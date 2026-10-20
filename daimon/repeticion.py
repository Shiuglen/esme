"""Lo que se repite: las tareas que el creador vuelve a encargar.

Una **skill** es una receta con ficheros, scripts y permiso: se comparte, se vende,
se mejora. Para que Esme escriba las suyas necesita ver que el creador repite una
misma tarea. Este módulo mira los encargos (lo que el creador le pidió al Taller) y
agrupa los que se parecen: tres encargos parecidos ya no son casualidad, son un
hábito, y un hábito se puede convertir en skill.

La regla es conservadora a propósito:

- **sólo los encargos** cuentan (`kind == "user_msg"`): lo que dijo la IA o lo que
  leyó un fichero no es una tarea del creador;
- **sólo los que Cerraron bien**: un encargo que se rompió tres veces no es un
  hábito, es un problema;
- **tres o más** (__MIN_REPETICIONES__): con dos no se distingue un hábito de una
  coincidencia;
- **nunca por la espalda**: esto **propone**. La skill la crea el usuario cuando
  quiere, no el agente solo.

La propuesta dice qué se repite, cuántas veces y en qué términos; de ahí sale el
encargo que el usuario puede convertir en skill tal cual.
"""
from __future__ import annotations

import hashlib
import re
import unicodedata
from collections import Counter
from datetime import datetime, timezone

import numpy as np

from .immune import TRUST
from .ingest import Event
from .suenio import _STOP

MIN_REPETICIONES = 3      # cuántas veces se repite antes de proposer una skill
SIM_MIN = 0.5             # coseno mínimo para que dos encargos sean la misma tarea
MIN_COHESION = 0.5        # palabras compartidas: por debajo, el grupo no es una sola tarea
TOPE_TERMINOS = 5         # términos que nombran la tarea en la propuesta
MAX_CITA = 220            # longitud del encargo de ejemplo que se lleva la propuesta
MAX_ENCARGO = 400         # un encargo de verdad es corto: una transcripción no lo es
_FUENTE = "repeticion"
# De dónde viene un encargo que cuenta. Las transcripciones de las sesiones (.jsonl) son
# mensajes sueltos («sigue en donde estabas», «dale full»): no son encargos, son maneras
# de continuar la conversación. Los encargos de verdad llegan del Taller, con su fuente.
_FUENTE_ENCARGO = "encargo"

# Un encargo de la Tienda o del Taller empieza por su categoría; no es ruido, pero
# tampoco es lo que el creador pidió, así que se quita para comparar.
_PREAMBULO = re.compile(r"^\s*(?:\[(?:constructor|revisor|probador|explorador)\]\s*)+", re.IGNORECASE)


def _id(texto: str) -> str:
    """Id por contenido normalizado: la misma propuesta no se guarda dos veces."""
    return hashlib.sha1(" ".join(texto.lower().split()).encode()).hexdigest()[:16]


def _normaliza(texto: str) -> str:
    """El encargo tal cual, sin el preámbulo del oficio y con los espacios andra."""
    limpio = _PREAMBULO.sub("", texto or "").strip()
    return " ".join(limpio.split())


def _firma(texto: str) -> frozenset[str]:
    """Las palabras que describen la tarea: sin stopwords ni cifras."""
    bruto = re.findall(r"[a-záéíóúñü]{3,}", texto.lower())
    return frozenset(w for w in bruto if w not in _STOP)


def _terminos(textos: list[str], corpus: list[str], tope: int = TOPE_TERMINOS) -> list[str]:
    """Las palabras que nombran esta tarea: las que se repiten aquí y son raras en la mente.

    La rareza se mide contra **toda** la mente, no contra el grupo: si no, todas las
    palabras del grupo empatan y la propuesta no dice nada («actualiza» no distingue
    una tarea de otra si todas tus tareas son actualizaciones).
    """
    df = Counter(w for c in corpus for w in set(_firma(c)))
    n = max(len(corpus), 1)
    tf = Counter(w for t in textos for w in _firma(t))
    # IDF clásico: una palabra que sale en todos los documentos no dice nada (log(1)=0).
    idf = {w: float(np.log(n / (1 + df.get(w, 0)))) for w in tf}
    score = {w: c * idf[w] for w, c in tf.items() if c >= 2 and idf[w] > 0}
    if not score:                       # corpus diminuto: manda la frecuencia, con desempate alfabético
        score = {w: float(c) for w, c in tf.items() if c >= 2}
    return [w for w, _ in sorted(score.items(), key=lambda t: (-t[1], t[0]))][:tope]


def _agrupa(encargos: list[Event], vectores) -> list[list[int]]:
    """Agrupar los encargos parecidos entre sí (coseno sobre sus vectores)."""
    grupos: list[list[int]] = []
    for i in range(len(encargos)):
        if vectores is None or len(vectores) == 0:
            # Sin vectores: sólo se agrupa por coincidencia exacta de la firma.
            firma = _firma(encargos[i].text)
            for g in grupos:
                if firma & _firma(encargos[g[0]].text) == firma and firma:
                    g.append(i)
                    break
            else:
                grupos.append([i])
            continue
        mejor, mejor_sim = None, SIM_MIN
        for g in grupos:
            # Contra el miembro más cercano, no contra el centroide: el centroide de un
            # grupo grande se diluye y acaba uniendo tareas que no son la misma.
            sims = vectores[g] @ vectores[i]
            sim = float(np.max(sims))
            if sim > mejor_sim:
                mejor, mejor_sim = g, sim
        if mejor is None:
            grupos.append([i])
        else:
            mejor.append(i)
    return grupos


def _texto_propuesta(terminos: list[str], veces: int, ejemplo: str, desde: str, hasta: str) -> str:
    """La propuesta, en palabras: qué se repite, cuántas veces y con qué encargo."""
    return (f"tarea repetida: {', '.join(terminos) or 'sin términos'} se repite {veces} veces "
            f"(de {desde} a {hasta}); para escribir una skill, este encargo sirve de ejemplo: «{ejemplo}»")


def _id_estable(r: "Repeticion") -> str:
    """El id de la tarjeta: sale de lo que **no** cambia, no del texto.

    El texto lleva los términos, y los términos cambian cuando la mente crece (el IDF los
    reordena). Si el id saliera de ahí, la misma repetición tendría un id nuevo cada vez y
    la mente guardaría una tarjeta por noche. El id sale de los encargos que la componen:
    la misma tarea repetida es siempre la misma tarjeta.
    """
    return _id("|".join(sorted(r.encargos)))


def _coherencia(textos: list[str]) -> float:
    """Cuánto se parecen los encargos del grupo entre sí: palabras comunes sobre la unión.

    El coseno agrupa por significado, pero un grupo puede acabar con encargos que se
    parecen de lejos («actualiza el readme» y «mide el consumo»): son vecinos, no la
    misma tarea. Con palabras (sin stopwords) se ve enseguida: dos encargos de la
    misma cosa comparten muchas; dos encargos distintos, casi ninguna.
    """
    if len(textos) < 2:
        return 1.0
    firmas = [set(_firma(t)) for t in textos]
    total = 0.0
    n = 0
    for i in range(len(firmas)):
        for j in range(i + 1, len(firmas)):
            a, b = firmas[i], firmas[j]
            union = a | b
            total += (len(a & b) / len(union)) if union else 0.0
            n += 1
    return total / n if n else 1.0


class Repeticion:
    """Una tarea que se repite y la skill que podría salir de ella."""

    def __init__(self, veces: int, terminos: list[str], ejemplo: str, desde: str, hasta: str,
                 encargos: list[str], motores: list[str], coherencia: float = 1.0):
        self.veces = veces
        self.terminos = terminos
        self.ejemplo = ejemplo
        self.desde = desde
        self.hasta = hasta
        self.encargos = encargos
        self.motores = motores
        # cuánto se parecen los encargos entre sí: si es poco, el grupo no es una sola tarea
        self.coherencia = coherencia

    @property
    def dispersa(self) -> bool:
        """El grupo se parece menos de lo que debería: la receta avisa antes de nada."""
        return self.coherencia < MIN_COHESION

    @property
    def texto(self) -> str:
        return _texto_propuesta(self.terminos, self.veces, self.ejemplo, self.desde, self.hasta)

    @property
    def titulo(self) -> str:
        """El nombre de la skill que se podría escribir: los términos que la nombran.

        Si los términos no distinguen (una mente con pocos encargos), se recorta el
        encargo de ejemplo: el usuario tiene que leer algo que reconozca, no un
       Sorted de palabras.
        """
        if self.terminos:
            return ", ".join(self.terminos[:3])
        return (self.ejemplo[:60] + "…") if len(self.ejemplo) > 60 else self.ejemplo

    @property
    def borrador(self) -> dict:
        """El esqueleto de la skill: la evidencia real, sin inventar el cómo.

        La mente sabe **qué** se repite y con qué palabras lo pidió el creador; no sabe
        cómo se hace (nadie le ha grabado la manera). Por eso el borrador trae los
        encargos de verdad y una lista de huecos por rellenar: **la receta la escribes
        tú**, la mente sólo pone la mesa.
        """
        return _borrador(self)

    def a_dict(self) -> dict:
        return {"titulo": self.titulo, "veces": self.veces, "terminos": self.terminos,
                "ejemplo": self.ejemplo, "desde": self.desde, "hasta": self.hasta,
                "motores": self.motores, "encargos": self.encargos,
                "coherencia": round(self.coherencia, 3), "dispersa": self.dispersa,
                "borrador": self.borrador}


def _slug(texto: str, tope: int = 64) -> str:
    """Un nombre de skill: minúsculas, guiones y sólo letras y números.

    El nombre de una skill es su carpeta: tiene que poder vivir en un disco y no
    depender de cómo se escribieron las palabras. Las tildes se quitan («instalación»
    → «instalacion»), no se rompen a mitad («instalaci-n»).
    """
    plano = unicodedata.normalize("NFD", texto or "").encode("ascii", "ignore").decode("ascii")
    base = re.sub(r"[^a-z0-9]+", "-", plano.lower()).strip("-")
    base = re.sub(r"-{2,}", "-", base)[:tope].strip("-")
    return base


def _borrador(r: "Repeticion") -> dict:
    """El esqueleto de la skill que puede salir de esta repetición.

    Tres piezas y ninguna invención:
    - **el nombre**: los términos que nombran la tarea (o el título recortado);
    - **la descripción**: qué es esto y cuándo usarla (la leen los agentes);
    - **el cuerpo**: la evidencia (los encargos de verdad) y los huecos que rellenas.

    Los huecos son la parte importante: la mente no sabe cómo se hace la tarea, así que
    no lo escribe. Lo escribe el creador, y por eso esto es un borrador y no una skill.
    """
    titulo = r.titulo
    nombre = _slug("-".join(r.terminos[:3]) or titulo)
    if not nombre:
        nombre = "tarea-repetida"
    descripcion = (f"«{titulo}»: una tarea que el creador ha encargado {r.veces} veces "
                   f"(del {r.desde} al {r.hasta}). Úsala cuando te pida algo como «{r.ejemplo[:120]}».")
    otros = [e for e in r.encargos if e != r.ejemplo][:3]
    lineas = [
        f"# {titulo}",
        "",
        f"Esta receta nació de una costumbre: el creador ha encargado esta tarea "
        f"**{r.veces} veces**, del {r.desde} al {r.hasta}.",
        "",
    ]
    if r.dispersa:
        # El grupo se parece menos de lo que debería: se dice antes de que la receta mienta.
        lineas += [
            "> **Ojo:** estos encargos no se parecen mucho entre sí. Puede que no sean la "
            "misma tarea: léelos y corrige la receta antes de instalar.",
            "",
        ]
    lineas += [
        "## El encargo de ejemplo",
        "",
        f"> {r.ejemplo}",
        "",
    ]
    if otros:
        lineas += ["## Cómo lo pidió otras veces", ""]
        lineas += [f"- {e}" for e in otros]
        lineas += [""]
    lineas += [
        "## Antes de empezar",
        "",
        "- [ ] Qué hay que mirar primero (lo escribe el creador).",
        "- [ ] Qué se prepara antes de tocar nada (lo escribe el creador).",
        "",
        "## Al terminar",
        "",
        "- [ ] Cómo se comprueba que está bien (lo escribe el creador).",
        "",
        "---",
        "",
        f"Propuesta de Esme: {r.veces} encargos iguales "
        f"({'los motores: ' + ', '.join(r.motores) if r.motores else 'sin motor anotado'}). "
        "La receta la escribes tú.",
        "",
    ]
    return {"nombre": nombre, "descripcion": descripcion, "cuerpo": "\n".join(lineas)}


def _candidatos(eventos: list[Event]) -> list[Event]:
    """Sólo los encargos del creador: lo que le pidió al Taller, no lo que respondió la IA.

    Y sólo los que vienen del Taller (fuente «encargo»): los .jsonl de las sesiones
    guardan mensajes sueltos («sigue en donde estabas», «dale full»), que no son encargos
    sino maneras de continuar la conversación. Si contaran, media hora de conversación se
    leería como «la misma tarea repetida 23 veces».

    Y sólo los **cortos**: un encargo es una petición («actualiza el README»), no una
    transcripción con código pegado.
    """
    out = []
    for e in eventos:
        if e.kind != "user_msg" or e.source != _FUENTE_ENCARGO:
            continue
        texto = _normaliza(e.text)
        if 20 <= len(texto) <= MAX_ENCARGO:
            out.append(e)
    return out


def repeticiones(eventos: list[Event], vectores=None) -> list[Repeticion]:
    """Las tareas que el creador repite. Lista vacía si no hay encargos suficientes.

    `vectores` son los vectores de los **candidatos** (en el mismo orden): sin ellos se
    agrupa por coincidencia de palabras, que es más conservadora pero suficiente.
    """
    eventos = list(eventos)
    candidatos = _candidatos(eventos)
    if len(candidatos) < MIN_REPETICIONES:
        return []
    vec = None
    if vectores is not None and len(vectores) == len(candidatos):
        vec = vectores
    grupos = _agrupa(candidatos, vec)
    corpus = [e.text for e in eventos]          # la mente entera: lo raro se mide contra ella
    fuera: list[Repeticion] = []
    for g in grupos:
        if len(g) < MIN_REPETICIONES:
            continue
        pila = [candidatos[i] for i in g]
        textos = [_normaliza(e.text) for e in pila]
        términos = _terminos(textos, corpus)
        ejemplo = max(textos, key=lambda t: (len(t), t))
        ejemplo = (ejemplo[:MAX_CITA] + "…") if len(ejemplo) > MAX_CITA else ejemplo
        días = sorted(e.ts[:10] for e in pila)
        motores = sorted({e.source for e in pila})
        fuera.append(Repeticion(len(pila), términos, ejemplo, días[0], días[-1], textos, motores, _coherencia(textos)))
    fuera.sort(key=lambda r: (-r.veces, r.titulo))
    return fuera


def _vectores_de(home, candidatos: list[Event]):
    """Los vectores de los candidatos, si la mente los tiene. Si no, se agrupa por palabras."""
    if not candidatos:
        return None
    try:
        return np.stack([home.hippo.vector(e.id) for e in candidatos])
    except Exception:
        return None


def propuesta(home) -> dict:
    """Las tareas que el creador repite ahora mismo. Sólo lee: no escribe nada.

    Es lo que ve la app para proponer la skill. Devuelve lista vacía si no hay
    encargos suficientes: una mente nueva no inventa hábitos.
    """
    eventos = [e for e in home.hippo.events() if e.source != _FUENTE]
    candidatos = _candidatos(eventos)
    if len(candidatos) < MIN_REPETICIONES:
        return {"repeticiones": [], "total": 0,
                "informe": "todavía no hay una tarea que se repita tres veces"}
    props = repeticiones(eventos, _vectores_de(home, candidatos))
    return {"repeticiones": [p.a_dict() for p in props], "total": len(props),
            "informe": f"{len(props)} tarea(s) que se repiten y esperan una skill"}


def proponer(home, tope: int = 50000) -> dict:
    """El sueño ve las repeticiones y deja la propuesta en la memoria. Nunca crea la skill.

    Idempotente: la misma propuesta tiene el mismo id (por contenido), así que dormir
    dos veces no duplica nada.
    """
    eventos = [e for e in home.hippo.events() if e.source != _FUENTE]
    if not eventos:
        return {"repeticiones": 0, "total": 0, "ids": [], "titulos": [], "informe": "mente vacía"}
    props = repeticiones(eventos, _vectores_de(home, _candidatos(eventos)))
    guardados: list[str] = []
    tarjetas = []
    for p in props:
        eid = _id_estable(p)
        tarjetas.append(Event(eid, p.texto, _FUENTE, "decision",
                              datetime.now(timezone.utc).isoformat(), TRUST["user"]))
        guardados.append(eid)
    if tarjetas:
        # Por sincronización de fuente: si la propuesta cambia (la tarea se repitió otra vez,
        # los términos se ordenaron distinto) la tarjeta se actualiza en vez de duplicarse.
        home.ingest(tarjetas)
    return {"repeticiones": len(props), "total": len(props), "ids": guardados,
            "titulos": [p.titulo for p in props],
            "informe": f"{len(props)} tarea(s) que se repiten y esperan una skill"}
