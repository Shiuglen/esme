from daimon.hippocampus import Hippocampus
from daimon.ingest import Event
from daimon.lens import Lens
from tests.fakes import fake_encoder


def _ev(i, text, ts="2026-10-10T00:00:00Z"):
    return Event(f"id{i}", text, "test", "note", ts, 0.8)


def _hippo(tmp_path):
    enc, dim = fake_encoder(32)
    return Hippocampus(tmp_path / "mem.db", Lens(enc, dim))


def test_store_y_recall(tmp_path):
    h = _hippo(tmp_path)
    assert h.store([_ev(1, "laya es gratis y local"), _ev(2, "receta de arepas"), _ev(3, "precio del dolar")]) == 3
    hits = h.recall("laya gratis", k=3, hops=0)
    assert hits[0].event.id == "id1" and hits[0].hop == 0
    assert len(h) == 3


def test_recall_vacio(tmp_path):
    assert _hippo(tmp_path).recall("lo que sea") == []


def test_multisalto(tmp_path):
    h = _hippo(tmp_path)
    h.store([_ev(1, "alfa beta"), _ev(2, "beta gamma"), _ev(3, "gamma delta"), _ev(4, "zeta eta theta")])
    flat = [x.event.id for x in h.recall("alfa", k=1, hops=0)]
    deep = [x.event.id for x in h.recall("alfa", k=1, hops=2)]
    assert flat == ["id1"]
    assert "id3" in deep and "id4" not in deep


def test_forget_cascada(tmp_path):
    h = _hippo(tmp_path)
    h.store([_ev(1, "recuerdo original"), _ev(2, "resumen del recuerdo"), _ev(3, "reflexion sobre el resumen")])
    h.link("id2", "id1"); h.link("id3", "id2")
    cert = h.forget("id1")
    assert sorted(cert["forgotten"]) == ["id1", "id2", "id3"] and len(cert["sha256"]) == 64
    assert h.get("id1") is None and len(h) == 0
    assert h.store([_ev(1, "recuerdo original")]) == 0
    assert all(x.event.id != "id1" for x in h.recall("recuerdo original", k=5))


def test_persistencia(tmp_path):
    h = _hippo(tmp_path)
    h.store([_ev(1, "algo que recordar"), _ev(2, "otra cosa")])
    h2 = _hippo(tmp_path)
    assert len(h2) == 2 and h2.get("id1").text == "algo que recordar"
    assert h2.recall("algo que recordar", k=1, hops=0)[0].event.id == "id1"
    assert h2.vector("id1").shape == (32,)
    assert {e.id for e in h2.events()} == {"id1", "id2"}


def test_ids_por_contenido_y_bloqueo_tras_mover(tmp_path):
    from daimon.ingest import collect
    d = tmp_path / "src"; d.mkdir()
    f = d / "n.md"
    f.write_text("# A\n\nMi diagnostico medico es X y es privado.\n")
    h = _hippo(tmp_path)
    h.add_source_events(collect([f]))
    eid = h.events()[0].id
    h.forget(eid)
    f.write_text("# Nueva seccion arriba\n\nAlgo nuevo.\n\n# A\n\nMi diagnostico medico es X y es privado.\n")
    h.add_source_events(collect([f]))
    assert all("diagnostico" not in e.text for e in h.events())


def test_nota_editada_se_actualiza(tmp_path):
    from daimon.ingest import collect
    f = tmp_path / "n.md"
    f.write_text("# A\n\nEl precio es 79 dolares.\n")
    h = _hippo(tmp_path)
    h.add_source_events(collect([f]))
    f.write_text("# A\n\nEl precio es 99 dolares.\n")
    h.add_source_events(collect([f]))
    texts = [e.text for e in h.events()]
    assert any("99" in t for t in texts) and not any("79" in t for t in texts)


def test_dos_procesos_no_chocan(tmp_path):
    h1, h2 = _hippo(tmp_path), _hippo(tmp_path)
    h1.store([_ev(1, "uno")])
    assert h2.store([_ev(2, "dos")]) == 1
    h3 = _hippo(tmp_path)
    assert {e.id for e in h3.events()} == {"id1", "id2"} and len(h3.V) == 2
    assert not list(tmp_path.glob("*.tmp*"))
