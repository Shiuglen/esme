"""Métricas honestas: medias con intervalo de confianza bootstrap y tasa de empeoramiento."""
from __future__ import annotations

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
