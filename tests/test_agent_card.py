"""La Agent Card de Esme: lo que otro agente puede esperar de ella."""
from daimon.agent_card import agent_card


def test_la_tarjeta_dice_quien_es_y_donde_vive():
    c = agent_card("http://127.0.0.1:47321")
    assert c["name"] == "Esme"
    assert c["url"] == "http://127.0.0.1:47321/"
    assert c["version"]
    assert c["provider"]["url"].startswith("https://")


def test_ofrece_lo_que_sabe_hacer_y_nada_mas():
    c = agent_card("http://127.0.0.1:47321")
    ids = [s["id"] for s in c["skills"]]
    assert "memoria" in ids
    assert "sueno" in ids
    memoria = next(s for s in c["skills"] if s["id"] == "memoria")
    assert "recall" in memoria["x-esme"]["herramientas"]
    # la puerta del Taller existe hoy: entra en la tarjeta, y con su regla visible
    puerta = next(s for s in c["skills"] if s["id"] == "taller")
    rutas = puerta["x-esme"]["http"]
    assert any("POST /taller/encargo" in r for r in rutas)
    # y no promete lo que NO hay: desde fuera la tarea no se crea, la aprueba el creador
    assert "creador" in puerta["description"]


def test_la_puerta_no_dice_que_cree_tareas_sola():
    """El que la tarjeta nombre el Taller no le quita su regla: sin el creador, nada arranca."""
    c = agent_card("http://127.0.0.1:47321")
    puerta = next(s for s in c["skills"] if s["id"] == "taller")
    assert "NO" in puerta["description"] or "no crea" in puerta["description"]


def test_todo_lo_prometido_es_local():
    c = agent_card("http://127.0.0.1:47321")
    assert c["x-esme"]["enTuEquipo"] is True
    assert c["x-esme"]["mcp"].endswith("/mcp")


def test_la_url_base_no_puede_dejar_barra_doble():
    assert agent_card("http://127.0.0.1:47321/")["url"] == "http://127.0.0.1:47321/"


def test_la_tarjeta_anuncia_el_navegador_que_existe(tmp_path):
    """Lo que la tarjeta promete tiene que existir: si el navegador se cae, la tarjeta miente."""
    import asyncio

    from daimon.gate import build_server
    from daimon.home import Home

    card = agent_card("http://127.0.0.1:1234")
    habilidades = {s["id"]: s for s in card["skills"]}
    assert "navegador" in habilidades
    herramientas = habilidades["navegador"]["x-esme"]["herramientas"]
    assert herramientas == ["navegar", "clic_en_la_pagina", "escribir_en_la_pagina", "bajar_la_mira", "volver_en_la_historia"]
    # y el servidor MCP las expone de verdad
    srv = build_server(Home(tmp_path))
    nombres = {t.name for t in asyncio.run(srv.list_tools())}
    assert set(herramientas) <= nombres
