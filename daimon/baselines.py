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


def pack(texts: list[str], budget: int) -> tuple[str, int]:
    """Concatena sin pasarse nunca del presupuesto; si queda hueco ≥50 tokens, recorta el trozo que no cabe."""
    parts: list[str] = []
    for t in texts:
        candidate = SEP.join(parts + [t])
        if count(candidate) <= budget:
            parts.append(t)
            continue
        used = count(SEP.join(parts)) if parts else 0
        remaining = budget - used
        if remaining >= 50:
            room = remaining * 4 - (len(SEP) if parts else 0) - 4
            parts.append(t[:max(room, 0)])
            break
    text = SEP.join(parts)
    while count(text) > budget:          # garantía dura
        text = text[:-4]
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
