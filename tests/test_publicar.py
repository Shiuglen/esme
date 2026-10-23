#!/usr/bin/env python3
"""La publicación dice la verdad, también sobre lo que hay fuera.

El check de antes decía «todo en su sitio» mientras el paquete no estaba en PyPI y la
entrada del registro no estaba publicada. Ahora mira las dos cosas de fuera y las dice
como son: dato, no golpe (la primera publicación es normal: el paquete todavía no está).
"""
from __future__ import annotations

import importlib.util
import json
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]


def _carga():
    spec = importlib.util.spec_from_file_location("publicar", RAIZ / "scripts" / "publicar.py")
    mod = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(mod)
    return mod


publicar = _carga()


def test_el_paquete_que_no_esta_en_pypi_se_dice(monkeypatch):
    def falso(url, timeout=15):
        if "pypi.org" in url:
            return 404, None
        return 200, {"name": "io.github.Shiuglen/esme", "version": "0.1.1"}
    monkeypatch.setattr(publicar, "_http_json", falso)
    lineas = publicar.estado_remoto()
    assert any("NO está publicado" in l for l in lineas)
    assert any("está viva" in l for l in lineas)


def test_la_entrada_que_no_esta_se_dice(monkeypatch):
    def falso(url, timeout=15):
        if "pypi.org" in url:
            return 200, {"releases": {"0.1.0": []}}
        return 404, None
    monkeypatch.setattr(publicar, "_http_json", falso)
    lineas = publicar.estado_remoto()
    assert any("NO está publicada" in l for l in lineas)
    assert any("0.1.0" in l for l in lineas)


def test_el_estado_local_no_miente(monkeypatch, capsys):
    monkeypatch.setattr(publicar, "estado_remoto", lambda: ["PyPI: daimon-esme NO está publicado (todavía)"])
    codigo = publicar.estado()
    salida = capsys.readouterr().out
    assert codigo == 0
    assert "NO está publicado" in salida
    # y no dice «todo en su sitio» a lo bruto: dice qué falta
    assert "pending publisher" in salida


def test_el_json_de_la_consulta_se_lee(monkeypatch):
    # la consulta devuelve (código, json): el código 404 sin cuerpo es una respuesta, no un fallo
    monkeypatch.setattr(publicar.urllib.request, "urlopen", lambda url, timeout=15: _Resp(b'{"releases": {"0.1.0": []}}'))
    codigo, datos = publicar._http_json("https://pypi.org/pypi/x/json")
    assert codigo == 200 and "0.1.0" in json.dumps(datos)


class _Resp:
    status = 200
    def __init__(self, cuerpo: bytes): self.cuerpo = cuerpo
    def read(self) -> bytes: return self.cuerpo
    def __enter__(self): return self
    def __exit__(self, *a): return False
