"""Lo que la mente aprende del equipo: cada veredicto del creador es una lección que no se olvida."""
from daimon.equipo import aprender, lecciones


def test_sin_veredictos_no_se_inventa_nada():
    assert lecciones({"veredictos": [], "tareas": []}) == []
    assert lecciones({}) == []


def test_cuenta_los_aciertos_de_cada_motor():
    datos = {"veredictos": [
        {"ts": 1, "motor": "opencode", "modelo": "opencode/glm", "exito": True},
        {"ts": 2, "motor": "opencode", "modelo": "opencode/glm", "exito": True},
        {"ts": 3, "motor": "opencode", "modelo": "opencode/glm", "exito": False},
        {"ts": 4, "motor": "qwen-code", "modelo": "qwen/coder", "exito": False},
    ]}
    textos = lecciones(datos)
    assert any("opencode te quedaste 2 de 3" in t for t in textos)
    assert any("qwen-code no te quedaste ninguna de las 1" in t for t in textos)


def test_cuenta_lo_que_se_rompe_una_y_otra_vez():
    datos = {"veredictos": [{"ts": 1, "motor": "qwen-code", "modelo": None, "exito": False}],
             "tareas": [
                 {"id": "a", "motor": "qwen-code", "estado": "error", "error": "Authentication required"},
                 {"id": "b", "motor": "qwen-code", "estado": "error", "error": "Authentication required"},
                 {"id": "c", "motor": "qwen-code", "estado": "error", "error": "Internal error"},
             ]}
    textos = lecciones(datos)
    assert any("se rompió 2 veces con «Authentication required»" in t for t in textos)
    # lo que pasó una vez sola no se cuenta: es ruido
    assert not any("Internal error" in t for t in textos)


def test_lo_que_se_guarda_es_un_recuerdo_por_contenido():
    """La misma lección no se guarda dos veces: el id es por contenido."""
    from daimon.equipo import _id
    a = _id("Del equipo: con opencode te quedaste 2 de 3 tareas que te dio por buenas.")
    b = _id("del equipo: con opencode te quedaste 2 de 3 tareas que te dio por buenas.")
    assert a == b
    assert a != _id("otra cosa")


def test_aprender_devuelve_el_informe(tmp_path):
    from daimon.home import Home
    home = Home(tmp_path / "mente")
    informe = aprender(home, {"veredictos": [{"ts": 1, "motor": "opencode", "modelo": "m", "exito": True}]})
    assert informe["lecciones"] == 1
    assert informe["ids"] and informe["texto"]
    # la lección quedó en la mente (es un recuerdo de verdad)
    textos = [e.text for e in home.hippo.events()]
    assert any("te quedaste 1 de 1" in t for t in textos)
