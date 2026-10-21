"""Servidor local del cerebro: API para la app + MCP para los agentes, en un solo proceso y con un solo candado.

Solo escucha en loopback; toda petición exige el token del arranque y un Origin permitido.
"""
from __future__ import annotations

import asyncio
import json
import threading
import time
from collections import deque
from pathlib import Path

import numpy as np

from starlette.concurrency import run_in_threadpool
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response, StreamingResponse

from . import rea as rea_mod
from . import rumbo as rumbo_mod
from .atlas import atlas_for
from .gate import build_server, feedback_tool, remember_tool
from .home import Home
from .ingest import collect

ORIGINS = {"http://localhost:5173", "http://127.0.0.1:5173", "app://daimon"}


class EventBus:
    """Eventos de la mente (quién recordó qué) para el Atlas en vivo; seguro entre hilos."""

    def __init__(self, keep: int = 2000):
        # 2000 eventos en vivo: la app puede mirar atrás sin quedarse sin historial
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


# Rutas públicas: la Agent Card (qué sabe hacer Esme). No llevan nada de tu memoria.
PUBLICAS = ("/.well-known/agent-card.json", "/.well-known/agent.json")


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
        # La Agent Card es pública: sólo dice qué sabe hacer Esme, no lleva nada de tu memoria.
        if request.url.path in PUBLICAS:
            resp = await call_next(request)
            for k, v in _cors(origin).items():
                resp.headers[k] = v
            return resp
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
    return {"id": e.id, "text": e.text, "source": e.source, "kind": e.kind, "ts": e.ts, "trust": e.trust,            "compartment": e.compartment}


def create_app(home: Home, token: str, allowed_hosts: list[str] | None = None, voz=None):
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
        motor = b.get("motor")
        # El presupuesto es el de la mente (configurable); 0 usa ese, y un negativo significa sin límite.
        presupuesto = int(b.get("budget", 0)) or int(home.config.get("presupuesto", 4000))
        text, used, ids = await locked(home.thalamus.compose)(b["query"], presupuesto, motor=motor)
        ev = {"type": "recall", "who": b.get("who", "app"), "query": b["query"], "ids": ids, "tokens": used,
              "abstained": not ids, "motor": motor}
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
        return JSONResponse({"result": await locked(feedback_tool)(home, b["ids"], bool(b["useful"]), b["query"],
                                                                 motor=b.get("motor"))})

    @mcp.custom_route("/memories", methods=["GET"])
    async def memories(req: Request):
        # 200 recuerdos por defecto: la app no se queda con la punta de iceberg
        q, limit = req.query_params.get("q", ""), int(req.query_params.get("limit", 200))
        # por fuente: lo que guardaste (en X, en un archivo…), sin búsqueda: es una coleta, no un recuerdo
        fuente = req.query_params.get("fuente", "")
        if fuente:
            return JSONResponse([{**_event_dict(e), "score": 0} for e in await locked(home.hippo.por_fuente)(fuente, limit)])
        if not q:   # sin búsqueda: lo último que aprendió tu mente
            recientes = (await locked(home.hippo.events)())[::-1][:limit]
            return JSONResponse([{**_event_dict(e), "score": 0} for e in recientes])
        hits = await locked(home.hippo.recall)(q, k=limit, hops=0)
        return JSONResponse([{**_event_dict(h.event), "score": round(h.score, 4)} for h in hits])

    @mcp.custom_route("/memory/{id}", methods=["GET"])
    async def memory(req: Request):
        e = await locked(home.hippo.get)(req.path_params["id"])
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

    @mcp.custom_route("/ingest-x", methods=["POST"])
    async def ingest_x(req: Request):
        """La mente absorbe tu X: una cosecha de FYP, guardados o búsquedas entra como recuerdos."""
        from .x import eventos_de_x
        b = await req.json()
        cosecha = b.get("cosecha")
        if isinstance(cosecha, str):
            cosecha = json.loads(Path(cosecha).read_text(encoding="utf-8"))
        eventos = eventos_de_x(cosecha or {})
        added = await locked(lambda: home.ingest(eventos))()
        bus.publish({"type": "ingest-x", "added": added})
        return JSONResponse({"added": added, "memories": len(home.hippo)})

    @mcp.custom_route("/rea/absorber", methods=["POST"])
    async def rea_absorber(req: Request):
        """El espejo: REA mira un programa y lo que vio entra en la memoria de la mente."""
        b = await req.json()
        ruta = b.get("ruta")
        if not isinstance(ruta, str) or not ruta.strip():
            return JSONResponse({"ok": False, "error": "falta la ruta del programa"}, status_code=400)
        try:
            evidencia = await run_in_threadpool(rea_mod.analizar, ruta.strip())
        except rea_mod.ErrorRea as e:
            return JSONResponse({"ok": False, "error": str(e)}, status_code=400)
        r = await locked(lambda: rea_mod.ingerir(home, evidencia, ruta.strip(), motivo=b.get("motivo", "")))()
        bus.publish({"type": "rea", **r})
        return JSONResponse({"ok": True, **r})

    @mcp.custom_route("/rea/recuerdos", methods=["POST"])
    async def rea_recuerdos(req: Request):
        """Lo que la mente ya sabe de un programa: los recuerdos de su informe.

        Es la puerta del «recrear»: quien va a rehacer una pieza de un programa pide aquí lo que
        de él se sabe, en vez de adivinarlo.
        """
        b = await req.json()
        ruta = b.get("ruta")
        if not isinstance(ruta, str) or not ruta.strip():
            return JSONResponse({"ok": False, "error": "falta la ruta del programa"}, status_code=400)
        fuente = rea_mod.fuente_de(ruta.strip())
        evs = await locked(home.hippo.por_fuente)(fuente, 300)
        return JSONResponse({"ok": True, "fuente": fuente, "recuerdos": [e.text for e in evs]})

    @mcp.custom_route("/rumbo", methods=["GET"])
    async def rumbo(_: Request):
        """Para qué trabaja esta mente: los pilares y los objetivos."""
        return JSONResponse(rumbo_mod.lee(home.path))

    @mcp.custom_route("/rumbo", methods=["POST"])
    async def rumbo_post(req: Request):
        b = await req.json()
        accion = str(b.get("accion", ""))
        ahora = int(time.time() * 1000)
        if accion == "anadir_pilar":
            r = rumbo_mod.anade_pilar(home.path, str(b.get("texto", "")), ahora)
        elif accion == "anadir_objetivo":
            r = rumbo_mod.anade_objetivo(home.path, str(b.get("texto", "")), ahora, b.get("pilar"))
        elif accion == "cambiar_objetivo":
            r = rumbo_mod.cambia_objetivo(home.path, str(b.get("id", "")), str(b.get("estado", "activo")), ahora)
        elif accion == "quitar_pilar":
            r = rumbo_mod.quita_pilar(home.path, str(b.get("id", "")))
        elif accion == "quitar_objetivo":
            r = rumbo_mod.quita_objetivo(home.path, str(b.get("id", "")))
        else:
            return JSONResponse({"error": "no sé qué hacer con eso"}, 400)
        return JSONResponse(r)

    @mcp.custom_route("/sueño", methods=["POST"])
    async def sueno(req: Request):
        """La mente duerme: destila personas y escenas de lo vivido y lo guarda como tarjetas."""
        from .suenio import dormir
        informe = await locked(dormir)(home)
        bus.publish({"type": "sueño", **informe})
        return JSONResponse(informe)

    @mcp.custom_route("/repeticiones", methods=["GET"])
    async def repeticiones(_: Request):
        """Las tareas que el creador repite: candidatas a convertirse en skill.

        No crea nada: sólo dice qué se repite y cuántas veces, para que el usuario decida.
        """
        from .repeticion import propuesta
        return JSONResponse(await locked(propuesta)(home))

    @mcp.custom_route("/equipo", methods=["POST"])
    async def equipo(req: Request):
        """Lo que la mente aprende del equipo: cada veredicto del creador es una lección."""
        from .equipo import aprender
        b = await req.json()
        informe = await locked(aprender)(home, b if isinstance(b, dict) else {})
        bus.publish({"type": "equipo", **informe})
        return JSONResponse(informe)

    @mcp.custom_route("/orquesta", methods=["GET"])
    async def orquesta(_: Request):
        """Qué motor gana en qué: las señales que ha aprendido la mente de cada IA."""
        return JSONResponse(home.thalamus.estadisticas())

    @mcp.custom_route("/atlas", methods=["GET"])
    async def atlas(_: Request):
        return JSONResponse(await locked(atlas_for)(home))

    # La voz de Esme (daimon/voz.py): oír PCM float32 a 16 kHz (hasta 15 min) y decir texto como WAV.
    if voz is None:
        from daimon.voz import Voz
        voz = Voz()
    voz_cerrojo = threading.Lock()

    def con_voz(fn):
        def run(*a):
            with voz_cerrojo:
                return fn(*a)
        return lambda *a: run_in_threadpool(run, *a)

    @mcp.custom_route("/voz/oir", methods=["POST"])
    async def voz_oir(req: Request):
        datos = await req.body()
        if not datos or len(datos) % 4:
            return JSONResponse({"error": "falta el audio (PCM float32 a 16 kHz)"}, 400)
        if len(datos) > 16000 * 4 * 900:   # 15 minutos de audio, no 3: no se rechaza una charla larga
            return JSONResponse({"error": "el audio pasa de 15 minutos"}, 413)
        pcm = np.frombuffer(datos, dtype="<f4")
        texto = await con_voz(voz.oir)(pcm, req.query_params.get("idioma", "es"))
        return JSONResponse({"texto": texto})

    @mcp.custom_route("/voz/decir", methods=["POST"])
    async def voz_decir(req: Request):
        texto = str((await req.json()).get("texto", "")).strip()[:20000]   # hasta 20 000 caracteres, no 4 000
        if not texto:
            return JSONResponse({"error": "no hay nada que decir"}, 400)
        return Response(await con_voz(voz.decir)(texto), media_type="audio/wav")

    @mcp.custom_route("/events", methods=["GET"])
    async def events(_: Request):
        return StreamingResponse(bus.stream(), media_type="text/event-stream",
                                 headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})

    # La Agent Card: la puerta por la que otro agente descubre qué sabe hacer Esme.
    # Es pública (no lleva datos del usuario, sólo capacidades) y pública es como se descubre.
    def agent_card_of(request: Request) -> dict:
        from daimon.agent_card import agent_card
        return agent_card(str(request.base_url).rstrip("/"))

    @mcp.custom_route("/.well-known/agent-card.json", methods=["GET"])
    async def agent_card_ruta(_: Request):
        return JSONResponse(agent_card_of(_))

    @mcp.custom_route("/.well-known/agent.json", methods=["GET"])
    async def agent_json(_: Request):
        return JSONResponse(agent_card_of(_))

    hosts = {"127.0.0.1", "localhost", *(allowed_hosts or [])}
    app = mcp.streamable_http_app(
        stateless_http=True, json_response=True, host="127.0.0.1",
        transport_security=TransportSecuritySettings(enable_dns_rebinding_protection=False))
    app.add_middleware(Guard, token=token, hosts=hosts)
    return app, bus
