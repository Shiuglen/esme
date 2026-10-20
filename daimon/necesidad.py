"""Lo que falta: las herramientas que la mente deduce que hay que fabricar.

Una **herramienta** es una capacidad que se puede instalar y usar (una Forja, un servidor
MCP). Esme ya sabe fabricarlas: la Forja escribe el fichero, lo prueba y tú lo apruebas.
Lo que no sabía era **cuándo** hace falta una.

Aquí se mira lo que de verdad se rompe:

- un fallo que se repite (el mismo error, otra vez y otra vez) es una señal de que falta
  una capacidad, no de que el motor sea malo;
- si ese fallo nombra algo que ninguna herramienta instalada resuelve, la propuesta es
  clara: hay que fabricar esa herramienta.

Tres reglas conservadoras, porque una propuesta mala es ruido:

- **el fallo tiene que repetirse** (dos veces o más): una vez es un día malo;
- **tiene que ser el mismo fallo**: «se cortó la red» y «no encontró el fichero» son
  dos cosas distintas y no se wrinkles together;
- **tiene que faltar de verdad**: si ya hay una herramienta conectada que lo resuelve,
  no se propone nada (seчен se dice «instala la que ya tienes»).

Y como siempre: **esto propone, no crea**. La Forja la lanzas tú.
"""
from __future__ import annotations

import re
from collections import Counter, defaultdict

from .ingest import Event

MIN_FALLOS = 2             # cuántas veces tiene que repetirse el fallo
MAX_FALLOS = 6             # cuántos fallos distintos se miran (los más repetidos)
MIN_ENCARGO = 15           # longitud mínima de un encargo para que se pueda fabricar
_FUENTE = "necesidad"

# Los fallos que son de la red, de la máquina o del modelo: no se arreglan con una
# herramienta nueva. Se listan para no proponer por tontería.
_NO_ES_HERRAMIENTA = re.compile(
    r"timeout|timed out|connection|network|econn|enotfound|dns|rate limit|429|"
    r"401|403|unauthorized|forbidden|quota|out of memory|no space|"
    r"cancelad|cancelled|killed|abort|broken pipe|disconnect",
    re.IGNORECASE)

# Los fallos que sí hablan de una herramienta que falta: el agente no pudo hacer algo
# porque no tenía con qué hacerlo.
_PIDE_HERRAMIENTA = re.compile(
    r"no (?:such |known )?(?:tool|command|module|function|method|binary|package)|"
    r"unknown (?:tool|command|module|function|binary|package)|"
    r"command not found|not found:|no such file|not installed|is not installed|"
    r"missing (?:tool|dependency|module|package|file)|"
    r"cannot find|can't find|could not find|"
    r"permission denied|not permitted|"
    r"unsupported (?:operation|format|type)|not implemented|"
    r"requires? .{0,40}(?:package|library|module|dependency)",
    re.IGNORECASE)

# Lo que hay que quitar antes de mirar el fallo en serio.
_RUIDO = re.compile(r"^[\s·•\-—>]+|[\s·•\-—<>]+$")


def _limpia(error: str) -> str:
    """El fallo, sin el ruido que lo envuelve y sin paths que nomeaning nada."""
    t = " ".join(str(error or "").split())
    t = _RUIDO.sub("", t)
    # Las rutas absolutas cambian cada vez: el fallo es el mismo, la ruta no.
    t = re.sub(r"(/[\w.\-]+){2,}", "…", t)
    return t[:200]


def _clave(error: str) -> str:
    """La firma del fallo: lo que se repite es lo mismo aunque el texto varíe."""
    t = _limpia(error).lower()
    t = re.sub(r"[0-9a-f]{8,}", "…", t)          # hashes, ids
    t = re.sub(r"\b\d+\b", "…", t)                # números (puertos, líneas)
    return t[:120]


def _pide_herramienta(error: str) -> bool:
    """¿El fallo dice que falta una capacidad? Y que sea algo arreglable."""
    if _NO_ES_HERRAMIENTA.search(error):
        return False
    return bool(_PIDE_HERRAMIENTA.search(error))


def _herramienta_de(error: str) -> str:
    """El nombre de lo que falta, si el fallo lo dice: «no such file 'pdftotext'»."""
    m = re.search(r"(?:no such file|not found|not installed|no module named)\s*[:'\"\s]*([\w.\-]+)", error, re.IGNORECASE)
    if m:
        return m.group(1)
    m = re.search(r"(?:unknown|no) (?:tool|command|module|binary|package)\s*[:'\"\s]*([\w.\-]+)", error, re.IGNORECASE)
    if m:
        return m.group(1)
    return ""


class Necesidad:
    """Un fallo que se repite y que pide una herramienta."""

    def __init__(self, fallo: str, veces: int, motores: list[str], herramienta: str, encargos: list[str]):
        self.fallo = fallo
        self.veces = veces
        self.motores = motores
        self.herramienta = herramienta
        self.encargos = encargos

    @property
    def titulo(self) -> str:
        """Lo que hay que fabricar, en palabras: el nombre si lo sabemos, el fallo si no."""
        return self.herramienta or (self.fallo[:70] + ("…" if len(self.fallo) > 70 else ""))

    @property
    def texto(self) -> str:
        """La propuesta, en palabras: qué se rompió, cuántas veces y qué habría que fabricar."""
        quien = ", ".join(self.motores[:3]) or "el equipo"
        return (f"herramienta que falta: {self.fallo} se repitió {self.veces} veces en {quien}; "
                f"para arreglarlo haría falta fabricar una herramienta ({self.titulo})")

    def a_dict(self) -> dict:
        return {"titulo": self.titulo, "fallo": self.fallo, "veces": self.veces,
                "motores": self.motores, "herramienta": self.herramienta, "encargos": self.encargos}


def detectar(fallos: list[dict], herramientas: list[str] | None = None) -> list[Necesidad]:
    """Las herramientas que hay que fabricar, según los fallos que se repiten.

    `fallos` es una lista de {error, motor, encargo}. `herramientas` son las slugs ya
    conectadas: si el fallo nombra una que ya está, no se propone nada.
    """
    conectadas = {h.lower() for h in (herramientas or [])}
    por_fallo: dict[str, list[dict]] = defaultdict(list)
    for f in fallos:
        if not isinstance(f, dict):
            continue
        error = str(f.get("error") or "")
        if not error:
            continue
        por_fallo[_clave(error)].append(f)

    salida: list[Necesidad] = []
    for clave, grupo in por_fallo.items():
        if len(grupo) < MIN_FALLOS:
            continue
        ejemplo = _limpia(str(grupo[0].get("error") or ""))
        if not _pide_herramienta(ejemplo):
            continue
        herramienta = _herramienta_de(ejemplo).lower()
        if herramienta and herramienta in conectadas:
            continue                      # ya la tienes: no hay nada que fabricar
        motores = sorted({str(g.get("motor") or "") for g in grupo if g.get("motor")})
        encargos = [str(g.get("encargo") or "") for g in grupo if str(g.get("encargo") or "").strip()]
        salida.append(Necesidad(ejemplo, len(grupo), motores, herramienta, encargos))
    salida.sort(key=lambda n: (-n.veces, n.titulo))
    return salida[:MAX_FALLOS]


def _fallos_desde_memorias(eventos: list[Event]) -> list[dict]:
    """Los fallos, tal y como están en la memoria: cada tarea que acabó en error."""
    salida = []
    for e in eventos:
        if e.kind != "decision" or not e.text.startswith("fallo"):
            continue
        # «fallo: <texto>» — el motor y el encargo si están
        cuerpo = e.text.split(":", 1)[1].strip() if ":" in e.text else e.text.strip()
        motor, _, resto = cuerpo.partition("|")
        salida.append({"error": resto.strip() or cuerpo, "motor": motor.strip(), "encargo": ""})
    return salida


def necesidad_de(home, herramientas: list[str] | None = None) -> dict:
    """Lo que la mente deduce que falta ahora mismo. Sólo lee: no fabrica nada."""
    eventos = [e for e in home.hippo.events() if e.source != _FUENTE]
    fallos = _fallos_desde_memorias(eventos)
    if not fallos:
        return {"necesidades": [], "total": 0,
                "informe": "no hay fallos repetidos: nada que fabricar"}
    props = detectar(fallos, herramientas)
    return {"necesidades": [n.a_dict() for n in props], "total": len(props),
            "informe": (f"{len(props)} herramienta(s) que el equipo echa de menos"
                        if props else "los fallos que se repiten no piden ninguna herramienta")}
