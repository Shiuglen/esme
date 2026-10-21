"""Métricas honestas: medias con intervalo de confianza bootstrap y tasa de empeoramiento."""
from __future__ import annotations

import math

import numpy as np


def bootstrap_ci(values, n: int = 2000, seed: int = 0) -> tuple[float, float, float]:
    v = np.asarray(values, dtype=float)
    if len(v) == 0:
        return float("nan"), float("nan"), float("nan")
    rng = np.random.default_rng(seed)
    means = v[rng.integers(0, len(v), size=(n, len(v)))].mean(axis=1)
    return float(v.mean()), float(np.percentile(means, 2.5)), float(np.percentile(means, 97.5))


def worse_rate(a: dict, base: dict) -> float:
    common = [k for k in a if k in base]
    return sum(a[k] < base[k] for k in common) / len(common) if common else 0.0


def paired_diff_ci(a: dict, b: dict, n: int = 5000, seed: int = 0) -> tuple[float, float, float]:
    """La diferencia de acierto entre dos variantes, **emparejada por ítem**.

    Las variantes se responden las MISMAS preguntas: la comparación justa es por pares, y su
    IC es mucho más estrecho que el de dos medias independientes (el mismo ítem se anula solo).
    Comparar dos medias sueltas —que es lo que hacía el veredicto— mezcla la diferencia real con
    el ruido de los ítems: por eso un empate acababa contando como derrota.
    """
    keys = [k for k in a if k in b]
    if not keys:
        return float("nan"), float("nan"), float("nan")
    d = np.asarray([a[k] - b[k] for k in keys], dtype=float)
    rng = np.random.default_rng(seed)
    means = d[rng.integers(0, len(d), size=(n, len(d)))].mean(axis=1)
    return float(d.mean()), float(np.percentile(means, 2.5)), float(np.percentile(means, 97.5))


def sign_test_p(diffs) -> float:
    """Test exacto del binomio sobre los pares discordantes (p = 0,5 en cada dirección).

    No mira las medias: mira cuántos ítems cambian a favor y cuántos en contra. Con 35 ítems
    y puntuaciones de 0 / 0,5 / 1, es el test que no se fía de la forma de la distribución.
    """
    pos = sum(1 for d in diffs if d > 0)
    neg = sum(1 for d in diffs if d < 0)
    n = pos + neg
    if n == 0:
        return 1.0
    k = min(pos, neg)
    p = sum(math.comb(n, i) for i in range(k + 1)) / (2 ** n) * 2
    return min(1.0, p)
