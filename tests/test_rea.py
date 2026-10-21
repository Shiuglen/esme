"""REA: entender un programa para que la mente lo sepa.

Estos tests fijan el contrato del espejo: lo que REA vio entra en la memoria con su procedencia,
lo que no se pudo ver también entra (es la mitad del conocimiento), y el informe no inventa nada
que no esté en la evidencia.
"""
import json
import subprocess
from pathlib import Path

import pytest

from daimon import rea
from daimon.gate import build_server
from daimon.home import Home
from tests.fakes import fake_encoder


# ── una evidencia pequeña y de mentira (pero con la forma real) ─────────────────────────────────

def _evidencia() -> dict:
    return {
        "evidence_id": "ev_123",
        "subject": {"name": "main", "local_path": "/tmp/app/out/main",
                    "digest": {"sha256": "a" * 64}, "format": "directory"},
        "confidence": "derived",
        "authority": "shipped-artifact",
        "limitations": ["Graph coverage is incomplete; unavailable facts remain explicit."],
        "normalized_result": {
            "summary": {
                "browser_windows": 2,
                "explicit_web_preferences": 4,
                "sender_validation_observations": 0,
                "ipc": {"literal_channels": 2, "main_handlers": 2, "dynamic_channel_operations": 0,
                       "paired_renderer_transmissions": 0, "unpaired_literal_renderer_transmissions": 0},
            },
            "statistics": {"relevant_files": 1, "parsed_javascript_files": 1, "skipped_javascript_files": 0,
                           "parse_failures": 0, "visited_ast_nodes": 100, "findings": 3, "text_bytes_read": 10},
            "graph": {
                "nodes": [
                    {"kind": "ipc-channel", "node_id": "n1", "observations": [
                        {"label": "hilos:buscar", "properties": {"channel": "hilos:buscar", "mode": "handle", "resolution": "literal"},
                         "evidence": {"location": {"available": True, "value": {"kind": "source-range", "source": "index.js",
                                                                             "start": {"line": 12, "column": 1}}}}}]},
                    {"kind": "ipc-channel", "node_id": "n2", "observations": [
                        {"label": "mente:recordar", "properties": {"channel": "mente:recordar", "mode": "handle", "resolution": "literal"},
                         "evidence": {"location": {"available": True, "value": {"kind": "source-range", "source": "index.js",
                                                                             "start": {"line": 30, "column": 1}}}}}]},
                    {"kind": "browser-window", "node_id": "w1", "observations": [
                        {"label": "BrowserWindow", "properties": {"source_path": "index.js", "options_status": "object-literal",
                                                                 "web_preferences": [{"name": "contextIsolation", "value": {"status": "literal", "value": True}}]},
                         "evidence": {"location": {"available": True, "value": {"kind": "source-range", "source": "index.js",
                                                                             "start": {"line": 90, "column": 1}}}}}]},
                ],
                "edges": [],
                "coverage": {"status": "partial", "truncated": False, "limits": []},
                "limitations": [],
            },
            "semantic_graph": {
                "nodes": [
                    {"kind": "function", "node_id": "f1", "label": None, "properties": {"name": "leerConfig"},
                     "identity": {"module_path": "index.js", "source_range": {"start": {"line": 5, "column": 1}}},
                     "evidence": {}},
                    {"kind": "function", "node_id": "f2", "label": "ayuda", "properties": {},
                     "identity": {"module_path": "index.js", "source_range": {"start": {"line": 7, "column": 1}}},
                     "evidence": {}},
                    {"kind": "binding", "node_id": "b1", "identity": {"module_path": "index.js"}, "properties": {}, "evidence": {}},
                ],
                "relations": [
                    {"source_node_id": "b1", "target_node_id": "f1", "relation": "calls", "resolution": "resolved", "properties": {}, "evidence": {}},
                    {"source_node_id": "b1", "target_node_id": "f2", "relation": "calls", "resolution": "resolved", "properties": {}, "evidence": {}},
                    {"source_node_id": "b1", "target_node_id": "f1", "relation": "calls", "resolution": "resolved", "properties": {}, "evidence": {}},
                ],
                "unknowns": [
                    {"node_id": "u1", "family": "call-flow", "reason": "dynamic-call", "detail": "Unsupported MemberExpression call target.",
                     "evidence": {"location": {"available": True, "value": {"kind": "source-range", "source": "index.js", "start": {"line": 40, "column": 1}}}}},
                    {"node_id": "u2", "family": "call-flow", "reason": "dynamic-call", "detail": "Unsupported MemberExpression call target.",
                     "evidence": {}},
                ],
                "coverage": {"status": "partial", "truncated": True, "limits": [{"name": "semantic_graph_node_ceiling", "value": 100000}]},
                "limitations": [],
            },
        },
    }


def _home(tmp_path):
    return Home(tmp_path, encoder=fake_encoder(32))


# ── el informe ─────────────────────────────────────────────────────────────────────────────────

def test_el_informe_dice_lo_que_vio():
    txt = rea.informe(_evidencia(), motivo="prueba")
    assert "`hilos:buscar`" in txt and "`mente:recordar`" in txt
    assert "index.js:12" in txt
    assert "leerConfig" in txt
    assert "contextIsolation=True" in txt
    assert "prueba" in txt                      # el motivo queda escrito


def test_el_informe_dice_tambien_lo_que_no_se_pudo_ver():
    """La mitad del conocimiento: los huecos, con su razón y su cantidad."""
    txt = rea.informe(_evidencia())
    assert "Lo que NO se pudo ver" in txt
    assert "dynamic-call" in txt
    assert "2" in txt.split("Desconocidos totales:")[1][:20]
    assert "Graph coverage is incomplete" in txt   # los límites de REA, sin parafrasear


def test_el_informe_no_inventa_lo_que_no_esta():
    ev = _evidencia()
    txt = rea.informe(ev)
    assert "canal-que-no-existe" not in txt
    assert "99 canales" not in txt


def test_un_canal_que_aparece_dos_vezes_cuenta_una():
    """El mismo canal lo ve el proceso principal y el renderer: contarlo dos veces sería mentir."""
    ev = _evidencia()
    ev["normalized_result"]["graph"]["nodes"].append({
        "kind": "ipc-channel", "node_id": "n1bis", "observations": [
            {"label": "hilos:buscar", "properties": {"channel": "hilos:buscar", "mode": "emit", "resolution": "literal"},
             "evidence": {}}]})
    txt = rea.informe(ev)
    frase = txt.split("## En una frase")[1].split("##")[0]
    assert "2 canales vistos" in frase
    assert txt.count("| `hilos:buscar` |") == 1


def test_los_numeros_son_los_de_la_evidencia():
    txt = rea.informe(_evidencia())
    frase = txt.split("## En una frase")[1].split("##")[0]
    assert "2 ventanas" in frase
    assert "2 canales IPC" in frase
    assert "2 funciones" in frase


def test_el_informe_acota_los_canales():
    ev = _evidencia()
    canales = [{"kind": "ipc-channel", "node_id": f"n{i}", "observations": [
        {"label": f"c:{i}", "properties": {"channel": f"c:{i}", "mode": "handle", "resolution": "literal"}, "evidence": {}}]}
        for i in range(300)]
    ev["normalized_result"]["graph"]["nodes"] = canales
    txt = rea.informe(ev)
    assert "c:0" in txt and "c:299" not in txt
    assert "canales más" in txt


# ── el comando ─────────────────────────────────────────────────────────────────────────────────

def test_analizar_avisa_si_el_programa_no_existe(tmp_path):
    with pytest.raises(rea.ErrorRea, match="no existe"):
        rea.analizar(tmp_path / "no-esta")


def test_analizar_avisa_si_no_es_un_programa(tmp_path):
    f = tmp_path / "notas.txt"
    f.write_text("hola")
    with pytest.raises(rea.ErrorRea, match="no es un programa"):
        rea.analizar(f)


def test_analizar_usa_rea_con_la_version_fijada(tmp_path, monkeypatch):
    """La versión se fija: REA publica deprisa y una versión nueva puede romper el análisis."""
    app = tmp_path / "out"
    app.mkdir()
    (app / "index.js").write_text("console.log(1)")
    visto = {}

    def falso(cmd, **kwargs):
        visto["cmd"] = cmd
        return subprocess.CompletedProcess(cmd, 0, stdout=json.dumps(_evidencia()), stderr="")

    monkeypatch.setattr(rea.subprocess, "run", falso)
    ev = rea.analizar(app)
    assert ev["evidence_id"] == "ev_123"
    assert visto["cmd"][0] in ("rea", "npx")
    if visto["cmd"][0] == "npx":
        assert f"rea-agents@{rea.VERSION}" in visto["cmd"]
    assert "--format" in visto["cmd"] and "json" in visto["cmd"]


def test_analizar_explica_el_fallo_de_rea(tmp_path, monkeypatch):
    app = tmp_path / "out"
    app.mkdir()
    monkeypatch.setattr(rea.subprocess, "run",
                        lambda cmd, **k: subprocess.CompletedProcess(cmd, 1, stdout="", stderr="boom"))
    with pytest.raises(rea.ErrorRea, match="boom"):
        rea.analizar(app)


# ── la absorción ───────────────────────────────────────────────────────────────────────────────

def test_ingerir_deja_el_conocimiento_con_su_procedencia(tmp_path):
    h = _home(tmp_path)
    r = rea.ingerir(h, _evidencia(), "/tmp/app/out/main", motivo="porque sí")
    assert r["added"] > 0
    assert r["fuente"].startswith("rea:")
    fuentes = {e.source for e in h.hippo.events()}
    assert fuentes == {r["fuente"]}
    assert Path(r["informe"]).exists()


def test_reabsorber_actualiza_en_vez_de_duplicar(tmp_path):
    """La misma fuente entra otra vez: lo que cambió se actualiza, lo que no, se queda."""
    h = _home(tmp_path)
    ev = _evidencia()
    primero = rea.ingerir(h, ev, "/tmp/app/out/main")
    segundo = rea.ingerir(h, ev, "/tmp/app/out/main")
    assert segundo["fuente"] == primero["fuente"]
    assert len(h.hippo) == len({e.id for e in h.hippo.events()})


def test_cada_recuerdo_sabe_de_que_apartado_viene(tmp_path):
    """Sin el título del apartado, una fila suelta no sabe de qué es: la mente no la encuentra."""
    h = _home(tmp_path)
    rea.ingerir(h, _evidencia(), "/tmp/app/out/main")
    textos = [e.text for e in h.hippo.events()]
    assert any(t.startswith("La superficie: los canales IPC.") for t in textos)
    assert any("hilos:buscar" in t and "La superficie" in t for t in textos)


def test_la_mente_recuerda_lo_absorbido(tmp_path):
    """Lo absorbido se puede preguntar después: para eso sirve."""
    h = _home(tmp_path)
    rea.ingerir(h, _evidencia(), "/tmp/app/out/main", motivo="porque sí")
    from daimon.gate import recall_tool
    salida = recall_tool(h, "canales IPC", 800)
    assert "hilos:buscar" in salida


# ── la puerta: el agente lo llama ───────────────────────────────────────────────────────────────

def test_la_herramienta_mcp_absorbe_un_programa(tmp_path, monkeypatch):
    monkeypatch.setattr(rea, "analizar", lambda ruta, **k: _evidencia())
    h = _home(tmp_path)
    srv = build_server(h)
    import asyncio
    res = asyncio.run(srv.call_tool("esme_absorbe_programa", {"ruta": "/tmp/app/out/main", "motivo": "curiosidad"}))
    texto = str(res)
    assert '"added"' in texto
    assert any(e.source.startswith("rea:") for e in h.hippo.events())


def test_la_herramienta_explica_cuando_rea_no_puede(tmp_path, monkeypatch):
    def falla(ruta, **k):
        raise rea.ErrorRea("no existe el programa")
    monkeypatch.setattr(rea, "analizar", falla)
    h = _home(tmp_path)
    srv = build_server(h)
    import asyncio
    res = asyncio.run(srv.call_tool("esme_absorbe_programa", {"ruta": "/nada"}))
    assert "no pudo analizar" in str(res)
