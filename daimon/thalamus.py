"""Tálamo: decide qué recuerdos entran en el mensaje a la IA, en qué orden y con qué presupuesto.

Aprende de resultados: ranker lineal entrenado por pares (evidencia oro) y actualizado en línea con feedback.
"""
from __future__ import annotations

import math
from datetime import datetime, timezone
from pathlib import Path

import numpy as np

from .baselines import fmt, pack
from .hippocampus import Hippocampus
from .ingest import Event
from .lexical import BM25
from .tokens import count

KINDS = ("note", "doc", "user_msg", "ai_msg")
W0 = np.array([1, 0.6, -0.1, 0.2, 0.1, 0, 0, 0.05, 0, -0.05], dtype=np.float64)


def _days_since(ts: str, now: datetime) -> float:
    try:
        t = datetime.fromisoformat(ts.replace("Z", "+00:00"))
        if t.tzinfo is None:
            t = t.replace(tzinfo=timezone.utc)
        return max((now - t).total_seconds() / 86400, 0.0)
    except ValueError:
        return 365.0


def features(query: str, cand: Event, dense: float, bm25: float, hop: int,
             now: datetime | None = None) -> np.ndarray:
    now = now or datetime.now(timezone.utc)
    onehot = [1.0 if cand.kind == k else 0.0 for k in KINDS]
    return np.array([dense, bm25, hop, cand.trust, math.exp(-_days_since(cand.ts, now) / 90),
                     *onehot, math.log1p(count(cand.text)) / 8], dtype=np.float64)


def _sigmoid(x):
    return 1.0 / (1.0 + np.exp(-x))


class Thalamus:
    def __init__(self, hippo: Hippocampus, bm25: BM25, w: np.ndarray | None = None,
                 mmr_lambda: float = 0.7, k: int = 40, eps: float = 0.05):
        self.hippo, self.bm25 = hippo, bm25
        self.w = (W0.copy() if w is None else np.asarray(w, dtype=np.float64))
        self.mmr_lambda, self.k, self.eps = mmr_lambda, k, eps
        self._last: dict[str, dict[str, np.ndarray]] = {}
        self._rng = np.random.default_rng(0)

    def candidates(self, query: str, k: int | None = None) -> list[tuple[Event, np.ndarray]]:
        k = k or self.k
        if len(self.hippo) == 0:
            return []
        now = datetime.now(timezone.utc)
        q = self.hippo.lens.encode([query], role="query")[0]
        found: dict[str, tuple[Event, float, int]] = {}
        for h in self.hippo.recall(query, k=k // 2, hops=2):
            found[h.event.id] = (h.event, float(self.hippo.vector(h.event.id) @ q), h.hop)
        lex = self.bm25.search(query, k)
        top = max((s for _, s in lex), default=1.0) or 1.0
        lexs = {e.id: s / top for e, s in lex}
        for e, _ in lex:
            if e.id not in found and self.hippo.get(e.id) is not None:
                found[e.id] = (e, float(self.hippo.vector(e.id) @ q), 0)
        return [(e, features(query, e, d, lexs.get(i, 0.0), hop, now)) for i, (e, d, hop) in found.items()]

    def rank(self, query: str) -> list[tuple[Event, float, np.ndarray]]:
        cands = self.candidates(query)
        return sorted(((e, float(x @ self.w), x) for e, x in cands), key=lambda t: -t[1])

    def compose(self, query: str, budget: int, explore: bool = False) -> tuple[str, int, list[str]]:
        ranked = self.rank(query)
        if not ranked:
            return "", 0, []
        if explore and self._rng.random() < self.eps:
            self._rng.shuffle(ranked)
        # MMR: relevancia frente a redundancia con lo ya elegido
        scores = np.array([s for _, s, _ in ranked])
        rel = (scores - scores.min()) / (scores.max() - scores.min() + 1e-9)
        vecs = np.stack([self.hippo.vector(e.id) for e, _, _ in ranked])
        chosen: list[int] = []
        left = list(range(len(ranked)))
        while left and len(chosen) < 60:
            if chosen:
                red = np.max(vecs[left] @ vecs[chosen].T, axis=1)
            else:
                red = np.zeros(len(left))
            mmr = self.mmr_lambda * rel[left] - (1 - self.mmr_lambda) * red
            pick = left[int(np.argmax(mmr))]
            chosen.append(pick)
            left.remove(pick)
        texts = [fmt(ranked[i][0]) for i in chosen]
        text, used = pack(texts, budget)
        ids = [ranked[i][0].id for i, t in zip(chosen, texts) if t[:40] in text]
        self._last[query] = {ranked[i][0].id: ranked[i][2] for i in chosen}
        return text, used, ids

    def fit(self, examples: list[tuple[str, set[str]]], epochs: int = 200, lr: float = 0.1,
            l2: float = 1e-3) -> float:
        """Regresión logística por pares: la evidencia oro debe puntuar por encima del resto."""
        diffs = []
        for query, gold in examples:
            cands = self.candidates(query)
            pos = [x for e, x in cands if e.id in gold]
            neg = [x for e, x in cands if e.id not in gold]
            for p in pos:
                for n in neg:
                    diffs.append(p - n)
        if not diffs:
            return float("nan")
        D = np.array(diffs)
        loss = float("nan")
        for _ in range(epochs):
            m = D @ self.w
            loss = float(np.mean(np.log1p(np.exp(-m))) + l2 * self.w @ self.w)
            grad = -(D * _sigmoid(-m)[:, None]).mean(0) + 2 * l2 * self.w
            self.w -= lr * grad
        return loss

    def feedback(self, ids: list[str], reward: float, query: str, lr: float = 0.05) -> None:
        """Actualización en línea (bandido): lo que sirvió sube, lo que no, baja."""
        feats = self._last.get(query, {})
        for i in ids:
            x = feats.get(i)
            if x is not None:
                self.w += lr * (reward - _sigmoid(x @ self.w)) * x

    def save(self, path: Path) -> None:
        np.save(path, self.w)

    def load(self, path: Path) -> None:
        self.w = np.load(path).astype(np.float64)
