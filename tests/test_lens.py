import numpy as np

from daimon.lens import Lens
from tests.fakes import fake_encoder


def _lens():
    enc, dim = fake_encoder(32)
    return Lens(enc, dim)


def test_normalizado():
    v = _lens().encode(["hola mundo", "otra cosa distinta"])
    assert v.dtype == np.float32
    assert np.allclose(np.linalg.norm(v, axis=1), 1.0, atol=1e-5)


def test_vacio_no_rompe():
    v = _lens().encode([""])
    assert v.shape == (1, 32) and np.all(np.isfinite(v))


def test_adaptador_acerca_pares():
    lens = _lens()
    pairs = [(f"gato{i} casa{i}", f"felino{i} hogar{i}") for i in range(40)]
    a = lens.encode([p[0] for p in pairs]); b = lens.encode([p[1] for p in pairs])
    before = float(np.mean(np.sum(a * b, axis=1)))
    first = lens.train_adapter(pairs, epochs=1)
    last = lens.train_adapter(pairs, epochs=60)
    a = lens.encode([p[0] for p in pairs]); b = lens.encode([p[1] for p in pairs])
    after = float(np.mean(np.sum(a * b, axis=1)))
    assert last < first
    assert after > before + 0.1


def test_guardar_cargar(tmp_path):
    enc, dim = fake_encoder(32)
    lens = Lens(enc, dim)
    lens.train_adapter([("a b", "c d"), ("e f", "g h")], epochs=5)
    lens.save(tmp_path / "lens.npz")
    other = Lens.load(tmp_path / "lens.npz", enc)
    assert np.allclose(lens.encode(["a b"]), other.encode(["a b"]))
