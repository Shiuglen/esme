import json

from daimon.bench.items import Item
from daimon.bench.judge import fact_recall, judge, parse_score
from daimon.bench.metrics import bootstrap_ci, paired_diff_ci, sign_test_p, worse_rate
from daimon.bench.report import report
from daimon.bench.run import run


class FakeAnswerer:
    def __init__(self, fail_on=()):
        self.calls, self.fail_on = 0, set(fail_on)

    def answer(self, system, prompt, max_tokens=256):
        self.calls += 1
        if any(f in prompt for f in self.fail_on):
            from daimon.teachers import TeacherError
            raise TeacherError("caído")
        return "Laya porque es gratis" if "CONTEXTO" in prompt else "No lo sé"


ITEMS = [Item(f"q{i}", f"pregunta {i}", "Laya, gratis", ["laya", "gratis"], ["e1"], "porque", "real") for i in range(4)]
VARIANTS = {"ia_sola": lambda q, b: ("", 0), "md": lambda q, b: ("Laya es gratis", 4)}


def test_cache_reanuda(tmp_path):
    a = FakeAnswerer()
    rows = run(ITEMS, VARIANTS, a, 1500, tmp_path / "c.jsonl")
    assert len(rows) == 8 and a.calls == 8
    a2 = FakeAnswerer()
    rows2 = run(ITEMS, VARIANTS, a2, 1500, tmp_path / "c.jsonl")
    assert a2.calls == 0 and len(rows2) == 8


def test_error_no_cuenta_como_cero(tmp_path):
    a = FakeAnswerer(fail_on=["pregunta 0"])
    rows = run(ITEMS, VARIANTS, a, 1500, tmp_path / "c.jsonl")
    errs = [r for r in rows if r["status"] == "error"]
    assert len(errs) == 2
    # los errores no se guardan en caché: se reintentan al reanudar
    a2 = FakeAnswerer()
    rows2 = run(ITEMS, VARIANTS, a2, 1500, tmp_path / "c.jsonl")
    assert a2.calls == 2 and all(r["status"] == "ok" for r in rows2)


def test_parse_score_y_judge():
    assert parse_score("PUNTUACIÓN: 1") == 1.0
    assert parse_score("puntuacion 0,5") == 0.5
    assert parse_score("PUNTUACIÓN: 0") == 0.0
    assert parse_score("blabla") == 0.0

    class J:
        def answer(self, s, p, max_tokens=256):
            assert "Laya, gratis" in p and "gratis" in p
            return "PUNTUACIÓN: 0.5"
    assert judge(ITEMS[0], "algo", J()) == 0.5


def test_fact_recall():
    it = Item("x", "q", "g", ["usar Laya por defecto", "Jev es de pago"], [], "hecho", "real")
    assert fact_recall(it, "Decidimos usar Laya por defecto.") == 0.5
    assert fact_recall(it, "") == 0.0


def test_bootstrap_ic():
    assert bootstrap_ci([1, 1, 1, 1]) == (1.0, 1.0, 1.0)
    m, lo, hi = bootstrap_ci([0, 1] * 50)
    assert lo < m < hi and abs(m - 0.5) < 1e-9


def test_worse_rate():
    assert worse_rate({"a": 1, "b": 0, "c": 0.5}, {"a": 1, "b": 1, "c": 0}) == 1 / 3


def _rows(variant, score, tokens, ids):
    return [{"item_id": i, "variant": variant, "status": "ok", "score": score, "facts": score,
             "context_tokens": tokens, "latency_s": 1.0, "answer": ""} for i in ids]


def test_veredicto(tmp_path):
    items = [Item(f"z{i}", "q", "g", ["f"], [], "hecho", "generada") for i in range(200)]
    ids = [i.id for i in items]
    rows = _rows("ia_sola", 0.0, 0, ids) + _rows("bm25", 0.2, 1500, ids) + _rows("daimon", 1.0, 1500, ids)
    s = report(rows, items, tmp_path / "r.md")
    assert s["verdict"] is True and (tmp_path / "r.md").exists()
    rows = _rows("ia_sola", 0.0, 0, ids) + _rows("bm25", 0.5, 1500, ids) + _rows("daimon", 0.5, 1500, ids)
    assert report(rows, items, tmp_path / "r2.md")["verdict"] is False
    rows = _rows("ia_sola", 0.0, 0, ids) + _rows("bm25", 0.5, 1500, ids) + _rows("daimon", 0.5, 900, ids)
    assert report(rows, items, tmp_path / "r3.md")["verdict"] is True


# ——— el veredicto por pares (20-oct): el ruido del instrumento, no la memoria ———
def _ruidoso(n, ac_daimon, ac_base, semilla=0):
    """Ítems con acierto ruidoso: dos variantes con la misma media pueden no ser iguales."""
    import random
    r = random.Random(semilla)
    ids = [f"q{i}" for i in range(n)]

    def filas(v, p, tokens):
        out = []
        for i in ids:
            out.append({"item_id": i, "variant": v, "status": "ok", "score": 1.0 if r.random() < p else 0.0,
                        "facts": 1.0 if r.random() < p else 0.0, "context_tokens": tokens,
                        "latency_s": 1.0, "answer": ""})
        return out
    return filas("daimon", ac_daimon, 900) + filas("bm25", ac_base, 1500) + filas("ia_sola", 0.0, 0)


def test_empate_ruidoso_no_es_derrota(tmp_path):
    """Dos variantes con la MISMA media y el mismo ruido: la diferencia no se distingue → empate."""
    items = [Item(f"q{i}", "q", "g", ["f"], [], "hecho", "generada") for i in range(35)]
    rows = _ruidoso(35, 0.8, 0.8, 3)
    s = report(rows, items, tmp_path / "r.md")
    assert s["verdict"] is True, s["reason"]
    assert "empata" in s["reason"]


def test_perder_de_verdad_no_pasa(tmp_path):
    """Si la memoria es peor de verdad (y el ruido es pequeño), NO CUMPLE."""
    items = [Item(f"q{i}", "q", "g", ["f"], [], "hecho", "generada") for i in range(200)]
    ids = [i.id for i in items]
    # daimon acierta 0,4; bm25 acierta 0,8: la diferencia es enorme y consistente
    rows = _rows("ia_sola", 0.0, 0, ids) + _rows("bm25", 0.8, 1500, ids) + _rows("daimon", 0.4, 900, ids)
    s = report(rows, items, tmp_path / "r.md")
    assert s["verdict"] is False
    assert "peor" in s["reason"]


def test_la_entrega_por_la_puerta_no_es_linea_base(tmp_path):
    """El pack (`sesion`) no puede hacer de línea base: si no, el veredicto juzga a la memoria
    contra ella misma con el protocolo puesto."""
    items = [Item(f"q{i}", "q", "g", ["f"], [], "hecho", "generada") for i in range(200)]
    ids = [i.id for i in items]
    rows = (_rows("ia_sola", 0.0, 0, ids) + _rows("bm25", 0.5, 1500, ids)
            + _rows("daimon", 0.5, 900, ids) + _rows("sesion", 1.0, 950, ids))
    s = report(rows, items, tmp_path / "r.md")
    assert s["verdict"] is True, s["reason"]
    md = (tmp_path / "r.md").read_text(encoding="utf-8")
    assert "entrega por la puerta" in md


def test_pareado_detecta_el_ruido():
    """El IC pareado es más estrecho que el de las medias sueltas: eso es lo que hace posible
    decidir un empate."""
    import random
    r = random.Random(11)
    n = 200
    ids = [f"q{i}" for i in range(n)]
    a = {i: (1.0 if r.random() < 0.8 else 0.0) for i in ids}
    b = {i: (1.0 if r.random() < 0.8 else 0.0) for i in ids}
    dif, lo, hi = paired_diff_ci(a, b)
    m1, l1, h1 = bootstrap_ci(list(a.values()))
    m2, l2, h2 = bootstrap_ci(list(b.values()))
    assert (h1 - l1) + (h2 - l2) > (hi - lo)   # el ruido de las medias sueltas es mayor
    assert lo <= dif <= hi
