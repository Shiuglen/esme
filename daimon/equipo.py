"""Lo que la mente aprende del equipo.

Cada vez que el creador aplica o descarta una tarea, la app se lo cuenta a la mente. La mente
destila el resultado en **una lección que no se olvida**: qué motor y qué modelo aciertan contigo y
qué se rompe una y otra vez.

Esa lección es un recuerdo como los demás (id por contenido: si el equipo mejora, la lección se
actualiza en vez de acumular gemelos), así que:

- la **herencia** se la pasa al siguiente agente antes de su primera pregunta («con OpenCode te
  quedaste 3 de 9 tareas; con qwen-code, 0 de 11»);
- el **router** puede tenerla en cuenta cuando elige motor.

No se guarda nada si no hay veredictos: una mente sin datos no inventaascriptura.
"""
from __future__ import annotations

import hashlib
from collections import Counter, defaultdict
from datetime import datetime, timezone

from .ingest import Event
from .immune import TRUST


def _id(texto: str) -> str:
    """Id por contenido normalizado: la misma lección no se guarda dos veces."""
    return hashlib.sha1(" ".join(texto.lower().split()).encode()).hexdigest()[:16]


def _fracciono(a: int, b: int) -> str:
    return f"{a} de {b}"


def lecciones(datos: dict) -> list[str]:
    """Las lecciones del equipo, en palabras. `datos` trae veredictos y tareas."""
    veredictos = datos.get("veredictos") or []
    tareas = {t.get("id"): t for t in (datos.get("tareas") or []) if isinstance(t, dict)}
    if not veredictos:
        return []

    # Por motor y modelo: aciertos y fallos.
    por = defaultdict(lambda: {"si": 0, "no": 0, "modelos": Counter()})
    for v in veredictos:
        if not isinstance(v, dict):
            continue
        motor = v.get("motor") or "desconocido"
        modelo = v.get("modelo")
        b = por[motor]
        b["si" if v.get("exito") else "no"] += 1
        if modelo:
            b["modelos"][modelo] += 1
    # Qué falla, por motor (los errores de las tareas que acabar en error).
    fallos = defaultdict(Counter)
    for t in tareas.values():
        if t.get("estado") != "error" or not t.get("error"):
            continue
        fallos[t.get("motor") or "desconocido"][str(t["error"])[:80]] += 1

    salida: list[str] = []
    for motor, b in sorted(por.items(), key=lambda kv: -(kv[1]["si"] + kv[1]["no"])):
        total = b["si"] + b["no"]
        if not total:
            continue
        linea = (f"Del equipo: con {motor} te quedaste {_fracciono(b['si'], total)} tareas "
                 f"que te dio por buenas")
        if b["si"] == 0:
            linea = f"Del equipo: con {motor} no te quedaste ninguna de las {total} tareas que hizo"
        modelo_top, n_top = (b["modelos"].most_common(1) or [(None, 0)])[0]
        if modelo_top and n_top > 1:
            linea += f"; su modelo más usado fue {modelo_top}"
        salida.append(linea + ".")
        for motivo, n in fallos.get(motor, Counter()).most_common(2):
            if n < 2:
                continue
            salida.append(f"Del equipo: con {motor} se rompió {n} veces con «{motivo}».")
    return salida


def _encargos(datos: dict) -> list[tuple[str, str]]:
    """Los encargos que el creador le hizo al Taller: (id de tarea, encargo).

    La app manda el título de cada tarea. Aquí sólo interesan las que **cerraron bien**:
    un encargo que se rompió tres veces es un problema, no un hábito.

    El id de la tarea va con el encargo: tres tareas distintas con el mismo texto son tres
    repeticiones, y la misma tarea mandada dos veces es una sola.
    """
    tareas = datos.get("tareas") or []
    out = []
    for t in tareas:
        if not isinstance(t, dict):
            continue
        if t.get("estado") not in (None, "lista"):
            continue
        encargo = str(t.get("encargo") or "").strip()
        if len(encargo) >= 20:
            out.append((str(t.get("id") or ""), encargo))
    return out


def aprender(home, datos: dict) -> dict:
    """La mente guarda las lecciones del equipo. Devuelve el informe de lo aprendido."""
    texto = lecciones(datos)
    guardadas = []
    for t in texto:
        eid = _id(t)
        ev = Event(eid, t, "equipo", "decision", datetime.now(timezone.utc).isoformat(), TRUST["user"])
        home.add([ev])
        guardadas.append(eid)
    encargos = _encargos(datos)
    if encargos:
        # Cada encargo se guarda como recuerdo del creador (kind=user_msg): así el sueño puede
        # ver qué tarea se repite y proponer una skill. El id lleva el de la tarea, así que
        # tres tareas con el mismo texto cuentan tres y la misma tarea no cuenta dos.
        from .repeticion import _id as _id_encargo, _normaliza
        vistos: set[str] = set()
        nuevos = []
        for tarea_id, encargo in encargos:
            texto_encargo = _normaliza(encargo)
            eid = _id_encargo(f"{tarea_id}:{texto_encargo}")
            if eid in vistos:
                continue
            vistos.add(eid)
            nuevos.append(Event(eid, texto_encargo, "encargo", "user_msg",
                                 datetime.now(timezone.utc).isoformat(), TRUST["user"]))
        if nuevos:
            home.add(nuevos)
    return {"lecciones": len(texto), "ids": guardadas, "texto": texto,
            "encargos": len(encargos)}
