"""Búsqueda léxica BM25 con normalización de acentos (la línea base clásica)."""
from __future__ import annotations

import math
import re
import unicodedata
from collections import Counter

from .ingest import Event

STOP = set("""de la que el en y a los se del las un por con no una su para es al lo como mas o pero sus le ya
fue este ha si porque esta son entre cuando muy sin sobre tambien me hasta hay donde quien desde todo nos
the of and to in is it that for on with as was be this are or by an at from qué que cómo como cual""".split())


def tokenize(text: str) -> list[str]:
    t = "".join(c for c in unicodedata.normalize("NFKD", text.lower()) if not unicodedata.combining(c))
    return [w for w in re.findall(r"\w+", t) if w not in STOP and len(w) > 1]


class BM25:
    def __init__(self, events: list[Event], k1: float = 1.5, b: float = 0.75):
        self.events, self.k1, self.b = events, k1, b
        self.docs = [Counter(tokenize(e.text)) for e in events]
        self.lens = [sum(d.values()) for d in self.docs]
        self.avg = (sum(self.lens) / len(self.lens)) if self.lens else 0.0
        df = Counter(w for d in self.docs for w in d)
        n = len(self.docs)
        self.idf = {w: math.log(1 + (n - c + 0.5) / (c + 0.5)) for w, c in df.items()}

    def search(self, query: str, k: int) -> list[tuple[Event, float]]:
        q = tokenize(query)
        scores = []
        for i, d in enumerate(self.docs):
            s = 0.0
            for w in q:
                f = d.get(w, 0)
                if f:
                    s += self.idf[w] * f * (self.k1 + 1) / (f + self.k1 * (1 - self.b + self.b * self.lens[i] / max(self.avg, 1e-9)))
            if s > 0:
                scores.append((s, i))
        scores.sort(reverse=True)
        return [(self.events[i], s) for s, i in scores[:k]]
