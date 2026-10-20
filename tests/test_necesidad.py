"""Pruebas de lo que falta: las herramientas que el equipo echa de menos.

Lo que se comprueba es lo que el usuario ve: la lista de herramientas que la mente
deduce, y la regla de que no propone por tontería (un fallo de red no es una
herramienta que falte, y una herramienta que ya tienes no se vuelve a proponer).
"""
from daimon.home import Home
from daimon.ingest import Event
from daimon.necesidad import detectar, necesidad_de
from tests.fakes import fake_encoder


def _home(tmp_path) -> Home:
    enc, dim = fake_encoder(32)
    return Home(tmp_path / "mente", encoder=(enc, dim))


def _fallo(error: str, motor: str = "opencode", id: str = "t1") -> dict:
    return {"id": id, "error": error, "motor": motor, "estado": "error"}


def test_un_fallo_que_se_repite_pide_herramienta():
    fallos = [_fallo("command not found: pdftotext", id="t1"),
              _fallo("command not found: pdftotext", id="t2")]
    props = detectar(fallos)
    assert len(props) == 1
    assert props[0].veces == 2
    assert props[0].herramienta == "pdftotext"
    assert "pdftotext" in props[0].titulo


def test_un_fallo_una_sola_vez_no_propone():
    """Una vez es un día malo, no una capacidad que falta."""
    fallos = [_fallo("command not found: pdftotext", id="t1")]
    assert detectar(fallos) == []


def test_los_fallos_de_red_no_son_herramientas():
    """La red se cae; eso no se arregla fabricando una herramienta."""
    for error in ["ETIMEDOUT connecting to api", "429 rate limit exceeded",
                  "ENOTFOUND api.example.com", "out of memory"]:
        props = detectar([_fallo(error, id="t1"), _fallo(error, id="t2")])
        assert props == [], error


def test_lo_que_ya_tienes_no_se_vuelve_a_proponer():
    fallos = [_fallo("command not found: pdftotext", id="t1"),
              _fallo("command not found: pdftotext", id="t2")]
    assert detectar(fallos, herramientas=["pdftotext"]) == []


def test_fallos_distintos_no_se_juntan():
    """Dos errores que no son el mismo son dos problemas, no uno repetido."""
    fallos = [_fallo("command not found: pdftotext", id="t1"),
              _fallo("no such file: qpdf", id="t2"),
              _fallo("module not found: fitz", id="t3")]
    assert detectar(fallos) == []


def test_el_mismo_fallo_con_ruido_distinto_es_el_mismo():
    """Las rutas y los números cambian; el fallo es el mismo."""
    fallos = [_fallo("no such file: /home/sakai/proyecto/bin/pdftotext", id="t1"),
              _fallo("no such file: /tmp/otro/bin/pdftotext", id="t2")]
    props = detectar(fallos)
    assert len(props) == 1
    assert props[0].veces == 2


def test_los_motores_se_saben():
    fallos = [_fallo("command not found: pdftotext", motor="opencode", id="t1"),
              _fallo("command not found: pdftotext", motor="cline", id="t2")]
    props = detectar(fallos)
    assert props[0].motores == ["cline", "opencode"]


def test_la_mente_ve_los_fallos_que_guardo_el_equipo(tmp_path):
    """El fallo crudo tiene que estar en la memoria: si no, no hay nada que deducir."""
    h = _home(tmp_path)
    from daimon.equipo import aprender
    aprender(h, {"tareas": [
        {"id": "t1", "motor": "opencode", "modelo": "m", "estado": "error",
         "error": "command not found: pdftotext", "encargo": "extrae el texto del PDF"},
        {"id": "t2", "motor": "opencode", "modelo": "m", "estado": "error",
         "error": "command not found: pdftotext", "encargo": "extrae el texto del PDF"},
    ], "veredictos": []})
    guardados = [e for e in h.hippo.events() if e.text.startswith("fallo")]
    assert len(guardados) == 2
    salida = necesidad_de(h)
    assert salida["total"] == 1
    assert salida["necesidades"][0]["herramienta"] == "pdftotext"


def test_una_mente_sana_no_inventa_necesidades(tmp_path):
    h = _home(tmp_path)
    salida = necesidad_de(h)
    assert salida["total"] == 0
    assert salida["necesidades"] == []
