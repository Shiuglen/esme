from daimon.baselines import ctx_none, make_ctx_bm25, make_ctx_dense, make_ctx_long, make_ctx_md, pack
from daimon.hippocampus import Hippocampus
from daimon.ingest import Event
from daimon.lens import Lens
from daimon.lexical import BM25
from daimon.tokens import count
from tests.fakes import fake_encoder


def _ev(i, text, ts):
    return Event(f"id{i}", text, "t", "note", ts, 0.8)


EVS = [_ev(1, "La decision fue usar Laya por defecto", "2026-10-01T00:00:00Z"),
       _ev(2, "Receta de arepas con queso", "2026-10-05T00:00:00Z"),
       _ev(3, "El servidor de pruebas usa Linux", "2026-10-09T00:00:00Z")]


def test_pack_no_excede():
    text, used = pack(["x" * 10000, "corto"], budget=100)
    assert used <= 100 and count(text) <= 100
    assert pack([], 100) == ("", 0)


def test_pack_salta_lo_que_no_cabe():
    text, used = pack(["a" * 40, "b" * 1000, "c" * 40], budget=40)
    assert "a" * 40 in text and used <= 40


def test_bm25_acentos():
    bm = BM25(EVS)
    res = bm.search("¿qué decisión tomamos?", k=2)
    assert res[0][0].id == "id1" and res[0][1] > 0


def test_bm25_vacio():
    assert BM25([]).search("algo", 3) == []


def test_md_filtra_firme(tmp_path):
    md = tmp_path / "CLAUDE.md"
    md.write_text("Usar Laya por defecto.\nProyecto FirmeDigital en Next.js\nResponder en español.\n")
    text, used = make_ctx_md([md])("cualquier cosa", 500)
    assert "Laya" in text and "español" in text and "Firme" not in text


def test_ctx_none():
    assert ctx_none("hola", 1500) == ("", 0)


def test_dense_y_long(tmp_path):
    enc, dim = fake_encoder(32)
    h = Hippocampus(tmp_path / "m.db", Lens(enc, dim)); h.store(EVS)
    text, used = make_ctx_dense(h)("arepas con queso", 30)
    assert "arepas" in text and used <= 30
    text, used = make_ctx_long(EVS)("lo que sea", 20)
    assert "Linux" in text and used <= 20
