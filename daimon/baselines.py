"""Constructores de contexto de las líneas base: todos con la misma firma y el mismo presupuesto."""
from __future__ import annotations

from pathlib import Path
from typing import Callable

from .hippocampus import Hippocampus
from .immune import clean, is_excluded
from .ingest import Event
from .lexical import BM25
from .tokens import count

SEP = "\n---\n"
# Por debajo de este tamaño (en caracteres) un fragmento ya no se parte por palabras: es más útil
# entero que limpio.
MIN_FRAGMENTO = 64
CtxFn = Callable[[str, int], tuple[str, int]]


def fmt(e: Event) -> str:
    return f"[{e.kind} · {e.ts[:10]}] {e.text}"


def _corta(t: str, room_chars: int) -> str:
    """Recorta al final de una palabra.

    Antes el recorte era a caracteres crudos (y la garantía dura quitaba de cuatro en cuatro), así
    que la IA recibía media palabra y no entendía nada. Ahora se corta por palabras.

    Excepción: si el trozo sale muy corto (menos de `MIN_FRAGMENTO`), se deja entero aunque haya
    que partir una palabra: un fragmento de tres palabras partido no vale ni un Sorted, y prefiero
    que la IA reciba el comienzo del recuerdo que no le llegue nada.
    """
    if len(t) <= room_chars:
        return t
    corte = t[:room_chars]
    if " " in corte:
        i = corte.rfind(" ")
        if i >= MIN_FRAGMENTO:
            return corte[:i].rstrip() + "…"
    return corte + "…"


def pack(texts: list[str], budget: int, incluidos: list[int] | None = None) -> tuple[str, int]:
    """Concatena sin pasarse nunca del presupuesto.

    - `budget <= 0` significa SIN LÍMITE: entra todo lo que haya (para quien quiera el contexto entero).
    - Si un recuerdo no cabe entero, se recorta **por palabras** (nunca a media palabra) y se marca
      con «…»; así la IA recibe el comienzo del recuerdo, que es lo que le sirve.
    - `incluidos` recibe los índices de los trozos que de verdad entraron en el texto.
    """
    if budget <= 0:                      # sin límite: el presupuesto deja de limitar nada
        if incluidos is not None:
            incluidos.extend(range(len(texts)))
        text = SEP.join(texts)
        return text, count(text)
    parts: list[str] = []
    for i, t in enumerate(texts):
        candidate = SEP.join(parts + [t])
        if count(candidate) <= budget:
            parts.append(t)
            if incluidos is not None:
                incluidos.append(i)
            continue
        used = count(SEP.join(parts)) if parts else 0
        room = (budget - used) * 4 - (len(SEP) if parts else 0)
        if room >= MIN_FRAGMENTO:
            parts.append(_corta(t, room))
            if incluidos is not None:
                incluidos.append(i)
        break
    text = SEP.join(parts)
    while count(text) > budget and parts:   # garantía dura, pero recortando por palabras
        last = parts[-1]
        corte = last[:-1] if last.endswith("…") else last
        i = corte.rfind(" ")
        if i >= MIN_FRAGMENTO:
            parts[-1] = corte[:i].rstrip() + "…"
        else:
            parts.pop()
        text = SEP.join(parts)
    return text, count(text)


def ctx_none(query: str, budget: int) -> tuple[str, int]:
    return "", 0


def make_ctx_md(md_paths: list[Path]) -> CtxFn:
    lines = []
    for p in md_paths:
        if is_excluded(str(p)):
            continue
        for line in Path(p).read_text(encoding="utf-8", errors="replace").splitlines():
            c = clean(line)
            if c is not None and c.strip():
                lines.append(c)
    body = "\n".join(lines)
    return lambda query, budget: pack([body], budget)


def make_ctx_bm25(bm25: BM25, k: int = 50) -> CtxFn:
    return lambda query, budget: pack([fmt(e) for e, _ in bm25.search(query, k)], budget)


def make_ctx_dense(hippo: Hippocampus, k: int = 50) -> CtxFn:
    return lambda query, budget: pack([fmt(h.event) for h in hippo.recall(query, k=k, hops=0)], budget)


def make_ctx_long(events: list[Event]) -> CtxFn:
    recent = sorted(events, key=lambda e: e.ts, reverse=True)
    return lambda query, budget: pack([fmt(e) for e in recent], budget)
