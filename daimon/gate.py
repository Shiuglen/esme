"""Puerta MCP: Claude Code (y cualquier agente) pide contexto vivo a la mente en vez de leer ficheros .md."""
from __future__ import annotations

import hashlib
import threading
from datetime import datetime, timezone

from mcp.server.mcpserver import Context

from .home import Home
from .immune import TRUST, clean
from .ingest import Event

KINDS = {"note", "doc", "user_msg", "ai_msg"}


def recall_tool(home: Home, query: str, budget: int = 1500, motor: str | None = None) -> str:
    text, _, ids = home.thalamus.compose(query, budget, motor=motor)
    return f"{text}\n\n[recuerdos: {', '.join(ids)}]" if text else "Sin recuerdos relevantes."


def remember_tool(home: Home, text: str, kind: str = "note") -> str:
    cleaned = clean(text)
    if cleaned is None:
        return "rechazado: contenido excluido por el sistema inmune"
    if not cleaned.strip():
        return "rechazado: texto vacío"
    eid = hashlib.sha1(cleaned.encode()).hexdigest()[:16]
    ev = Event(eid, cleaned, "mcp", kind if kind in KINDS else "note",
               datetime.now(timezone.utc).isoformat(), TRUST["user"])
    home.add([ev])
    return eid


def feedback_tool(home: Home, ids: list[str], useful: bool, query: str,
                  motor: str | None = None) -> str:
    if not home.thalamus.feedback(ids, 1.0 if useful else 0.0, query, motor=motor):
        return "sin efecto: esa consulta no se compuso con recall en esta sesión"
    home.save_thalamus()
    return "ok"


def who_from_headers(headers) -> str:
    """Nombre corto del cliente MCP (claude, opencode, codex, gemini…) a partir de su User-Agent."""
    ua = (dict(headers or {}).get("user-agent") or "").lower()
    for name in ("claude", "opencode", "codex", "gemini", "cursor", "zed"):
        if name in ua:
            return name
    return "agente"


def build_server(home: Home, lock: threading.Lock | None = None, on_event=None):
    from mcp.server.mcpserver import MCPServer   # mcp 2.x (antes FastMCP)

    lock = lock or threading.Lock()   # las herramientas corren en hilos: una a la vez sobre la misma mente
    mcp = MCPServer("daimon", instructions="Memoria viva de Daimon: usa recall antes de trabajar, remember para guardar "
                                           "decisiones y feedback para indicar qué recuerdos sirvieron.")

    @mcp.tool()
    def recall(query: str, ctx: Context, budget: int = 1500, motor: str | None = None) -> str:
        """Devuelve el contexto más útil de la memoria de Daimon para esta consulta (con ids citados).

        Manda «motor» (el nombre de la IA que vas a usar) y la mente te dará el contexto como lo
        quiere ese motor: cada IA aprende su propia forma."""
        with lock:
            text, used, ids = home.thalamus.compose(query, budget, motor=motor)
        if on_event:
            try:
                who = who_from_headers(ctx.headers)
            except Exception:
                who = "agente"
            on_event({"type": "recall", "who": who, "query": query, "ids": ids, "tokens": used,
                      "abstained": not ids, "motor": motor})
        return f"{text}\n\n[recuerdos: {', '.join(ids)}]" if text else "Sin recuerdos relevantes."

    @mcp.tool()
    def remember(text: str, kind: str = "note") -> str:
        """Guarda un hecho, decisión o preferencia en la memoria de Daimon. Devuelve su id."""
        with lock:
            return remember_tool(home, text, kind)

    @mcp.tool()
    def feedback(ids: list[str], useful: bool, query: str, motor: str | None = None) -> str:
        """Indica si los recuerdos devueltos por recall sirvieron, para que Daimon aprenda qué contexto funciona."""
        with lock:
            return feedback_tool(home, ids, useful, query, motor=motor)

    return mcp
