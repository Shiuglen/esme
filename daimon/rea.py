"""REA: entender un programa para que la mente lo sepa.

REA (*Reverse Engineer Anything*, MIT, `rea-agents` 6.7.0) devuelve un grafo de lo que ve de un
programa: módulos, funciones, canales IPC, ventanas — cada conclusión **con su evidencia** y **con
los límites de esa evidencia**. Aquí ese grafo se convierte en un informe que **la mente absorbe**:
el programa deja de ser una caja negra y pasa a ser conocimiento de Esme, con su procedencia, y
cualquier agente puede preguntarle después por él.

Por qué así y no como receta manual: una receta se ejecuta cuando alguien se acuerda. Un
**agente** que puede absorber el conocimiento de cualquier programa es lo que hace que Esme
escale: cada programa entendido deja de ser un problema y se convierte en material.

Regla de la casa (17-oct-2026): REA se usa sobre lo propio, sobre lo del usuario con permiso y
para el forense del propio equipo. **Nunca** sobre apps de terceros para copiarlas.
"""
from __future__ import annotations

import hashlib
import json
import re
import shutil
import subprocess
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

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


class ErrorRea(RuntimeError):
    """REA no pudo analizar. El motivo va en el mensaje, para que el agente lo sepa y no repita."""


# ── el comando ─────────────────────────────────────────────────────────────────────────────────

def comando_rea() -> list[str]:
    """El binario de REA: el que está instalado si lo hay; si no, npx con la versión fijada."""
    if shutil.which("rea"):
        return ["rea"]
    return ["npx", "-y", f"rea-agents@{VERSION}"]


def analizar(ruta: str | Path, *, timeout: int = TIMEOUT, nodos: int = LIMITE_NODOS) -> dict:
    """Analiza un programa y devuelve su evidencia (el sobre JSON de REA)."""
    ruta = Path(ruta).expanduser()
    if not ruta.exists():
        raise ErrorRea(f"no existe el programa: {ruta}")
    if not (ruta.is_dir() or ruta.suffix == ".asar"):
        raise ErrorRea(f"eso no es un programa que REA sepa mirar: {ruta}")
    cmd = comando_rea() + [
        "analyze-javascript-application", str(ruta),
        "--format", "json",
        "--max-semantic-nodes", str(nodos),
    ]
    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
    except subprocess.TimeoutExpired:
        raise ErrorRea(f"REA tardó más de {timeout} s y se paró (mira un programa más pequeño)") from None
    if proc.returncode != 0:
        detalle = (proc.stderr or proc.stdout or "").strip().splitlines()
        raise ErrorRea(f"REA no pudo analizar el programa: {detalle[-1] if detalle else 'sin explicación'}")
    try:
        return json.loads(proc.stdout)
    except json.JSONDecodeError:
        raise ErrorRea("REA no devolvió evidencia legible (su salida no es JSON)") from None


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


def informe(evidencia: dict, *, motivo: str = "") -> str:
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
    return {
        "evidencia": evidencia.get("evidence_id"),
        "programa": (evidencia.get("subject") or {}).get("local_path"),
        "resumen": nr.get("summary") or {},
        "estadisticas": nr.get("statistics") or {},
        "canales": {c["canal"]: c["sitio"] for c in _canales(grafo)},
        "ventanas": [{"sitio": v["sitio"], "prefs": v["prefs"]} for v in _ventanas(grafo)],
        "ficheros": {c["fichero"]: {"funciones": c["funciones"], "nodos": c["nodos"]} for c in _ficheros(semantico)},
        "funciones": {f["nombre"]: f"{f['fichero']}:{f['linea']}" for f in mas_llamadas},
        "desconocidos": len(semantico.get("unknowns") or []),
    }


def _firmas(ventanas: list[dict]) -> dict[str, list[str]]:
    """Cada ventana por sus preferencias: es lo que sobrevive a una compilación."""
    salida: dict[str, list[str]] = {}
    for v in ventanas:
        salida.setdefault(", ".join(sorted(v.get("prefs") or [])), []).append(v.get("sitio") or "")
    return salida


def comparar(a: dict, b: dict, nombre_a: str = "la versión anterior", nombre_b: str = "la versión nueva") -> str:
    """Qué cambió entre dos versiones del mismo programa, en palabras y con números."""
    ca, cb = set(a.get("canales") or {}), set(b.get("canales") or {})
    nuevos, fuera = sorted(cb - ca), sorted(ca - cb)
    fa, fb = set(a.get("ficheros") or {}), set(b.get("ficheros") or {})
    fn_a, fn_b = set(a.get("funciones") or {}), set(b.get("funciones") or {})
    fnuevas, ffuera = sorted(fn_b - fn_a), sorted(fn_a - fn_b)
    va, vb = _firmas(a.get("ventanas") or []), _firmas(b.get("ventanas") or [])
    ventanas_nuevas = sorted(set(vb) - set(va))
    ventanas_fuera = sorted(set(va) - set(vb))
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
        f"**{_p(len(ventanas_nuevas), 'ventana con preferencias nuevas', 'ventanas con preferencias nuevas')}** y "
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
    if ventanas_nuevas:
        L.append("Ventanas con preferencias que no estaban: " + "; ".join(ventanas_nuevas) + ".")
        L.append("")
    if ventanas_fuera:
        L.append("Ventanas que ya no están: " + "; ".join(ventanas_fuera) + ".")
        L.append("")
    if not ventanas_nuevas and not ventanas_fuera:
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
        "canales": ((nr.get("summary") or {}).get("ipc") or {}).get("literal_channels"),
        "funciones": sum(1 for n in (nr.get("semantic_graph") or {}).get("nodes") or [] if n.get("kind") == "function"),
        "desconocidos": len((nr.get("semantic_graph") or {}).get("unknowns") or []),
    }


def absorber(home, ruta: str | Path, *, motivo: str = "", timeout: int = TIMEOUT) -> dict:
    """El camino entero: REA mira el programa y la mente se queda con lo que vio."""
    return ingerir(home, analizar(ruta, timeout=timeout), ruta, motivo=motivo)


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
    va_list = versiones(home, ruta)
    if contra is not None:
        vb_list = versiones(home, contra)
        if not va_list:
            va_list = [reducir(analizar(ruta, timeout=timeout))]
        if not vb_list:
            vb_list = [reducir(analizar(contra, timeout=timeout))]
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
