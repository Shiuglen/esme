"""El rumbo de la mente: los pilares y los objetivos."""
from daimon import rumbo


def test_un_rumbo_vacio_es_rumbo(tmp_path):
    r = rumbo.lee(tmp_path)
    assert r["pilares"] == [] and r["objetivos"] == []


def test_aniadir_un_pilar_y_una_objetivo(tmp_path):
    rumbo.anade_pilar(tmp_path, "Hacer Esme de otro mundo", 1000)
    rumbo.anade_objetivo(tmp_path, "Publicar la tienda firmada", 2000)
    r = rumbo.lee(tmp_path)
    assert r["pilares"][0]["texto"] == "Hacer Esme de otro mundo"
    assert r["objetivos"][0]["texto"] == "Publicar la tienda firmada"
    assert r["objetivos"][0]["estado"] == "activo"


def test_un_objetivo_puede_vivir_bajo_un_pilar(tmp_path):
    rumbo.anade_pilar(tmp_path, "Esme de otro mundo", 1000)
    p = rumbo.lee(tmp_path)["pilares"][0]["id"]
    rumbo.anade_objetivo(tmp_path, "Galería de pieles", 2000, p)
    r = rumbo.lee(tmp_path)
    assert r["objetivos"][0]["pilar"] == p


def test_cerrar_un_objetivo_le_pone_fecha(tmp_path):
    rumbo.anade_objetivo(tmp_path, "Lo que sea", 2000)
    oid = rumbo.lee(tmp_path)["objetivos"][0]["id"]
    rumbo.cambia_objetivo(tmp_path, oid, "hecho", 3000)
    o = rumbo.lee(tmp_path)["objetivos"][0]
    assert o["estado"] == "hecho" and o["cerrado"] == 3000
    # y se puede volver a abrir
    rumbo.cambia_objetivo(tmp_path, oid, "activo", 4000)
    o = rumbo.lee(tmp_path)["objetivos"][0]
    assert o["estado"] == "activo" and o["cerrado"] is None


def test_quitar_un_pilar_no_borra_sus_objetivos(tmp_path):
    rumbo.anade_pilar(tmp_path, "Uno", 1000)
    p = rumbo.lee(tmp_path)["pilares"][0]["id"]
    rumbo.anade_objetivo(tmp_path, "Un objetivo", 2000, p)
    rumbo.quita_pilar(tmp_path, p)
    r = rumbo.lee(tmp_path)
    assert r["pilares"] == []
    assert len(r["objetivos"]) == 1 and r["objetivos"][0]["pilar"] is None


def test_un_fichero_danado_no_tira_el_rumbo(tmp_path):
    (tmp_path / "rumbo.json").write_text("{ esto no es json")
    assert rumbo.lee(tmp_path)["objetivos"] == []


def test_lo_que_no_tiene_forma_se_cae(tmp_path):
    (tmp_path / "rumbo.json").write_text(
        '{"pilares": [{"texto": "Bien"}, {"texto": ""}, 5], "objetivos": [{"texto": "X", "estado": "inventado"}]}')
    r = rumbo.lee(tmp_path)
    assert len(r["pilares"]) == 1
    assert r["objetivos"][0]["estado"] == "activo"


def test_no_hay_mas_de_siete_pilares(tmp_path):
    for i in range(9):
        rumbo.anade_pilar(tmp_path, f"Pilar {i}", 1000 + i)
    r = rumbo.lee(tmp_path)
    assert len(r["pilares"]) == rumbo.MAX_PILARES


def test_un_pilar_repetido_no_se_duplica(tmp_path):
    rumbo.anade_pilar(tmp_path, "El mismo", 1000)
    rumbo.anade_pilar(tmp_path, "El mismo", 2000)
    assert len(rumbo.lee(tmp_path)["pilares"]) == 1
