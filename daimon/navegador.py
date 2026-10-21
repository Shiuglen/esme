"""El navegador de Esme, del lado de la mente.

La app tiene el navegador (Chromium propio, en `app/src/main/navegador/`); la mente lo usa por una
puerta HTTP diminuta en 127.0.0.1, con token. Aquí está el cliente y las herramientas MCP.

Por qué así: **cualquier agente que hable con la mente de Esme puede abrir la web de verdad** — los
del Taller, el de la conversación y los de fuera de la máquina. La puerta es la misma que la de la
memoria: mismo token, mismas guardas (sólo http/https, nada de ficheros).

Si la app no está delante (el cerebro sólo, o la app cerrada), las herramientas lo dicen y no
inventan: la mente nunca finge que ha navegado.
"""
from __future__ import annotations

import json
import os
import urllib.error
import urllib.request

# La puerta del navegador: la pone la app al arrancar el cerebro.
ENV_URL = "ESME_NAVEGADOR_URL"
ENV_TOKEN = "ESME_NAVEGADOR_TOKEN"


class ClienteNavegador:
    """Habla con el navegador de la app. Si no está, lo dice (no inventa)."""

    def __init__(self, url: str | None = None, token: str | None = None, timeout: float = 20.0):
        self.url = (url if url is not None else os.environ.get(ENV_URL, "")).rstrip("/")
        self.token = token if token is not None else os.environ.get(ENV_TOKEN, "")
        self.timeout = timeout

    @property
    def disponible(self) -> bool:
        return bool(self.url)

    def _llama(self, ruta: str, datos: dict) -> dict:
        if not self.url:
            return {"error": "El navegador de Esme no está delante ahora mismo."}
        peticion = urllib.request.Request(
            f"{self.url}{ruta}",
            data=json.dumps(datos).encode("utf-8"),
            headers={"Content-Type": "application/json", "Authorization": f"Bearer {self.token}"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(peticion, timeout=self.timeout) as r:
                return json.loads(r.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            detalle = e.read().decode("utf-8", "replace")[:200]
            try:
                cuerpo = json.loads(detalle)
                return {"error": str(cuerpo.get("error") or detalle)}
            except json.JSONDecodeError:
                return {"error": detalle or f"el navegador respondió {e.code}"}
        except Exception as e:  # noqa: BLE001 - la puerta puede no estar
            return {"error": f"El navegador de Esme no contesta ({e})."}

    def abrir(self, url: str) -> dict:
        return self._llama("/abrir", {"url": url})

    def estado(self) -> dict:
        return self._llama("/estado", {})

    def clic(self, objetivo: str) -> dict:
        return self._llama("/clic", {"objetivo": objetivo})

    def escribir(self, objetivo: str, valor: str) -> dict:
        return self._llama("/escribir", {"objetivo": objetivo, "valor": valor})

    def bajar(self, abajo: bool = True) -> dict:
        return self._llama("/scroll", {"abajo": abajo})

    def volver(self) -> dict:
        return self._llama("/volver", {})


def en_palabras(r: dict) -> str:
    """Lo que la herramienta MCP devuelve: la página, en texto, con sus acciones posibles."""
    if not isinstance(r, dict):
        return "El navegador no devolvió nada."
    if r.get("error"):
        return str(r["error"])
    lineas = []
    if r.get("titulo"):
        lineas.append(f"Página: {r['titulo']}")
    if r.get("url"):
        lineas.append(f"URL: {r['url']}")
    if r.get("donde"):
        lineas.append(f"Hecho: {r['donde']}")
    if r.get("texto"):
        lineas.append("")
        lineas.append(str(r["texto"]))
    if r.get("acciones"):
        lineas.append("")
        lineas.append("Acciones posibles: " + " · ".join(str(a) for a in r["acciones"][:40]))
    return "\n".join(lineas) if lineas else "La página está vacía."
