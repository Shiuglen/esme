"""Pruebas del sueño: personas y escenas destiladas de la mente, e ingesta de X."""
import json
from pathlib import Path

from daimon.home import Home
from daimon.ingest import Event
from daimon.suenio import dormir
from daimon.x import eventos_de_x
from tests.fakes import fake_encoder


def _home(tmp_path) -> Home:
    enc, dim = fake_encoder(32)
    return Home(tmp_path / "mente", encoder=(enc, dim))


def _ev(i, texto, ts, fuente="t", confianza=0.8):
    return Event(f"id{i}", texto, fuente, "user_msg" if i % 2 else "note", ts, confianza)


def test_sueño_distila_personas_y_escenas(tmp_path):
    h = _home(tmp_path)
    evs = []
    for i, d in [(1, "2026-10-01"), (2, "2026-10-02"), (3, "2026-10-03"),
                 (4, "2026-10-04"), (5, "2026-10-05")]:
        evs.append(_ev(i, f"Sakai revisa la Prueba 0 del Tálamo con Laya {i}", f"{d}T10:00:00Z"))
    evs.append(_ev(6, "receta de arepas con queso y azúcar", "2026-10-06T09:00:00Z"))
    h.add(evs)
    informe = dormir(h)
    assert informe["personas"] >= 1
    tarjetas = [e for e in h.hippo.events() if e.source == "sueño"]
    assert any("Sakai" in e.text and "persona" in e.text for e in tarjetas)
    assert any(e.parent == "id1" for e in tarjetas)          # procedencia: el sueño enlaza lo producido


def test_sueño_es_idempotente(tmp_path):
    h = _home(tmp_path)
    h.add([_ev(1, "Sakai prueba el sueño del Tálamo", "2026-10-01T10:00:00Z"),
           _ev(2, "Sakai prueba el sueño del Tálamo otra vez", "2026-10-01T10:05:00Z"),
           _ev(3, "Sakai prueba el sueño del Tálamo más", "2026-10-01T10:10:00Z")])
    primero = dormir(h)
    n_primero = len(h.hippo)
    segundo = dormir(h)
    assert segundo["energia"] <= 0 and len(h.hippo) == n_primero


def test_olvido_arrasa_la_tarjeta(tmp_path):
    h = _home(tmp_path)
    h.add([_ev(1, "Sakai prepara el examen con Osqui", "2026-10-01T10:00:00Z"),
           _ev(2, "Sakai corregida el examen con Osqui", "2026-10-02T10:00:00Z"),
           _ev(3, "Sakai aprueba el examen con Osqui", "2026-10-03T10:00:00Z")])
    dormir(h)
    tarjetas = [e.id for e in h.hippo.events() if e.source == "sueño"]
    assert tarjetas
    cert = h.hippo.forget("id1")                             # muere el padre, muere la tarjeta en cascada
    assert "id1" in cert["forgotten"]
    vivos = [e.id for e in h.hippo.events() if e.source == "sueño"]
    vivos = [g for g in tarjetas if g in vivos]
    assert not vivos                                         # la tarjeta producida por id1 no sobrevive


def test_ingesta_de_x(tmp_path):
    bruto = {"typo": "coleccion", "tabs": [
        {"url": "https://x.com/i/bookmarks", "n": 2, "posts": [
            {"url": "https://x.com/a/status/1", "author": "Ana | @ana", "text": "sobre memoria de agentes", "date": "2026-10-19T10:00:00Z"},
            {"url": "https://x.com/b/status/2", "author": "Beto | @beto", "text": "hilos de orquestación", "date": "2026-10-19T11:00:00Z"},
        ]},
        {"url": "https://x.com/home", "n": 1, "posts": [
            {"url": "https://x.com/c/status/3", "author": "Cid | @cid", "text": "lo del FYP de hoy", "date": "2026-10-19T12:00:00Z"},
        ]},
    ]}
    ruta = tmp_path / "x.json"
    ruta.write_text(json.dumps(bruto), encoding="utf-8")
    h = _home(tmp_path)
    eventos = eventos_de_x(json.loads(ruta.read_text()))
    assert {e.source for e in eventos} == {"x:bookmarks", "x:fyp"}
    assert all(e.kind == "doc" for e in eventos) and all(e.trust == 0.2 for e in eventos)
    assert any("Orquestación".lower() in e.text.lower() or "orquestación" in e.text for e in eventos)
    assert h.ingest(eventos) == 3
    hits = h.hippo.recall("orquestación", k=3, hops=0)
    assert hits and hits[0].event.source.startswith("x:")
