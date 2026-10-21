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
