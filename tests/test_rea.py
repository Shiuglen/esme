"""REA: entender un programa para que la mente lo sepa.

Estos tests fijan el contrato del espejo: lo que REA vio entra en la memoria con su procedencia,
lo que no se pudo ver también entra (es la mitad del conocimiento), y el informe no inventa nada
que no esté en la evidencia.
"""
import json
import subprocess
from pathlib import Path

import pytest

from daimon import rea
from daimon.gate import build_server
from daimon.home import Home
from tests.fakes import fake_encoder


# ── una evidencia pequeña y de mentira (pero con la forma real) ─────────────────────────────────

def _evidencia() -> dict:
    return {
        "evidence_id": "ev_123",
        "subject": {"name": "main", "local_path": "/tmp/app/out/main",
                    "digest": {"sha256": "a" * 64}, "format": "directory"},
        "confidence": "derived",
        "authority": "shipped-artifact",
        "limitations": ["Graph coverage is incomplete; unavailable facts remain explicit."],
        "normalized_result": {
            "summary": {
                "browser_windows": 2,
                "explicit_web_preferences": 4,
                "sender_validation_observations": 0,
                "ipc": {"literal_channels": 2, "main_handlers": 2, "dynamic_channel_operations": 0,
                       "paired_renderer_transmissions": 0, "unpaired_literal_renderer_transmissions": 0},
            },
            "statistics": {"relevant_files": 1, "parsed_javascript_files": 1, "skipped_javascript_files": 0,
                           "parse_failures": 0, "visited_ast_nodes": 100, "findings": 3, "text_bytes_read": 10},
            "graph": {
                "nodes": [
                    {"kind": "ipc-channel", "node_id": "n1", "observations": [
                        {"label": "hilos:buscar", "properties": {"channel": "hilos:buscar", "mode": "handle", "resolution": "literal"},
                         "evidence": {"location": {"available": True, "value": {"kind": "source-range", "source": "index.js",
                                                                             "start": {"line": 12, "column": 1}}}}}]},
                    {"kind": "ipc-channel", "node_id": "n2", "observations": [
                        {"label": "mente:recordar", "properties": {"channel": "mente:recordar", "mode": "handle", "resolution": "literal"},
                         "evidence": {"location": {"available": True, "value": {"kind": "source-range", "source": "index.js",
                                                                             "start": {"line": 30, "column": 1}}}}}]},
                    {"kind": "browser-window", "node_id": "w1", "observations": [
                        {"label": "BrowserWindow", "properties": {"source_path": "index.js", "options_status": "object-literal",
                                                                 "web_preferences": [{"name": "contextIsolation", "value": {"status": "literal", "value": True}}]},
                         "evidence": {"location": {"available": True, "value": {"kind": "source-range", "source": "index.js",
                                                                             "start": {"line": 90, "column": 1}}}}}]},
                ],
                "edges": [],
                "coverage": {"status": "partial", "truncated": False, "limits": []},
                "limitations": [],
            },
            "semantic_graph": {
                "nodes": [
                    {"kind": "function", "node_id": "f1", "label": None, "properties": {"name": "leerConfig"},
                     "identity": {"module_path": "index.js", "source_range": {"start": {"line": 5, "column": 1}}},
                     "evidence": {}},
                    {"kind": "function", "node_id": "f2", "label": "ayuda", "properties": {},
                     "identity": {"module_path": "index.js", "source_range": {"start": {"line": 7, "column": 1}}},
                     "evidence": {}},
                    {"kind": "binding", "node_id": "b1", "identity": {"module_path": "index.js"}, "properties": {}, "evidence": {}},
                ],
                "relations": [
                    {"source_node_id": "b1", "target_node_id": "f1", "relation": "calls", "resolution": "resolved", "properties": {}, "evidence": {}},
                    {"source_node_id": "b1", "target_node_id": "f2", "relation": "calls", "resolution": "resolved", "properties": {}, "evidence": {}},
                    {"source_node_id": "b1", "target_node_id": "f1", "relation": "calls", "resolution": "resolved", "properties": {}, "evidence": {}},
                ],
                "unknowns": [
                    {"node_id": "u1", "family": "call-flow", "reason": "dynamic-call", "detail": "Unsupported MemberExpression call target.",
                     "evidence": {"location": {"available": True, "value": {"kind": "source-range", "source": "index.js", "start": {"line": 40, "column": 1}}}}},
                    {"node_id": "u2", "family": "call-flow", "reason": "dynamic-call", "detail": "Unsupported MemberExpression call target.",
                     "evidence": {}},
                ],
                "coverage": {"status": "partial", "truncated": True, "limits": [{"name": "semantic_graph_node_ceiling", "value": 100000}]},
                "limitations": [],
            },
        },
    }


def _home(tmp_path):
    return Home(tmp_path, encoder=fake_encoder(32))


# ── el informe ─────────────────────────────────────────────────────────────────────────────────

def test_el_informe_dice_lo_que_vio():
    txt = rea.informe(_evidencia(), motivo="prueba")
    assert "`hilos:buscar`" in txt and "`mente:recordar`" in txt
    assert "index.js:12" in txt
    assert "leerConfig" in txt
    assert "contextIsolation=True" in txt
    assert "prueba" in txt                      # el motivo queda escrito


def test_el_informe_dice_tambien_lo_que_no_se_pudo_ver():
    """La mitad del conocimiento: los huecos, con su razón y su cantidad."""
    txt = rea.informe(_evidencia())
    assert "Lo que NO se pudo ver" in txt
    assert "dynamic-call" in txt
    assert "2" in txt.split("Desconocidos totales:")[1][:20]
    assert "Graph coverage is incomplete" in txt   # los límites de REA, sin parafrasear


def test_el_informe_no_inventa_lo_que_no_esta():
    ev = _evidencia()
    txt = rea.informe(ev)
    assert "canal-que-no-existe" not in txt
    assert "99 canales" not in txt


def test_un_canal_que_aparece_dos_vezes_cuenta_una():
    """El mismo canal lo ve el proceso principal y el renderer: contarlo dos veces sería mentir."""
    ev = _evidencia()
    ev["normalized_result"]["graph"]["nodes"].append({
        "kind": "ipc-channel", "node_id": "n1bis", "observations": [
            {"label": "hilos:buscar", "properties": {"channel": "hilos:buscar", "mode": "emit", "resolution": "literal"},
             "evidence": {}}]})
    txt = rea.informe(ev)
    frase = txt.split("## En una frase")[1].split("##")[0]
    assert "2 canales vistos" in frase
    assert txt.count("| `hilos:buscar` |") == 1


def test_los_numeros_son_los_de_la_evidencia():
    txt = rea.informe(_evidencia())
    frase = txt.split("## En una frase")[1].split("##")[0]
    assert "2 ventanas" in frase
    assert "2 canales IPC" in frase
    assert "2 funciones" in frase


def test_el_informe_acota_los_canales():
    ev = _evidencia()
    canales = [{"kind": "ipc-channel", "node_id": f"n{i}", "observations": [
        {"label": f"c:{i}", "properties": {"channel": f"c:{i}", "mode": "handle", "resolution": "literal"}, "evidence": {}}]}
        for i in range(300)]
    ev["normalized_result"]["graph"]["nodes"] = canales
    txt = rea.informe(ev)
    assert "c:0" in txt and "c:299" not in txt
    assert "canales más" in txt


# ── el comando ─────────────────────────────────────────────────────────────────────────────────

def test_analizar_avisa_si_el_programa_no_existe(tmp_path):
    with pytest.raises(rea.ErrorRea, match="no existe"):
        rea.analizar(tmp_path / "no-esta")


def test_analizar_avisa_si_no_es_un_programa(tmp_path):
    f = tmp_path / "notas.txt"
    f.write_text("hola")
    with pytest.raises(rea.ErrorRea, match="no es un programa"):
        rea.analizar(f)


class _ProcesoFalso:
    """Un REA de mentira: el test no lanza el motor de verdad (ni la JVM, ni 18 s de espera)."""

    def __init__(self, cmd, stdout=None, stderr=None, **kwargs):
        self.cmd = cmd
        self.visto = kwargs
        self.pid = 999999          # un pid que no existe: el vigilante no ve nada
        self.returncode = 0
        self._stdout = stdout
        self._stderr = stderr
        self._espera = kwargs.pop("espera", None)
        self._ya_vencio = False

    def wait(self, timeout=None):
        if self._espera and not self._ya_vencio:
            self._ya_vencio = True
            raise subprocess.TimeoutExpired(self.cmd, timeout or 0)
        return self.returncode

    def escribe(self, datos):
        self._stdout.write(json.dumps(datos).encode())


def _rea_falso(monkeypatch, *, evidencia=None, codigo=0, error="", espera=None):
    """Pone un REA de mentira en su sitio y devuelve dónde se vio lo que se le pasó."""
    visto = {}

    def Popen(cmd, stdout=None, stderr=None, **kwargs):
        if espera:
            kwargs["espera"] = espera
        p = _ProcesoFalso(cmd, stdout=stdout, stderr=stderr, **kwargs)
        visto["cmd"] = cmd
        visto["kwargs"] = kwargs
        visto["stdout"] = stdout
        visto["stderr"] = stderr
        if evidencia is not None:
            p.escribe(evidencia)
        if error:
            stderr.write(error.encode())
        p.returncode = codigo
        return p

    monkeypatch.setattr(rea.subprocess, "Popen", Popen)
    return visto


def test_analizar_usa_rea_con_la_version_fijada(tmp_path, monkeypatch):
    """La versión se fija: REA publica deprisa y una versión nueva puede romper el análisis."""
    app = tmp_path / "out"
    app.mkdir()
    (app / "index.js").write_text("console.log(1)")
    visto = _rea_falso(monkeypatch, evidencia=_evidencia())
    ev = rea.analizar(app)
    assert ev["evidence_id"] == "ev_123"
    assert visto["cmd"][0] in ("rea", "npx")
    if visto["cmd"][0] == "npx":
        assert f"rea-agents@{rea.VERSION}" in visto["cmd"]
    assert "--format" in visto["cmd"] and "json" in visto["cmd"]


def test_analizar_explica_el_fallo_de_rea(tmp_path, monkeypatch):
    app = tmp_path / "out"
    app.mkdir()
    _rea_falso(monkeypatch, codigo=1, error="boom")
    with pytest.raises(rea.ErrorRea, match="boom"):
        rea.analizar(app)


def test_analizar_no_guarda_la_salida_en_la_memoria_sino_en_un_fichero(tmp_path, monkeypatch):
    """La salida de REA pesa; si vive en la memoria, se multiplica por tres y mata el escritorio."""
    app = tmp_path / "out"
    app.mkdir()
    visto = _rea_falso(monkeypatch, evidencia=_evidencia())
    rea.analizar(app)
    # stdout es un fichero, no una tubería: la evidencia va a disco y se lee después
    assert visto["stdout"] is not None
    assert visto["stdout"].name.endswith("evidencia.json")
    assert "capture_output" not in visto["kwargs"]


def test_analizar_mata_al_grupo_entero_cuando_se_pasa_de_tiempo(tmp_path, monkeypatch):
    """El fin de tiempo mata al padre Y a sus hijos: si no, Ghidra sigue comiendo CPU huérfano."""
    app = tmp_path / "out"
    app.mkdir()
    _rea_falso(monkeypatch, evidencia=_evidencia(), espera=True)
    with pytest.raises(rea.ErrorRea, match="tardó más"):
        rea.analizar(app, timeout=1)


def test_analizar_dice_el_motivo_real_cuando_rea_no_puede(tmp_path, monkeypatch):
    """REA contesta con su propio error en JSON: se enseña su motivo, no «Analysis failed»."""
    app = tmp_path / "out"
    app.mkdir()
    _rea_falso(monkeypatch, evidencia={
        "error": "Analysis failed", "code": "provider_unavailable",
        "message": "The selected analysis provider is unavailable.",
        "details": {"rejections": [
            {"provider_id": "ghidra", "code": "not_configured",
             "reason": "Set GHIDRA_INSTALL_DIR to an extracted Ghidra 12.1.x release directory."}]},
    })
    with pytest.raises(rea.ErrorRea, match="GHIDRA_INSTALL_DIR"):
        rea.analizar(app)


def test_analizar_no_empieza_si_la_maquina_no_tiene_memoria(tmp_path, monkeypatch):
    """Si la memoria no da, el espejo dice que no: no es él quien decide a quién mata el OOM."""
    app = tmp_path / "out"
    app.mkdir()
    _rea_falso(monkeypatch, evidencia=_evidencia())
    monkeypatch.setattr(rea.presupuesto, "hay_suelo", lambda: (False, "no hay memoria"))
    with pytest.raises(rea.ErrorRea, match="no hay memoria"):
        rea.analizar(app)


def test_analizar_no_hay_dos_a_la_vez(tmp_path, monkeypatch):
    """Un análisis a la vez en toda la máquina: tres REA a la vez son los que mataron el escritorio."""
    app = tmp_path / "out"
    app.mkdir()
    _rea_falso(monkeypatch, evidencia=_evidencia())

    class _Ocupado:
        def __enter__(self):
            raise rea.presupuesto.Ocupado("ya hay un análisis en marcha")

        def __exit__(self, *a):
            return False

    monkeypatch.setattr(rea.presupuesto, "candado", lambda **k: _Ocupado())
    with pytest.raises(rea.ErrorRea, match="ya hay un análisis en marcha"):
        rea.analizar(app)


# ── el espejo no se limita a un tipo de programa ────────────────────────────────────────────────

def test_el_espejo_mira_cualquier_programa_no_solo_apps_electron(tmp_path):
    """Un binario no es «un Electron con cero ventanas»: se mira con el motor que le toca."""
    app = tmp_path / "out"
    app.mkdir()
    assert rea.plan_de(app)[0] == "analyze-javascript-application"
    binario = tmp_path / "programa"
    binario.write_bytes(b"\x7fELF\x02\x01\x01" + b"\x00" * 64)
    assert rea.plan_de(binario)[0] == "analyze"


def test_el_entorno_de_rea_encuentra_su_motor_nativo(tmp_path, monkeypatch):
    """Ghidra y el JDK vivían sólo en la terminal del creador: la app heredaba otro entorno."""
    casa = tmp_path / "Applications" / "ghidra"
    (casa / "ghidra_12.1.4_PUBLIC").mkdir(parents=True)
    (casa / "jdk-21.0.12.1+1").mkdir()
    (casa / "pwn-venv" / "bin").mkdir(parents=True)
    monkeypatch.setenv("HOME", str(tmp_path))
    monkeypatch.delenv("GHIDRA_INSTALL_DIR", raising=False)
    monkeypatch.delenv("JAVA_HOME", raising=False)
    monkeypatch.delenv("REA_PWNTOOLS_PYTHON", raising=False)
    ent = rea.entorno_rea()
    assert ent["GHIDRA_INSTALL_DIR"].endswith("ghidra_12.1.4_PUBLIC")
    assert ent["JAVA_HOME"].endswith("jdk-21.0.12.1+1")
    assert ent["REA_PWNTOOLS_PYTHON"].endswith("pwn-venv/bin/python")
    assert ent["PATH"].split(":")[0].endswith("jdk-21.0.12.1+1/bin")


def test_el_informe_de_un_binario_no_dice_que_es_electron():
    """El informe dice lo que vio. Antes decía «un programa Electron» de todo, y mentía."""
    ev = {
        "evidence_id": "ev_bin", "confidence": "derived", "authority": "shipped-artifact",
        "subject": {"name": "programa", "local_path": "/usr/bin/programa", "format": "elf",
                    "architecture": "x86_64", "digest": {"sha256": "b" * 64}},
        "analysis_profile": {"provider": {"id": "rea-workflow", "name": "REA composed investigation workflow",
                                          "version": "1"},
                             "parameters": {"upstream_analysis_profile": {
                                 "provider": {"id": "ghidra", "name": "Ghidra", "version": "12.1.4"}}}},
        "operation": "read_binary_inventory_summary",
        "normalized_result": {"image_base": "0x100000", "segment_count": 2, "procedure_count": 134,
                              "string_count": 132, "document": "el texto del motor",
                              "segments": [{"name": "s1", "start": "0x100000", "end": "0x100350",
                                            "length": 848, "address_space": "ram"}]},
        "limitations": ["No se vio todo lo empaquetado."],
    }
    texto = rea.informe(ev)
    assert "Electron" not in texto
    assert "elf" in texto and "x86_64" in texto
    assert "Ghidra 12.1.4" in texto
    assert "134 procedimientos" in texto
    assert "No se vio todo lo empaquetado." in texto


def test_la_comparacion_de_dos_binarios_no_habla_de_canales():
    """Comparar dos binarios con la cuenta de las apps daba ceros que parecían verdades."""
    antes = {"clase": "nativo", "programa": "/bin/a", "segmentos": {"s1": {"inicio": "0x1000", "longitud": 10}},
             "procedimientos": 10, "cadenas": 5, "formato": "elf", "arquitectura": "x86_64"}
    despues = {"clase": "nativo", "programa": "/bin/b", "segmentos": {"s1": {"inicio": "0x2000", "longitud": 20},
               "s2": {"inicio": "0x3000", "longitud": 5}},
               "procedimientos": 12, "cadenas": 5, "formato": "elf", "arquitectura": "x86_64"}
    texto = rea.comparar(antes, despues)
    assert "canal" not in texto
    assert "s2" in texto
    assert "0x1000" in texto and "0x2000" in texto


# ── la absorción ───────────────────────────────────────────────────────────────────────────────

def test_ingerir_deja_el_conocimiento_con_su_procedencia(tmp_path):
    h = _home(tmp_path)
    r = rea.ingerir(h, _evidencia(), "/tmp/app/out/main", motivo="porque sí")
    assert r["added"] > 0
    assert r["fuente"].startswith("rea:")
    fuentes = {e.source for e in h.hippo.events()}
    assert fuentes == {r["fuente"]}
    assert Path(r["informe"]).exists()


def test_reabsorber_actualiza_en_vez_de_duplicar(tmp_path):
    """La misma fuente entra otra vez: lo que cambió se actualiza, lo que no, se queda."""
    h = _home(tmp_path)
    ev = _evidencia()
    primero = rea.ingerir(h, ev, "/tmp/app/out/main")
    segundo = rea.ingerir(h, ev, "/tmp/app/out/main")
    assert segundo["fuente"] == primero["fuente"]
    assert len(h.hippo) == len({e.id for e in h.hippo.events()})


def test_cada_recuerdo_sabe_de_que_apartado_viene(tmp_path):
    """Sin el título del apartado, una fila suelta no sabe de qué es: la mente no la encuentra."""
    h = _home(tmp_path)
    rea.ingerir(h, _evidencia(), "/tmp/app/out/main")
    textos = [e.text for e in h.hippo.events()]
    assert any(t.startswith("La superficie: los canales IPC.") for t in textos)
    assert any("hilos:buscar" in t and "La superficie" in t for t in textos)


def test_una_version_reducida_al_lado_del_informe(tmp_path):
    """Cada absorción deja su versión: sin eso no se puede comparar dos builds."""
    h = _home(tmp_path)
    r = rea.ingerir(h, _evidencia(), "/tmp/app/out/main", motivo="versión A")
    version = Path(r["version"])
    assert version.exists()
    guardado = json.loads(version.read_text(encoding="utf-8"))
    assert guardado["canales"] and "hilos:buscar" in guardado["canales"]
    assert guardado["programa"] == "/tmp/app/out/main"


def test_comparar_dos_versiones_dice_que_cambio(tmp_path):
    h = _home(tmp_path)
    ev_a = _evidencia()
    ev_b = json.loads(json.dumps(ev_a))
    # la versión B tiene un canal más
    nodos = ev_b["normalized_result"]["graph"]["nodes"]
    nodos.append({"kind": "ipc-channel", "node_id": "nuevo", "observations": [
        {"label": "canal:nuevo", "properties": {"channel": "canal:nuevo", "mode": "handle", "resolution": "literal"},
         "evidence": {}}]})
    rea.ingerir(h, ev_a, "/tmp/app/out/main", motivo="A")
    rea.ingerir(h, ev_b, "/tmp/app/out/main", motivo="B")
    assert len(rea.versiones(h, "/tmp/app/out/main")) == 2
    texto, clave = rea.comparar_versiones(h, "/tmp/app/out/main")
    assert "`canal:nuevo`" in texto
    assert "1 canal nuevo" in texto
    # y el «qué cambió» entra en la memoria con su procedencia
    r = rea.ingerir_comparacion(h, texto, clave)
    assert r["added"] > 0
    assert any(e.source.startswith("rea:comparacion:") for e in h.hippo.events())


def test_una_ventana_que_gana_una_preferencia_no_es_una_ventana_nueva():
    """Las ventanas se emparejan por parecido, no por igualdad: los valores cambian en cada
    compilación (y una ventana que gana una preferencia sigue siendo la misma ventana)."""
    antes = {"ventanas": [{"sitio": "a", "prefs": ["contextIsolation=True", "nodeIntegration=False",
                                                   "sandbox=True", "webSecurity=True"]}]}
    despues = {"ventanas": [{"sitio": "b", "prefs": ["additionalArguments=[...]", "contextIsolation=True",
                                                     "nodeIntegration=False", "sandbox=True",
                                                     "webSecurity=True"]}]}
    texto = rea.comparar(antes, despues)
    assert "1 ventana nueva" not in texto
    assert "0 ventanas nuevas" in texto
    assert "cambió" in texto


def test_una_ventana_de_verdad_nueva_se_dice_nueva():
    antes = {"ventanas": [{"sitio": "a", "prefs": ["contextIsolation=True", "nodeIntegration=False",
                                                   "sandbox=True", "webSecurity=True"]}]}
    despues = {"ventanas": [{"sitio": "b", "prefs": ["offscreen=True", "session=sessionForPictures()",
                                                     "spellcheck=False"]}]}
    texto = rea.comparar(antes, despues)
    assert "1 ventana nueva" in texto
    assert "offscreen" in texto


def test_la_mente_recuerda_lo_absorbido(tmp_path):
    """Lo absorbido se puede preguntar después: para eso sirve."""
    h = _home(tmp_path)
    rea.ingerir(h, _evidencia(), "/tmp/app/out/main", motivo="porque sí")
    from daimon.gate import recall_tool
    salida = recall_tool(h, "canales IPC", 800)
    assert "hilos:buscar" in salida


# ── la puerta: el agente lo llama ───────────────────────────────────────────────────────────────

def test_la_herramienta_mcp_absorbe_un_programa(tmp_path, monkeypatch):
    monkeypatch.setattr(rea, "analizar", lambda ruta, **k: _evidencia())
    h = _home(tmp_path)
    srv = build_server(h)
    import asyncio
    res = asyncio.run(srv.call_tool("esme_absorbe_programa", {"ruta": "/tmp/app/out/main", "motivo": "curiosidad"}))
    texto = str(res)
    assert '"added"' in texto
    assert any(e.source.startswith("rea:") for e in h.hippo.events())


def test_la_herramienta_explica_cuando_rea_no_puede(tmp_path, monkeypatch):
    def falla(ruta, **k):
        raise rea.ErrorRea("no existe el programa")
    monkeypatch.setattr(rea, "analizar", falla)
    h = _home(tmp_path)
    srv = build_server(h)
    import asyncio
    res = asyncio.run(srv.call_tool("esme_absorbe_programa", {"ruta": "/nada"}))
    assert "no pudo analizar" in str(res)
