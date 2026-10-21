"""El banco del espejo: las preguntas se derivan de la evidencia y el número es honesto."""
import json
import sys
from pathlib import Path

import pytest

from daimon.bench import rea as banco
from daimon.home import Home
from tests.fakes import fake_encoder

sys.path.insert(0, str(Path(__file__).resolve().parent))


def _evidencia() -> dict:
    return {
        "evidence_id": "ev1",
        "subject": {"name": "app", "local_path": "/tmp/app/out"},
        "normalized_result": {
            "summary": {"browser_windows": 1, "explicit_web_preferences": 2, "ipc": {"literal_channels": 2, "main_handlers": 2}},
            "statistics": {"parsed_javascript_files": 7, "findings": 5},
            "graph": {"nodes": [
                {"kind": "ipc-channel", "observations": [
                    {"label": "hilos:buscar", "properties": {"channel": "hilos:buscar", "mode": "handle"},
                     "evidence": {"location": {"available": True, "value": {"kind": "source-range", "source": "index.js", "start": {"line": 3}}}}}]},
                {"kind": "ipc-channel", "observations": [
                    {"label": "mente:recordar", "properties": {"channel": "mente:recordar", "mode": "handle"},
                     "evidence": {"location": {"available": True, "value": {"kind": "source-range", "source": "index.js", "start": {"line": 9}}}}}]},
                {"kind": "browser-window", "observations": [
                    {"label": "w", "properties": {"source_path": "index.js", "web_preferences": [
                        {"name": "contextIsolation", "value": {"status": "literal", "value": True}},
                        {"name": "nodeIntegration", "value": {"status": "literal", "value": False}}]},
                     "evidence": {}}]},
            ]},
            "semantic_graph": {
                "nodes": [{"kind": "function", "node_id": "f1", "label": "leerConfig", "properties": {"name": "leerConfig"},
                           "identity": {"module_path": "index.js", "source_range": {"start": {"line": 5}}}, "evidence": {}}],
                "relations": [{"source_node_id": "x", "target_node_id": "f1", "relation": "calls", "resolution": "resolved"}],
                "unknowns": [{"node_id": "u1", "family": "call-flow", "reason": "dynamic-call", "detail": "d", "evidence": {}}],
            },
        },
    }


def _evidencia_nativa() -> dict:
    """La forma de un binario: lo que devuelve REA con su motor nativo."""
    return {
        "evidence_id": "ev_bin",
        "subject": {"name": "programa", "local_path": "/usr/bin/programa", "format": "elf",
                    "architecture": "x86_64", "digest": {"sha256": "b" * 64}},
        "analysis_profile": {"provider": {"id": "rea-workflow", "name": "REA composed investigation workflow",
                                          "version": "1"},
                             "parameters": {"upstream_analysis_profile": {
                                 "provider": {"id": "ghidra", "name": "Ghidra", "version": "12.1.4"}}}},
        "operation": "binary_overview",
        "normalized_result": {"image_base": "0x100000", "segment_count": 33, "procedure_count": 3198,
                              "string_count": 4976, "document": "el texto del motor",
                              "segments": [{"name": ".text", "start": "0x100000", "end": "0x100350",
                                            "length": 848, "address_space": "ram"}]},
        "limitations": ["Derived by an REA composed workflow."],
    }


def _home(tmp_path, name="mente"):
    return Home(tmp_path / name, encoder=fake_encoder(32))


def test_las_preguntas_salen_de_la_evidencia():
    items = banco.preguntas(_evidencia(), "app")
    preguntas = " ".join(i.question for i in items)
    assert "canales IPC" in preguntas
    assert "ventanas" in preguntas
    assert "funciones" in preguntas
    assert "no se pudo ver" in preguntas
    # los hechos clave son cosas que la evidencia dice de verdad
    hechos = [f for i in items for f in i.evidence]
    assert "`hilos:buscar`" in hechos
    assert "contextIsolation=True" in hechos
    assert "`leerConfig`" in hechos


def test_la_recall_de_evidencia_es_un_tanto():
    item = banco.preguntas(_evidencia(), "app")[0]
    completo = " ".join(item.evidence)
    assert banco.recall_de_evidencia(item, completo) == 1.0
    assert banco.recall_de_evidencia(item, "nada de esto") == 0.0


def test_sin_mirar_no_se_sabe_nada_y_mirando_sí(tmp_path):
    """El número del banco: la misma mente, la misma pregunta; sólo cambia la absorción."""
    from daimon import rea as rea_mod
    base = _home(tmp_path, "base")
    espejo = _home(tmp_path, "espejo")
    evidencia = _evidencia()
    rea_mod.ingerir(espejo, evidencia, "/tmp/app/out", motivo="prueba")
    items = banco.preguntas(evidencia, "app")
    filas = banco.mide(base, espejo, items, 1500)
    r = banco.resumen(filas)
    assert r["base_recall"] == 0.0          # sin mirar, la mente no sabe nada del programa
    assert r["espejo_recall"] > 0.5         # mirando, sí
    assert r["mejora"] == pytest.approx(r["espejo_recall"] - r["base_recall"])
    assert len(filas) == len(items)


def test_el_banco_se_guarda(tmp_path):
    destino = tmp_path / "filas.jsonl"
    banco.guarda([{"item_id": "x", "espejo_recall": 1.0}], destino)
    assert json.loads(destino.read_text(encoding="utf-8").strip())["item_id"] == "x"


# ── el banco también pregunta por los binarios ─────────────────────────────────────────────────

def test_el_banco_pregunta_por_un_binario():
    """El instrumento se escala con el espejo: si el espejo mira cualquier programa, el banco
    tiene que saber preguntar por cualquier programa."""
    preguntas = banco.preguntas(_evidencia_nativa(), "programa")
    assert preguntas, "un binario también da preguntas"
    textos = " ".join(p.question for p in preguntas)
    assert "formato" in textos.lower()
    assert "segmentos" in textos.lower()


def test_los_hechos_que_se_miden_estan_de_verdad_en_el_informe():
    """El número del banco sólo vale si lo que se comprueba está en la memoria de verdad."""
    from daimon import rea as rea_mod
    ev = _evidencia_nativa()
    informe = rea_mod.informe(ev)
    for item in banco.preguntas(ev, "programa"):
        assert item.evidence, f"la pregunta «{item.question}» no tiene hechos que comprobar"
        for hecho in item.evidence:
            assert hecho[:60] in informe, f"«{hecho}» no está en el informe"


def test_los_hechos_que_se_miden_estan_en_el_informe_de_una_app():
    from daimon import rea as rea_mod
    ev = _evidencia()
    informe = rea_mod.informe(ev)
    for item in banco.preguntas(ev, "app"):
        for hecho in item.evidence:
            assert hecho[:60] in informe, f"«{hecho}» no está en el informe"


def test_el_informe_nativo_nombra_al_programa_en_cada_apartado():
    """La pregunta lleva el nombre del programa: si el apartado no lo lleva, no se parece a la
    pregunta, y la memoria lo tiene pero no lo devuelve (así se perdió el banco: 0,08)."""
    from daimon import rea as rea_mod
    informe = rea_mod.informe(_evidencia_nativa(), motivo="prueba")
    apartados = [l for l in informe.splitlines() if l.startswith("## ")]
    assert apartados
    for apartado in apartados:
        assert "programa" in apartado, f"el apartado «{apartado}» no nombra al programa"
