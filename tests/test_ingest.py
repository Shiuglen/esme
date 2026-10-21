from pathlib import Path

from daimon.ingest import Event, collect, from_claude_jsonl, from_markdown, sin_boilerplate
from daimon.troceo import trocea

FIX = Path(__file__).parent / "fixtures"


def test_trocea_por_filas_de_tabla():
    """El hallazgo del 12-oct: la tabla entra POR FILAS (antes iba entera y no pasaba el presupuesto)."""
    doc = "| Área | Estado |\n|---|---|\n| Red | hecha |\n| Prueba 0 | a medias |"
    trozos = trocea("doc", doc)
    filas = [t for t in trozos if t.tipo == "fila-tabla"]
    assert [t.texto for t in filas] == ["| Área | Estado |", "| Red | hecha |", "| Prueba 0 | a medias |"]
    # el separador de cabecera no es el oro de nadie
    assert all(not t.texto.startswith("|---") for t in trozos)


def test_trocea_por_apartados_y_parrafos():
    doc = "# Título\n\nUn párrafo.\n\n## Otro\n\nMás texto."
    trozos = trocea("doc", doc)
    assert [t.texto for t in trozos] == ["Un párrafo.", "Más texto."]
    assert trozos[0].fuente == "doc#titulo"
    assert trozos[1].fuente == "doc#otro"


def test_trocea_vacio():
    assert trocea("doc", "   ") == []


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


def test_nota_con_un_trozo_excluido_conserva_el_resto():
    # Un fragmento prohibido ya no tira la nota entera: solo cae el trozo culpable.
    evs = collect([FIX / "excluida"])
    assert any("Una línea normal" in e.text for e in evs)
    assert any("Texto inocente" in e.text for e in evs)
    assert not any("FirmeDigital" in e.text for e in evs)
    assert not any("El deploy de" in e.text for e in evs)


def test_ingiere_codigo_config_y_texto(tmp_path):
    (tmp_path / "a.py").write_text("def hola():\n    return 'mundo'\n")
    (tmp_path / "b.toml").write_text("[herramienta]\nnombre = 'daimon'\n")
    (tmp_path / "c.txt").write_text("una nota suelta\n")
    (tmp_path / "d.yaml").write_text("clave: valor\n")
    evs = collect([tmp_path])
    fuentes = {Path(e.source).name for e in evs}
    assert {"a.py", "b.toml", "c.txt", "d.yaml"} <= fuentes
    assert any("mundo" in e.text for e in evs)


def test_fichero_enorme_se_salta(tmp_path):
    (tmp_path / "enorme.txt").write_text("x" * (2 * 1024 * 1024 + 10))
    (tmp_path / "normal.txt").write_text("esto sí entra\n")
    evs = collect([tmp_path])
    assert {Path(e.source).name for e in evs} == {"normal.txt"}


def test_secreto_partido_entre_trozos():
    from daimon.ingest import from_markdown
    import tempfile
    filler = " ".join(f"w{i}" for i in range(129))
    p = Path(tempfile.mkdtemp()) / "s.md"
    p.write_text(filler + " password: hunter2xyz " + " ".join(f"v{i}" for i in range(200)))
    evs = collect([p])
    assert evs and all("hunter2xyz" not in e.text for e in evs)


def test_las_urls_rotas_del_harvest_se_vuelven_a_pegar():
    # el harvest trocea el texto del post: la URL llega partida en varias líneas
    from daimon.x import repara_urls
    roto = "¡Prueba esto! \nhttps://\ngithub.com/segfault42/hel\niosgen\n…\n\nCódigo abierto"
    arreglado = repara_urls(roto)
    assert "https://github.com/segfault42/heliosgen" in arreglado
    assert "https://\n" not in arreglado
    # y un texto normal no se toca
    assert repara_urls("una línea\notra línea") == "una línea\notra línea"


def test_el_boilerplate_repetido_no_entra_dos_veces():
    """Absorber un documento largo mete ruido: catorce variantes del mismo texto de móvil llenaban
    la memoria, y el recall respondía con eso en vez de con lo que importaba."""
    base = "Deska mobile 1.3.0. - `deska-1.3.0-android.apk`: direct install on Android (sideload)."
    evs = [Event(f"e{i}", base.replace("1.3.0", f"1.{i}.0"), "doc", "doc", "2026-10-21", 0.8)
           for i in range(2, 16)]
    quedan = sin_boilerplate(evs)
    assert len(quedan) == 1


def test_lo_que_se_parece_pero_viene_de_otro_fichero_se_queda():
    """La puerta es por fuente: dos documentos que hablan de lo mismo son dos recuerdos, no uno."""
    texto = "El agente guarda sus skills mientras aprende y cada skill nueva es un fichero."
    evs = [Event("a", texto, "doc1", "doc", "2026-10-21", 0.8),
           Event("b", texto, "doc2", "doc", "2026-10-21", 0.8)]
    assert len(sin_boilerplate(evs)) == 2


def test_lo_que_es_distinto_se_queda():
    evs = [Event("a", "El agente guarda sus skills mientras aprende y cada skill nueva es un fichero.", "doc", "doc", "2026-10-21", 0.8),
           Event("b", "La jaula del agente: el HOME, las claves SSH y el llavero se quedan fuera.", "doc", "doc", "2026-10-21", 0.8)]
    assert len(sin_boilerplate(evs)) == 2
