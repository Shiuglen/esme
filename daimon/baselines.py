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
CtxFn = Callable[[str, int], tuple[str, int]]


def fmt(e: Event) -> str:
    return f"[{e.kind} · {e.ts[:10]}] {e.text}"


def _corta(t: str, room_tokens: int) -> str:
    """Recorta al final de una palabra y marca el corte: nunca se parte una palabra por la mitad.

    Antes el recorte era a caracteres crudos (y la garantía dura quitaba de cuatro en cuatro),
    así que la IA recibía media palabra y no entendía nada. Ahora recibe texto legible hasta el final.
    """
    room = max(room_tokens, 0) * 4
    if len(t) <= room:
        return t
    corte = t[:room]
    if " " in corte:
        corte = corte[:corte.rfind(" ")]
    return corte.rstrip() + "…"


def pack(texts: list[str], budget: int, incluidos: list[int] | None = None) -> tuple[str, int]:
    """Concatena sin pasarse nunca del presupuesto.

    - `budget <= 0` significa SIN LÍMITE: entra todo lo que haya (para quien quiera el contexto entero).
    - Si un trozo no cabe, se recorta por palabras y se marca con «…»; nunca se mutila a media palabra.
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
        remaining = budget - used
        room = remaining * 4 - (len(SEP) if parts else 0)
        if room >= 40:                    # queda sitio para un trozo legible
            parts.append(_corta(t, max(room // 4, 0)))
            if incluidos is not None:
                incluidos.append(i)
        break
    text = SEP.join(parts)
    while count(text) > budget:          # garantía dura, pero sin cortar a media palabra
        base = text[:-1] if text.endswith("…") else text
        corte = base.rfind(" ")
        text = ((base[:corte].rstrip()) if corte > 0 else base[:-4]).rstrip() + "…"
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
