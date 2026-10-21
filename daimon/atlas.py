"""Atlas: la memoria real convertida en un mapa con relieve.

Los recuerdos se proyectan a 2D por su significado (UMAP); la densidad se vuelve altura (KDE) y cada región recibe una
etiqueta sacada de sus propios textos. Nada es decorativo: si hay una montaña, de verdad sabes mucho de eso.
"""
from __future__ import annotations

import json
import math
import re
import threading
import time
import unicodedata
from collections import Counter
from typing import Callable

import numpy as np

from .ingest import Event
from .lexical import tokenize

_cerrojo = threading.Lock()

_GENERIC = {"usuario", "user", "claude", "assistant", "the", "que", "para", "con", "esto", "tambien", "todo", "puede",
            "hacer", "bien", "ahora", "solo", "cada", "aqui", "asi", "pero", "como", "mas", "muy", "note", "doc",
            "antes", "despues", "miro", "medido", "aplicable", "codigo", "code", "have", "this", "with", "you", "your",
            "cuando", "donde", "entonces", "porque", "sobre", "hace", "hecho", "dice", "dijo", "tiene", "tener", "ver",
            "vez", "sin", "son", "fue", "era", "ser", "estar", "esta", "este", "eso", "ese", "algo", "nada", "otro",
            "https", "http", "www", "com", "html"}   # trozos de URL: no nombran nada


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
    P = P - (P.min(0) + P.max(0)) / 2          # centrado por su caja: el mapa usa todo el espacio, equilibrado
    scale = np.abs(P).max() or 1.0
    return (P / scale).astype(np.float64)


def _kde_heights(P: np.ndarray, bw: float = 0.08) -> np.ndarray:
    """La altura de cada punto: cuánta masa tiene cerca.

    **Por bloques y sin la matriz n×n×2**: esa expresión (`P[:, None, :] - P[None, :, :]`) crea
    un tensor de n×n×2 en float64 — con 5.768 recuerdos eran 532 MB, y con los 19.737 de la mente
    viva, **6,2 GB**: el pico que se llevó la app por delante (el OOM de 13 GB del 20-oct).
    Aquí la distancia se calcula por bloques y con la identidad del producto escalar
    (|a|²+|b|²−2a·b), así que lo que vive a la vez es un bloque por n, no n×n×2.
    """
    n = len(P)
    dens = np.zeros(n)
    if n == 0:
        return dens
    P = np.asarray(P, dtype=np.float64)
    norma2 = np.square(np.linalg.norm(P, axis=1))
    bloque = max(1, min(n, 512))
    for i in range(0, n, bloque):
        trozo = P[i:i + bloque]
        d2 = norma2[i:i + bloque][:, None] + norma2[None, :] - 2.0 * (trozo @ P.T)
        np.maximum(d2, 0.0, out=d2)
        dens[i:i + bloque] = np.exp(-d2 / (2 * bw * bw)).sum(1)
    lo, hi = dens.min(), dens.max()
    return (dens - lo) / (hi - lo) if hi > lo else np.zeros(n)


def _sin_acentos(w: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFKD", w) if not unicodedata.combining(c))


def _formas(textos) -> dict[str, str]:
    """Para cada palabra normalizada (sin acentos ni mayúsculas, como la cuenta tokenize), cómo la escribes tú más a menudo."""
    vistas: dict[str, Counter] = {}
    for t in textos:
        for w in re.findall(r"\w+", t):
            vistas.setdefault(_sin_acentos(w.lower()), Counter())[w] += 1
    return {k: max(c.items(), key=lambda kv: (kv[1], kv[0] != _sin_acentos(kv[0])))[0] for k, c in vistas.items()}


def _labels(texts_by_cluster: dict[int, list[str]], centroids: dict[int, np.ndarray] | None = None,
            encode: Callable[[list[str]], np.ndarray] | None = None, k: int = 2) -> dict[int, list[str]]:
    """Los términos de cada tema. Candidatos: las palabras más distintivas (tf-idf). Con lente, gana la que más se acerca
    a lo que el tema significa (su centro), no la más repetida, y la segunda no puede ser casi la misma que la primera."""
    tf = {c: Counter(w for t in ts for w in set(tokenize(t)) if w not in _GENERIC and not w.isdigit() and len(w) > 2)
          for c, ts in texts_by_cluster.items()}
    df = Counter(w for c in tf for w in tf[c])
    n = len(tf)
    formas = _formas(t for ts in texts_by_cluster.values() for t in ts)
    cands: dict[int, list[str]] = {}
    for c, counts in tf.items():
        size = max(len(texts_by_cluster[c]), 1)
        counts = Counter({w: f for w, f in counts.items() if f >= max(2, 0.08 * size) and "_" not in w
                          and not any(ch.isdigit() for ch in w)}) or counts
        scored = sorted(counts.items(), key=lambda kv: -kv[1] * math.log(n / df[kv[0]]) if n > 1 else -kv[1])
        cands[c] = [formas.get(w, w) for w, _ in scored[:12]]
    todas = sorted({w for ws in cands.values() for w in ws})
    if encode is None or centroids is None or not todas:
        return {c: ws[:k] for c, ws in cands.items()}
    try:
        E = np.asarray(encode(todas), dtype=np.float32)
    except Exception:   # sin lente (el codificador no responde): el mapa no se cae por no saber nombrar; manda la frecuencia
        return {c: ws[:k] for c, ws in cands.items()}
    E /= np.maximum(np.linalg.norm(E, axis=1, keepdims=True), 1e-9)
    fila = {w: i for i, w in enumerate(todas)}
    out = {}
    for c, ws in cands.items():
        centro = centroids[c] / max(float(np.linalg.norm(centroids[c])), 1e-9)
        elegidas: list[str] = []
        for w in sorted(ws, key=lambda w: -float(E[fila[w]] @ centro)):
            if any(float(E[fila[w]] @ E[fila[e]]) > 0.85 or _sin_acentos(w.lower())[:5] == _sin_acentos(e.lower())[:5] for e in elegidas):
                continue
            elegidas.append(w)
            if len(elegidas) == k:
                break
        out[c] = elegidas
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


def compute_atlas(vectors: np.ndarray, events: list[Event], seed: int = 0,
                  encode: Callable[[list[str]], np.ndarray] | None = None) -> dict:
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
    # El nombre de un tema debe ser central en él y a la vez distinguirlo del resto de la mente: se compara cada palabra
    # con la suma de dos direcciones unitarias, el centro del tema y lo que ese centro tiene de más que el de toda la mente.
    V32 = np.asarray(vectors, dtype=np.float32)
    unit = lambda x: x / max(float(np.linalg.norm(x)), 1e-9)
    todo = V32.mean(0)
    centros = {c: V32[labels_idx == c].mean(0) for c in by_c}
    names = _labels(by_c, {c: unit(v) + unit(v - todo) for c, v in centros.items()}, encode)
    points = [{"id": e.id, "x": round(float(P[i, 0]), 4), "y": round(float(P[i, 1]), 4), "h": round(float(H[i]), 4),
               "cluster": int(labels_idx[i]), "kind": e.kind, "source": e.source.split("/")[-1][:80],
               "ts": e.ts, "trust": round(float(e.trust), 3)}   # la tinta envejece con ts; la confianza es el trazo (tinta o grafito)
              for i, e in enumerate(events)]
    clusters = []
    for c in sorted(by_c):
        idx = np.where(labels_idx == c)[0]
        clusters.append({"id": c, "label": " · ".join(names[c]) or f"región {c}", "terms": names[c] or [f"región {c}"], "x": round(float(P[idx, 0].mean()), 4),
                         "y": round(float(P[idx, 1].mean()), 4), "size": int(len(idx))})
    return {"points": points, "clusters": clusters}


def _mismo_formato(sig) -> bool:
    """¿La caché guardada es del formato actual? (la marca va en la primera posición)."""
    return isinstance(sig, list) and bool(sig) and sig[0] == "v4"


def _firma(home) -> list:
    events = home.hippo.events()
    return ["v4", len(events), events[-1].id if events else ""]   # v2: ts y trust; v3: términos con la lente; v4: términos distintivos


def _calcula(home) -> dict:
    """El atlas de verdad: la proyección, el mapa de densidad y los grupos."""
    events = home.hippo.events()
    V = np.stack([home.hippo.vector(e.id) for e in events]) if events else np.zeros((0, home.lens.dim), np.float32)
    return compute_atlas(V, events, encode=lambda ws: home.lens.encode(ws, role="query"))


# El atlas es caro y la memoria cambia en cada recuerdo: recalcularlo en cada `remember` era una
# trampa (con la mente llena, minutos de CPU y un pico de memoria enorme). Ahora se sirve el que
# hay y se recalcula por detrás, sin pisar a quien lo pidió, y **con un tope**: un mapa de la mente
# no necesita estar al segundo.
_recalculando = False
_ultimo_intento = 0.0
ESPERA_ATLAS = 300.0     # segundos entre recálculos


def _recalcula_en_hilo(home) -> None:
    """Recalcula el atlas por detrás, si toca y si no hay otro cálculo en marcha."""
    global _recalculando, _ultimo_intento
    ahora = time.monotonic()
    with _cerrojo:
        if _recalculando or (ahora - _ultimo_intento) < ESPERA_ATLAS:
            return
        _recalculando = True
        _ultimo_intento = ahora

    def trabajo() -> None:
        global _recalculando
        try:
            atlas = _calcula(home)
            _guarda(home, atlas)
        except Exception:      # un atlas que falla no puede tumbar la app: se sigue con el viejo
            pass
        finally:
            with _cerrojo:
                _recalculando = False

    threading.Thread(target=trabajo, daemon=True).start()


def _guarda(home, atlas: dict) -> None:
    cache = home.path / "atlas.json"
    cache.write_text(json.dumps({"sig": _firma(home), "atlas": atlas}))


def atlas_for(home) -> dict:
    """Atlas de un hogar, con caché en atlas.json mientras la memoria no cambie.

    Si la memoria ha cambiado, **se sirve el atlas que hay** y el nuevo se calcula por detrás:
    quien lo pide no espera (ni se lleva el pico de memoria en la respuesta).
    """
    events = home.hippo.events()
    sig = ["v4", len(events), events[-1].id if events else ""]   # v2: ts y trust; v3: términos con la lente; v4: términos distintivos
    cache = home.path / "atlas.json"
    guardado = None
    if cache.exists():
        try:
            data = json.loads(cache.read_text())
            if data.get("sig") == sig:
                return data["atlas"]
            # Una caché de **formato viejo** no se sirve: se recalcula (sus datos no son comparables).
            guardado = data.get("atlas") if _mismo_formato(data.get("sig")) else None
        except (json.JSONDecodeError, OSError):
            guardado = None
    if guardado:
        _recalcula_en_hilo(home)
        return guardado
    atlas = _calcula(home)
    _guarda(home, atlas)
    return atlas
