from pathlib import Path

from daimon.ingest import chunk, collect, from_claude_jsonl, from_markdown

FIX = Path(__file__).parent / "fixtures"


def test_chunk_respeta_tamano():
    words = [f"w{i}" for i in range(500)]
    parts = chunk(" ".join(words), max_words=160, overlap=30)
    assert all(len(p.split()) <= 160 for p in parts)
    assert parts[1].split()[0] == words[130]
    assert parts[-1].split()[-1] == "w499"


def test_chunk_corto():
    assert chunk("hola mundo") == ["hola mundo"]
    assert chunk("   ") == []


def test_markdown_eventos():
    evs = from_markdown(FIX / "nota.md")
    assert evs and all(e.kind == "note" and e.source == str(FIX / "nota.md") for e in evs)
    assert len({e.id for e in evs}) == len(evs)


def test_jsonl_usuario_y_ia():
    evs = from_claude_jsonl(FIX / "sesion.jsonl")
    kinds = sorted(e.kind for e in evs)
    assert kinds == ["ai_msg", "user_msg"]
    user = next(e for e in evs if e.kind == "user_msg")
    assert user.trust == 1.0 and user.ts.startswith("2026-10-10")


def test_collect_excluye_y_redacta():
    evs = collect([FIX])
    text = "\n".join(e.text for e in evs)
    assert "FirmeDigital" not in text
    assert "sk-ant" not in text and "[SECRET_REDACTED]" in text
    assert "Laya" in text


def test_ruta_excluida_no_entra():
    evs = collect([FIX / "excluida"])
    assert not any("FirmeDigital-notas" in e.source for e in evs)


def test_nota_con_un_trozo_excluido_se_descarta_entera():
    evs = collect([FIX / "excluida"])
    assert not any(e.source.endswith("mezcla.md") for e in evs)


def test_secreto_partido_entre_trozos():
    from daimon.ingest import from_markdown
    import tempfile
    filler = " ".join(f"w{i}" for i in range(129))
    p = Path(tempfile.mkdtemp()) / "s.md"
    p.write_text(filler + " password: hunter2xyz " + " ".join(f"v{i}" for i in range(200)))
    evs = collect([p])
    assert evs and all("hunter2xyz" not in e.text for e in evs)
