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


def test_remember_no_duplica_variantes(tmp_path):
    """La misma frase con otros espacios o mayúsculas ya no crea dos recuerdos."""
    h = _home(tmp_path)
    a = remember_tool(h, "El servidor corre en Linux")
    b = remember_tool(h, "el   servidor corre en linux")
    assert a == b and len(h.hippo) == 1


def test_remember_conserva_el_tipo(tmp_path):
    """Antes un tipo desconocido se forzaba a «note» y se perdía el matiz."""
    h = _home(tmp_path)
    remember_tool(h, "Adoptamos Postgres", kind="decision")
    assert h.hippo.events()[0].kind == "decision"


def test_recall_toma_el_presupuesto_de_la_mente(tmp_path):
    """Sin budget explícito, la mente usa el suyo (configurable)."""
    import json
    (tmp_path / "config.json").write_text(json.dumps({"presupuesto": 400}), encoding="utf-8")
    h = _home(tmp_path)
    remember_tool(h, "Laya decide sin coste y sin llamadas de pago")
    out = recall_tool(h, "Laya decide")
    assert "Laya" in out
    assert len(out) < 400 * 4 * 2          # respeta el presupuesto de la mente


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
    remember_tool(h, "Qloo da hasta 15000 dolares en premios")
    recall_tool(h, "Arc USDC", 500)
    w0 = h.thalamus.w.copy()
    assert feedback_tool(h, [rid], True, "Arc USDC") == "ok"
    assert (h.thalamus.w != w0).any() and (tmp_path / "pesos.npz").exists()
    # Con otra consulta, la señal sigue valiendo: los ids son la verdad, no la frase.
    assert feedback_tool(h, [rid], True, "consulta nunca vista") == "ok"
    # Sin ningún id que se haya compuesto, no hay nada que aprender: eso sí es «sin efecto».
    assert feedback_tool(h, ["id-que-nunca-existio"], True, "consulta nunca vista").startswith("sin efecto")


def test_servidor_expone_herramientas(tmp_path):
    import asyncio
    srv = build_server(_home(tmp_path))
    names = {t.name for t in asyncio.run(srv.list_tools())}
    # La memoria (recall/remember/feedback) y el navegador: la web de verdad, para cualquier agente.
    assert {"recall", "remember", "feedback"} <= names
    assert {"navegar", "clic_en_la_pagina", "escribir_en_la_pagina"} <= names
    # La sesión de arranque: la memoria entra sola con una llamada, sin proxy.
    assert "sesion" in names


def test_el_servidor_declara_el_protocolo(tmp_path):
    """Las «instructions» del servidor MCP son la vía barata para que la memoria se use sola."""
    import asyncio
    srv = build_server(_home(tmp_path))
    inst = getattr(srv, "instructions", "") or ""
    for paso in ("sesion", "recall", "remember", "feedback"):
        assert paso in inst


def test_sesion_abre_con_el_rumbo_y_el_contexto(tmp_path):
    """El pack de arranque: para qué trabaja la mente, qué sabe de tu tarea y cómo usarla."""
    from daimon import rumbo as rumbo_mod
    from daimon.sesion import pack_de_arranque
    h = _home(tmp_path)
    rumbo_mod.escribe(tmp_path, {"pilares": [{"texto": "Esme de otro mundo"}],
                                 "objetivos": [{"texto": "Escalar Esme", "estado": "activo"}]})
    remember_tool(h, "Arc paga 500 USDC")
    pack = pack_de_arranque(h, "Arc USDC")
    assert "Escalar Esme" in pack          # el rumbo
    assert "500" in pack                    # el contexto de la tarea
    assert "recordar" in pack or "remember" in pack   # el protocolo
    # Sin rumbo, el pack sigue siendo válido: no se rompe por no tener dirección.
    assert "Escalar Esme" not in pack_de_arranque(_home(tmp_path / "otra"), "lo que sea")


def test_sesion_a_traves_del_servidor(tmp_path):
    import asyncio
    h = _home(tmp_path)
    remember_tool(h, "Los cursos cuestan 79, 179 y 299 dólares")
    srv = build_server(h)
    res = asyncio.run(srv.call_tool("sesion", {"tarea": "precio de los cursos"}))
    text = str(res)
    assert "79" in text and "Error" not in text


def test_home_lee_config(tmp_path):
    import json
    (tmp_path / "config.json").write_text(json.dumps({"mmr_lambda": 1.0, "max_drop": 1.3, "min_dense": 0.5,
                                                     "query_prefix": "Q: ", "doc_prefix": "D: "}))
    h = _home(tmp_path)
    th = h.thalamus
    assert (th.mmr_lambda, th.max_drop, th.min_dense) == (1.0, 1.3, 0.5)
    assert (h.lens.query_prefix, h.lens.doc_prefix) == ("Q: ", "D: ")


def test_dimension_incompatible(tmp_path):
    import pytest
    h = _home(tmp_path)
    remember_tool(h, "algo que recordar")
    with pytest.raises(ValueError, match="codificador"):
        Home(tmp_path, encoder=fake_encoder(16))


def test_recall_a_traves_del_servidor(tmp_path):
    import asyncio
    h = _home(tmp_path)
    remember_tool(h, "Las auditorías cuestan 79, 179 y 299 dólares")
    srv = build_server(h)
    res = asyncio.run(srv.call_tool("recall", {"query": "precio auditorías", "budget": 500}))
    text = str(res)
    assert "79" in text and "Error" not in text
