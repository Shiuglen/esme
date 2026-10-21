import json

import pytest
from starlette.testclient import TestClient

from daimon.home import Home
from daimon.server import create_app
from tests.fakes import fake_encoder

TOKEN = "t0k3n"
H = {"Authorization": f"Bearer {TOKEN}"}


class _VozFalsa:
    """Voz de mentira: solo para ver que el servidor no recorta lo que le llega."""

    def __init__(self):
        self.dicho = ""

    def oir(self, pcm, idioma="es"):
        return "texto oído"

    def decir(self, texto):
        self.dicho = texto
        return b"RIFF-falso"


@pytest.fixture
def ctx(tmp_path):
    home = Home(tmp_path, encoder=fake_encoder(32))
    app, bus = create_app(home, TOKEN, allowed_hosts=["testserver"])
    with TestClient(app) as c:
        yield c, bus, home


@pytest.fixture
def ctx_voz(tmp_path):
    home = Home(tmp_path, encoder=fake_encoder(32))
    voz = _VozFalsa()
    app, bus = create_app(home, TOKEN, allowed_hosts=["testserver"], voz=voz)
    with TestClient(app) as c:
        yield c, bus, home, voz


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


def test_recall_toma_el_presupuesto_de_la_mente(ctx):
    """Sin budget explícito, la mente usa el suyo; ya no el 1500 fijo de siempre."""
    c, _, _ = ctx
    c.post("/remember", json={"text": "El informe de auditoría dura 79 páginas y pesa mucho"}, headers=H)
    r = c.post("/recall", json={"query": "informe de auditoría", "who": "chat"}, headers=H).json()
    assert r["ids"] and r["tokens"] > 0
    assert r["tokens"] <= 4000          # el presupuesto por defecto de la mente


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


def test_lo_que_la_mente_sabe_de_un_programa(ctx):
    """La puerta del «recrear»: lo que el espejo dejó de un programa, preguntado por su ruta."""
    from daimon import rea as rea_mod
    c, _, home = ctx
    programa = "/tmp/app/out/main"
    rea_mod.ingerir(home, {"evidence_id": "ev1", "subject": {"name": "main", "local_path": programa},
                           "normalized_result": {"summary": {"ipc": {"literal_channels": 1}}, "graph": {"nodes": []},
                                                 "semantic_graph": {"nodes": [], "unknowns": []}}},
                    programa, motivo="prueba")
    r = c.post("/rea/recuerdos", json={"ruta": programa}, headers=H).json()
    assert r["ok"] and r["fuente"].startswith("rea:")
    assert r["recuerdos"] and any("canales IPC" in t for t in r["recuerdos"])
    # un programa que la mente no conoce: vacío, pero sin error
    vacio = c.post("/rea/recuerdos", json={"ruta": "/otro/programa"}, headers=H).json()
    assert vacio["ok"] and vacio["recuerdos"] == []
    assert c.post("/rea/recuerdos", json={}, headers=H).status_code == 400


def test_comparar_dos_versiones(ctx):
    """La puerta del «qué cambió»: dos absorciones del mismo programa y la comparación."""
    from daimon import rea as rea_mod
    c, _, home = ctx
    programa = "/tmp/app/out/main"
    base = {"evidence_id": "ev1", "subject": {"name": "main", "local_path": programa},
            "normalized_result": {"summary": {"ipc": {"literal_channels": 1}}, "graph": {"nodes": [
                {"kind": "ipc-channel", "observations": [
                    {"label": "hilos:buscar", "properties": {"channel": "hilos:buscar", "mode": "handle"}, "evidence": {}}]}]},
                "semantic_graph": {"nodes": [], "unknowns": []}}}
    otro = json.loads(json.dumps(base))
    otro["normalized_result"]["graph"]["nodes"].append({"kind": "ipc-channel", "observations": [
        {"label": "canal:nuevo", "properties": {"channel": "canal:nuevo", "mode": "handle"}, "evidence": {}}]})
    rea_mod.ingerir(home, base, programa, motivo="A")
    rea_mod.ingerir(home, otro, programa, motivo="B")
    r = c.post("/rea/comparar", json={"ruta": programa}, headers=H).json()
    assert r["ok"] and "`canal:nuevo`" in r["texto"]
    assert any(e.source.startswith("rea:comparacion:") for e in home.hippo.events())
    assert c.post("/rea/comparar", json={}, headers=H).status_code == 400


def test_mcp_lista_herramientas(ctx):
    c, _, _ = ctx
    hdr = {**H, "Accept": "application/json, text/event-stream", "Content-Type": "application/json"}
    init = {"jsonrpc": "2.0", "id": 1, "method": "initialize",
            "params": {"protocolVersion": "2025-06-18", "capabilities": {}, "clientInfo": {"name": "test", "version": "0"}}}
    r = c.post("/mcp", json=init, headers=hdr)
    assert r.status_code == 200
    r = c.post("/mcp", json={"jsonrpc": "2.0", "id": 2, "method": "tools/list", "params": {}}, headers=hdr)
    names = {t["name"] for t in r.json()["result"]["tools"]}
    assert {"recall", "remember", "feedback"} <= names
    assert {"navegar", "clic_en_la_pagina", "escribir_en_la_pagina"} <= names


def test_sin_busqueda_devuelve_lo_mas_reciente(ctx):
    c, _, _ = ctx
    for t in ["primero que aprendí", "segundo que aprendí", "lo último que aprendí"]:
        c.post("/remember", json={"text": t}, headers=H)
    res = c.get("/memories", params={"limit": 2}, headers=H).json()
    assert [r["text"] for r in res] == ["lo último que aprendí", "segundo que aprendí"]


def test_memorias_traemos_muchas_por_defecto(ctx):
    c, _, _ = ctx
    for i in range(205):
        c.post("/remember", json={"text": f"recuerdo número {i}"}, headers=H)
    assert len(c.get("/memories", headers=H).json()) == 200


def test_el_historial_vivo_guarda_muchos_eventos(ctx):
    c, bus, _ = ctx
    assert bus.history.maxlen == 2000


def test_la_cola_del_lector_no_crece_sin_limite():
    """Un lector lento no puede hacer crecer al cerebro: lo que no cabe, se suelta lo viejo."""
    import asyncio

    from daimon.server import EventBus

    async def va():
        bus = EventBus(keep=10, cola=5)
        q: asyncio.Queue = asyncio.Queue(maxsize=bus.cola_max)
        bus._subs.add(q)
        for i in range(50):
            bus._encolar(q, {"n": i})
        return q

    q = asyncio.run(va())
    assert q.qsize() == 5                      # no crece: el tope manda
    assert q.get_nowait()["n"] == 45          # y se queda con lo último, que es lo que interesa


def test_el_texto_que_habla_no_se_recorta(ctx_voz):
    c, _, _, voz = ctx_voz
    largo = "palabra" * 800     # 6 400 caracteres: antes se cortaban a 4 000
    r = c.post("/voz/decir", json={"texto": largo}, headers=H)
    assert r.status_code == 200 and len(voz.dicho) == len(largo)


def test_el_audio_largo_se_acepta(ctx_voz):
    import numpy as np
    c, _, _, _ = ctx_voz
    pcm = np.zeros(16000 * 300, dtype="<f4").tobytes()   # 5 minutos: antes se rechazaba a los 3
    r = c.post("/voz/oir", content=pcm, headers={**H, "Content-Type": "application/octet-stream"})
    assert r.status_code == 200 and r.json()["texto"] == "texto oído"
