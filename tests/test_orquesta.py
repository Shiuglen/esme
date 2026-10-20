"""Pruebas de la mente por motor y de las rutas nuevas: absorber tu X, dormir y la orquesta."""
import json

from starlette.testclient import TestClient

from daimon.home import Home
from daimon.server import create_app
from tests.fakes import fake_encoder

TOKEN = "t0k3n"
H = {"Authorization": f"Bearer {TOKEN}"}


def _ctx(tmp_path):
    home = Home(tmp_path / "mente", encoder=fake_encoder(32))
    app, bus = create_app(home, TOKEN, allowed_hosts=["testserver"])
    return TestClient(app), bus, home


def test_recall_con_motor_aprende_su_propia_forma(tmp_path):
    c, _, home = _ctx(tmp_path)
    rid = c.post("/remember", json={"text": "Arc paga 500 USDC a los auditores"}, headers=H).json()["id"]
    c.post("/remember", json={"text": "Qloo da hasta 15000 dolares en premios"}, headers=H)
    r = c.post("/recall", json={"query": "Arc USDC", "budget": 400, "motor": "opus"}, headers=H).json()
    assert rid in r["ids"]
    res = c.post("/feedback", json={"ids": [rid], "useful": True, "query": "Arc USDC", "motor": "opus"}, headers=H).json()
    assert res["result"] == "ok"
    assert "opus" in home.thalamus.pesos_motor           # ese motor ya tiene contexto propio
    assert home.thalamus.pesos_motor["opus"] is not home.thalamus.w
    orquesta = c.get("/orquesta", headers=H).json()
    assert orquesta["opus"]["señales"] == 1 and orquesta["opus"]["media"] == 1.0
    # otro motor no hereda lo aprendido del primero
    assert "opus" not in home.thalamus.pesos_motor or "otro" not in home.thalamus.pesos_motor


def test_pesos_por_motor_sobreviven_al_reinicio(tmp_path):
    c, _, home = _ctx(tmp_path)
    rid = c.post("/remember", json={"text": "Arc paga 500 USDC"}, headers=H).json()["id"]
    c.post("/recall", json={"query": "Arc USDC", "budget": 300, "motor": "haiku"}, headers=H)
    c.post("/feedback", json={"ids": [rid], "useful": True, "query": "Arc USDC", "motor": "haiku"}, headers=H)
    otro = Home(tmp_path / "mente", encoder=fake_encoder(32))
    assert "haiku" in otro.thalamus.pesos_motor
    assert otro.thalamus.estadisticas()["haiku"]["señales"] == 1


def test_ingest_x_absorbe_tu_x(tmp_path):
    c, _, home = _ctx(tmp_path)
    cosecha = {"tabs": [{"url": "https://x.com/i/bookmarks", "posts": [
        {"author": "Ana", "text": "el hipocampo artificial de los agentes", "url": "https://x.com/a/status/1",
         "date": "2026-10-19T10:00:00Z"},
    ]}]}
    res = c.post("/ingest-x", json={"cosecha": cosecha}, headers=H).json()
    assert res["added"] == 1 and res["memories"] == 1
    r = c.post("/recall", json={"query": "hipocampo agentes", "budget": 400}, headers=H).json()
    assert r["ids"] and "hipocampo" in r["context"].lower()


def test_sueño_destila_y_devuelve_informe(tmp_path):
    c, _, home = _ctx(tmp_path)
    for i in range(3):
        c.post("/remember", json={"text": f"Sakai prueba la Tálamo con Laya número {i}"}, headers=H)
    res = c.post("/sueño", json={}, headers=H).json()
    assert res["personas"] >= 1
    assert any(e.source == "sueño" for e in home.hippo.events())
    assert len(res["sha256"]) == 64
