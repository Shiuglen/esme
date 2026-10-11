"""Juez: puntúa cada respuesta contra el oro con una rúbrica fija, más un recuerdo de hechos determinista."""
from __future__ import annotations

import hashlib
import json
import re
import unicodedata
from pathlib import Path

from .items import Item

SYSTEM_JUDGE = ("Eres un evaluador estricto. Comparas una RESPUESTA con la RESPUESTA CORRECTA y sus HECHOS CLAVE. "
                "Puntúa 1 si la respuesta contiene la idea correcta y los hechos clave esenciales, 0.5 si es parcialmente "
                "correcta o incompleta, 0 si es incorrecta, inventada o dice que no sabe. "
                "Responde SOLO con una línea: PUNTUACIÓN: <1|0.5|0>")
_SCORE = re.compile(r"(?i)puntuaci[oó]n\s*:?\s*(0[.,]5|1|0)")
_ANY = re.compile(r"(?<![\d.,])(0[.,]5|1|0)(?![\d.,])")


def parse_score(text: str) -> float:
    m = _SCORE.search(text) or _ANY.search(text)
    return float(m.group(1).replace(",", ".")) if m else 0.0


def judge(item: Item, answer: str, judge_model) -> float:
    facts = "\n".join(f"- {f}" for f in item.key_facts)
    prompt = (f"PREGUNTA: {item.question}\n\nRESPUESTA CORRECTA: {item.gold}\n\nHECHOS CLAVE:\n{facts}\n\n"
              f"RESPUESTA A EVALUAR: {answer}")
    return parse_score(judge_model.answer(SYSTEM_JUDGE, prompt, 16))


def _toks(text: str) -> set[str]:
    t = "".join(c for c in unicodedata.normalize("NFKD", text.lower()) if not unicodedata.combining(c))
    return {w for w in re.findall(r"\w+", t) if len(w) >= 3}


def fact_recall(item: Item, answer: str) -> float:
    ans = _toks(answer)
    if not item.key_facts:
        return 0.0
    hit = 0
    for f in item.key_facts:
        ft = _toks(f)
        if ft and len(ft & ans) / len(ft) >= 0.6:
            hit += 1
    return hit / len(item.key_facts)


def score(rows: list[dict], items: list[Item], judge_model, cache_path: Path) -> list[dict]:
    """Añade 'score' y 'facts' a cada fila ok; caché por (ítem, variante, respuesta)."""
    by_id = {i.id: i for i in items}
    cache_path = Path(cache_path)
    cache = {}
    if cache_path.exists():
        for line in cache_path.read_text(encoding="utf-8").splitlines():
            if line.strip():
                r = json.loads(line)
                cache[r["key"]] = r["score"]
    for r in rows:
        if r["status"] != "ok":
            continue
        item = by_id[r["item_id"]]
        key = hashlib.sha1(f'{r["item_id"]}|{r["variant"]}|{r["answer"]}'.encode()).hexdigest()
        if key not in cache:
            cache[key] = judge(item, r["answer"], judge_model)
            with cache_path.open("a", encoding="utf-8") as f:
                f.write(json.dumps({"key": key, "score": cache[key]}) + "\n")
        r["score"] = cache[key]
        r["facts"] = fact_recall(item, r["answer"])
    return rows
