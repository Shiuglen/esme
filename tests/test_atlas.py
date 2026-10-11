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
