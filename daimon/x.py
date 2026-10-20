"""La mente absorbe tu X: FYP y bookmarks convertidos en recuentos con procedencia.

Prácticas: solo lectura en X; lo que entra guarda su URL, tal como está (nada de parafrasear
lo que dijo otro), y cada fuente se sincroniza por colección: si el nuevo barrido de FYP
ya no trae un post, su recuerdo queda obsoleto, sin pisar nada.
"""
from __future__ import annotations

import hashlib
import re
from datetime import datetime, timezone

from .immune import TRUST, clean
from .ingest import Event

_FUENTES = {"/home": "x:fyp", "/i/bookmarks": "x:bookmarks", "/search": "x:busqueda"}


def _fuente(url: str) -> str:
    for camino, fuente in _FUENTES.items():
        if camino in url:
            return fuente
    return "x:otro"


def _fecha(preparada: str) -> str:
    try:
        datetime.fromisoformat(preparada.replace("Z", "+00:00"))
        return preparada
    except ValueError:
        return datetime.now(timezone.utc).isoformat()


def repara_urls(texto: str) -> str:
    """El harvest trocea el texto del post: una URL puede llegar partida en varias líneas («https://\ngithub.com/…»).

    Con los trozos pegados, el enlace vuelve a funcionar: un recuerdo con una URL rota no se puede seguir."""
    previo = None
    while previo != texto:
        previo = texto

        def pega(m: re.Match) -> str:
            url, trozo = m.group(1), m.group(2)
            camino = re.sub(r"^https?://", "", url)
            if not camino:
                return url + trozo                    # aún no hay host: el trozo es su continuación
            if "/" not in camino and not trozo.startswith("/"):
                return m.group(0)                    # el host ya está entero: el trozo es prosa
            return url + trozo

        texto = re.sub(r"(https?://[^\s]*)\n([^\s]+)", pega, texto)
    return texto


def eventos_de_x(recolección: dict | list) -> list[Event]:
    """Pasa la cosecha (tabs de FYP, bookmarks o búsquedas) a eventos de la mente."""
    tabs = recolección if isinstance(recolección, list) else recolección.get("tabs", [])
    out: list[Event] = []
    seen: set[str] = set()
    for tab in tabs:
        fuente = _fuente(tab.get("url", ""))
        for p in tab.get("posts", []):
            texto = clean(f"{p.get('author', '')}: {repara_urls(p.get('text', '') or '')} ({p.get('url', '')})")
            if texto is None or not texto.strip() or not p.get("text"):
                continue                       # anuncios y ruido no manchan la mente
            clave = " ".join(texto.lower().split())
            if clave in seen:
                continue
            seen.add(clave)
            eid = hashlib.sha1(clave.encode()).hexdigest()[:16]
            out.append(Event(eid, texto, fuente, "doc", _fecha(p.get("date", "")), TRUST["web"]))
    return out
