"""La sesión que empieza: el pack de arranque de un agente.

**Por qué existe esto.** TencentDB Agent Memory inyecta la memoria sola porque **secuestra el
tráfico del LLM** (`ANTHROPIC_BASE_URL` → un proxy en `:8096`, `MemoryProxy/README.md:3-7`): así el
recuerdo entra sin que el agente pregunte. Es elegante y es exactamente lo que nos falta… pero
secuestra las claves del proveedor y reescribe el prompt de quien llama. Eso no lo vamos a hacer.

**Lo que sí se puede** —y este módulo es eso— es que el servidor MCP **declare su protocolo** y que
el agente lo llame **una vez** al empezar. Una llamada, sin proxy, sin claves y con el mismo efecto
práctico: el agente llega al trabajo con el rumbo y con lo que la mente ya sabe de su tarea.

Qué trae el pack:

- **el rumbo**: para qué trabaja esta mente (el objetivo activo y sus pilares);
- **el contexto**: lo que el tálamo compone para la tarea que el agente va a hacer, con los ids
  citados para poder dar `feedback` después;
- **el protocolo**: qué pedir, qué guardar y qué devolver, en tres líneas.

La última parte es lo que más importa a largo plazo: **cada agente que entra por aquí aprende cómo
usar la mente**, y la mente aprende de cada agente (el tálamo guarda qué contexto le sirvió a cada
motor, `daimon/thalamus.py`).
"""
from __future__ import annotations

import json
import os
from pathlib import Path

from .home import Home
from . import rumbo as rumbo_mod

# El protocolo que el servidor MCP declara en sus «instructions». Los clientes MCP lo enseñan al
# modelo al inicializar, así que es la vía barata para que la memoria se use sola: sin proxy,
# sin claves, sin reescribir el prompt de nadie.
PROTOCOLO = (
    "Memoria viva de Daimon, la mente de quien te invoca. Protocolo: "
    "(1) al empezar una tarea, llama a `sesion` con una frase que diga qué vas a hacer: te devuelve "
    "el rumbo de la mente y el contexto de esa tarea; "
    "(2) antes de investigar o de decidir, `recall` con la pregunta concreta; "
    "(3) `remember` para las decisiones y los hechos que deben sobrevivir a esta conversación; "
    "(4) `feedback` con los ids que te sirvieron, al terminar. "
    "Cada motor recibe el contexto en la forma que a ese motor le conviene."
)

COMO_USARLA = (
    "Cómo se usa esta mente: `sesion` al empezar · `recall` antes de investigar · "
    "`remember` para lo que debe durar · `feedback` al terminar. "
    "Pide `motor` con tu nombre: la mente guarda qué contexto le sirve a cada IA y lo aprendido "
    "sobrevive al reinicio."
)


def _rumbo_texto(home: Home) -> str:
    """Para qué trabaja esta mente: el objetivo activo y sus pilares, en una frase."""
    r = rumbo_mod.lee(home.path)
    objetivos = [o.get("texto") for o in r.get("objetivos", []) if o.get("estado") == "activo"]
    pilares = [p.get("texto") for p in r.get("pilares", [])]
    if not objetivos and not pilares:
        return ""
    partes = []
    if objetivos:
        partes.append("objetivo: " + "; ".join(str(o) for o in objetivos[:3]))
    if pilares:
        partes.append("pilares: " + ", ".join(str(p) for p in pilares[:6]))
    return " | ".join(partes)


# ── Los compañeros: quién más está trabajando en el Taller, ahora mismo ──────────────────────────
# Dos agentes en el Taller a la vez es lo normal, no la excepción. Cada uno trabaja en su copia
# aislada, así que no se pisan los ficheros; lo que **no** se ve es el otro. Sin esto, dos agentes
# pueden romper el mismo repo de la casa sin saber que el otro estaba ahí.
#
# Se lee el registro del Taller (el mismo fichero que escribe la app) y, de cada copia, su último
# commit — **sin lanzar git**: se leen los ficheros de `.git`. Un `git log` por compañero en cada
# sesión sería gastar un proceso por nada.

ESTADOS_VIVOS = ("trabajando", "preparando", "esperando")


def _directorio_taller() -> Path:
    """Dónde está el registro del Taller. `ESME_APP_DATA` lo puede mover (tests, instalaciones)."""
    base = os.environ.get("ESME_APP_DATA") or str(Path.home() / ".config" / "daimon-app")
    return Path(base) / "taller"


def _tareas_vivas() -> list[dict]:
    """Las tareas que están vivas ahora mismo (trabajando, preparando o esperando)."""
    f = _directorio_taller() / "tareas.json"
    if not f.exists():
        return []
    try:
        bruto = json.loads(f.read_text(encoding="utf-8"))
    except Exception:
        return []
    tareas = bruto if isinstance(bruto, list) else bruto.get("tareas", bruto)
    if isinstance(tareas, dict):
        tareas = list(tareas.values())
    if not isinstance(tareas, list):
        return []
    return [t for t in tareas if isinstance(t, dict) and t.get("estado") in ESTADOS_VIVOS]


def _git_dir(copia: Path) -> Path | None:
    """La carpeta `.git` de esa copia: puede ser un directorio o un fichero (worktree)."""
    g = copia / ".git"
    if g.is_dir():
        return g
    if g.is_file():
        try:
            linea = g.read_text(encoding="utf-8").strip()
        except Exception:
            return None
        if linea.startswith("gitdir:"):
            destino = Path(linea.split(":", 1)[1].strip())
            return destino if destino.is_absolute() else (copia / destino)
    return None


def _mensaje_commit(git_dir: Path, sha: str) -> str:
    """El asunto real del commit, leído del objeto de git (no del COMMIT_EDITMSG, que se queda viejo).

    El objeto es un texto comprimido con zlib: la cabecera y luego el mensaje, separados por una
    línea en blanco. Si algo falla (objeto empaquetado, formato raro), no se inventa nada.
    """
    obj = git_dir / "objects" / sha[:2] / sha[2:]
    if not obj.exists():
        return ""
    try:
        import zlib
        crudo = zlib.decompress(obj.read_bytes()).decode("utf-8", "replace")
    except Exception:
        return ""
    partes = crudo.split("\n\n", 1)
    if len(partes) < 2:
        return ""
    for linea in partes[1].splitlines():
        if linea.strip():
            return linea.strip()[:120]
    return ""


def _ultimo_commit(copia: Path) -> tuple[str, str] | None:
    """(sha corto, asunto) del último commit de la copia, leyendo `.git` sin lanzar git."""
    g = _git_dir(copia)
    if g is None:
        return None
    sha = ""
    try:
        head = (g / "HEAD").read_text(encoding="utf-8").strip()
        if head.startswith("ref:"):
            ref = head.split(":", 1)[1].strip()
            sha = (g / ref).read_text(encoding="utf-8").strip()
        else:
            sha = head
    except Exception:
        return None
    if not sha:
        return None
    asunto = _mensaje_commit(g, sha)
    if not asunto:
        # Sin objeto legible (paketizado o raro): el mensaje del editor, que puede estar viejo.
        try:
            for linea in (g / "COMMIT_EDITMSG").read_text(encoding="utf-8").splitlines():
                if linea.strip():
                    asunto = linea.strip()[:120]
                    break
        except Exception:
            asunto = ""
    return (sha[:8], asunto)


def companeros(yo: str | None = None) -> list[dict]:
    """Quién más está trabajando en el Taller ahora mismo.

    `yo` es el identificador de la tarea propia, para no one's list itself.
    """
    fuera = []
    for t in _tareas_vivas():
        tid = str(t.get("id") or "")
        if yo and tid == yo:
            continue
        copia = (t.get("copia") or {}).get("ruta")
        commit = _ultimo_commit(Path(copia)) if copia else None
        fuera.append({
            "id": tid,
            "titulo": str(t.get("titulo") or "")[:160],
            "motor": str(t.get("motor") or t.get("motorNombre") or ""),
            "turnos": t.get("turnos") or 0,
            "copia": copia,
            "commit": commit,
        })
    return fuera


def _companeros_texto(yo: str | None = None) -> str:
    gente = companeros(yo)
    if not gente:
        return ""
    lineas = [f"[compañeros] {len(gente)} persona(s) más trabajando en el Taller ahora mismo:"]
    for g in gente:
        bits = [f"- {g['id']}"]
        if g["titulo"]:
            bits.append(f"«{g['titulo']}»")
        if g["motor"]:
            bits.append(f"motor {g['motor']}")
        if g["turnos"]:
            bits.append(f"{g['turnos']} turnos")
        if g["copia"]:
            bits.append(f"copia {g['copia']}")
        if g["commit"]:
            bits.append(f"último commit {g['commit'][0]} «{g['commit'][1]}»")
        lineas.append("  " + " · ".join(bits))
    lineas.append("  Antes de tocar lo que es de otro, mira su commit: tu trabajo y el suyo "
                  "conviven en la misma casa.")
    return "\n".join(lineas)


def pack_de_arranque(home: Home, tarea: str, budget: int = 0, motor: str | None = None,
                     yo: str | None = None) -> str:
    """El pack de arranque: rumbo + contexto de la tarea + compañeros + protocolo.

    `budget` son tokens de contexto (0 = el presupuesto de la mente). El contexto se compone con el
    mismo motor que el resto de la mente, así que cada IA recibe lo que a esa IA le sirve.
    """
    if budget is None or budget <= 0:
        budget = int(home.config.get("presupuesto", 4000))
    bloques: list[str] = []

    rumbo = _rumbo_texto(home)
    if rumbo:
        bloques.append(f"[rumbo] {rumbo}")

    consulta = (tarea or "").strip()
    if consulta:
        texto, _, ids = home.thalamus.compose(consulta, budget, motor=motor)
        if texto:
            bloques.append(f"[contexto de tu tarea]\n{texto}\n[recuerdos: {', '.join(ids)}]")
        else:
            bloques.append("[contexto de tu tarea] la mente no sabe nada de esto todavía: "
                           "trabaja con lo que ve y guarda lo que aprendas con `remember`.")

    companeros_txt = _companeros_texto(yo)
    if companeros_txt:
        bloques.append(companeros_txt)

    bloques.append(f"[protocolo] {COMO_USARLA}")
    return "\n\n".join(bloques)
