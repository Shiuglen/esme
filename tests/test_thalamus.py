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
    assert features("q", e, 0.5, 0.2, 1).shape == (12,)


def test_features_lexico_absoluto_y_rango():
    e = Event("x", "hola", "t", "note", "2026-10-01T00:00:00Z", 0.8)
    debil = features("q", e, 0.5, 1.0, 0, bm25_raw=0.5, dense_rank=0)
    fuerte = features("q", e, 0.5, 1.0, 0, bm25_raw=40.0, dense_rank=0)
    lejos = features("q", e, 0.5, 1.0, 0, bm25_raw=40.0, dense_rank=30)
    assert fuerte[10] > 0.95 and debil[10] < 0.1          # la fuerza léxica absoluta distingue lo que la relativa no
    assert lejos[11] < fuerte[11] == 1.0


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


def test_compose_corte_adaptativo(tmp_path):
    th = _setup(tmp_path, _corpus())
    _, full_tokens, full = th.compose("tema3 detalle", 1500)
    th.max_drop = 0.05
    _, cut_tokens, cut = th.compose("tema3 detalle", 1500)
    assert 1 <= len(cut) < len(full) and cut_tokens < full_tokens
    assert cut[0] == full[0]


def test_no_se_abstiene_ante_pregunta_ajena(tmp_path):
    """Antes devolvía "" y el agente se quedaba parado sin poder hacer nada.

    Ahora, si nada parece mucho, devuelve lo mejor que hay y lo marca como contexto débil."""
    th = _setup(tmp_path, _corpus())
    th.min_dense = 0.6          # el codificador falso (32 dims) da hasta ~0.4 por azar
    text, used, ids = th.compose("receta de paella valenciana con mariscos", 1500)
    assert text.startswith("[contexto débil")
    assert used > 0 and ids


def test_el_presupuesto_manda_y_no_hay_tope_de_60(tmp_path):
    """El tope de 60 recuerdos desapareció: ahora manda el presupuesto (y 0 = sin límite)."""
    th = _setup(tmp_path, _corpus())
    th.max_items = None
    _, _, ids = th.compose("tema3 detalle", 0)          # sin límite
    assert len(ids) > 60
    _, _, pocos = th.compose("tema3 detalle", 60)       # con presupuesto corto
    assert len(pocos) < len(ids)


def test_el_feedback_sobrevive_al_reinicio(tmp_path):
    """La señal no se pierde al reiniciar: las consultas compuestas se guardan."""
    th = _setup(tmp_path, _corpus())
    _, _, ids = th.compose("tema1 detalle", 300)
    th.save(tmp_path / "pesos.npz")

    otro = _setup(tmp_path, _corpus())
    otro.load(tmp_path / "pesos.npz")                  # como si la app reiniciase
    assert otro.feedback(ids[:1], 1.0, "tema1 detalle") is True


def test_el_feedback_aguanta_un_query_distinto(tmp_path):
    """Si el aviso llega con otra consulta, el aprendizaje no se pierde: se busca entre las
    composiciones recientes la que traiga esos recuerdos."""
    th = _setup(tmp_path, _corpus())
    _, _, ids = th.compose("tema1 detalle", 300)
    w0 = th.w.copy()
    assert th.feedback(ids[:1], 1.0, "otra consulta que no es") is True
    assert (th.w != w0).any()


def test_feedback_negativo_no_destruye(tmp_path):
    th = _setup(tmp_path, _corpus())
    for _ in range(6):
        _, _, ids = th.compose("tema1 detalle", 300)
        assert th.feedback(ids[:1], 0.0, "tema1 detalle")
    assert th.w[0] > 0 and np.linalg.norm(th.w) < 10 * np.linalg.norm(np.ones(12))
    _, _, after = th.compose("tema1 detalle", 300)
    assert after[0] != ids[0]          # lo marcado como inútil deja de ir primero


def test_feedback_consulta_desconocida(tmp_path):
    th = _setup(tmp_path, _corpus())
    w0 = th.w.copy()
    assert th.feedback(["g1"], 1.0, "nunca compuesta") is False and np.allclose(w0, th.w)


def test_explorar_cambia_el_orden(tmp_path):
    th = _setup(tmp_path, _corpus())
    th.eps = 1.0
    base = th.compose("tema3 detalle", 400)[2]
    assert any(th.compose("tema3 detalle", 400, explore=True)[2] != base for _ in range(5))
