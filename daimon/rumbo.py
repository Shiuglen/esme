"""El rumbo de una mente: para qué trabaja. Pilares (las estrellas fijas) y objetivos (lo que va cambiando).

Vive en la CARPETA de la mente (rumbo.json), no en la app: es de la mente, y viaja con ella. Y el rumbo no es un
texto suelto: tiene estados, pertenece a un pilar y se cierra cuando se cumple.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

RUMBO = "rumbo.json"
VERSION = 1
MAX_PILARES = 7
MAX_OBJETIVOS = 60
ESTADOS = ("activo", "hecho", "pausado")

Pilar = dict
Objetivo = dict


def _texto(x, maximo=200) -> str:
    return " ".join(str(x or "").split())[:maximo]


def _id(texto: str, creado: int) -> str:
    base = re.sub(r"[^a-z0-9]+", "-", _texto(texto, 40).lower()).strip("-")[:28] or "x"
    return f"{base}-{creado % 100000}"


def vacio() -> dict:
    return {"version": VERSION, "pilares": [], "objetivos": []}


def normaliza(bruto) -> dict:
    """Lee un rumbo de cualquier forma y devuelve uno sano: lo que no vale se cae, lo demás se queda."""
    if not isinstance(bruto, dict):
        return vacio()
    pilares: list[Pilar] = []
    vistos = set()
    for p in (bruto.get("pilares") or [])[:MAX_PILARES]:
        if not isinstance(p, dict):
            continue
        texto = _texto(p.get("texto"))
        if not texto or texto in vistos:
            continue
        vistos.add(texto)
        creado = p.get("creado") if isinstance(p.get("creado"), int) else 0
        pilares.append({"id": str(p.get("id") or _id(texto, creado)), "texto": texto, "creado": creado})
    ids = {p["id"] for p in pilares}

    objetivos: list[Objetivo] = []
    vistos_o = set()
    for o in (bruto.get("objetivos") or [])[:MAX_OBJETIVOS]:
        if not isinstance(o, dict):
            continue
        texto = _texto(o.get("texto"))
        if not texto or texto in vistos_o:
            continue
        vistos_o.add(texto)
        creado = o.get("creado") if isinstance(o.get("creado"), int) else 0
        estado = o.get("estado") if o.get("estado") in ESTADOS else "activo"
        pilar = o.get("pilar") if o.get("pilar") in ids else None
        cerrados = o.get("cerrado") if isinstance(o.get("cerrado"), int) else None
        objetivos.append({"id": str(o.get("id") or _id(texto, creado)), "texto": texto, "estado": estado,
                          "creado": creado, "cerrado": cerrados, "pilar": pilar})
    return {"version": VERSION, "pilares": pilares, "objetivos": objetivos}


def lee(carpeta: Path) -> dict:
    f = Path(carpeta) / RUMBO
    if not f.exists():
        return vacio()
    try:
        return normaliza(json.loads(f.read_text()))
    except Exception:
        return vacio()


def escribe(carpeta: Path, rumbo: dict) -> dict:
    """Guarda un rumbo sano. Devuelve lo que quedó guardado (nunca lo que se pidió sin más)."""
    sano = normaliza(rumbo)
    f = Path(carpeta) / RUMBO
    f.parent.mkdir(parents=True, exist_ok=True)
    f.write_text(json.dumps(sano, ensure_ascii=False, indent=1) + "\n")
    return sano


def anade_pilar(carpeta: Path, texto: str, ahora: int) -> dict:
    r = lee(carpeta)
    t = _texto(texto)
    if not t:
        return r
    if len(r["pilares"]) >= MAX_PILARES:
        r["pilares"] = r["pilares"][1:]
    r["pilares"].append({"id": _id(t, ahora), "texto": t, "creado": ahora})
    return escribe(carpeta, r)


def anade_objetivo(carpeta: Path, texto: str, ahora: int, pilar: str | None = None) -> dict:
    r = lee(carpeta)
    t = _texto(texto)
    if not t:
        return r
    vivos = [o for o in r["objetivos"] if o["estado"] == "activo"]
    if len(vivos) >= MAX_OBJETIVOS:
        return r
    ids = {p["id"] for p in r["pilares"]}
    r["objetivos"].append({"id": _id(t, ahora), "texto": t, "estado": "activo", "creado": ahora, "cerrado": None,
                            "pilar": pilar if pilar in ids else None})
    return escribe(carpeta, r)


def cambia_objetivo(carpeta: Path, id: str, estado: str, ahora: int) -> dict:
    r = lee(carpeta)
    if estado not in ESTADOS:
        return r
    for o in r["objetivos"]:
        if o["id"] == id:
            o["estado"] = estado
            o["cerrado"] = ahora if estado == "hecho" else None
            break
    return escribe(carpeta, r)


def quita_pilar(carpeta: Path, id: str) -> dict:
    """Quita un pilar. Sus objetivos NO se borran: se quedan sin casa (perder un objetivo no es lo que se pidió)."""
    r = lee(carpeta)
    r["pilares"] = [p for p in r["pilares"] if p["id"] != id]
    for o in r["objetivos"]:
        if o.get("pilar") == id:
            o["pilar"] = None
    return escribe(carpeta, r)


def quita_objetivo(carpeta: Path, id: str) -> dict:
    r = lee(carpeta)
    r["objetivos"] = [o for o in r["objetivos"] if o["id"] != id]
    return escribe(carpeta, r)
