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
# El presupuesto por defecto sale de la configuración de la mente (0 = sin límite).


def recall_tool(home: Home, query: str, budget: int | None = None, motor: str | None = None) -> str:
    """Contexto vivo para la consulta.

    `budget` son tokens de contexto. 0 (o menos) = el presupuesto de la mente (configurable en
    config.json; si ahí también es 0, es sin límite). Pide más si tu trabajo lo necesita."""
    if budget is None or budget <= 0:
        budget = int(home.config.get("presupuesto", 4000))
    text, _, ids = home.thalamus.compose(query, budget, motor=motor)
    return f"{text}\n\n[recuerdos: {', '.join(ids)}]" if text else "Sin recuerdos relevantes."


def remember_tool(home: Home, text: str, kind: str = "note") -> str:
    cleaned = clean(text)
    if cleaned is None:
        return "rechazado: contenido excluido por el sistema inmune"
    if not cleaned.strip():
        return "rechazado: texto vacío"
    # Id por contenido normalizado: la misma frase con otros espacios o mayúsculas ya no crea un
    # recuerdo nuevo (antes sí, y la memoria se llenaba de gemelos).
    eid = hashlib.sha1(" ".join(cleaned.lower().split()).encode()).hexdigest()[:16]
    # El tipo ya no se fuerza a los cuatro conocidos: si el agente dice "decision" o "preferencia",
    # se guarda con ese tipo y no se pierde información.
    ev = Event(eid, cleaned, "mcp", (kind or "note").strip().lower() or "note",
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
    # Las «instructions» del servidor son la vía barata para que la memoria se use sola: los
    # clientes MCP las enseñan al modelo al inicializar, así que el protocolo llega sin proxy,
    # sin claves y sin reescribir el prompt de quien llama.
    from .sesion import PROTOCOLO, pack_de_arranque

    mcp = MCPServer("daimon", instructions=PROTOCOLO)

    @mcp.tool()
    def sesion(tarea: str, ctx: Context, motor: str | None = None, tarea_id: str | None = None) -> str:
        """Abre la sesión de trabajo: el rumbo de esta mente y el contexto de lo que vas a hacer.

        Llámala UNA vez al empezar, con una frase que diga qué vas a hacer. Te devuelve:
        para qué trabaja esta mente, lo que ya se sabe de tu tarea (con los ids, para poder dar
        `feedback` después), **quién más está trabajando en el Taller ahora mismo** y el protocolo
        de la memoria.

        Es la forma de tener la memoria puesta **sin proxy**: no se secuestra el tráfico del LLM,
        solo se pide una vez.

        «tarea_id» es el identificador de tu tarea en el Taller (si lo sabes): así no te listan a ti.
        """
        with lock:
            pack = pack_de_arranque(home, tarea, motor=motor, yo=tarea_id)
        if on_event:
            try:
                who = who_from_headers(ctx.headers)
            except Exception:
                who = "agente"
            on_event({"type": "sesion", "who": who, "tarea": tarea[:200]})
        return pack

    @mcp.tool()
    def recall(query: str, ctx: Context, budget: int = 0, motor: str | None = None) -> str:
        """Devuelve el contexto más útil de la memoria de Daimon para esta consulta (con ids citados).

        Manda «motor» (el nombre de la IA que vas a usar) y la mente te dará el contexto como lo
        quiere ese motor: cada IA aprende su propia forma.

        «budget» son tokens de contexto (0 = el presupuesto de la mente). Pide más si tu trabajo lo
        necesita: la mente ya no recorta por sorpresa."""
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

    # ── El navegador: la web de verdad, del lado de la app ──────────────────────────────────
    # La app es quien tiene el Chromium (el navegador de Esme). La mente le habla por una puerta
    # diminuta en 127.0.0.1 con token, así que estas herramientas funcionan para cualquier agente
    # que hable con Daimon: los del Taller, el de la conversación y los de fuera de la máquina.
    from .navegador import ClienteNavegador, en_palabras

    @mcp.tool()
    def navegar(url: str) -> str:
        """Abre una página en el navegador de Esme y devuelve lo que hay: el texto, los botones, los
        campos y las acciones posibles. Úsala cuando la página necesita JavaScript, o cuando tengas
        que rellenar un formulario o pulsar algo. Sólo direcciones http o https."""
        return en_palabras(ClienteNavegador().abrir(url))

    @mcp.tool()
    def clic_en_la_pagina(objetivo: str) -> str:
        """Pulsa un botón o enlace de la página que tienes abierta en el navegador de Esme (por su texto)."""
        return en_palabras(ClienteNavegador().clic(objetivo))

    @mcp.tool()
    def escribir_en_la_pagina(objetivo: str, valor: str) -> str:
        """Rellena un campo de la página abierta en el navegador de Esme (por su nombre o su marcador)."""
        return en_palabras(ClienteNavegador().escribir(objetivo, valor))

    return mcp
