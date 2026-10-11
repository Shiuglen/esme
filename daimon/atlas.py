"""Atlas: la memoria real convertida en un mapa con relieve.

Los recuerdos se proyectan a 2D por su significado (UMAP); la densidad se vuelve altura (KDE) y cada región recibe una
etiqueta sacada de sus propios textos. Nada es decorativo: si hay una montaña, de verdad sabes mucho de eso.
"""
from __future__ import annotations

import json
import math
from collections import Counter

import numpy as np

from .ingest import Event
from .lexical import tokenize

_GENERIC = {"usuario", "user", "claude", "assistant", "the", "que", "para", "con", "esto", "tambien", "todo", "puede",
            "hacer", "bien", "ahora", "solo", "cada", "aqui", "asi", "pero", "como", "mas", "muy", "note", "doc",
            "antes", "despues", "miro", "medido", "aplicable", "codigo", "code", "have", "this", "with", "you", "your",
            "cuando", "donde", "entonces", "porque", "sobre", "hace", "hecho", "dice", "dijo", "tiene", "tener", "ver",
            "vez", "sin", "son", "fue", "era", "ser", "estar", "esta", "este", "eso", "ese", "algo", "nada", "otro"}


def _project(V: np.ndarray, seed: int) -> np.ndarray:
    n = len(V)
    if n < 20:
        X = V - V.mean(0)
        u, s, _ = np.linalg.svd(X, full_matrices=False)
        P = u[:, :2] * s[:2] if n > 1 else np.zeros((n, 2))
    else:
        import umap
        P = umap.UMAP(n_components=2, metric="cosine", n_neighbors=min(15, n - 1), min_dist=0.08,
                      random_state=seed, n_jobs=1).fit_transform(V)
    P = P - P.mean(0)
    scale = np.abs(P).max() or 1.0
    return (P / scale).astype(np.float64)


def _kde_heights(P: np.ndarray, bw: float = 0.08) -> np.ndarray:
    d2 = ((P[:, None, :] - P[None, :, :]) ** 2).sum(-1)
    dens = np.exp(-d2 / (2 * bw * bw)).sum(1)
    lo, hi = dens.min(), dens.max()
    return (dens - lo) / (hi - lo) if hi > lo else np.zeros(len(P))


def _labels(texts_by_cluster: dict[int, list[str]]) -> dict[int, str]:
    tf = {c: Counter(w for t in ts for w in set(tokenize(t)) if w not in _GENERIC and not w.isdigit() and len(w) > 2)
          for c, ts in texts_by_cluster.items()}
    df = Counter(w for c in tf for w in tf[c])
    n = len(tf)
    out = {}
    for c, counts in tf.items():
        size = max(len(texts_by_cluster[c]), 1)
        counts = Counter({w: f for w, f in counts.items() if f >= max(2, 0.08 * size) and "_" not in w
                          and not any(ch.isdigit() for ch in w)}) or counts
        scored = sorted(counts.items(), key=lambda kv: -kv[1] * math.log(n / df[kv[0]]) if n > 1 else -kv[1])
        out[c] = " · ".join(w for w, _ in scored[:2]) or f"región {c}"
    return out


def _merge_similar(V: np.ndarray, lab: np.ndarray, thr: float = 0.9) -> np.ndarray:
    """Une regiones cuyo centro significa casi lo mismo (coseno > thr) y renumera 0..k-1."""
    ids = sorted(set(int(c) for c in lab))
    C = np.stack([V[lab == c].mean(0) for c in ids])
    C /= np.maximum(np.linalg.norm(C, axis=1, keepdims=True), 1e-9)
    parent = list(range(len(ids)))

    def root(i):
        while parent[i] != i:
            parent[i] = parent[parent[i]]
            i = parent[i]
        return i
    S = C @ C.T
    for i in range(len(ids)):
        for j in range(i + 1, len(ids)):
            if S[i, j] > thr:
                parent[root(j)] = root(i)
    roots = {}
    remap = {c: roots.setdefault(root(i), len(roots)) for i, c in enumerate(ids)}
    return np.array([remap[int(c)] for c in lab])


def compute_atlas(vectors: np.ndarray, events: list[Event], seed: int = 0) -> dict:
    if len(events) == 0:
        return {"points": [], "clusters": []}
    P = _project(np.asarray(vectors, dtype=np.float32), seed)
    H = _kde_heights(P)
    n = len(events)
    k = int(min(40, max(2, round(math.sqrt(n / 8)))))
    k = min(k, n)
    from sklearn.cluster import KMeans
    labels_idx = KMeans(n_clusters=k, n_init=4, random_state=seed).fit_predict(vectors) if n > k else np.arange(n)
    labels_idx = _merge_similar(np.asarray(vectors, dtype=np.float32), labels_idx)
    by_c: dict[int, list[str]] = {}
    for e, c in zip(events, labels_idx):
        by_c.setdefault(int(c), []).append(e.text)
    names = _labels(by_c)
    points = [{"id": e.id, "x": round(float(P[i, 0]), 4), "y": round(float(P[i, 1]), 4), "h": round(float(H[i]), 4),
               "cluster": int(labels_idx[i]), "kind": e.kind, "source": e.source.split("/")[-1][:80]}
              for i, e in enumerate(events)]
    clusters = []
    for c in sorted(by_c):
        idx = np.where(labels_idx == c)[0]
        clusters.append({"id": c, "label": names[c], "x": round(float(P[idx, 0].mean()), 4),
                         "y": round(float(P[idx, 1].mean()), 4), "size": int(len(idx))})
    return {"points": points, "clusters": clusters}


def atlas_for(home) -> dict:
    """Atlas de un hogar, con caché en atlas.json mientras la memoria no cambie."""
    events = home.hippo.events()
    sig = [len(events), events[-1].id if events else ""]
    cache = home.path / "atlas.json"
    if cache.exists():
        data = json.loads(cache.read_text())
        if data.get("sig") == sig:
            return data["atlas"]
    V = np.stack([home.hippo.vector(e.id) for e in events]) if events else np.zeros((0, home.lens.dim), np.float32)
    atlas = compute_atlas(V, events)
    cache.write_text(json.dumps({"sig": sig, "atlas": atlas}))
    return atlas
