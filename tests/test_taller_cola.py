"""Pruebas de la puerta del Taller: los encargos que llegan de fuera.

Lo que se comprueba es lo que el usuario ve: la cola guarda lo que entra con su
hora y su origen, caduca a las 24 h, no deja inundar (5 por hora) y, sobre todo,
**nunca crea una tarea**: aquí sólo se espera, y la decisión es del creador.
"""
from daimon.home import Home
from daimon.taller_cola import ErrPuerta, entrar, limpiar, pendientes, responder
from tests.fakes import fake_encoder


def _home(tmp_path) -> Home:
    enc, dim = fake_encoder(32)
    return Home(tmp_path / "mente", encoder=(enc, dim))


def test_lo_que_entra_queda_pendiente_con_su_hora_y_su_origen(tmp_path):
    h = _home(tmp_path)
    x = entrar(h, "Repasa los enlaces rotos del blog y anótalos en una lista.", ahora=1000.0)
    assert x["estado"] == "pendiente"
    assert x["ts"] == 1000.0
    assert x["origen"] == "fuera"
    assert x["id"].startswith("enc-")
    assert pendientes(h, ahora=1001.0) == [x]


def test_sin_titulo_saca_la_primera_linea(tmp_path):
    h = _home(tmp_path)
    x = entrar(h, "Primera línea: el título.\nY el resto es el cuerpo del encargo.", ahora=1000.0)
    assert x["titulo"] == "Primera línea: el título."


def test_un_encargo_tonto_no_entra(tmp_path):
    h = _home(tmp_path)
    for malo in ({}, {"texto": "pequeño"}):
        try:
            entrar(h, malo.get("texto", None), ahora=1000.0)
            assert False, "tenía que negarse"
        except ErrPuerta:
            pass


def test_un_encargo_que_no_es_texto_no_entra(tmp_path):
    h = _home(tmp_path)
    try:
        entrar(h, 12345, ahora=1000.0)
        assert False, "tenía que negarse"
    except ErrPuerta:
        pass


def test_el_encargo_largo_se_encaja_al_tope_del_taller(tmp_path):
    h = _home(tmp_path)
    try:
        entrar(h, "x" * (20_000 + 1), ahora=1000.0)
        assert False, "tenía que negarse"
    except ErrPuerta as e:
        assert "tope del Taller" in str(e)


def test_la_puerta_no_inunda_cinco_por_hora(tmp_path):
    h = _home(tmp_path)
    texto = "Revisa las estadísticas de la web de anoche y deja el resumen anotado."
    for i in range(5):
        entrar(h, f"{texto} (parte {i})", ahora=1000.0 + i)
    try:
        entrar(h, texto + " (parte 6)", ahora=1010.0)
        assert False, "la hora estaba llena"
    except ErrPuerta as e:
        assert "llena" in str(e)


def test_un_encargo_de_hace_25_horas_no_se_cuenta_como_pendiente(tmp_path):
    h = _home(tmp_path)
    entrar(h, "Repasa los enlaces rotos del blog y anótalos en una lista.", ahora=1000.0)
    assert pendientes(h, ahora=1000.0 + 25 * 3600) == []


def test_lo_que_se_va_aceptando_deja_de_esperar(tmp_path):
    h = _home(tmp_path)
    x = entrar(h, "Repasa los enlaces rotos del blog y anótalos en una lista.", ahora=1000.0)
    r = responder(h, x["id"], "aceptado", ahora=1050.0)
    assert r["estado"] == "aceptado"
    assert r["respondido"] == 1050.0
    assert pendientes(h, ahora=1050.0) == []


def test_los_que_ya_respondiste_no_se_responden_dos_veces(tmp_path):
    h = _home(tmp_path)
    x = entrar(h, "Repasa los enlaces rotos del blog y anótalos en una lista.", ahora=1000.0)
    responder(h, x["id"], "rechazado", ahora=1050.0)
    try:
        responder(h, x["id"], "aceptado", ahora=1060.0)
        assert False, "ya tenía respuesta"
    except ErrPuerta:
        pass


def test_un_id_que_no_existe_se_dice_de_verdad(tmp_path):
    h = _home(tmp_path)
    try:
        responder(h, "enc-que-no-es", "aceptado", ahora=1000.0)
        assert False, "tenía que negarse"
    except ErrPuerta as e:
        assert "ningún encargo" in str(e)


def test_la_decision_no_es_una_palabra_cualquiera(tmp_path):
    h = _home(tmp_path)
    x = entrar(h, "Repasa los enlaces rotos del blog y anótalos en una lista.", ahora=1000.0)
    try:
        responder(h, x["id"], "quizá", ahora=1050.0)
        assert False, "una decisión de ésas no existe"
    except ErrPuerta:
        x


def test_la_limpieza_suelta_lo_resuelto_y_deja_lo_pendiente(tmp_path):
    h = _home(tmp_path)
    a = entrar(h, "Repasa los enlaces rotos del blog y anótalos en una lista.", ahora=1000.0)
    b = entrar(h, "Prepara el resumen de ventas de la semana y guárdalo anotado.", ahora=1010.0)
    responder(h, a["id"], "aceptado", ahora=1020.0)
    limpiar(h, ahora=1030.0)
    fuera = pendientes(h, ahora=1030.0)
    assert [x["id"] for x in fuera] == [b["id"]]


def test_lo_que_caduca_lo_guarda_la_limpieza_fuera(tmp_path):
    h = _home(tmp_path)
    entrar(h, "Repasa los enlaces rotos del blog y anótalos en una lista.", ahora=1000.0)
    limpiar(h, ahora=1000.0 + 25 * 3600)
    assert pendientes(h, ahora=1000.0 + 25 * 3601) == []
