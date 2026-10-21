"""El banco del espejo: preguntas sobre un programa, contestadas con y sin haberlo mirado.

La pregunta que hace esta palanca es simple: **¿de qué sirve absorber un programa?** La respuesta
no es «mucho»: es un número. Y el número se mide sin juez y sin modelo, como se midió la memoria
contra mem0: se compone el contexto que la IA recibiría y se mira si los hechos clave están
dentro.

Las preguntas **no se inventan**: se derivan de la propia evidencia de REA, así que el oro y los
hechos clave son verdad por construcción (los canales que REA vio, las ventanas con sus
preferencias, las funciones que más se llaman, los límites que el propio REA declara).

La comparación es limpia: la misma mente, el mismo presupuesto, las mismas preguntas; la única
diferencia es que en una se ha mirado el programa y en la otra no.
"""
from __future__ import annotations

import hashlib
from pathlib import Path

from .items import Item
# Las mismas funciones que usa el informe: una sola implementación, para que el examen no se
# mida contra una lista de funciones distinta de la que el informe afirma.
from ..rea import _forma_de
from ..rea import _funciones as _funciones_del_informe
from ..rea import _mas_llamadas as _mas_llamadas_del_informe
from ..rea import _motor_de
from ..rea import informe as _informe_del_espejo


def _id(pregunta: str) -> str:
    return "rea-" + hashlib.sha1(pregunta.encode()).hexdigest()[:12]


def _canales(evidencia: dict) -> list[str]:
    grafo = (evidencia.get("normalized_result") or {}).get("graph") or {}
    vistos: list[str] = []
    for n in grafo.get("nodes") or []:
        if n.get("kind") != "ipc-channel":
            continue
        for obs in n.get("observations") or []:
            props = obs.get("properties") or {}
            c = props.get("channel") or obs.get("label")
            if c and c not in vistos:
                vistos.append(c)
    return sorted(vistos)


def _ventanas(evidencia: dict) -> list[str]:
    """Las preferencias web tal cual salen en el informe (con su valor)."""
    grafo = (evidencia.get("normalized_result") or {}).get("graph") or {}
    salida: list[str] = []
    for n in grafo.get("nodes") or []:
        if n.get("kind") != "browser-window":
            continue
        for obs in n.get("observations") or []:
            for p in (obs.get("properties") or {}).get("web_preferences") or []:
                valor = (p.get("value") or {}).get("value")
                texto = f"{p.get('name')}={valor if valor is not None else (p.get('value') or {}).get('expression') or '?'}"
                if texto not in salida:
                    salida.append(texto)
    return salida


def _funciones(evidencia: dict) -> list[str]:
    """Las funciones más llamadas: las mismas que lista el informe."""
    semantico = (evidencia.get("normalized_result") or {}).get("semantic_graph") or {}
    return [f["nombre"] for f in _mas_llamadas_del_informe(semantico, _funciones_del_informe(semantico))]


def _razones(evidencia: dict) -> list[str]:
    semantico = (evidencia.get("normalized_result") or {}).get("semantic_graph") or {}
    salida: list[str] = []
    for u in semantico.get("unknowns") or []:
        r = u.get("reason")
        if r and r not in salida:
            salida.append(r)
    return salida


def _medidas(evidencia: dict) -> dict:
    nr = evidencia.get("normalized_result") or {}
    resumen = nr.get("summary") or {}
    return {
        "canales": ((resumen.get("ipc") or {}).get("literal_channels")) or 0,
        "ventanas": resumen.get("browser_windows") or 0,
        "ficheros": (nr.get("statistics") or {}).get("parsed_javascript_files") or 0,
        "hallazgos": (nr.get("statistics") or {}).get("findings") or 0,
        "miembros": resumen.get("exposed_api_members") or 0,
    }


def _n(x: object) -> str:
    """Un número como lo escribe una persona: 1.234, no 1234."""
    try:
        return f"{int(x):,}".replace(",", ".")
    except (TypeError, ValueError):
        return str(x)


def preguntas(evidencia: dict, nombre: str) -> list[Item]:
    """El juego de preguntas sobre un programa, derivado de su evidencia (nada inventado).

    El instrumento se escala con el espejo: el espejo ya mira cualquier programa (una app
    Electron, un binario nativo, un paquete), así que el banco tiene que saber preguntar por
    cualquier programa. Antes sólo sabía de las apps Electron, y con una app Electron el número
    era una anécdota de una sola app.
    """
    forma = _forma_de(evidencia)
    if forma == "nativo":
        return _preguntas_nativo(evidencia, nombre)
    if forma == "generico":
        return _preguntas_generico(evidencia, nombre)
    return _preguntas_electron(evidencia, nombre)


def _hechos_del_informe(informe: str, *candidatos: str) -> list[str]:
    """Los hechos que de verdad están en la memoria: se buscan en el informe, no se inventan.

    Si un hecho no aparece en el informe, la pregunta no se hace. Es mejor no medir que medir
    una cosa que la mente no sabe: el número del banco tiene que ser verdad.
    """
    return [c for c in candidatos if c and c[:60] in informe]


def _preguntas_nativo(evidencia: dict, nombre: str) -> list[Item]:
    """Las preguntas de un binario: su forma, sus números, su motor y sus límites.

    Mismo principio que en las apps: las preguntas y sus hechos clave salen de la propia evidencia,
    así que el oro es verdad por construcción y no hace falta juez.
    """
    nr = evidencia.get("normalized_result") or {}
    asunto = evidencia.get("subject") or {}
    items: list[Item] = []

    def nuevo(pregunta: str, oro: str, hechos: list[str], evidencia_: list[str]) -> None:
        items.append(Item(id=_id(pregunta), question=pregunta, gold=oro, key_facts=hechos,
                          evidence=evidencia_, type="hecho", origin="generada", validated=True))

    formato = asunto.get("format") or ""
    arquitectura = asunto.get("architecture") or ""
    segmentos = nr.get("segment_count")
    procedimientos = nr.get("procedure_count")
    cadenas = nr.get("string_count")
    motor = _motor_de(evidencia)
    limites = evidencia.get("limitations") or []

    informe = _informe_del_espejo(evidencia)

    if formato and arquitectura:
        hechos = _hechos_del_informe(informe, f"binario **{formato}** de **{arquitectura}**")
        if hechos:
            nuevo(f"¿Qué formato y qué arquitectura tiene {nombre}?",
                  f"{nombre} es un binario {formato} de {arquitectura}.",
                  [formato, arquitectura], hechos)

    if segmentos and procedimientos and cadenas:
        hechos = _hechos_del_informe(informe,
                                     f"**{_n(segmentos)} segmentos**",
                                     f"**{_n(procedimientos)} procedimientos**",
                                     f"**{_n(cadenas)} cadenas**")
        if hechos:
            nuevo(f"¿Cuántos segmentos, procedimientos y cadenas tiene {nombre}?",
                  f"{nombre} tiene {_n(segmentos)} segmentos, {_n(procedimientos)} procedimientos "
                  f"y {_n(cadenas)} cadenas.",
                  [str(segmentos), str(procedimientos), str(cadenas)], hechos)

    if motor:
        hechos = _hechos_del_informe(informe, f"**{motor}**")
        if hechos:
            nuevo(f"¿Qué motor leyó {nombre}?",
                  f"{nombre} lo leyó {motor}.",
                  [motor], hechos)

    if limites:
        primero = str(limites[0])
        hechos = _hechos_del_informe(informe, primero[:60])
        if hechos:
            nuevo(f"¿Qué no se pudo ver de {nombre}?",
                  "El análisis declara: " + primero,
                  [primero[:60]], hechos)

    return items


def _preguntas_generico(evidencia: dict, nombre: str) -> list[Item]:
    """Cuando la evidencia no es de una forma que sepamos: se pregunta por lo que sí hay."""
    nr = evidencia.get("normalized_result") or {}
    asunto = evidencia.get("subject") or {}
    items: list[Item] = []

    def nuevo(pregunta: str, oro: str, hechos: list[str], evidencia_: list[str]) -> None:
        items.append(Item(id=_id(pregunta), question=pregunta, gold=oro, key_facts=hechos,
                          evidence=evidencia_, type="hecho", origin="generada", validated=True))

    formato = asunto.get("format") or ""
    motor = _motor_de(evidencia)
    if formato:
        nuevo(f"¿De qué tipo es {nombre}?",
              f"{nombre} es un artefacto de formato {formato}.",
              [formato],
              [f"formato `{formato}`"])
    if motor:
        nuevo(f"¿Qué motor leyó {nombre}?",
              f"{nombre} lo leyó {motor}.",
              [motor],
              [f"**{motor}**"])
    resumen = nr.get("summary") if isinstance(nr.get("summary"), dict) else {}
    for clave in list(resumen)[:4]:
        valor = resumen[clave]
        if isinstance(valor, (int, float)) and not isinstance(valor, bool):
            nuevo(f"¿Qué {clave.replace('_', ' ')} tiene {nombre}?",
                  f"{nombre} tiene {valor} en {clave.replace('_', ' ')}.",
                  [str(valor)],
                  [f"| {clave} | {valor} |"])
    return items


def _preguntas_electron(evidencia: dict, nombre: str) -> list[Item]:
    """Las preguntas de una app Electron: canales, ventanas, funciones y lo que no se pudo ver."""
    canales = _canales(evidencia)
    ventanas = _ventanas(evidencia)
    funciones = _funciones(evidencia)
    razones = _razones(evidencia)
    m = _medidas(evidencia)
    items: list[Item] = []

    def nuevo(pregunta: str, oro: str, hechos: list[str], evidencia_: list[str]) -> None:
        items.append(Item(id=_id(pregunta), question=pregunta, gold=oro, key_facts=hechos,
                          evidence=evidencia_, type="hecho", origin="generada", validated=True))

    if canales:
        muestra = canales[:5] + canales[-3:]
        nuevo(f"¿Qué canales IPC expone {nombre}?",
              f"{nombre} expone {m['canales']} canales IPC, entre ellos " + ", ".join(muestra[:5]) + ".",
              [f"`{c}`" for c in muestra] + [str(m["canales"])],
              [f"`{c}`" for c in muestra] + [f"{m['canales']} canales IPC"])

    if ventanas:
        nuevo(f"¿Qué ventanas tiene {nombre} y con qué preferencias web?",
              f"{nombre} tiene {m['ventanas']} ventanas; sus preferencias web incluyen " + ", ".join(ventanas[:4]) + ".",
              ventanas[:4], ventanas[:4])

    if funciones:
        nuevo(f"¿Qué funciones de {nombre} se llaman más?",
              "Las funciones más llamadas de " + nombre + " son " + ", ".join(funciones[:5]) + ".",
              [f"`{f}`" for f in funciones[:5]], [f"`{f}`" for f in funciones[:5]])

    if razones:
        nuevo(f"¿Qué no se pudo ver de {nombre}?",
              "El análisis no pudo resolver " + ", ".join(razones[:3]) + ".",
              razones[:3], razones[:3])

    nuevo(f"¿Cuántos ficheros se analizaron de {nombre}?",
          f"Se analizaron {m['ficheros']} ficheros JavaScript y se hallaron {m['hallazgos']} hallazgos.",
          [str(m["ficheros"]), str(m["hallazgos"])],
          [f"JavaScript analizados: {m['ficheros']}", f"Hallazgos: {m['hallazgos']}"])

    if m["miembros"]:
        nuevo(f"¿Cuántos miembros expone el puente de contexto de {nombre}?",
              f"El puente de contexto expone {m['miembros']} miembros al renderer.",
              [str(m["miembros"])], [f"{_n(m['miembros'])} miembros"])

    return items


def recall_de_evidencia(item: Item, ctx: str) -> float:
    """La parte de la evidencia que el contexto trae: la misma regla del banco de mem0."""
    if not item.evidence:
        return 0.0
    return sum(1 for e in item.evidence if e[:60] in ctx) / len(item.evidence)


def mide(home_base, home_espejo, items: list[Item], budget: int = 1500) -> list[dict]:
    """La misma pregunta, las dos mentes: la de antes de mirar y la de después."""
    filas = []
    for item in items:
        texto_base, usados_base, _ = home_base.thalamus.compose(item.question, budget)
        texto_espejo, usados_espejo, ids = home_espejo.thalamus.compose(item.question, budget)
        filas.append({
            "item_id": item.id,
            "question": item.question,
            "evidence": item.evidence,
            "base_recall": round(recall_de_evidencia(item, texto_base), 4),
            "base_tokens": usados_base,
            "espejo_recall": round(recall_de_evidencia(item, texto_espejo), 4),
            "espejo_tokens": usados_espejo,
            "espejo_ids": ids,
        })
    return filas


def resumen(filas: list[dict]) -> dict:
    """El número: acierto (evidencia traída) y tokens, con y sin el espejo."""
    if not filas:
        return {"preguntas": 0}
    n = len(filas)
    return {
        "preguntas": n,
        "base_recall": round(sum(f["base_recall"] for f in filas) / n, 4),
        "espejo_recall": round(sum(f["espejo_recall"] for f in filas) / n, 4),
        "base_tokens": round(sum(f["base_tokens"] for f in filas) / n),
        "espejo_tokens": round(sum(f["espejo_tokens"] for f in filas) / n),
        "mejora": round(sum(f["espejo_recall"] - f["base_recall"] for f in filas) / n, 4),
    }


def guarda(filas: list[dict], path: Path) -> None:
    import json
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        for fila in filas:
            f.write(json.dumps(fila, ensure_ascii=False) + "\n")
