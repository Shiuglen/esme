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


def pack_de_arranque(home: Home, tarea: str, budget: int = 0, motor: str | None = None) -> str:
    """El pack de arranque: rumbo + contexto de la tarea + protocolo.

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

    bloques.append(f"[protocolo] {COMO_USARLA}")
    return "\n\n".join(bloques)
