import json

import pytest
from starlette.testclient import TestClient

from daimon.home import Home
from daimon.server import create_app
from tests.fakes import fake_encoder

TOKEN = "t0k3n"
H = {"Authorization": f"Bearer {TOKEN}"}


@pytest.fixture
def ctx(tmp_path):
    home = Home(tmp_path, encoder=fake_encoder(32))
    app, bus = create_app(home, TOKEN, allowed_hosts=["testserver"])
    with TestClient(app) as c:
        yield c, bus, home


def test_sin_token_401(ctx):
    c, _, _ = ctx
    assert c.get("/health").status_code == 401
    assert c.post("/mcp", json={}).status_code == 401
    assert c.get("/events").status_code == 401


def test_origin_ajeno_403(ctx):
    c, _, _ = ctx
    assert c.get("/health", headers={**H, "Origin": "https://evil.example"}).status_code == 403
    assert c.get("/health", headers={**H, "Origin": "http://localhost:5173"}).status_code == 200


def test_remember_recall_evento(ctx):
    c, bus, _ = ctx
    rid = c.post("/remember", json={"text": "Las auditorías cuestan 79 179 y 299 dólares"}, headers=H).json()["id"]
    r = c.post("/recall", json={"query": "auditorías cuestan", "budget": 500, "who": "chat"}, headers=H).json()
    assert rid in r["ids"] and "79" in r["context"] and r["abstained"] is False
    ev = bus.history[-1]
    assert ev["type"] == "recall" and ev["who"] == "chat" and rid in ev["ids"]


def test_memoria_dni_y_olvido(ctx):
    c, _, _ = ctx
    rid = c.post("/remember", json={"text": "dato privado que olvidar"}, headers=H).json()["id"]
    m = c.get(f"/memory/{rid}", headers=H).json()
    assert m["text"] == "dato privado que olvidar" and m["source"] == "mcp" and m["trust"] == 1.0
    cert = c.post("/forget", json={"id": rid}, headers=H).json()
    assert cert["forgotten"] == [rid] and len(cert["sha256"]) == 64
    assert c.get(f"/memory/{rid}", headers=H).status_code == 404


def test_busqueda_y_atlas_vacio(ctx):
    c, _, _ = ctx
    assert c.get("/atlas", headers=H).json() == {"points": [], "clusters": []}
    c.post("/remember", json={"text": "receta de arepas"}, headers=H)
    res = c.get("/memories", params={"q": "arepas", "limit": 5}, headers=H).json()
    assert res and "arepas" in res[0]["text"]


def test_ingest_usa_sistema_inmune(ctx, tmp_path):
    c, _, home = ctx
    d = tmp_path / "fuente"; d.mkdir()
    (d / "a.md").write_text("# Nota\n\nUna idea normal sobre Daimon.\n")
    (d / "FirmeDigital.md").write_text("# Secreto\n\nNo debe entrar.\n")
    n = c.post("/ingest", json={"paths": [str(d)]}, headers=H).json()["added"]
    assert n == 1 and not any("Secreto" in e.text for e in home.hippo.events())


def test_mcp_lista_herramientas(ctx):
    c, _, _ = ctx
    hdr = {**H, "Accept": "application/json, text/event-stream", "Content-Type": "application/json"}
    init = {"jsonrpc": "2.0", "id": 1, "method": "initialize",
            "params": {"protocolVersion": "2025-06-18", "capabilities": {}, "clientInfo": {"name": "test", "version": "0"}}}
    r = c.post("/mcp", json=init, headers=hdr)
    assert r.status_code == 200
    r = c.post("/mcp", json={"jsonrpc": "2.0", "id": 2, "method": "tools/list", "params": {}}, headers=hdr)
    names = {t["name"] for t in r.json()["result"]["tools"]}
    assert names == {"recall", "remember", "feedback"}


def test_sin_busqueda_devuelve_lo_mas_reciente(ctx):
    c, _, _ = ctx
    for t in ["primero que aprendí", "segundo que aprendí", "lo último que aprendí"]:
        c.post("/remember", json={"text": t}, headers=H)
    res = c.get("/memories", params={"limit": 2}, headers=H).json()
    assert [r["text"] for r in res] == ["lo último que aprendí", "segundo que aprendí"]
