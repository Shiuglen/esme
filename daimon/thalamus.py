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
W0 = np.array([1, 0.6, -0.1, 0.2, 0.1, 0, 0, 0.05, 0, -0.05, 0.5, 0.5], dtype=np.float64)


def _days_since(ts: str, now: datetime) -> float:
    try:
        t = datetime.fromisoformat(ts.replace("Z", "+00:00"))
        if t.tzinfo is None:
            t = t.replace(tzinfo=timezone.utc)
        return max((now - t).total_seconds() / 86400, 0.0)
    except ValueError:
        return 365.0


def features(query: str, cand: Event, dense: float, bm25: float, hop: int,
             now: datetime | None = None, bm25_raw: float = 0.0, dense_rank: int | None = None) -> np.ndarray:
    """12 rasgos: significado, léxico relativo, salto, confianza, recencia, tipo (4), longitud,
    léxico absoluto (¿la coincidencia es fuerte de verdad?) y rango por significado."""
    now = now or datetime.now(timezone.utc)
    onehot = [1.0 if cand.kind == k else 0.0 for k in KINDS]
    lex_abs = 1.0 - math.exp(-bm25_raw / 10)
    dense_rr = 1.0 / (1.0 + dense_rank / 5) if dense_rank is not None else 0.0
    return np.array([dense, bm25, hop, cand.trust, math.exp(-_days_since(cand.ts, now) / 90),
                     *onehot, math.log1p(count(cand.text)) / 8, lex_abs, dense_rr], dtype=np.float64)


def _sigmoid(x):
    return 1.0 / (1.0 + np.exp(-x))


class Thalamus:
    def __init__(self, hippo: Hippocampus, bm25: BM25, w: np.ndarray | None = None,
                 mmr_lambda: float = 0.7, k: int = 40, eps: float = 0.05, max_drop: float | None = None,
                 min_dense: float | None = None):
        self.hippo, self.bm25 = hippo, bm25
        self.w = (W0.copy() if w is None else np.asarray(w, dtype=np.float64))
        self.mmr_lambda, self.k, self.eps = mmr_lambda, k, eps
        # corte adaptativo: solo entra lo que puntúa a menos de max_drop del mejor (None = llenar el presupuesto)
        self.max_drop = max_drop
        # abstención: si nada se parece lo bastante (ni por significado ni por palabras fuertes), no se mete ruido
        self.min_dense = min_dense
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
        raw = {e.id: s for e, s in lex}
        for e, _ in lex:
            if e.id not in found and self.hippo.get(e.id) is not None:
                found[e.id] = (e, float(self.hippo.vector(e.id) @ q), 0)
        order = sorted(found, key=lambda i: -found[i][1])
        drank = {i: r for r, i in enumerate(order)}
        return [(e, features(query, e, d, raw.get(i, 0.0) / top, hop, now, raw.get(i, 0.0), drank[i]))
                for i, (e, d, hop) in found.items()]

    def rank(self, query: str) -> list[tuple[Event, float, np.ndarray]]:
        cands = self.candidates(query)
        return sorted(((e, float(x @ self.w), x) for e, x in cands), key=lambda t: -t[1])

    def compose(self, query: str, budget: int, explore: bool = False) -> tuple[str, int, list[str]]:
        ranked = self.rank(query)
        if not ranked:
            return "", 0, []
        if self.min_dense is not None:
            best_dense = max(x[0] for _, _, x in ranked)
            best_lex = max(x[10] for _, _, x in ranked)
            if best_dense < self.min_dense and best_lex < 0.7:
                return "", 0, []
        if self.max_drop is not None:
            ranked = [t for t in ranked if t[1] >= ranked[0][1] - self.max_drop]
        # MMR: relevancia frente a redundancia con lo ya elegido
        scores = np.array([s for _, s, _ in ranked])
        if explore and self._rng.random() < self.eps:      # exploración: perturba las puntuaciones
            scores = scores + self._rng.normal(0, max(scores.std(), 1e-3), len(scores))
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
        self._last[query] = {e.id: x for e, _, x in ranked}
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

    def feedback(self, ids: list[str], reward: float, query: str, lr: float = 0.05, k_alt: int = 10) -> bool:
        """Bandido por pares: lo útil sube frente a las alternativas; lo inútil baja frente a ellas.

        Devuelve False (sin efecto) si esa consulta no se compuso en esta sesión."""
        feats = self._last.get(query)
        marked = [i for i in ids if feats and i in feats]
        if not marked:
            return False
        others = sorted((i for i in feats if i not in ids), key=lambda i: -(feats[i] @ self.w))[:k_alt]
        pos, neg = (marked, others) if reward >= 0.5 else (others, marked)
        for p in pos:
            for n in neg:
                d = feats[p] - feats[n]
                self.w += lr * _sigmoid(-(d @ self.w)) * d
        return True

    def save(self, path: Path) -> None:
        np.save(path, self.w)

    def load(self, path: Path) -> None:
        self.w = np.load(path).astype(np.float64)
