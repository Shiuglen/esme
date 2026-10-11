from daimon.gate import build_server, feedback_tool, recall_tool, remember_tool
from daimon.home import Home
from tests.fakes import fake_encoder


def _home(tmp_path):
    return Home(tmp_path, encoder=fake_encoder(32))


def test_remember_y_recall(tmp_path):
    h = _home(tmp_path)
    rid = remember_tool(h, "Decidimos usar Laya por defecto porque es gratis")
    assert len(rid) == 16
    out = recall_tool(h, "¿qué decidimos sobre Laya?", 500)
    assert "Laya" in out and rid in out
    h2 = _home(tmp_path)                    # persiste entre procesos
    assert "Laya" in recall_tool(h2, "Laya", 500)


def test_recall_sin_memoria(tmp_path):
    assert recall_tool(_home(tmp_path), "algo", 500) == "Sin recuerdos relevantes."


def test_remember_rechaza_firme(tmp_path):
    h = _home(tmp_path)
    assert remember_tool(h, "notas de FirmeDigital").startswith("rechazado")
    assert len(h.hippo) == 0


def test_remember_redacta(tmp_path):
    h = _home(tmp_path)
    remember_tool(h, "la clave es sk-ant-api03-ABCDEFGHIJKLMNOP")
    assert "sk-ant" not in h.hippo.events()[0].text


def test_feedback_ok(tmp_path):
    h = _home(tmp_path)
    rid = remember_tool(h, "Arc paga 500 USDC")
    recall_tool(h, "Arc USDC", 500)
    w0 = h.thalamus.w.copy()
    assert feedback_tool(h, [rid], True, "Arc USDC") == "ok"
    assert (h.thalamus.w != w0).any() and (tmp_path / "thalamus.npy").exists()


def test_servidor_expone_herramientas(tmp_path):
    import asyncio
    srv = build_server(_home(tmp_path))
    names = {t.name for t in asyncio.run(srv.list_tools())}
    assert names == {"recall", "remember", "feedback"}
