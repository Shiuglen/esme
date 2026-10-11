"""Corredor de la Prueba 0: cada variante responde cada pregunta con el mismo modelo y el mismo presupuesto."""
from __future__ import annotations

import json
import time
from pathlib import Path
from typing import Callable

from ..teachers import TeacherError
from .items import Item

SYSTEM_ANSWER = ('Eres un asistente. Responde en español, breve y preciso. Usa el CONTEXTO si es relevante; '
                 'si no sabes, di "No lo sé".')


def prompt_for(question: str, context: str) -> str:
    return f"CONTEXTO:\n{context}\n\nPREGUNTA: {question}" if context else f"PREGUNTA: {question}"


def _load_cache(path: Path) -> dict[tuple[str, str], dict]:
    if not path.exists():
        return {}
    out = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        if line.strip():
            r = json.loads(line)
            out[(r["item_id"], r["variant"])] = r
    return out


def run(items: list[Item], variants: dict[str, Callable[[str, int], tuple[str, int]]], answerer,
        budget: int, cache_path: Path, max_tokens: int = 256, on_row: Callable[[dict], None] | None = None) -> list[dict]:
    cache_path = Path(cache_path)
    cache_path.parent.mkdir(parents=True, exist_ok=True)
    cache = _load_cache(cache_path)
    rows = []
    for item in items:
        for name, ctx_fn in variants.items():
            hit = cache.get((item.id, name))
            if hit:
                rows.append(hit)
                continue
            context, used = ctx_fn(item.question, budget)
            t0 = time.monotonic()
            try:
                answer, status = answerer.answer(SYSTEM_ANSWER, prompt_for(item.question, context), max_tokens), "ok"
            except TeacherError as e:
                answer, status = f"ERROR: {e}", "error"
            row = {"item_id": item.id, "variant": name, "context_tokens": used, "answer": answer,
                   "latency_s": round(time.monotonic() - t0, 3), "status": status}
            if status == "ok":           # los errores no se guardan: se reintentan al reanudar
                with cache_path.open("a", encoding="utf-8") as f:
                    f.write(json.dumps(row, ensure_ascii=False) + "\n")
            if on_row:
                on_row(row)
            rows.append(row)
    return rows
