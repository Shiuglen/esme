import numpy as np

from daimon.atlas import atlas_for, compute_atlas
from daimon.ingest import Event


def _blobs(n_per=40, seed=0):
    rng = np.random.default_rng(seed)
    centers = rng.standard_normal((3, 32)) * 5
    V, evs = [], []
    words = [["arepa", "queso", "maiz"], ["usdc", "wallet", "solana"], ["memoria", "talamo", "red"]]
    for c in range(3):
        for i in range(n_per):
            v = centers[c] + rng.standard_normal(32) * 0.3
            V.append(v / np.linalg.norm(v))
            evs.append(Event(f"e{c}_{i}", " ".join(words[c]) + f" detalle{i}", f"src{c}", "note", "2026-10-01", 0.8))
    return np.array(V, dtype=np.float32), evs


def test_vacio():
    assert compute_atlas(np.zeros((0, 8), dtype=np.float32), []) == {"points": [], "clusters": []}


def test_tres_regiones_separadas_y_etiquetadas():
    V, evs = _blobs()
    a = compute_atlas(V, evs)
    pts = a["points"]
    assert len(pts) == 120 and all(-1 <= p["x"] <= 1 and -1 <= p["y"] <= 1 and 0 <= p["h"] <= 1 for p in pts)
    # cada mancha cae en un único grupo dominante
    for c in range(3):
        cl = [p["cluster"] for p in pts if p["id"].startswith(f"e{c}_")]
        assert max(cl.count(x) for x in set(cl)) / len(cl) > 0.9
    labels = " ".join(c["label"] for c in a["clusters"])
    assert "usdc" in labels or "wallet" in labels or "solana" in labels


def test_determinista():
    V, evs = _blobs()
    assert compute_atlas(V, evs, seed=0)["points"][:5] == compute_atlas(V, evs, seed=0)["points"][:5]


def test_cache(tmp_path):
    from daimon.home import Home
    from tests.fakes import fake_encoder
    h = Home(tmp_path, encoder=fake_encoder(32))
    _, evs = _blobs(n_per=10)
    h.add(evs)
    a1 = atlas_for(h)
    assert (tmp_path / "atlas.json").exists()
    assert atlas_for(h) == a1


def test_cada_punto_lleva_su_fecha_y_su_confianza():
    V, evs = _blobs(n_per=4)
    evs[0] = Event(evs[0].id, evs[0].text, "src0", "ai_msg", "2026-09-28T10:00:00+00:00", 0.4)
    p = {x["id"]: x for x in compute_atlas(V, evs)["points"]}
    assert p[evs[0].id]["ts"] == "2026-09-28T10:00:00+00:00" and p[evs[0].id]["trust"] == 0.4
    assert p[evs[1].id]["trust"] == 0.8


def test_una_cache_de_formato_viejo_se_recalcula(tmp_path):
    import json
    from daimon.home import Home
    from tests.fakes import fake_encoder
    h = Home(tmp_path, encoder=fake_encoder(32))
    h.ingest([Event("a1", "hola mundo", "s", "note", "2026-10-01", 0.8), Event("a2", "adiós mundo", "s", "note", "2026-10-02", 0.8)])
    evs = h.hippo.events()
    (tmp_path / "atlas.json").write_text(json.dumps({"sig": [len(evs), evs[-1].id], "atlas": {"points": [{"id": "viejo"}], "clusters": []}}))
    assert all("ts" in p for p in atlas_for(h)["points"])


def test_las_etiquetas_conservan_los_acentos_y_las_mayusculas_de_tus_textos():
    from daimon.atlas import _labels
    textos = {0: ["El sueño de Venezuela"] * 6 + ["sueño y Venezuela otra vez"] * 3, 1: ["arepa con queso"] * 9}
    terms = _labels(textos)[0]
    assert set(terms) == {"sueño", "Venezuela"}


def test_con_lente_elige_la_palabra_que_resume_el_tema_y_no_la_mas_repetida():
    from daimon.atlas import _labels
    # «ambas» sale en todos los textos del tema y gana por frecuencia; pero lo que el tema significa es «jardín»
    textos = {0: [f"ambas cosas del jardín {i}" if i % 2 else f"ambas notas sueltas {i}" for i in range(10)],
              1: [f"arepa con queso {i}" for i in range(10)]}
    centros = {0: np.array([1, 0, 0], np.float32), 1: np.array([0, 1, 0], np.float32)}
    vec = {"jardín": [1, 0, 0], "arepa": [0, 1, 0], "queso": [0, 1, 0.1]}
    encode = lambda ws: np.array([vec.get(w, [0, 0, 1]) for w in ws], np.float32)
    assert _labels(textos)[0][0] == "ambas"                       # sin lente manda la frecuencia
    assert _labels(textos, centros, encode)[0][0] == "jardín"     # con lente manda el significado


def test_la_segunda_palabra_no_repite_la_primera():
    from daimon.atlas import _labels
    textos = {0: [f"dragón dragones fuego {i}" for i in range(10)], 1: [f"arepa con queso {i}" for i in range(10)]}
    centros = {0: np.array([1, 0, 0], np.float32), 1: np.array([0, 1, 0], np.float32)}
    vec = {"dragón": [1, 0, 0], "dragones": [0.99, 0.1, 0], "fuego": [0.7, 0.7, 0], "arepa": [0, 1, 0], "queso": [0, 1, 0]}
    encode = lambda ws: np.array([vec.get(w, [0, 0, 1]) for w in ws], np.float32)
    assert _labels(textos, centros, encode)[0] == ["dragón", "fuego"]


def test_cada_tema_lleva_sus_terminos():
    V, evs = _blobs()
    a = compute_atlas(V, evs)
    assert all(isinstance(c["terms"], list) and c["terms"] and c["label"] == " · ".join(c["terms"]) for c in a["clusters"])


def test_el_nombre_dice_lo_que_distingue_al_tema_del_resto_de_la_mente():
    # «común» está cerca del tema pero también de todo lo demás; «propio» es lo que solo tiene este tema
    rng = np.random.default_rng(1)
    V, evs = [], []
    for c, (centro, texto) in enumerate([([1, 0, 0], "común propio"), ([0, 1, 0], "arepa queso")]):
        for i in range(10):
            v = np.array(centro, np.float32) + rng.standard_normal(3).astype(np.float32) * 0.05
            V.append(v / np.linalg.norm(v)); evs.append(Event(f"e{c}_{i}", f"{texto} {i}", "s", "note", "2026-10-01", 0.8))
    vec = {"común": [1, 0.5, 0], "propio": [1, -0.6, 0], "arepa": [0, 1, 0], "queso": [0.1, 1, 0]}
    encode = lambda ws: np.array([vec.get(w, [0, 0, 1]) for w in ws], np.float32)
    a = compute_atlas(np.array(V), evs, encode=encode)
    tema = next(c for c in a["clusters"] if "propio" in c["terms"] or "común" in c["terms"])
    assert tema["terms"][0] == "propio"


def test_si_la_lente_falla_el_mapa_sigue_y_nombra_por_frecuencia():
    from daimon.atlas import _labels
    textos = {0: [f"ambas cosas del jardín {i}" for i in range(10)], 1: [f"arepa con queso {i}" for i in range(10)]}
    centros = {0: np.array([1, 0, 0], np.float32), 1: np.array([0, 1, 0], np.float32)}
    def rota(ws):
        raise RuntimeError("el codificador no responde")
    assert _labels(textos, centros, rota) == _labels(textos)
