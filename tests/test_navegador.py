"""El navegador de Esme, del lado de la mente: el cliente y sus palabras.

La puerta la pone la app; aquí se comprueba que se le habla como toca (con token, por POST) y que,
si la app no está, la mente lo dice en vez de fingir que ha navegado.
"""
from __future__ import annotations

import io
import json
import urllib.error

import pytest

from daimon.navegador import ENV_TOKEN, ENV_URL, ClienteNavegador, en_palabras


class _Respuesta:
    def __init__(self, cuerpo: bytes):
        self._cuerpo = cuerpo

    def read(self) -> bytes:
        return self._cuerpo

    def __enter__(self):
        return self

    def __exit__(self, *a):
        return False


def test_sin_app_no_se_inventa(monkeypatch):
    monkeypatch.delenv(ENV_URL, raising=False)
    c = ClienteNavegador()
    assert c.disponible is False
    r = c.abrir("https://x.com")
    assert "no está" in r["error"]
    assert "no está" in en_palabras(r)


def test_habla_con_la_puerta_con_token(monkeypatch):
    llamado = {}

    def falso(peticion, timeout=None):
        llamado["url"] = peticion.full_url
        llamado["token"] = peticion.headers.get("Authorization")
        llamado["cuerpo"] = json.loads(peticion.data.decode("utf-8"))
        return _Respuesta(json.dumps({"url": "https://x.com", "titulo": "X", "texto": "hola",
                                       "acciones": ["clic en «Ir»"]}).encode("utf-8"))

    monkeypatch.setenv(ENV_URL, "http://127.0.0.1:9999/")
    monkeypatch.setenv(ENV_TOKEN, "tok")
    monkeypatch.setattr("urllib.request.urlopen", falso)
    c = ClienteNavegador()
    assert c.disponible is True
    r = c.escribir("Buscar", "hola")
    assert llamado["url"] == "http://127.0.0.1:9999/escribir"
    assert llamado["token"] == "Bearer tok"
    assert llamado["cuerpo"] == {"objetivo": "Buscar", "valor": "hola"}
    assert r["titulo"] == "X"


def test_una_puerta_que_responde_error_no_rompe(monkeypatch):
    def falso(peticion, timeout=None):
        raise urllib.error.HTTPError(peticion.full_url, 401, "No", {}, io.BytesIO(b'{"error":"Sin permiso."}'))

    monkeypatch.setenv(ENV_URL, "http://127.0.0.1:9999")
    monkeypatch.setenv(ENV_TOKEN, "tok")
    monkeypatch.setattr("urllib.request.urlopen", falso)
    r = ClienteNavegador().estado()
    assert r["error"] == "Sin permiso."


def test_por_http_de_verdad_con_la_puerta_de_la_app():
    """No un simulacro: un servidor HTTP de verdad que habla como la puerta de la app."""
    import threading
    from http.server import BaseHTTPRequestHandler, HTTPServer

    visto = {}

    class Manejador(BaseHTTPRequestHandler):
        def do_POST(self):  # noqa: N802 - el nombre lo pone la librería
            largo = int(self.headers.get("Content-Length") or 0)
            cuerpo = json.loads(self.rfile.read(largo).decode("utf-8"))
            visto["ruta"] = self.path
            visto["token"] = self.headers.get("Authorization")
            visto["cuerpo"] = cuerpo
            respuesta = json.dumps({"url": "https://x.com", "titulo": "X", "texto": "hola",
                                    "acciones": ["clic en «Ir»"]}).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(respuesta)))
            self.end_headers()
            self.wfile.write(respuesta)

        def log_message(self, *a):
            return

    srv = HTTPServer(("127.0.0.1", 0), Manejador)
    hilo = threading.Thread(target=srv.serve_forever, daemon=True)
    hilo.start()
    try:
        c = ClienteNavegador(f"http://127.0.0.1:{srv.server_port}", "tok")
        r = c.abrir("https://x.com")
        assert visto["ruta"] == "/abrir"
        assert visto["token"] == "Bearer tok"
        assert visto["cuerpo"] == {"url": "https://x.com"}
        assert r["titulo"] == "X"
        assert "clic en «Ir»" in en_palabras(r)

        # la mirada: baja y sube, y la puerta recibe la dirección
        c.bajar(True)
        assert visto["ruta"] == "/scroll"
        assert visto["cuerpo"] == {"abajo": True}
        c.bajar(False)
        assert visto["cuerpo"] == {"abajo": False}
    finally:
        srv.shutdown()
        srv.server_close()


def test_lo_que_ve_el_agente_en_palabras():
    texto = en_palabras({"titulo": "X", "url": "https://x.com", "texto": "hola",
                         "acciones": ["clic en «Ir»", "escribir en «Buscar»"]})
    assert "Página: X" in texto
    assert "URL: https://x.com" in texto
    assert "hola" in texto
    assert "clic en «Ir»" in texto
