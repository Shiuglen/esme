"""La Agent Card de Esme: la puerta por la que otro agente descubre qué sabe hacer.

Palanca 3 de la tesis de escala (A2A): Esme deja de ser «la app del creador» y pasa a ser una
parada en la red de agentes. La tarjeta vive en `/.well-known/agent-card.json` (la ruta que pide el
protocolo A2A) y es **pública**: no lleva datos del usuario, sólo capacidades, para que otro agente
pueda saber qué ofrece antes de pedir nada.

Lo que ofrece Esme de verdad hoy:
- **memoria**: `recall` (el contexto que una IA necesita), `remember` (guardar una decisión),
  `feedback` (decirle qué sirvió), por MCP y por HTTP.
- **navegador**: `navegar`, `clic_en_la_pagina` y `escribir_en_la_pagina` — la web de verdad, con el
  navegador de la app detrás (MCP).
- **sueño**: la mente ordena su memoria, aprende de las tareas del Taller y prepara el día.
- **voz**: el oído y la voz de Esme, en el equipo, sin ir a la nube.

Lo que **no** ofrece todavía (y por eso no está en la tarjeta): encargar tareas al Taller desde
fuera. Está en camino; la tarjeta no promete lo que no hay.
"""
from __future__ import annotations

VERSION = "0.1.0"


def agent_card(url_base: str, version: str = VERSION) -> dict:
    """La tarjeta. `url_base` es la raíz del cerebro (http://127.0.0.1:PUERTO)."""
    base = url_base.rstrip("/")
    return {
        "name": "Esme",
        "description": ("Memoria viva local: recuerda lo que sabes y devuelve el contexto que cada IA necesita. "
                        "Todo dentro de tu equipo, sin cuentas y sin nube."),
        "url": f"{base}/",
        "version": version,
        "provider": {"organization": "Esme", "url": "https://github.com/Shiuglen/esme"},
        "documentationUrl": "https://github.com/Shiuglen/esme",
        "capabilities": {"streaming": True, "pushNotifications": False, "stateTransitionHistory": True},
        "defaultInputModes": ["text/plain"],
        "defaultOutputModes": ["text/plain"],
        "skills": [
            {
                "id": "memoria",
                "name": "Memoria viva",
                "description": ("Devuelve el contexto más útil para una consulta (con los ids de lo que usó), "
                                "guarda hechos, decisiones y preferencias, y aprende de qué contexto sirvió. "
                                "Por MCP (recall, remember, feedback) o por HTTP."),
                "tags": ["memoria", "contexto", "mcp", "privado"],
                "examples": [
                    "¿Qué decidimos sobre las pieles de la Tienda?",
                    "Guarda esta decisión: primero lo esencial impecable.",
                ],
                "x-esme": {"herramientas": ["recall", "remember", "feedback"],
                           "http": ["/recall", "/remember", "/feedback", "/memories", "/memory/{id}", "/forget", "/ingest", "/ingest-x", "/rumbo", "/health", "/events"]},
            },
            {
                "id": "navegador",
                "name": "Navegador de Esme",
                "description": ("Abre la web de verdad (con JavaScript y formularios), te devuelve lo que hay: el texto "
                                "y el mapa de lo que se puede tocar, cada cosa con su número (n7). Pulsas y rellenas "
                                "por número o por texto, y bajas la mirada cuando hay más página debajo. "
                                "Es el navegador de la app, servido por la mente: cualquier agente que hable con Esme "
                                "puede usarlo."),
                "tags": ["web", "navegador", "herramientas"],
                "examples": [
                    "Abre la página de las noticias y dime qué hay.",
                    "Busca en esa web el precio y vuelve con la cifra.",
                ],
                "x-esme": {"herramientas": ["navegar", "clic_en_la_pagina", "escribir_en_la_pagina", "bajar_la_mira"]},
            },
            {
                "id": "sueno",
                "name": "El sueño",
                "description": ("La mente ordena lo que sabe, aprende de las tareas del Taller y prepara el día "
                                "con lo que importa."),
                "tags": ["memoria", "proactividad"],
                "examples": ["Ordena lo que sabes y avísame de lo importante."],
                "x-esme": {"http": ["/sueno", "/orquesta", "/atlas", "/repeticiones", "/necesidad", "/equipo"]},
            },
            {
                "id": "voz",
                "name": "Voz local",
                "description": ("El oído (Whisper) y la voz (Piper) en el equipo: dictar y hablar sin que nada "
                                "salga a la red."),
                "tags": ["voz", "privado"],
                "examples": ["Escucha esto y escríbelo."],
                "x-esme": {"http": ["/voz/oir", "/voz/decir"]},
            },
        ],
        "securitySchemes": {
            "bearerAuth": {"type": "http", "scheme": "bearer",
                           "description": "El token local de tu cerebro (cabecera Authorization)."}
        },
        "security": [{"bearerAuth": []}],
        "x-esme": {
            "transporte": "MCP (streamable HTTP) en /mcp y HTTP directo",
            "mcp": f"{base}/mcp",
            "enTuEquipo": True,
            "licencia": "MIT",
        },
    }
