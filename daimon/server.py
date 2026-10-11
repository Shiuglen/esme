"""Servidor local del cerebro: API para la app + MCP para los agentes, en un solo proceso y con un solo candado.

Solo escucha en loopback; toda petición exige el token del arranque y un Origin permitido.
"""
from __future__ import annotations

import asyncio
import json
import threading
from collections import deque
from pathlib import Path

from starlette.concurrency import run_in_threadpool
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response, StreamingResponse

from .atlas import atlas_for
from .gate import build_server, feedback_tool, remember_tool
from .home import Home
from .ingest import collect

ORIGINS = {"http://localhost:5173", "http://127.0.0.1:5173", "app://daimon"}


class EventBus:
    """Eventos de la mente (quién recordó qué) para el Atlas en vivo; seguro entre hilos."""

    def __init__(self, keep: int = 200):
        self.history: deque[dict] = deque(maxlen=keep)
        self._subs: set[asyncio.Queue] = set()
        self._loop: asyncio.AbstractEventLoop | None = None

    def publish(self, ev: dict) -> None:
        self.history.append(ev)
        loop = self._loop
        for q in list(self._subs):
            if loop and loop.is_running():
                loop.call_soon_threadsafe(q.put_nowait, ev)

    async def stream(self):
        self._loop = asyncio.get_running_loop()
        q: asyncio.Queue = asyncio.Queue()
        self._subs.add(q)
        try:
            yield "retry: 2000\n\n"
            while True:
                try:
                    ev = await asyncio.wait_for(q.get(), timeout=15)
                    yield f"data: {json.dumps(ev, ensure_ascii=False)}\n\n"
                except asyncio.TimeoutError:
                    yield ": latido\n\n"
        finally:
            self._subs.discard(q)


class Guard(BaseHTTPMiddleware):
    def __init__(self, app, token: str, hosts: set[str]):
        super().__init__(app)
        self.token, self.hosts = token, hosts

    async def dispatch(self, request: Request, call_next):
        host = (request.headers.get("host") or "").split(":")[0]
        if host not in self.hosts:
            return JSONResponse({"error": "host no permitido"}, 403)
        origin = request.headers.get("origin")
        if origin and origin not in ORIGINS:
            return JSONResponse({"error": "origen no permitido"}, 403)
        if request.method == "OPTIONS":
            return Response(status_code=204, headers=_cors(origin))
        auth = request.headers.get("authorization", "")
        qtok = request.query_params.get("token") if request.url.path == "/events" else None
        if auth != f"Bearer {self.token}" and qtok != self.token:
            return JSONResponse({"error": "token requerido"}, 401)
        resp = await call_next(request)
        for k, v in _cors(origin).items():
            resp.headers[k] = v
        return resp


def _cors(origin: str | None) -> dict:
    if not origin:
        return {}
    return {"Access-Control-Allow-Origin": origin, "Access-Control-Allow-Headers": "authorization, content-type",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS"}


def _event_dict(e) -> dict:
    return {"id": e.id, "text": e.text, "source": e.source, "kind": e.kind, "ts": e.ts, "trust": e.trust,
            "compartment": e.compartment}


def create_app(home: Home, token: str, allowed_hosts: list[str] | None = None):
    from mcp.server.transport_security import TransportSecuritySettings

    bus, lock = EventBus(), threading.Lock()
    mcp = build_server(home, lock=lock, on_event=bus.publish)

    def locked(fn):
        def run(*a, **k):
            with lock:
                return fn(*a, **k)
        return lambda *a, **k: run_in_threadpool(run, *a, **k)

    @mcp.custom_route("/health", methods=["GET"])
    async def health(_: Request):
        return JSONResponse({"ok": True, "memories": len(home.hippo)})

    @mcp.custom_route("/recall", methods=["POST"])
    async def recall(req: Request):
        b = await req.json()
        text, used, ids = await locked(home.thalamus.compose)(b["query"], int(b.get("budget", 1500)))
        ev = {"type": "recall", "who": b.get("who", "app"), "query": b["query"], "ids": ids, "tokens": used,
              "abstained": not ids}
        bus.publish(ev)
        return JSONResponse({"context": text, "tokens": used, "ids": ids, "abstained": not ids})

    @mcp.custom_route("/remember", methods=["POST"])
    async def remember(req: Request):
        b = await req.json()
        out = await locked(remember_tool)(home, b["text"], b.get("kind", "note"))
        if out.startswith("rechazado"):
            return JSONResponse({"error": out}, 400)
        bus.publish({"type": "remember", "id": out})
        return JSONResponse({"id": out})

    @mcp.custom_route("/feedback", methods=["POST"])
    async def feedback(req: Request):
        b = await req.json()
        return JSONResponse({"result": await locked(feedback_tool)(home, b["ids"], bool(b["useful"]), b["query"])})

    @mcp.custom_route("/memories", methods=["GET"])
    async def memories(req: Request):
        q, limit = req.query_params.get("q", ""), int(req.query_params.get("limit", 20))
        hits = await locked(home.hippo.recall)(q, k=limit, hops=0) if q else []
        return JSONResponse([{**_event_dict(h.event), "score": round(h.score, 4)} for h in hits])

    @mcp.custom_route("/memory/{mid}", methods=["GET"])
    async def memory(req: Request):
        e = await locked(home.hippo.get)(req.path_params["mid"])
        return JSONResponse(_event_dict(e)) if e else JSONResponse({"error": "no existe"}, 404)

    @mcp.custom_route("/forget", methods=["POST"])
    async def forget(req: Request):
        b = await req.json()
        cert = await locked(home.hippo.forget)(b["id"])
        home.thalamus.bm25 = type(home.thalamus.bm25)(home.hippo.events())
        bus.publish({"type": "forget", "ids": cert["forgotten"]})
        return JSONResponse(cert)

    @mcp.custom_route("/ingest", methods=["POST"])
    async def ingest(req: Request):
        b = await req.json()
        added = await locked(lambda: home.ingest(collect([Path(p).expanduser() for p in b["paths"]])))()
        bus.publish({"type": "ingest", "added": added})
        return JSONResponse({"added": added, "memories": len(home.hippo)})

    @mcp.custom_route("/atlas", methods=["GET"])
    async def atlas(_: Request):
        return JSONResponse(await locked(atlas_for)(home))

    @mcp.custom_route("/events", methods=["GET"])
    async def events(_: Request):
        return StreamingResponse(bus.stream(), media_type="text/event-stream",
                                 headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})

    hosts = {"127.0.0.1", "localhost", *(allowed_hosts or [])}
    app = mcp.streamable_http_app(
        stateless_http=True, json_response=True, host="127.0.0.1",
        transport_security=TransportSecuritySettings(enable_dns_rebinding_protection=False))
    app.add_middleware(Guard, token=token, hosts=hosts)
    return app, bus
