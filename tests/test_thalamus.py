import numpy as np

from daimon.hippocampus import Hippocampus
from daimon.ingest import Event
from daimon.lens import Lens
from daimon.lexical import BM25
from daimon.thalamus import Thalamus, features
from daimon.tokens import count
from tests.fakes import fake_encoder


def _setup(tmp_path, events):
    enc, dim = fake_encoder(32)
    h = Hippocampus(tmp_path / "m.db", Lens(enc, dim)); h.store(events)
    return Thalamus(h, BM25(h.events()))


def _corpus():
    evs = []
    for i in range(30):
        evs.append(Event(f"g{i}", f"tema{i} apunte", "t", "note", "2026-10-01T00:00:00Z", 0.8))
        for j in range(5):
            evs.append(Event(f"d{i}_{j}", f"tema{i} detalle relleno{j}", "t", "doc", "2026-10-01T00:00:00Z", 0.8))
    return evs


def test_features_dim():
    e = Event("x", "hola", "t", "note", "2026-10-01T00:00:00Z", 0.8)
    assert features("q", e, 0.5, 0.2, 1).shape == (10,)


def test_compose_vacio(tmp_path):
    assert _setup(tmp_path, []).compose("algo", 1500) == ("", 0, [])


def test_compose_respeta_presupuesto(tmp_path):
    th = _setup(tmp_path, _corpus())
    text, used, ids = th.compose("tema3 detalle", 60)
    assert used <= 60 and count(text) <= 60 and ids


def test_fit_sube_oro(tmp_path):
    th = _setup(tmp_path, _corpus())
    before = sum(f"g{i}" == th.compose(f"tema{i} detalle", 10_000)[2][0] for i in range(20, 30))
    assert before <= 3          # sin entrenar, el oro (en desventaja léxica) no sale primero
    train = [(f"tema{i} detalle", {f"g{i}"}) for i in range(20)]
    th.fit(train, epochs=200, lr=0.1)
    ok = 0
    for i in range(20, 30):
        _, _, ids = th.compose(f"tema{i} detalle", 10_000)
        ok += f"g{i}" == ids[0]
    assert ok >= 8


def test_feedback_mueve_pesos(tmp_path):
    th = _setup(tmp_path, _corpus())
    _, _, ids = th.compose("tema1 detalle", 200)
    w0 = th.w.copy()
    th.feedback(ids[:1], 1.0, "tema1 detalle")
    assert not np.allclose(w0, th.w)


def test_guardar_cargar(tmp_path):
    th = _setup(tmp_path, _corpus())
    th.w[0] = 3.0
    th.save(tmp_path / "w.npy")
    (tmp_path / "otro").mkdir()
    th2 = _setup(tmp_path / "otro", [])
    th2.load(tmp_path / "w.npy")
    assert th2.w[0] == 3.0
