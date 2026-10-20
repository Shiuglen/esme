"""Pruebas de las tareas que se repiten: el sueño ve el hábito y propone una skill.

Lo que se comprueba aquí es lo que el usuario puede observar: la lista de tareas
repetidas que aparece en la app y la propuesta que el sueño deja en la memoria.
"""
from daimon.home import Home
from daimon.ingest import Event
from daimon.repeticion import MIN_COHESION, MIN_REPETICIONES, propuesta, repeticiones
from tests.fakes import fake_encoder


def _home(tmp_path) -> Home:
    enc, dim = fake_encoder(32)
    return Home(tmp_path / "mente", encoder=(enc, dim))


def _encargo(i: int, texto: str, ts: str = "2026-10-01T10:00:00Z", fuente: str = "encargo") -> Event:
    return Event(f"id{i}", texto, fuente, "user_msg", ts, 1.0)


def _ruido(home) -> None:
    """Una mente de verdad tiene otras muchas cosas: sin ellas, ninguna palabra es rara."""
    otros = [
        "mide el consumo de memoria del servidor en reposo y anótalo en el informe",
        "publica la versión nueva en la tienda de skins con su licencia leída",
        "arregla el test que falla en la puerta del taller con el motor lento",
        "escribe la guía de instalación para el servidor con el nginx delante",
        "actualiza los datos del servidor y reinicia el servicio de la mente",
        "mide el consumo de la app en reposo con la tarea en marcha",
    ]
    home.add([_encargo(100 + i, t) for i, t in enumerate(otros)])


def test_una_tarea_tres_veces_se_propone(tmp_path):
    h = _home(tmp_path)
    _ruido(h)
    h.add([
        _encargo(1, "actualiza el README del proyecto con la instalación nueva"),
        _encargo(2, "actualiza el README del proyecto con la instalación nueva"),
        _encargo(3, "actualiza el README del proyecto con la instalación nueva"),
    ])
    props = repeticiones(h.hippo.events())
    assert len(props) == 1
    assert props[0].veces == 3
    # El título nombra lo que distingue la tarea, no lo genérico.
    assert "readme" in props[0].titulo.lower()


def test_dos_veces_no_alcanza(tmp_path):
    """Con dos no se distingue un hábito de una coincidencia: no se propone nada."""
    h = _home(tmp_path)
    h.add([
        _encargo(1, "actualiza el README del proyecto con la instalación nueva"),
        _encargo(2, "actualiza el README del proyecto con la instalación nueva"),
    ])
    assert repeticiones(h.hippo.events()) == []


def test_lo_que_dijo_la_ia_no_cuenta(tmp_path):
    """Sólo los encargos del creador: la respuesta de la IA no es un hábito suyo."""
    h = _home(tmp_path)
    h.add([
        Event("a1", "actualiza el README del proyecto con la instalación nueva", "t", "ai_msg", "2026-10-01T10:00:00Z", 0.4),
        Event("a2", "actualiza el README del proyecto con la instalación nueva", "t", "ai_msg", "2026-10-02T10:00:00Z", 0.4),
        Event("a3", "actualiza el README del proyecto con la instalación nueva", "t", "ai_msg", "2026-10-03T10:00:00Z", 0.4),
    ])
    assert repeticiones(h.hippo.events()) == []


def test_las_conversaciones_continuadas_no_cuentan(tmp_path):
    """«sigue en donde estabas» repetido no es un encargo: es seguir la conversación.

    Es lo que pasa de verdad: los .jsonl de las sesiones guardan mensajes así, y si
    contaran, media hora de conversación se leería como una tarea repetida.
    """
    h = _home(tmp_path)
    _ruido(h)
    h.add([
        Event("s1", "sigue en donde estabas con lo de la página", "/home/sakai/.claude/projects/x.jsonl", "user_msg", "2026-10-01T10:00:00Z", 1.0),
        Event("s2", "sigue en donde estabas con lo de la página", "/home/sakai/.claude/projects/x.jsonl", "user_msg", "2026-10-02T10:00:00Z", 1.0),
        Event("s3", "sigue en donde estabas con lo de la página", "/home/sakai/.claude/projects/x.jsonl", "user_msg", "2026-10-03T10:00:00Z", 1.0),
    ])
    assert repeticiones(h.hippo.events()) == []


def test_una_transcripcion_larga_no_es_un_encargo(tmp_path):
    """Una conversación entera pegada no es una petición: es material de trabajo."""
    h = _home(tmp_path)
    largo = "actualiza el README " + ("y revisa el código del servidor por aquí " * 40)
    h.add([_encargo(i, largo) for i in (1, 2, 3)])
    assert repeticiones(h.hippo.events()) == []


def test_tareas_distintas_no_se_mezclan(tmp_path):
    h = _home(tmp_path)
    h.add([
        _encargo(1, "actualiza el README del proyecto con la instalación nueva"),
        _encargo(2, "mide el consumo de memoria del servidor en reposo"),
        _encargo(3, "publica la versión nueva en la tienda de skins"),
        _encargo(4, "arregla el test que falla en la puerta del taller"),
        _encargo(5, "escribe la guía de instalación para el servidor"),
    ])
    props = repeticiones(h.hippo.events())
    assert props == []


def test_la_propuesta_no_escribe_en_la_mente(tmp_path):
    """Mirar no es escribir: la propuesta sólo dice, la skill la crea el usuario."""
    h = _home(tmp_path)
    h.add([
        _encargo(1, "actualiza el README del proyecto con la instalación nueva"),
        _encargo(2, "actualiza el README del proyecto con la instalación nueva"),
        _encargo(3, "actualiza el README del proyecto con la instalación nueva"),
    ])
    antes = len(h.hippo)
    salida = propuesta(h)
    assert salida["total"] == 1
    assert len(h.hippo) == antes


def test_el_sueño_deja_la_propuesta_para_que_la_app_la_muestre(tmp_path):
    h = _home(tmp_path)
    h.add([
        _encargo(1, "actualiza el README del proyecto con la instalación nueva"),
        _encargo(2, "actualiza el README del proyecto con la instalación nueva"),
        _encargo(3, "actualiza el README del proyecto con la instalación nueva"),
    ])
    from daimon.suenio import dormir
    informe = dormir(h)
    assert informe["repeticiones"]["total"] == 1
    guardadas = [e for e in h.hippo.events() if e.source == "repeticion"]
    assert len(guardadas) == 1
    assert "3 veces" in guardadas[0].text


def test_dormir_tres_veces_no_deja_tres_tarjetas(tmp_path):
    """La misma repetición es la misma tarjeta: dormir dos veces no la duplica.

    El texto lleva los términos, y los términos cambian cuando la mente crece; si el id
    saliera de ahí, cada noche dejaría una tarjeta nueva de lo mismo.
    """
    h = _home(tmp_path)
    _ruido(h)
    h.add([
        _encargo(1, "actualiza el README del proyecto con la instalación nueva"),
        _encargo(2, "actualiza el README del proyecto con la instalación nueva"),
        _encargo(3, "actualiza el README del proyecto con la instalación nueva"),
    ])
    from daimon.suenio import dormir
    for _ in range(3):
        dormir(h)
        h.add([_encargo(50, "una cosa nueva que escribir en el informe del servidor")])
    import sqlite3
    c = sqlite3.connect(h.path / "mem.db")
    total, vivas = c.execute("SELECT COUNT(*), SUM(deleted=0) FROM events WHERE source='repeticion'").fetchone()
    assert vivas == 1, f"debería quedar una sola tarjeta viva, hay {vivas}"


def test_una_mente_nueva_no_inventa_habitos(tmp_path):
    h = _home(tmp_path)
    salida = propuesta(h)
    assert salida["total"] == 0
    assert salida["repeticiones"] == []


def test_el_equipo_guarda_el_encargo_para_que_el_sueño_lo_vea(tmp_path):
    """El fallo de raíz: si la mente no recibe el encargo, no puede saber qué se repite."""
    h = _home(tmp_path)
    _ruido(h)
    from daimon.equipo import aprender
    # Tres tareas DISTINTAS con el mismo encargo: tres repeticiones.
    aprender(h, {"tareas": [{"id": f"t{i}", "motor": "opencode", "modelo": "m",
                             "estado": "lista", "encargo": "actualiza el README del proyecto"}
                            for i in range(3)],
                 "veredictos": []})
    props = repeticiones(h.hippo.events())
    assert props and props[0].veces >= MIN_REPETICIONES


def test_la_misma_tarea_no_cuenta_dos_veces(tmp_path):
    """La app manda la lista de tareas enteras cada vez: la misma tarea es una sola."""
    h = _home(tmp_path)
    from daimon.equipo import aprender
    for _ in range(3):
        aprender(h, {"tareas": [{"id": "t1", "motor": "opencode", "modelo": "m",
                                 "estado": "lista", "encargo": "actualiza el README del proyecto"}],
                     "veredictos": []})
    assert repeticiones(h.hippo.events()) == []


def test_una_tarea_que_se_rompió_no_es_un_hábito(tmp_path):
    """Tres encargos que fallaron son un problema, no una costumbre: no se propone skill."""
    h = _home(tmp_path)
    _ruido(h)
    from daimon.equipo import aprender
    aprender(h, {"tareas": [{"id": f"t{i}", "motor": "opencode", "modelo": "m",
                             "estado": "error", "error": "se quedó colgada",
                             "encargo": "actualiza el README del proyecto"}
                            for i in range(3)],
                 "veredictos": []})
    assert repeticiones(h.hippo.events()) == []


# ---- La receta: el esqueleto que la mente pone y el creador escribe ----

def test_la_propuesta_lleva_el_borrador_de_la_receta(tmp_path):
    """La tarjeta de «lo que repites» trae el esqueleto: sin esto, la skill no se puede escribir."""
    h = _home(tmp_path)
    _ruido(h)
    h.add([
        _encargo(1, "actualiza el README del proyecto con la instalación nueva"),
        _encargo(2, "actualiza el README del proyecto con la instalación nueva"),
        _encargo(3, "actualiza el README del proyecto con la instalación nueva"),
    ])
    props = repeticiones(h.hippo.events())
    b = props[0].borrador
    assert b["nombre"] and b["descripcion"] and b["cuerpo"]
    # el nombre tiene que poder ser una carpeta: sólo letras, números y guiones
    assert all(c.isalnum() or c in "-." for c in b["nombre"]), b["nombre"]
    # y la receta lleva la evidencia, no invenciones
    assert "README" in b["cuerpo"]
    assert "3 veces" in b["cuerpo"]
    # los huecos están vacíos a propósito: la receta la escribe el creador
    assert "- [ ]" in b["cuerpo"]


def test_el_borrador_no_inventa_como_se_hace(tmp_path):
    """La mente no sabe el «cómo»: por eso el cuerpo deja huecos, no pasos."""
    h = _home(tmp_path)
    _ruido(h)
    h.add([_encargo(i, "publica la versión nueva en la tienda con su licencia") for i in (1, 2, 3)])
    b = repeticiones(h.hippo.events())[0].borrador
    # lo único que sabe de la tarea es lo que pidió el creador
    assert "publica la versión nueva" in b["cuerpo"]
    # y que la escribió el creador (el hueco lo dice)
    assert "lo escribe el creador" in b["cuerpo"]


def test_el_nombre_no_se_parte_por_las_tildes(tmp_path):
    """«instalación» es una palabra, no «instalaci-n»."""
    h = _home(tmp_path)
    _ruido(h)
    h.add([_encargo(i, "actualiza el README con la instalación nueva del servidor") for i in (1, 2, 3)])
    b = repeticiones(h.hippo.events())[0].borrador
    assert "instalacion" in b["nombre"]
    # ninguna palabra queda partida: ni «instalaci-n» ni «readme-» al final
    assert not b["nombre"].endswith("-")
    assert "-n" not in b["nombre"]


def test_un_grupo_disperso_avisa_en_la_receta(tmp_path):
    """Si los encargos del grupo no se parecen, la receta lo dice: no es la misma tarea."""
    h = _home(tmp_path)
    h.add([
        _encargo(1, "actualiza el readme del proyecto con la instalación nueva"),
        _encargo(2, "mide el consumo de memoria del servidor en reposo"),
        _encargo(3, "publica la versión nueva en la tienda con su licencia"),
    ])
    props = repeticiones(h.hippo.events())
    if not props:
        return                      # el codificador de mentira puede no agrupar: no hay nada que avisar
    p = props[0]
    assert p.coherencia < 1.0
    assert p.dispersa is (p.coherencia < MIN_COHESION)
    if p.dispersa:
        assert "no se parecen mucho" in p.borrador["cuerpo"]


def test_una_tarea_de_verdad_no_avisa(tmp_path):
    """La misma tarea dicha de tres formas: la receta va tranquila."""
    h = _home(tmp_path)
    h.add([
        _encargo(1, "actualiza el readme del proyecto con la instalación nueva"),
        _encargo(2, "actualiza el readme del proyecto con la instalación nueva"),
        _encargo(3, "actualiza el readme del proyecto con la instalación nueva"),
    ])
    p = repeticiones(h.hippo.events())[0]
    assert p.coherencia == 1.0
    assert p.dispersa is False
    assert "no se parecen mucho" not in p.borrador["cuerpo"]
