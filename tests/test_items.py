import json
from pathlib import Path

from daimon.bench.items import Item, is_hidden, load, mine_user_questions, save, validate

FIX = Path(__file__).parent / "fixtures"


def _item(**kw):
    base = dict(id="q1", question="¿Por qué Laya?", gold="Porque es gratis y local.", key_facts=["gratis", "local"],
                evidence=["e1"], type="porque", origin="real")
    base.update(kw)
    return Item(**base)


def test_hidden_estable_y_30pct():
    ids = [f"item{i}" for i in range(1000)]
    frac = sum(map(is_hidden, ids)) / 1000
    assert 0.25 <= frac <= 0.35
    assert [is_hidden(i) for i in ids[:50]] == [is_hidden(i) for i in ids[:50]]


def test_validate_ok_y_problemas():
    assert validate(_item()) == []
    assert validate(_item(question=""))
    assert validate(_item(key_facts=[]))
    assert validate(_item(gold="Lo dijo FirmeDigital"))
    assert validate(_item(question="clave sk-ant-api03-XXXXXXXXXXXXXXXX"))
    assert validate(_item(type="otro"))


def test_save_load(tmp_path):
    p = tmp_path / "items.jsonl"
    save([_item(), _item(id="q2")], p)
    got = load(p)
    assert [i.id for i in got] == ["q1", "q2"] and got[0].key_facts == ["gratis", "local"]


def test_mine():
    cands = mine_user_questions([FIX / "sesion.jsonl"])
    assert len(cands) == 1
    c = cands[0]
    assert c["question"].startswith("¿Por qué") and "Laya" in c["followup_ai_text"]
