"""REA: entender un programa para que la mente lo sepa.

REA (*Reverse Engineer Anything*, MIT, `rea-agents` 6.7.0) devuelve un grafo de lo que ve de un
programa: módulos, funciones, canales IPC, ventanas — cada conclusión **con su evidencia** y **con
los límites de esa evidencia**. Aquí ese grafo se convierte en un informe que **la mente absorbe**:
el programa deja de ser una caja negra y pasa a ser conocimiento de Esme, con su procedencia, y
cualquier agente puede preguntarle después por él.

Por qué así y no como receta manual: una receta se ejecuta cuando alguien se acuerda. Un
**agente** que puede absorber el conocimiento de cualquier programa es lo que hace que Esme
escale: cada programa entendido deja de ser un problema y se convierte en material.

El espejo **no limita a nadie**: mira lo que le pidan mirar —una app Electron, un binario
nativo, un APK, un paquete, una web—, sin listas de rutas permitidas ni advertencias de
techo. El motivo con el que se pide queda escrito en el informe y viaja con la evidencia, así
que siempre se sabe **por qué** se miró y **con qué autorización**. Lo que la casa no hace es
lo otro: Esme no escribe malware, no roba credenciales, no rompe DRM y no toca la vida ni los
datos de terceros. Esme **se escribe sola, no se copia**.
"""
from __future__ import annotations

import contextlib
import hashlib
import json
import os
import re
import shutil
import subprocess
import tempfile
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

from . import presupuesto
from .immune import TRUST, clean, redact
from .ingest import Event
from .troceo import slug, trocea

VERSION = "6.7.0"
# El grafo semántico no crece sin límite: 20.000 nodos bastan para entender un programa y
# mantienen el análisis dentro de la memoria de esta máquina (la regla es «casi no consumir»).
LIMITE_NODOS = 20_000
TIMEOUT = 900          # segundos: el análisis de una app entera tarda minutos
MAX_CANALES = 200      # el informe entra en la memoria: no cabe un volcado entero
MAX_FUNCIONES = 25
MAX_SEGMENTOS = 200    # los segmentos de un binario: también se acotan (hay binarios con miles)
MAX_DOCUMENTO = 20_000  # el documento que devuelve el motor nativo, en caracteres
MAX_LIMITES = 40       # los límites que declara la evidencia: son largos y se cortan
MAX_CAMPOS = 60        # las filas del resumen genérico


class ErrorRea(RuntimeError):
    """REA no pudo analizar. El motivo va en el mensaje, para que el agente lo sepa y no repita."""


# ── el comando ─────────────────────────────────────────────────────────────────────────────────

def comando_rea() -> list[str]:
    """El binario de REA: el que está instalado si lo hay; si no, npx con la versión fijada."""
    if shutil.which("rea"):
        return ["rea"]
    casa = Path.home() / ".local" / "bin" / "rea"
    if casa.exists():
        return [str(casa)]
    return ["npx", "-y", f"rea-agents@{VERSION}"]


def entorno_rea() -> dict[str, str]:
    """El entorno que REA necesita para encontrar su motor nativo (Ghidra, el JDK, pwntools).

    Estas variables vivían sólo en la terminal del creador. La app, el servidor y el Taller
    heredan otro entorno, así que REA no encontraba a Ghidra y contestaba `provider_unavailable`
    —el espejo se quedaba ciego sin decir por qué—. Aquí se buscan solas y se le pasan al hijo.
    """
    ent = dict(os.environ)
    base = Path.home() / "Applications" / "ghidra"
    if base.is_dir():
        if not ent.get("GHIDRA_INSTALL_DIR"):
            for c in sorted(base.glob("ghidra_*_PUBLIC")):
                ent["GHIDRA_INSTALL_DIR"] = str(c)
                break
        if not ent.get("JAVA_HOME"):
            for c in sorted(base.glob("jdk-*")):
                ent["JAVA_HOME"] = str(c)
                break
        if not ent.get("REA_PWNTOOLS_PYTHON"):
            for c in sorted(base.glob("pwn-venv")):
                ent["REA_PWNTOOLS_PYTHON"] = str(c / "bin" / "python")
                break
    if ent.get("JAVA_HOME"):
        ent["PATH"] = f"{ent['JAVA_HOME']}/bin:{ent.get('PATH', '')}"
    casa = Path.home() / ".local" / "bin"
    if casa.is_dir():
        ent["PATH"] = f"{casa}:{ent.get('PATH', '')}"
    return ent


# Los ficheros que sí son programa: un binario tiene una firma, no un texto.
_MAGICOS = (b"\x7fELF", b"MZ", b"\xca\xfe\xba\xbe", b"\xcf\xfa\xed\xfe",
            b"\xce\xfa\xed\xfe", b"PK\x03\x04", b"dex\n", b"\x00asm")


def _parece_texto(ruta: Path) -> bool:
    """¿Es un fichero de texto? Un programa de verdad no lo es (y una nota no se puede mirar)."""
    try:
        cabeza = ruta.open("rb").read(4096)
    except OSError:
        return False
    if not cabeza:
        return True
    if cabeza.startswith(_MAGICOS):
        return False
    try:
        cabeza.decode("utf-8")
    except UnicodeDecodeError:
        return False
    return sum(1 for b in cabeza if b < 9 or (13 < b < 32)) < len(cabeza) * 0.05


def plan_de(ruta: Path, *, nodos: int = LIMITE_NODOS) -> list[str]:
    """El comando de REA que corresponde al programa.

    El espejo no se limita a un tipo de programa: una app Electron se reconstruye con su grafo
    semántico; un binario nativo (ELF, PE, Mach-O, .NET), un APK o un paquete se miran con el
    motor de Ghidra. Lo que no sepa REA lo dirá REA, no el espejo.
    """
    if ruta.is_dir() or ruta.suffix.lower() == ".asar":
        return ["analyze-javascript-application", str(ruta), "--format", "json",
                "--max-semantic-nodes", str(nodos)]
    return ["analyze", str(ruta), "--format", "json"]


def nodos_segun_memoria(nodos: int) -> int:
    """El presupuesto de nodos se ajusta a la memoria que hay: si la máquina va justa, se mira menos."""
    libre = presupuesto.memoria_disponible()
    gib = 1024 ** 3
    if not libre:
        return nodos
    if libre < 6 * gib:
        return max(2_000, nodos // 4)
    if libre < 10 * gib:
        return max(4_000, nodos // 2)
    return nodos


def _motivo_de_error(datos: dict) -> str:
    """El error de REA con sus palabras y el consejo de arreglo, no un «Analysis failed»."""
    partes = [str(datos.get("message") or datos.get("error") or "REA no pudo analizar el programa")]
    detalles = datos.get("details") or {}
    for rechazo in detalles.get("rejections") or []:
        proveedor = rechazo.get("provider_id") or "?"
        codigo = rechazo.get("code") or "?"
        razon = rechazo.get("reason") or ""
        partes.append(f"{proveedor}: {codigo}" + (f" — {razon}" if razon else ""))
    return " · ".join(partes)


def analizar(ruta: str | Path, *, timeout: int = TIMEOUT, nodos: int = LIMITE_NODOS,
             esperar: float = 0.0) -> dict:
    """Analiza un programa y devuelve su evidencia (el sobre JSON de REA).

    El espejo no se come la máquina: comprueba que hay memoria, toma el cerrojo (un análisis a la
    vez en toda la máquina), pone un tope al proceso hijo, escribe la salida a disco —no a la
    memoria— y deja muerto al grupo entero de procesos si algo se pasa.
    """
    with _candado(esperar):
        return _analizar_bajo_candado(ruta, timeout=timeout, nodos=nodos)


@contextlib.contextmanager
def _candado(espera: float = 0.0):
    """El cerrojo de máquina, con sus errores traducidos a los del espejo."""
    try:
        with presupuesto.candado(espera=espera):
            yield
    except presupuesto.Ocupado as e:
        raise ErrorRea(f"{e}: espera a que termine y vuelve a intentarlo") from None
    except presupuesto.PresupuestoInsuficiente as e:
        raise ErrorRea(f"no se puede mirar ahora: {e}") from None


def _analizar_bajo_candado(ruta: str | Path, *, timeout: int, nodos: int) -> dict:
    """El análisis con el cerrojo ya tomado: así una comparación no suelta la máquina en medio."""
    ruta = Path(ruta).expanduser()
    if not ruta.exists():
        raise ErrorRea(f"no existe el programa: {ruta}")
    if ruta.is_file() and _parece_texto(ruta):
        raise ErrorRea(f"eso no es un programa que REA sepa mirar: {ruta}")
    return _mirar(ruta, timeout=timeout, nodos=nodos)


def correr(command: list[str], *, timeout: int = TIMEOUT) -> tuple[int, str, str]:
    """Un comando de REA cualquiera, con el presupuesto de la casa puesto.

    El espejo protege las puertas de Esme (la app, el servidor, el MCP, la terminal). Esto
    protege las de fuera: un `rea` a pelo, desde un script o desde otra sesión, es exactamente
    lo que se comió la memoria el 21-oct. Mismos topes, mismo cerrojo, mismo final.
    """
    with _candado():
        hay, porque = presupuesto.hay_suelo()
        if not hay:
            raise ErrorRea(f"no se puede mirar ahora: {porque}")
        tope = presupuesto.tope_memoria()
        ent = entorno_rea()
        with tempfile.TemporaryDirectory(prefix="rea-shell-") as tmp:
            salida = Path(tmp) / "salida.txt"
            errores = Path(tmp) / "errores.txt"
            with salida.open("wb") as f_out, errores.open("wb") as f_err:
                try:
                    proc = subprocess.Popen(command, stdout=f_out, stderr=f_err, stdin=subprocess.DEVNULL,
                                            env=ent, start_new_session=True)
                except FileNotFoundError:
                    raise ErrorRea(f"no se encontró el comando: {command[0]}") from None
                with presupuesto.Vigilante(proc.pid, tope) as vigila:
                    try:
                        proc.wait(timeout=timeout)
                    except subprocess.TimeoutExpired:
                        presupuesto.mata_todo(proc.pid, vigila.vistos)
                        proc.wait(timeout=15)
                        raise ErrorRea(f"el comando tardó más de {timeout} s y se paró") from None
                    if vigila.excedido:
                        presupuesto.mata_todo(proc.pid, vigila.vistos)
                        raise ErrorRea(f"el comando pasó de {tope // (1024 * 1024)} MiB de memoria y se paró")
            return (proc.returncode,
                    salida.read_text(encoding="utf-8", errors="replace"),
                    errores.read_text(encoding="utf-8", errors="replace"))


def _mirar(ruta: Path, *, timeout: int, nodos: int) -> dict:
    """El análisis, con el gobernador puesto. La salida va a disco: la memoria no se toca."""
    cmd = comando_rea() + plan_de(ruta, nodos=nodos_segun_memoria(nodos))
    ent = entorno_rea()
    hay, porque = presupuesto.hay_suelo()
    if not hay:
        raise ErrorRea(f"no se puede mirar ahora: {porque}")
    tope = presupuesto.tope_memoria()
    with tempfile.TemporaryDirectory(prefix="rea-") as tmp:
        salida = Path(tmp) / "evidencia.json"
        errores = Path(tmp) / "errores.txt"
        with salida.open("wb") as f_out, errores.open("wb") as f_err:
            try:
                proc = subprocess.Popen(
                    cmd, stdout=f_out, stderr=f_err, stdin=subprocess.DEVNULL,
                    env=ent, start_new_session=True,
                )
            except FileNotFoundError:
                raise ErrorRea("no se encontró el motor de REA (¿está instalado `rea`?)") from None
            with presupuesto.Vigilante(proc.pid, tope) as vigila:
                try:
                    proc.wait(timeout=timeout)
                except subprocess.TimeoutExpired:
                    presupuesto.mata_todo(proc.pid, vigila.vistos)
                    proc.wait(timeout=15)
                    raise ErrorRea(f"REA tardó más de {timeout} s y se paró "
                                   f"(mira un programa más pequeño)") from None
                if vigila.excedido:
                    presupuesto.mata_todo(proc.pid, vigila.vistos)
                    raise ErrorRea(f"el análisis pasó de {tope // (1024 * 1024)} MiB de memoria y se paró "
                                   f"(mira un programa más pequeño)")
        datos = None
        try:
            with salida.open("r", encoding="utf-8") as f:
                datos = json.load(f)
        except (json.JSONDecodeError, OSError, UnicodeDecodeError):
            datos = None
        if isinstance(datos, dict) and datos.get("error"):
            raise ErrorRea(_motivo_de_error(datos))
        if datos is None:
            detalle = (errores.read_text(errors="replace") or "").strip().splitlines()
            if proc.returncode != 0:
                raise ErrorRea(f"REA no pudo analizar el programa: "
                               f"{detalle[-1] if detalle else 'sin explicación'}")
            raise ErrorRea("REA no devolvió evidencia legible (su salida no es JSON)")
        return datos


# ── el informe: del grafo a palabras ──────────────────────────────────────────────────────────

def _n(x: object) -> str:
    """Un número como lo escribe una persona: 20.175, no 20175."""
    try:
        return f"{int(x):,}".replace(",", ".")
    except (TypeError, ValueError):
        return str(x)


def _p(n: int, singular: str, plural: str) -> str:
    """«1 fichero» y «2 ficheros»: el número y la palabra, de acuerdo."""
    return f"{_n(n)} {singular if n == 1 else plural}"


def _en_trozos(elementos: list[str], prefijo: str, por: int = 12) -> list[str]:
    """Una lista larga, partida en trozos que se puedan recuperar.

    Una lista de 123 nombres en un solo párrafo es un recuerdo que el motor no trae: se le
    diluye el significado (el codificador promedia) y el buscador lo penaliza por largo. Con
    doce por trozo y el prefijo repetido, cada trozo se parece a la pregunta y entra solo.
    """
    if not elementos:
        return []
    trozos = []
    total = (len(elementos) + por - 1) // por
    for i in range(0, len(elementos), por):
        parte = elementos[i:i + por]
        trozos.append(f"{prefijo} ({i // por + 1} de {total}): " + ", ".join(parte) + ".")
    return trozos


def _sitio(evidencia: dict) -> str:
    """Dónde está lo visto: «index.js:10757» (o vacío si la evidencia no lo dice)."""
    val = (((evidencia or {}).get("location") or {}).get("value") or {})
    src, linea = val.get("source"), ((val.get("start") or {}).get("line"))
    if src and linea:
        return f"{src}:{linea}"
    return ""


def _canales(grafo: dict) -> list[dict]:
    """Los canales IPC, con su modo y el sitio donde se vio.

    El mismo canal aparece en varios nodos (el que lo maneja y el que lo emite): aquí va uno solo,
    con el primer sitio donde se vio. Contarlos dos veces sería mentir.
    """
    vistos: dict[str, dict] = {}
    for n in grafo.get("nodes") or []:
        if n.get("kind") != "ipc-channel":
            continue
        for obs in n.get("observations") or []:
            props = obs.get("properties") or {}
            nombre = props.get("channel") or obs.get("label") or "?"
            if nombre in vistos:
                continue
            vistos[nombre] = {
                "canal": nombre,
                "modo": props.get("mode") or props.get("operation") or "",
                "resolucion": props.get("resolution") or "",
                "sitio": _sitio(obs.get("evidence") or {}),
            }
    return sorted(vistos.values(), key=lambda f: f["canal"])


def _ventanas(grafo: dict) -> list[dict]:
    """Las ventanas con sus preferencias web (la superficie de seguridad, leída de verdad)."""
    filas = []
    for n in grafo.get("nodes") or []:
        if n.get("kind") != "browser-window":
            continue
        for obs in n.get("observations") or []:
            props = obs.get("properties") or {}
            prefs = []
            for p in props.get("web_preferences") or []:
                valor = (p.get("value") or {}).get("value")
                prefs.append(f"{p.get('name')}={valor if valor is not None else (p.get('value') or {}).get('expression') or '?'}")
            filas.append({
                "sitio": f"{props.get('source_path') or ''}:{_sitio(obs.get('evidence') or {}).split(':')[-1]}".strip(":"),
                "prefs": prefs,
                "opciones": props.get("options_status") or "",
            })
    return filas


def _ficheros(semantico: dict) -> list[dict]:
    """Los ficheros del programa con lo que hay dentro: así se ve de qué está hecho."""
    cuentas: dict[str, dict] = {}
    for n in semantico.get("nodes") or []:
        ident = n.get("identity") or {}
        ruta = ident.get("module_path")
        if not ruta:
            continue
        c = cuentas.setdefault(ruta, {"fichero": ruta, "funciones": 0, "nodos": 0})
        c["nodos"] += 1
        if n.get("kind") == "function":
            c["funciones"] += 1
    return sorted(cuentas.values(), key=lambda c: -c["nodos"])


def _funciones(semantico: dict) -> dict:
    """Las funciones con su nombre y su sitio: id → {nombre, fichero, linea}."""
    salida = {}
    for n in semantico.get("nodes") or []:
        if n.get("kind") != "function":
            continue
        ident = n.get("identity") or {}
        rango = ident.get("source_range") or {}
        props = n.get("properties") or {}
        salida[n.get("node_id")] = {
            "nombre": props.get("name") or n.get("label") or ident.get("label") or "(sin nombre)",
            "fichero": ident.get("module_path") or "",
            "linea": ((rango.get("start") or {}).get("line")),
        }
    return salida


def _mas_llamadas(semantico: dict, funciones: dict) -> list[dict]:
    """Las funciones que más se llaman: el corazón del programa."""
    conteo = Counter()
    for r in semantico.get("relations") or []:
        if r.get("relation") == "calls" and r.get("resolution") == "resolved":
            conteo[r.get("target_node_id")] += 1
    filas = []
    for nid, veces in conteo.most_common():
        f = funciones.get(nid)
        if f:
            filas.append({**f, "veces": veces})
    return filas[:MAX_FUNCIONES]


def _desconocidos(semantico: dict) -> list[dict]:
    """Lo que NO se pudo ver, agrupado: cada grupo con su razón y un ejemplo."""
    grupos: dict[tuple, dict] = {}
    for u in semantico.get("unknowns") or []:
        clave = (u.get("family") or "?", u.get("reason") or "?")
        g = grupos.setdefault(clave, {"n": 0, "detalle": "", "sitio": ""})
        g["n"] += 1
        if not g["detalle"]:
            g["detalle"] = u.get("detail") or ""
            g["sitio"] = _sitio(u.get("evidence") or {})
    filas = [{"familia": f, "razon": r, **g} for (f, r), g in grupos.items()]
    return sorted(filas, key=lambda g: -g["n"])


def _limites(evidencia: dict) -> list[str]:
    """Los límites que declara el propio REA, sin parafrasearlos."""
    nr = evidencia.get("normalized_result") or {}
    vistos: list[str] = []
    for grupo in (evidencia.get("limitations") or [], nr.get("limitations") or [],
                  (nr.get("graph") or {}).get("limitations") or [],
                  (nr.get("semantic_graph") or {}).get("limitations") or []):
        for l in grupo:
            if isinstance(l, str) and l not in vistos:
                vistos.append(l)
    return vistos


def _cobertura(bloque: dict) -> str:
    cov = (bloque or {}).get("coverage") or {}
    estado = cov.get("status") or "desconocido"
    if cov.get("truncated"):
        estado += " y truncado"
    topes = ", ".join(f"{l.get('name')}={l.get('value')}" for l in cov.get("limits") or [])
    return f"{estado}" + (f" (topes: {topes})" if topes else "")


def _forma_de(evidencia: dict) -> str:
    """De qué tipo es la evidencia: cada programa se cuenta con su propia historia.

    Antes el informe decía «un programa Electron» de todo, y un binario nativo salía como un
    Electron con cero ventanas y cero canales: un informe que mentía. Ahora cada forma tiene su
    informe, y lo que no se sabe se dice que no se sabe.
    """
    nr = evidencia.get("normalized_result") or {}
    if nr.get("graph") or nr.get("semantic_graph"):
        return "electron"
    if nr.get("segments") is not None or "procedure_count" in nr or "string_count" in nr:
        return "nativo"
    return "generico"


def informe(evidencia: dict, *, motivo: str = "") -> str:
    """Convierte la evidencia de REA en un informe que la mente pueda absorber.

    Todo lo que sale aquí está en la evidencia: si REA no lo dice, el informe no lo inventa.
    """
    forma = _forma_de(evidencia)
    if forma == "electron":
        return _informe_de_electron(evidencia, motivo=motivo)
    if forma == "nativo":
        return _informe_de_nativo(evidencia, motivo=motivo)
    return _informe_generico(evidencia, motivo=motivo)


def _cabecera_informe(evidencia: dict, *, motivo: str, titulo: str) -> list[str]:
    """La cabecera común: de quién es el informe, con qué evidencia y por qué se miró."""
    asunto = evidencia.get("subject") or {}
    digest = (asunto.get("digest") or {}).get("sha256") or ""
    ruta = asunto.get("local_path") or asunto.get("name") or "?"
    L = [f"# {titulo}", ""]
    L.append("> Informe generado por REA " + VERSION + " para la mente de Esme. "
             f"Cada dato viene de la evidencia de REA ({evidencia.get('evidence_id') or 'sin id'}); "
             f"confianza «{evidencia.get('confidence') or '?'}», autoridad «{evidencia.get('authority') or '?'}».")
    L.append(f"> Programa: `{ruta}` (sha256 `{(digest or '')[:16]}`) · generado el "
             f"{datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M')} UTC")
    if motivo:
        L.append(f"> Motivo: {motivo}")
    L.append("")
    return L


def _motor_de(evidencia: dict) -> str:
    """Quién leyó el programa: el motor de verdad (Ghidra, Hopper, IDA...), no el envoltorio."""
    encontrados: list[str] = []

    def _mira(perfil) -> None:
        if not isinstance(perfil, dict):
            return
        p = perfil.get("provider") if "provider" in perfil else perfil
        if not isinstance(p, dict):
            return
        nombre = p.get("name") or p.get("id")
        if not nombre:
            return
        version = p.get("version")
        etiqueta = f"{nombre} {version}".strip() if version and str(version) != "1" else str(nombre)
        if etiqueta not in encontrados:
            encontrados.append(etiqueta)

    perfil = evidencia.get("analysis_profile") or {}
    _mira(perfil)
    _mira((perfil.get("parameters") or {}).get("upstream_analysis_profile") or {})
    _mira(evidencia.get("provider") or {})
    for etiqueta in encontrados:
        if "composed" not in etiqueta.lower():
            return etiqueta
    return encontrados[0] if encontrados else "el motor de REA"


def _apartado_de_limites(evidencia: dict) -> list[str]:
    """Los límites que declara la propia evidencia: lo que no se pudo ver, con su razón."""
    limites = evidencia.get("limitations") or []
    L = ["## Lo que no se pudo ver", ""]
    if limites:
        for limite in limites[:MAX_LIMITES]:
            L.append(f"- {limite}")
        if len(limites) > MAX_LIMITES:
            L.append(f"- … y {len(limites) - MAX_LIMITES} límites más (el informe los acota)")
    else:
        L.append("La evidencia no declara límites. Eso no significa que no los tenga: significa "
                 "que REA no los escribió.")
    L.append("")
    return L


def _informe_de_nativo(evidencia: dict, *, motivo: str = "") -> str:
    """El informe de un binario: qué es, cómo está repartido en memoria y qué no se pudo ver."""
    nr = evidencia.get("normalized_result") or {}
    asunto = evidencia.get("subject") or {}
    segmentos = nr.get("segments") or []
    L = _cabecera_informe(evidencia, motivo=motivo,
                          titulo=f"Lo que REA vio de {asunto.get('name') or 'un binario'}")
    motor = _motor_de(evidencia)
    L.append("## En una frase")
    L.append("")
    L.append(f"Un binario **{asunto.get('format') or 'sin formato declarado'}** de "
             f"**{asunto.get('architecture') or 'arquitectura desconocida'}** con "
             f"**{_n(nr.get('segment_count', len(segmentos)))} segmentos**, "
             f"**{_n(nr.get('procedure_count', 0))} procedimientos** y "
             f"**{_n(nr.get('string_count', 0))} cadenas**, leído con **{motor}**"
             + (f" (base de imagen `{nr.get('image_base')}`)" if nr.get("image_base") else "") + ".")
    L.append("")
    L.append("## Qué es")
    L.append("")
    L.append("| | |")
    L.append("|---|---|")
    L.append(f"| Formato | `{asunto.get('format') or '?'}` |")
    L.append(f"| Arquitectura | `{asunto.get('architecture') or '?'}` |")
    L.append(f"| Motor | {motor} |")
    L.append(f"| Base de imagen | `{nr.get('image_base') or '?'}` |")
    L.append(f"| Segmentos | {_n(nr.get('segment_count', len(segmentos)))} |")
    L.append(f"| Procedimientos | {_n(nr.get('procedure_count', 0))} |")
    L.append(f"| Cadenas | {_n(nr.get('string_count', 0))} |")
    L.append(f"| Operación | `{evidencia.get('operation') or '?'}` |")
    L.append("")
    if segmentos:
        L.append("## Los segmentos de memoria")
        L.append("")
        L.append("| Segmento | Desde | Hasta | Longitud | Espacio |")
        L.append("|---|---|---|---|---|")
        for s in segmentos[:MAX_SEGMENTOS]:
            L.append(f"| `{s.get('name') or '?'}` | `{s.get('start') or '?'}` | `{s.get('end') or '?'}` | "
                     f"{_n(s.get('length', 0))} | `{s.get('address_space') or '?'}` |")
        if len(segmentos) > MAX_SEGMENTOS:
            L.append(f"| … | | | | {len(segmentos) - MAX_SEGMENTOS} segmentos más (el informe los acota) |")
        L.append("")
    documento = nr.get("document") or ""
    if documento:
        L.append("## Lo que el motor devolvió")
        L.append("")
        L.append(documento[:MAX_DOCUMENTO])
        if len(documento) > MAX_DOCUMENTO:
            L.append("")
            L.append(f"(el documento del motor se acota a {MAX_DOCUMENTO} caracteres de {len(documento)})")
        L.append("")
    L.extend(_apartado_de_limites(evidencia))
    return "\n".join(L) + "\n"


def _informe_generico(evidencia: dict, *, motivo: str = "") -> str:
    """Cuando la evidencia no es de una forma que sepamos: se dice lo que hay, sin inventar."""
    nr = evidencia.get("normalized_result") or {}
    asunto = evidencia.get("subject") or {}
    L = _cabecera_informe(evidencia, motivo=motivo,
                          titulo=f"Lo que REA vio de {asunto.get('name') or 'un programa'}")
    L.append("## En una frase")
    L.append("")
    L.append(f"Una evidencia de REA de formato `{asunto.get('format') or 'desconocido'}` "
             f"(`{evidencia.get('operation') or 'operación sin nombre'}`), leída con **{_motor_de(evidencia)}**.")
    L.append("")
    L.append("## Lo que devolvió el motor")
    L.append("")
    resumen = nr.get("summary") if isinstance(nr.get("summary"), dict) else {}
    if resumen:
        L.append("| Dato | Valor |")
        L.append("|---|---|")
        for clave, valor in list(resumen.items())[:MAX_CAMPOS]:
            L.append(f"| {clave} | {_n(valor) if isinstance(valor, (int, float)) and not isinstance(valor, bool) else valor} |")
        L.append("")
    else:
        L.append("El motor no devolvió un resumen con esos nombres.")
        L.append("")
    L.extend(_apartado_de_limites(evidencia))
    return "\n".join(L) + "\n"


def _informe_de_electron(evidencia: dict, *, motivo: str = "") -> str:
    """Convierte la evidencia de REA en un informe que la mente pueda absorber.

    Todo lo que sale aquí está en la evidencia: si REA no lo dice, el informe no lo inventa.
    """
    nr = evidencia.get("normalized_result") or {}
    resumen = nr.get("summary") or {}
    estadisticas = nr.get("statistics") or {}
    grafo = nr.get("graph") or {}
    semantico = nr.get("semantic_graph") or {}
    ipc = resumen.get("ipc") or {}
    asunto = evidencia.get("subject") or {}
    digest = (asunto.get("digest") or {}).get("sha256") or ""
    ruta = asunto.get("local_path") or asunto.get("name") or "?"

    funciones = _funciones(semantico)
    canales = _canales(grafo)
    ventanas = _ventanas(grafo)
    desconocidos = _desconocidos(semantico)
    mas_llamadas = _mas_llamadas(semantico, funciones)
    ficheros = _ficheros(semantico)

    L: list[str] = []
    L.append(f"# Lo que REA vio de {asunto.get('name') or ruta}")
    L.append("")
    L.append("> Informe generado por REA " + VERSION + " para la mente de Esme. "
             f"Cada dato viene de la evidencia de REA ({evidencia.get('evidence_id') or 'sin id'}); "
             f"confianza «{evidencia.get('confidence') or '?'}», autoridad «{evidencia.get('authority') or '?'}».")
    L.append(f"> Programa: `{ruta}` (sha256 `{(digest or '')[:16]}`) · generado el "
             f"{datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M')} UTC")
    if motivo:
        L.append(f"> Motivo: {motivo}")
    L.append("")

    L.append("## En una frase")
    L.append("")
    L.append(
        f"Un programa Electron ({ruta}) con **{_p(resumen.get('browser_windows', 0), 'ventana', 'ventanas')}**, "
        f"**{_n(ipc.get('literal_channels', 0))} canales IPC** ({_n(ipc.get('main_handlers', 0))} handlers en el "
        f"proceso principal) y **{_n(len(canales))} canales vistos**. "
        f"REA identificó **{_p(len(funciones), 'función', 'funciones')}** en **{_p(len(ficheros), 'fichero', 'ficheros')}** y "
        f"**{_n(len(semantico.get('nodes') or []))} nodos semánticos**; "
        f"**{_n(len(semantico.get('unknowns') or []))} cosas que no se pudo ver**, "
        f"en {len(desconocidos)} clases."
    )
    L.append("")

    L.append("## La superficie: los canales IPC")
    L.append("")
    L.append(f"Literales: {ipc.get('literal_channels', 0)} · handlers en el proceso principal: "
             f"{ipc.get('main_handlers', 0)} · dinámico: {ipc.get('dynamic_channel_operations', 0)} · "
             f"emisiones del renderer emparejadas: {ipc.get('paired_renderer_transmissions', 0)} · "
             f"sin pareja: {ipc.get('unpaired_literal_renderer_transmissions', 0)} · "
             f"canales distintos vistos: {len(canales)}.")
    L.append("")
    L.append(f"Del renderer al proceso principal: {resumen.get('context_bridge_apis', 0)} API de contexto "
             f"con {_n(resumen.get('exposed_api_members', 0))} miembros, "
             f"{_n(resumen.get('preload_entrypoints', 0))} punto(s) de entrada de preload y "
             f"{_n(resumen.get('utility_processes', 0))} proceso(s) auxiliar(es).")
    L.append("")
    if canales:
        # El listado, en trozos: la tabla es para el ojo humano, pero la mente trocea el informe
        # por filas y una fila suelta no se puede recomponer. Sin el listado, la pregunta «qué
        # canales expone» se llevaba 5 filas de 123 y fallaba.
        for trozo in _en_trozos([f"`{c['canal']}`" for c in canales[:MAX_CANALES]], "Canales IPC del programa"):
            L.append(trozo)
            L.append("")
        if len(canales) > MAX_CANALES:
            L.append(f"Y {len(canales) - MAX_CANALES} canales más que el informe deja fuera (la lista se acota).")
        L.append("")
        L.append("| Canal | Modo | Resolución | Dónde |")
        L.append("|---|---|---|---|")
        for c in canales[:MAX_CANALES]:
            L.append(f"| `{c['canal']}` | {c['modo']} | {c['resolucion']} | {c['sitio']} |")
        if len(canales) > MAX_CANALES:
            L.append(f"| … | | | {len(canales) - MAX_CANALES} canales más (el informe los acota) |")
    else:
        L.append("No se vio ningún canal IPC.")
    L.append("")

    L.append("## Las ventanas")
    L.append("")
    if ventanas:
        # Igual que con los canales: el dato completo en una línea, para que la mente lo traiga
        # entero y no tres trozos sueltos que no se pueden recomponer.
        for trozo in _en_trozos([f"{v['sitio'] or 'sin sitio'} ({', '.join(v['prefs']) or 'sin webPreferences'})"
                                for v in ventanas], "Ventanas del programa y sus preferencias web", por=6):
            L.append(trozo)
            L.append("")
        L.append("")
        for v in ventanas:
            L.append(f"- **{v['sitio'] or 'sin sitio'}** — {', '.join(v['prefs']) or 'sin webPreferences'}")
        L.append("")
        L.append(f"Preferencias web explícitas: {resumen.get('explicit_web_preferences', 0)} · "
                 f"validaciones de emisor observadas: {resumen.get('sender_validation_observations', 0)} "
                 "(un 0 aquí significa *no observado en el análisis estático*, no *seguro*).")
    else:
        L.append("No se vio ninguna ventana.")
    L.append("")

    L.append("## Los ficheros del programa")
    L.append("")
    if ficheros:
        for trozo in _en_trozos([f"{c['fichero']} ({_n(c['funciones'])} funciones, {_n(c['nodos'])} nodos)"
                                for c in ficheros], "Ficheros del programa analizados", por=6):
            L.append(trozo)
            L.append("")
        L.append("")
        L.append("| Fichero | Funciones | Nodos |")
        L.append("|---|---|---|")
        for c in ficheros[:20]:
            L.append(f"| `{c['fichero']}` | {_n(c['funciones'])} | {_n(c['nodos'])} |")
    else:
        L.append("REA no vio ningún fichero con código dentro.")
    L.append("")

    L.append("## El corazón: las funciones más llamadas")
    L.append("")
    if mas_llamadas:
        for trozo in _en_trozos([f"`{f['nombre']}` ({f['fichero']}:{f['linea']}, {f['veces']} veces)"
                                for f in mas_llamadas], "Funciones más llamadas del programa", por=8):
            L.append(trozo)
            L.append("")
        L.append("")
        L.append("| Función | Dónde | Veces que se llama |")
        L.append("|---|---|---|")
        for f in mas_llamadas:
            L.append(f"| `{f['nombre']}` | {f['fichero']}:{f['linea']} | {f['veces']} |")
    else:
        L.append("No se pudieron ordenar las llamadas.")
    L.append("")

    L.append("## Lo que NO se pudo ver")
    L.append("")
    L.append("Esto es tan importante como lo que sí se vio: son los huecos, con su razón.")
    L.append("")
    L.append("| Familia | Razón | Cuántos | Ejemplo |")
    L.append("|---|---|---|---|")
    for g in desconocidos[:20]:
        L.append(f"| {g['familia']} | {g['razon']} | {g['n']} | {g['detalle']} ({g['sitio']}) |")
    L.append("")
    # Las razones, en trozos: para que la pregunta «qué no se pudo ver» traiga la lista entera.
    for trozo in _en_trozos([f"{g['familia']}/{g['razon']} ({_n(g['n'])})" for g in desconocidos],
                            "Lo que no se pudo ver del programa, con su razón", por=6):
        L.append(trozo)
        L.append("")
    L.append("")
    L.append(f"Desconocidos totales: {len(semantico.get('unknowns') or [])} · "
             f"cobertura del grafo: {_cobertura(grafo)} · del grafo semántico: {_cobertura(semantico)}")
    L.append("")

    L.append("### Los limites que declara REA")
    L.append("")
    for l in _limites(evidencia):
        L.append(f"- {l}")
    L.append("")

    L.append("## Las medidas del analisis")
    L.append("")
    L.append(f"- Ficheros relevantes: {estadisticas.get('relevant_files', 0)} · "
             f"JavaScript analizados: {estadisticas.get('parsed_javascript_files', 0)} · "
             f"saltados: {estadisticas.get('skipped_javascript_files', 0)} · "
             f"fallos de parseo: {estadisticas.get('parse_failures', 0)}")
    L.append(f"- Hallazgos: {estadisticas.get('findings', 0)} · nodos de AST recorridos: "
             f"{estadisticas.get('visited_ast_nodes', 0)} · bytes leídos: {estadisticas.get('text_bytes_read', 0)}")
    L.append(f"- Grafo: {len(grafo.get('nodes') or [])} nodos y {len(grafo.get('edges') or [])} aristas · "
             f"semántico: {len(semantico.get('nodes') or [])} nodos y {len(semantico.get('relations') or [])} relaciones")
    L.append("")
    return "\n".join(L) + "\n"


# ── la absorción: del programa a la memoria ──────────────────────────────────────────────────

CABECERA = re.compile(r"^#{1,6}\s+(.+)$", re.M)


def _eventos_del_informe(texto: str, fuente: str, ts: str) -> list[Event]:
    """Los trozos del informe como recuerdos, **cada uno con el título de su apartado**.

    Sin el título, un recuerdo era una tabla suelta («| `hilos:buscar` | handle | …») y la mente
    no sabía de qué programa era: con el título, la pregunta «qué canales IPC expone esto» lo encuentra.
    """
    titulos: dict[str, str] = {}
    for m in CABECERA.finditer(texto):
        t = m.group(1).strip()
        titulos[slug(t)] = t
    eventos: list[Event] = []
    for trozo in trocea("informe", redact(texto)):
        ancla = trozo.fuente.split("#", 1)[-1].split("@", 1)[0]
        titulo = titulos.get(ancla, "")
        cuerpo = f"{titulo}. {trozo.texto}" if titulo else trozo.texto
        limpio = clean(cuerpo)
        if limpio is None:
            continue
        eid = hashlib.sha1(" ".join(limpio.lower().split()).encode()).hexdigest()[:16]
        eventos.append(Event(eid, limpio, fuente, "doc", ts, TRUST["file"]))
    return eventos


def reducir(evidencia: dict) -> dict:
    """Lo justo de una versión para compararla con otra.

    La evidencia entera pesa decenas de megabytes (el grafo semántico es el grueso) y la mente no
    la necesita: para decir qué cambió bastan la superficie, los ficheros y las funciones. Esto es
    lo que se guarda en disco: unos pocos kilobytes por programa.
    """
    nr = evidencia.get("normalized_result") or {}
    grafo = nr.get("graph") or {}
    semantico = nr.get("semantic_graph") or {}
    funciones = _funciones(semantico)
    mas_llamadas = _mas_llamadas(semantico, funciones)
    asunto = evidencia.get("subject") or {}
    return {
        "evidencia": evidencia.get("evidence_id"),
        "programa": asunto.get("local_path"),
        "clase": _forma_de(evidencia),
        "formato": asunto.get("format"),
        "arquitectura": asunto.get("architecture"),
        "motor": _motor_de(evidencia),
        "resumen": nr.get("summary") or {},
        "estadisticas": nr.get("statistics") or {},
        "canales": {c["canal"]: c["sitio"] for c in _canales(grafo)},
        "ventanas": [{"sitio": v["sitio"], "prefs": v["prefs"]} for v in _ventanas(grafo)],
        "ficheros": {c["fichero"]: {"funciones": c["funciones"], "nodos": c["nodos"]} for c in _ficheros(semantico)},
        "funciones": {f["nombre"]: f"{f['fichero']}:{f['linea']}" for f in mas_llamadas},
        "desconocidos": len(semantico.get("unknowns") or []),
        # lo nativo: los segmentos, los procedimientos y las cadenas, que es lo que se compara
        "segmentos": {s.get("name") or "": {"inicio": s.get("start"), "fin": s.get("end"),
                                            "longitud": s.get("length"), "espacio": s.get("address_space")}
                      for s in (nr.get("segments") or [])},
        "procedimientos": nr.get("procedure_count", 0),
        "cadenas": nr.get("string_count", 0),
        "base_imagen": nr.get("image_base"),
    }


def _firmas(ventanas: list[dict]) -> dict[str, list[str]]:
    """Cada ventana por sus preferencias: es lo que sobrevive a una compilación."""
    salida: dict[str, list[str]] = {}
    for v in ventanas:
        salida.setdefault(", ".join(sorted(v.get("prefs") or [])), []).append(v.get("sitio") or "")
    return salida


def _claves_ventana(v: dict) -> set[str]:
    """Las preferencias que declara una ventana (los nombres, no los valores)."""
    claves = set()
    for p in v.get("prefs") or []:
        k = str(p).split("=", 1)[0].strip()
        if k and not k.startswith("["):      # los «[spread@…]» son el código, no una preferencia
            claves.add(k)
    return claves


def _firma_ventana(v: dict) -> str:
    """La identidad de una ventana: **qué preferencias declara**, no qué valores tiene.

    Los valores cambian con cada compilación (los nombres del minificador, los `additionalArguments`
    que crecen), así que comparar por el texto de las preferencias hacía que **toda** ventana
    pareciera nueva y vieja a la vez. Los **nombres** de las preferencias no cambian: son la
    identidad de la ventana.
    """
    return ", ".join(sorted(_claves_ventana(v)))


def _emparejar_ventanas(va: list[dict], vb: list[dict]) -> tuple[list[tuple[dict, dict]], list[dict], list[dict]]:
    """Las ventanas de antes y las de ahora, emparejadas por **parecido**.

    No por igualdad exacta: una ventana que gana una preferencia («additionalArguments») es la
    misma ventana, no una nueva. Se empareja cada ventana de ahora con la de antes que más se le
    parece (Jaccard de las preferencias declaradas); si ninguna se parece lo suficiente, es nueva.
    """
    usados = [False] * len(va)
    pares: list[tuple[dict, dict]] = []
    nuevas: list[dict] = []
    for y in vb:
        cy = _claves_ventana(y)
        mejor, mejor_parecido = -1, 0.0
        for i, x in enumerate(va):
            if usados[i]:
                continue
            cx = _claves_ventana(x)
            union = cx | cy
            parecido = len(cx & cy) / len(union) if union else 1.0
            if parecido > mejor_parecido:
                mejor, mejor_parecido = i, parecido
        if mejor >= 0 and mejor_parecido >= 0.5:
            usados[mejor] = True
            pares.append((va[mejor], y))
        else:
            nuevas.append(y)
    fuera = [x for i, x in enumerate(va) if not usados[i]]
    return pares, nuevas, fuera


def _comparar_nativo(a: dict, b: dict, nombre_a: str, nombre_b: str) -> str:
    """La comparación de dos binarios: formato, arquitectura, segmentos, procedimientos y cadenas.

    Comparar dos binarios con la comparación de las apps Electron daba «0 canales nuevos, 0
    ventanas nuevas» para dos binarios que no tienen canales ni ventanas: un cero que parecía
    una verdad y no lo era.
    """
    sa = a.get("segmentos") or {}
    sb = b.get("segmentos") or {}
    nuevos = sorted(set(sb) - set(sa))
    fuera = sorted(set(sa) - set(sb))
    cambiados = [(k, sa[k], sb[k]) for k in sorted(set(sa) & set(sb))
                 if sa[k].get("longitud") != sb[k].get("longitud")
                 or sa[k].get("inicio") != sb[k].get("inicio")]
    L: list[str] = []
    L.append(f"# Qué cambió entre {nombre_a} y {nombre_b}")
    L.append("")
    L.append(f"> Comparación hecha con las dos versiones reducidas (lo que el espejo guardó de cada "
             f"una). {nombre_a}: {a.get('programa') or '?'} · {nombre_b}: {b.get('programa') or '?'}")
    L.append("")
    L.append("## En una frase")
    L.append("")
    L.append(f"**{_p(len(nuevos), 'segmento nuevo', 'segmentos nuevos')}**, "
             f"**{_p(len(fuera), 'segmento que se fue', 'segmentos que se fueron')}** y "
             f"**{_p(len(cambiados), 'segmento que cambió', 'segmentos que cambiaron')}**.")
    L.append("")
    if a.get("formato") != b.get("formato"):
        L.append(f"El formato cambió: `{a.get('formato')}` → `{b.get('formato')}`.")
        L.append("")
    if a.get("arquitectura") != b.get("arquitectura"):
        L.append(f"La arquitectura cambió: `{a.get('arquitectura')}` → `{b.get('arquitectura')}`.")
        L.append("")
    if a.get("base_imagen") != b.get("base_imagen"):
        L.append(f"La base de imagen cambió: `{a.get('base_imagen')}` → `{b.get('base_imagen')}`.")
        L.append("")
    L.append("## Los números")
    L.append("")
    L.append("| | Antes | Ahora |")
    L.append("|---|---|---|")
    L.append(f"| Segmentos | {_n(len(sa))} | {_n(len(sb))} |")
    L.append(f"| Procedimientos | {_n(a.get('procedimientos') or 0)} | {_n(b.get('procedimientos') or 0)} |")
    L.append(f"| Cadenas | {_n(a.get('cadenas') or 0)} | {_n(b.get('cadenas') or 0)} |")
    L.append("")
    if nuevos:
        L.append("Segmentos nuevos: " + ", ".join(f"`{s}`" for s in nuevos) + ".")
        L.append("")
    if fuera:
        L.append("Segmentos que se fueron: " + ", ".join(f"`{s}`" for s in fuera) + ".")
        L.append("")
    if cambiados:
        L.append("## Los segmentos que cambiaron")
        L.append("")
        L.append("| Segmento | Antes | Ahora |")
        L.append("|---|---|---|")
        for nombre, x, y in cambiados[:MAX_SEGMENTOS]:
            L.append(f"| `{nombre}` | `{x.get('inicio')}` ({_n(x.get('longitud', 0))} B) | "
                     f"`{y.get('inicio')}` ({_n(y.get('longitud', 0))} B) |")
        L.append("")
    return "\n".join(L) + "\n"


def comparar(a: dict, b: dict, nombre_a: str = "la versión anterior", nombre_b: str = "la versión nueva") -> str:
    """Qué cambió entre dos versiones del mismo programa, en palabras y con números."""
    if "nativo" in (a.get("clase"), b.get("clase")):
        return _comparar_nativo(a, b, nombre_a, nombre_b)
    ca, cb = set(a.get("canales") or {}), set(b.get("canales") or {})
    nuevos, fuera = sorted(cb - ca), sorted(ca - cb)
    fa, fb = set(a.get("ficheros") or {}), set(b.get("ficheros") or {})
    fn_a, fn_b = set(a.get("funciones") or {}), set(b.get("funciones") or {})
    fnuevas, ffuera = sorted(fn_b - fn_a), sorted(fn_a - fn_b)
    pares_v, ventanas_nuevas_v, ventanas_fuera_v = _emparejar_ventanas(a.get("ventanas") or [], b.get("ventanas") or [])
    # Las ventanas que se emparejan pero cambian de preferencias: eso también es «qué cambió».
    ventanas_cambiadas = [(x, y) for x, y in pares_v
                          if sorted(x.get("prefs") or []) != sorted(y.get("prefs") or [])]
    sa, sb = a.get("estadisticas") or {}, b.get("estadisticas") or {}

    L: list[str] = []
    L.append(f"# Qué cambió entre {nombre_a} y {nombre_b}")
    L.append("")
    L.append(f"> Comparación hecha con las dos versiones reducidas (lo que el espejo guardó de cada "
             f"una). {nombre_a}: {a.get('programa') or '?'} · {nombre_b}: {b.get('programa') or '?'}")
    L.append("")
    L.append("## En una frase")
    L.append("")
    L.append(
        f"**{_p(len(nuevos), 'canal nuevo', 'canales nuevos')}**, "
        f"**{_p(len(fuera), 'canal que se fue', 'canales que se fueron')}**, "
        f"**{_p(len(fnuevas), 'función nueva', 'funciones nuevas')}**, "
        f"**{_p(len(ffuera), 'función que desapareció', 'funciones que desaparecieron')}**, "
        f"**{_p(len(ventanas_nuevas_v), 'ventana nueva', 'ventanas nuevas')}**, "
        f"**{_p(len(ventanas_cambiadas), 'ventana que cambió sus preferencias', 'ventanas que cambiaron sus preferencias')}** y "
        f"{_p(len(fb - fa), 'fichero que aparece o desaparece', 'ficheros que aparecen o desaparecen')}."
    )
    L.append("")
    L.append("## Los canales IPC")
    L.append("")
    L.append(f"Antes: {len(ca)} · ahora: {len(cb)}")
    L.append("")
    if nuevos:
        L.append("Canales nuevos: " + ", ".join(f"`{c}`" for c in nuevos) + ".")
        L.append("")
    if fuera:
        L.append("Canales que ya no están: " + ", ".join(f"`{c}`" for c in fuera) + ".")
        L.append("")
    if not nuevos and not fuera:
        L.append("Ningún canal cambió.")
        L.append("")

    L.append("## Las funciones")
    L.append("")
    if fnuevas:
        L.append("Funciones nuevas: " + ", ".join(f"`{f}`" for f in fnuevas[:40]) + ".")
        L.append("")
    if ffuera:
        L.append("Funciones que se fueron: " + ", ".join(f"`{f}`" for f in ffuera[:40]) + ".")
        L.append("")
    if not fnuevas and not ffuera:
        L.append("Ninguna función cambió de nombre (con nombres minificados, esto no dice nada: "
                 "el minificador renombra en cada compilación).")
        L.append("")

    L.append("## Las ventanas")
    L.append("")
    L.append(f"Antes: {len(a.get('ventanas') or [])} · ahora: {len(b.get('ventanas') or [])} "
             "(se emparejan por **qué preferencias declaran**, no por sus valores: los valores cambian "
             "en cada compilación y harían que todo pareciera nuevo y viejo a la vez).")
    L.append("")
    if ventanas_nuevas_v:
        for v in ventanas_nuevas_v:
            L.append(f"Ventana nueva ({_firma_ventana(v) or 'sin preferencias'}): {v.get('prefs')}.")
        L.append("")
    if ventanas_fuera_v:
        for v in ventanas_fuera_v:
            L.append(f"Ventana que ya no está ({_firma_ventana(v) or 'sin preferencias'}): {v.get('prefs')}.")
        L.append("")
    if ventanas_cambiadas:
        for x, y in ventanas_cambiadas:
            antes, ahora = set(x.get("prefs") or []), set(y.get("prefs") or [])
            L.append(f"Ventana que cambió ({_firma_ventana(x) or 'sin preferencias'}): "
                     f"antes {sorted(antes)} · ahora {sorted(ahora)}.")
        L.append("")
    if not ventanas_nuevas_v and not ventanas_fuera_v and not ventanas_cambiadas:
        L.append("Las ventanas siguen con las mismas preferencias.")
        L.append("")

    L.append("## Los ficheros y las medidas")
    L.append("")
    L.append(f"Ficheros: antes {len(fa)} · ahora {len(fb)} · nuevos: "
             f"{', '.join(sorted(fb - fa)) or 'ninguno'} · fuera: {', '.join(sorted(fa - fb)) or 'ninguno'}.")
    L.append("")
    L.append(f"Ficheros JavaScript analizados: antes {sa.get('parsed_javascript_files', 0)} · "
             f"ahora {sb.get('parsed_javascript_files', 0)} · "
             f"hallazgos: antes {sa.get('findings', 0)} · ahora {sb.get('findings', 0)} · "
             f"nodos de AST: antes {sa.get('visited_ast_nodes', 0)} · ahora {sb.get('visited_ast_nodes', 0)}.")
    L.append("")
    return "\n".join(L) + "\n"


def _sello() -> str:
    """La marca de tiempo del archivo: con milisegundos, porque dos absorciones seguidas
    (o una comparación) no pueden acabar en el mismo fichero."""
    return datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S-%f")[:-3]


def clave_de(ruta: str | Path) -> str:
    """Un nombre estable por programa: si se reanaliza, la mente actualiza en vez de duplicar."""
    ruta = Path(ruta).expanduser()
    marca = hashlib.sha1(str(ruta.resolve() if ruta.exists() else ruta).encode()).hexdigest()[:6]
    nombre = "".join(c if c.isalnum() or c in "-_" else "-" for c in (ruta.name or "programa"))[:40]
    return f"{nombre}-{marca}"


def fuente_de(ruta: str | Path) -> str:
    """La procedencia en la memoria de un programa: la misma con la que se absorbe."""
    return f"rea:{clave_de(ruta)}"


def ingerir(home, evidencia: dict, ruta: str | Path, *, motivo: str = "") -> dict:
    """Escribe el informe junto a la mente y lo deja dentro como recuerdos con procedencia."""
    texto = informe(evidencia, motivo=motivo)
    clave = clave_de(ruta)
    carpeta = Path(home.path) / "rea"
    carpeta.mkdir(parents=True, exist_ok=True)
    sello = _sello()
    destino = carpeta / f"{clave}-{sello}.md"
    destino.write_text(texto, encoding="utf-8")
    # La versión reducida al lado: es lo que permite comparar dos builds sin volver a analizarlos.
    version = carpeta / f"{clave}-{sello}.json"
    version.write_text(json.dumps(reducir(evidencia), ensure_ascii=False, indent=1), encoding="utf-8")
    fuente = fuente_de(ruta)          # la procedencia es el programa, no la ruta del fichero
    eventos = _eventos_del_informe(texto, fuente, datetime.now(timezone.utc).isoformat())
    nuevos = home.ingest(eventos)
    nr = evidencia.get("normalized_result") or {}
    return {
        "added": nuevos,
        "memories": len(home.hippo),
        "informe": str(destino),
        "version": str(version),
        "fuente": fuente,
        "evidencia": evidencia.get("evidence_id"),
        "programa": (evidencia.get("subject") or {}).get("local_path"),
        "clase": _forma_de(evidencia),
        "canales": ((nr.get("summary") or {}).get("ipc") or {}).get("literal_channels"),
        "funciones": sum(1 for n in (nr.get("semantic_graph") or {}).get("nodes") or [] if n.get("kind") == "function"),
        "desconocidos": len((nr.get("semantic_graph") or {}).get("unknowns") or []),
        # lo nativo tiene sus propias cuentas: segmentos, procedimientos y cadenas
        "segmentos": nr.get("segment_count", len(nr.get("segments") or [])) if _forma_de(evidencia) == "nativo" else None,
        "procedimientos": nr.get("procedure_count") if _forma_de(evidencia) == "nativo" else None,
        "cadenas": nr.get("string_count") if _forma_de(evidencia) == "nativo" else None,
    }


def _soltar_memoria() -> None:
    """Lo que se suelta vuelve al sistema.

    La evidencia de REA son decenas de megabytes de objetos de Python. Al soltarlos, glibc se los
    queda en el montón y el cerebro sigue ocupándolos hasta que otro hilo los pida: por eso, después
    de absorber, el proceso Pesaba un gigabyte más sin estar haciendo nada.
    """
    import gc
    gc.collect()
    from .lens import _devolver_memoria
    _devolver_memoria()


def absorber(home, ruta: str | Path, *, motivo: str = "", timeout: int = TIMEOUT) -> dict:
    """El camino entero: REA mira el programa y la mente se queda con lo que vio."""
    evidencia = analizar(ruta, timeout=timeout)
    try:
        return ingerir(home, evidencia, ruta, motivo=motivo)
    finally:
        del evidencia
        _soltar_memoria()


def version_guardada(home, ruta: str | Path) -> dict | None:
    """La versión reducida más reciente de un programa ya mirado (si está guardada)."""
    vs = versiones(home, ruta)
    return vs[0] if vs else None


def versiones(home, ruta: str | Path) -> list[dict]:
    """Todas las versiones guardadas de un programa, de la más reciente a la más antigua.

    Cada absorción deja su versión; por eso se puede preguntar «qué cambió desde la última vez».
    """
    carpeta = Path(home.path) / "rea"
    if not carpeta.exists():
        return []
    clave = clave_de(ruta)
    salida = []
    for f in sorted(carpeta.glob(f"{clave}-*.json"), reverse=True):   # el sello va en el nombre: el orden es el del tiempo
        try:
            salida.append(json.loads(f.read_text(encoding="utf-8")))
        except (json.JSONDecodeError, OSError):
            continue
    return salida


def comparar_versiones(home, ruta: str | Path, *, contra: str | Path | None = None, nombre_a: str = "",
                       nombre_b: str = "", timeout: int = TIMEOUT) -> tuple[str, str]:
    """La comparación sin escribir en la mente: devuelve el texto y la clave.

    Separada a propósito: lo lento (analizar) va fuera del cerrojo y lo rápido (escribir) dentro.
    """
    # Un solo cerrojo para las dos mitades: si se soltara entre medias, otro análisis se
    # colaría y la comparación se haría con la máquina ya ocupada.
    with _candado():
        va_list = versiones(home, ruta)
        if contra is not None:
            vb_list = versiones(home, contra)
            if not va_list:
                va_list = [reducir(analizar(ruta, timeout=timeout))]
                _soltar_memoria()
            if not vb_list:
                vb_list = [reducir(analizar(contra, timeout=timeout))]
                _soltar_memoria()
            va, vb = va_list[0], vb_list[0]
            etiqueta_a = nombre_a or f"{Path(ruta).name} (antes)"
            etiqueta_b = nombre_b or f"{Path(contra).name} (después)"
            clave = f"{clave_de(ruta)}~{clave_de(contra)}"
        else:
            if len(va_list) >= 2:
                vb, va = va_list[0], va_list[1]
            else:
                # Sólo había una versión guardada: se mira el programa otra vez (ya cambió en disco).
                vb = reducir(analizar(ruta, timeout=timeout))
                _soltar_memoria()
                va = va_list[0] if va_list else vb
            etiqueta_a = nombre_a or "la versión anterior"
            etiqueta_b = nombre_b or "la versión nueva"
            clave = f"{clave_de(ruta)}~ahora"
    return comparar(va, vb, etiqueta_a, etiqueta_b), clave


def ingerir_comparacion(home, texto: str, clave: str) -> dict:
    """El «qué cambió» entra en la memoria, con su procedencia."""
    carpeta = Path(home.path) / "rea"
    carpeta.mkdir(parents=True, exist_ok=True)
    destino = carpeta / f"comparacion-{clave}-{_sello()}.md"
    destino.write_text(texto, encoding="utf-8")
    fuente = f"rea:comparacion:{clave}"
    eventos = _eventos_del_informe(texto, fuente, datetime.now(timezone.utc).isoformat())
    nuevos = home.ingest(eventos)
    return {"added": nuevos, "informe": str(destino), "fuente": fuente}


def comparar_programas(home, ruta: str | Path, *, contra: str | Path | None = None, nombre_a: str = "",
                       nombre_b: str = "", timeout: int = TIMEOUT) -> dict:
    """Compara dos versiones de un programa y deja el «qué cambió» en la memoria.

    Sin `contra`: la versión nueva contra la anterior del mismo programa (si sólo hay una guardada,
    se mira el programa otra vez y se compara con la que había: el programa ya cambió en disco).
    Con `contra`: la última versión de cada uno de los dos programas.
    """
    texto, clave = comparar_versiones(home, ruta, contra=contra, nombre_a=nombre_a, nombre_b=nombre_b,
                                      timeout=timeout)
    r = ingerir_comparacion(home, texto, clave)
    return {**r, "antes": nombre_a or "la versión anterior", "despues": nombre_b or "la versión nueva"}
