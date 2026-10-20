import io
import contextlib
import json
from pathlib import Path

from daimon.cli import main, recall_cmd, remember_cmd


def _mente(tmp_path: Path) -> Path:
    home = tmp_path / "mente"
    home.mkdir()
    (home / "config.json").write_text('{"encoder": "hash:32"}', encoding="utf-8")
    return home


def test_recall_desde_la_terminal(tmp_path):
    home = _mente(tmp_path)
    from daimon.home import Home
    from daimon.ingest import Event
    h = Home(home)
    h.add([Event("id1", "Sakai usa el Taller para revisar la Prueba 0", "t", "note", "2026-10-01T10:00:00Z", 0.8)])
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf):
        main(["recall", "--home", str(home), "Taller"])
    salida = buf.getvalue()
    assert "Prueba 0" in salida
    assert "id1" in salida          # los ids de lo que usó, como en la puerta MCP


def test_remember_desde_la_terminal_devuelve_el_id(tmp_path):
    home = _mente(tmp_path)
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf):
        main(["remember", "--home", str(home), "--kind", "decision", "el examen va con la configuración de la casa"])
    eid = buf.getvalue().strip()
    assert len(eid) == 16
    # lo que se guardó se puede volver a preguntar
    assert "configuración de la casa" in recall_cmd(home, "configuración")
    # y el tipo se conserva tal cual
    from daimon.home import Home
    assert any(e.kind == "decision" and e.id == eid for e in Home(home).hippo.events())


def test_recall_sin_memoria_no_revienta(tmp_path):
    home = tmp_path / "vacia"
    home.mkdir()
    assert "Sin recuerdos" in recall_cmd(home, "lo que sea")
