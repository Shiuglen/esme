"""Puerta MCP: Claude Code (y cualquier agente) pide contexto vivo a la mente en vez de leer ficheros .md."""
from __future__ import annotations

import hashlib
from datetime import datetime, timezone

from .home import Home
from .immune import TRUST, clean
from .ingest import Event

KINDS = {"note", "doc", "user_msg", "ai_msg"}


def recall_tool(home: Home, query: str, budget: int = 1500) -> str:
    text, _, ids = home.thalamus.compose(query, budget)
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


def feedback_tool(home: Home, ids: list[str], useful: bool, query: str) -> str:
    home.thalamus.feedback(ids, 1.0 if useful else 0.0, query)
    home.save_thalamus()
    return "ok"


def build_server(home: Home):
    from mcp.server.mcpserver import MCPServer   # mcp 2.x (antes FastMCP)

    mcp = MCPServer("daimon", instructions="Memoria viva de Daimon: usa recall antes de trabajar, remember para guardar "
                                           "decisiones y feedback para indicar qué recuerdos sirvieron.")

    @mcp.tool()
    def recall(query: str, budget: int = 1500) -> str:
        """Devuelve el contexto más útil de la memoria de Daimon para esta consulta (con ids citados)."""
        return recall_tool(home, query, budget)

    @mcp.tool()
    def remember(text: str, kind: str = "note") -> str:
        """Guarda un hecho, decisión o preferencia en la memoria de Daimon. Devuelve su id."""
        return remember_tool(home, text, kind)

    @mcp.tool()
    def feedback(ids: list[str], useful: bool, query: str) -> str:
        """Indica si los recuerdos devueltos por recall sirvieron, para que Daimon aprenda qué contexto funciona."""
        return feedback_tool(home, ids, useful, query)

    return mcp
