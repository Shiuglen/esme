"""Lente personal: codificador de significado + adaptador residual que se entrena con el usuario."""
from __future__ import annotations

import os
import time
from collections import OrderedDict
from pathlib import Path
from typing import Callable

import numpy as np

Encoder = Callable[[list[str]], np.ndarray]


def _normalize(x: np.ndarray) -> np.ndarray:
    n = np.linalg.norm(x, axis=1, keepdims=True)
    return (x / np.maximum(n, 1e-8)).astype(np.float32)


class Lens:
    def __init__(self, encoder: Encoder, dim: int, W: np.ndarray | None = None,
                 query_prefix: str = "", doc_prefix: str = ""):
        self.encoder, self.dim = encoder, dim
        self.query_prefix, self.doc_prefix = query_prefix, doc_prefix
        self.W = np.zeros((dim, dim), dtype=np.float32) if W is None else W.astype(np.float32)

    def _base(self, texts: list[str], role: str = "doc") -> np.ndarray:
        pre = self.query_prefix if role == "query" else self.doc_prefix
        raw = self.encoder([pre + t for t in texts])
        return _normalize(np.asarray(raw, dtype=np.float32).reshape(len(texts), self.dim))

    def encode(self, texts: list[str], role: str = "doc") -> np.ndarray:
        """role='query' para consultas y 'doc' para recuerdos (algunos codificadores usan prefijos distintos)."""
        x = self._base(texts, role)
        return _normalize(x + x @ self.W)

    def train_adapter(self, pairs: list[tuple[str, str]], epochs: int = 30, lr: float = 0.05,
                      tau: float = 0.05, l2: float = 1e-3, batch: int = 64, seed: int = 0) -> float:
        """InfoNCE simétrico con negativos del lote; gradiente analítico a través de la normalización."""
        a_all = self._base([p[0] for p in pairs])
        b_all = self._base([p[1] for p in pairs])
        rng = np.random.default_rng(seed)
        loss = float("nan")
        for _ in range(epochs):
            order = rng.permutation(len(pairs))
            losses = []
            for s in range(0, len(order), batch):
                idx = order[s:s + batch]
                if len(idx) < 2:
                    continue
                a, b = a_all[idx], b_all[idx]
                za, zb = a + a @ self.W, b + b @ self.W
                na, nb = np.linalg.norm(za, axis=1, keepdims=True), np.linalg.norm(zb, axis=1, keepdims=True)
                ua, ub = za / na, zb / nb
                logits = ua @ ub.T / tau
                n = len(idx)
                p_r = np.exp(logits - logits.max(1, keepdims=True)); p_r /= p_r.sum(1, keepdims=True)
                p_c = np.exp(logits - logits.max(0, keepdims=True)); p_c /= p_c.sum(0, keepdims=True)
                eye = np.eye(n, dtype=np.float32)
                losses.append(float(-(np.log(np.diag(p_r) + 1e-9).mean() + np.log(np.diag(p_c) + 1e-9).mean()) / 2))
                g = ((p_r - eye) + (p_c - eye)) / (2 * n * tau)      # dL/dlogits
                gua, gub = g @ ub, g.T @ ua                          # dL/du
                gza = (gua - ua * np.sum(gua * ua, 1, keepdims=True)) / na
                gzb = (gub - ub * np.sum(gub * ub, 1, keepdims=True)) / nb
                grad = a.T @ gza + b.T @ gzb + l2 * self.W
                self.W -= lr * grad.astype(np.float32)
            if losses:
                loss = float(np.mean(losses))
        return loss

    def save(self, path: Path) -> None:
        np.savez(path, W=self.W, dim=self.dim, qp=self.query_prefix, dp=self.doc_prefix)

    @classmethod
    def load(cls, path: Path, encoder: Encoder) -> "Lens":
        d = np.load(path)
        return cls(encoder, int(d["dim"]), d["W"], str(d["qp"]) if "qp" in d else "", str(d["dp"]) if "dp" in d else "")


def model2vec_encoder(name: str = "minishlab/potion-multilingual-128M") -> tuple[Encoder, int]:
    from model2vec import StaticModel
    model = StaticModel.from_pretrained(name)
    dim = int(model.embedding.shape[1])
    return (lambda texts: model.encode(texts)), dim


def ollama_encoder(model: str = "embeddinggemma", host: str = "http://127.0.0.1:11434",
                   batch: int = 64, timeout: float = 120) -> tuple[Encoder, int]:
    """Codificador local servido por Ollama (p. ej. EmbeddingGemma, multilingüe)."""
    from .ollama_http import post_json

    def call(texts: list[str]) -> np.ndarray:
        out = []
        for s in range(0, len(texts), batch):
            out.extend(post_json(host, "/api/embed", {"model": model, "input": texts[s:s + batch]}, timeout)["embeddings"])
        return np.asarray(out, dtype=np.float32)

    dim = int(call(["x"]).shape[1])
    return call, dim


def ruta_modelo(nombre: str) -> Path:
    """Carpeta de un modelo propio de Esme (por defecto ~/.local/share/esme/modelos/<nombre>-onnx)."""
    base = Path(os.environ.get("ESME_MODELOS", Path.home() / ".local/share/esme/modelos"))
    return base / f"{nombre}-onnx"


def _devolver_memoria() -> None:
    """Devuelve al sistema la memoria libre del proceso (glibc la guarda para reusarla si no se le pide)."""
    try:
        import ctypes
        ctypes.CDLL("libc.so.6").malloc_trim(0)
    except (OSError, AttributeError):   # otra libc u otro sistema: no pasa nada, solo se devuelve más tarde
        pass


def onnx_encoder(nombre: str = "embeddinggemma-300m", variante: str = "model_quantized", hilos: int | None = None,
                 tokens_por_lote: int = 2048, max_tokens: int = 2048, cache: int = 4096,
                 inactividad: float | None = 60) -> tuple[Encoder, int]:
    """La Lente propia: el modelo corre dentro del cerebro con ONNX Runtime (CPU), sin Ollama ni servidores aparte.
    Agrupa por longitud y llena cada lote hasta un presupuesto de tokens (no rellena en balde), usa la mitad de
    los núcleos para no acaparar el equipo y recuerda lo ya codificado (los textos repetidos no se recalculan).
    Consumo: con el modelo cargado el cerebro ocupa ~360 MB (y ~1,5 GB tras absorber, por la reserva de ONNX Runtime),
    y cargarlo cuesta ~0,1 s. Así que tras `inactividad` segundos sin usarse lo suelta y devuelve la memoria al sistema;
    al volver a usarse lo recupera. None lo deja siempre cargado.
    Lotes de 2048 tokens: al absorber, el pico baja de ~2,7 GB a ~1,6 GB perdiendo un 9 % de velocidad (medido el 12-oct;
    con 1024 apenas baja más y se pierde un 32 %)."""
    import threading

    import onnxruntime as ort
    from tokenizers import Tokenizer

    d = ruta_modelo(nombre)
    so = ort.SessionOptions()
    so.intra_op_num_threads = hilos or max(1, (os.cpu_count() or 2) // 2)
    so.inter_op_num_threads = 1
    estado: dict = {"sesion": None, "reloj": None, "ultimo": time.monotonic()}
    cerrojo = threading.RLock()

    def abrir():
        if estado["sesion"] is None:
            estado["sesion"] = ort.InferenceSession(str(d / "onnx" / f"{variante}.onnx"), so, providers=["CPUExecutionProvider"])
        return estado["sesion"]

    def soltar() -> None:
        with cerrojo:
            # un reloj viejo puede dispararse mientras un lote largo tiene el cerrojo: solo suelta si de verdad nadie lo usó
            if estado["sesion"] is None or time.monotonic() - estado["ultimo"] < inactividad:
                return
            estado["sesion"] = None
        import gc
        gc.collect()
        _devolver_memoria()

    def rearmar() -> None:
        if inactividad is None:
            return
        if estado["reloj"] is not None:
            estado["reloj"].cancel()
        estado["reloj"] = threading.Timer(inactividad, soltar)
        estado["reloj"].daemon = True
        estado["reloj"].start()

    tok = Tokenizer.from_file(str(d / "tokenizer.json"))
    tok.enable_truncation(max_tokens)
    tok.no_padding()
    with cerrojo:
        dim = int(abrir().get_outputs()[-1].shape[-1])
    rearmar()
    recuerdo: OrderedDict[str, np.ndarray] = OrderedDict()

    def correr(cod: list) -> np.ndarray:
        largo = max(len(e.ids) for e in cod)
        ids = np.zeros((len(cod), largo), np.int64)
        mascara = np.zeros((len(cod), largo), np.int64)
        for j, e in enumerate(cod):
            ids[j, :len(e.ids)] = e.ids
            mascara[j, :len(e.ids)] = 1
        return abrir().run(["sentence_embedding"], {"input_ids": ids, "attention_mask": mascara})[0]

    def enc(texts: list[str]) -> np.ndarray:
        out = np.zeros((len(texts), dim), np.float32)
        faltan = [i for i, t in enumerate(texts) if t not in recuerdo]
        for i, t in enumerate(texts):
            if t in recuerdo:
                out[i] = recuerdo[t]; recuerdo.move_to_end(t)
        if faltan:
            with cerrojo:   # el servidor usa hilos: nadie suelta el modelo a mitad de un lote
                cod = tok.encode_batch([texts[i] for i in faltan])
                orden = sorted(range(len(faltan)), key=lambda k: len(cod[k].ids))
                lote: list[int] = []
                for k in orden + [None]:
                    if k is not None and (not lote or (len(lote) + 1) * len(cod[k].ids) <= tokens_por_lote):
                        lote.append(k); continue
                    if lote:
                        vecs = correr([cod[q] for q in lote])
                        for q, v in zip(lote, vecs):
                            out[faltan[q]] = v
                    if k is not None:
                        lote = [k]
                estado["ultimo"] = time.monotonic()
            rearmar()
            for i in faltan:
                recuerdo[texts[i]] = out[i]
                if len(recuerdo) > cache:
                    recuerdo.popitem(last=False)
        return _normalize(out) if len(texts) else out

    enc.cargada = lambda: estado["sesion"] is not None   # type: ignore[attr-defined]
    return enc, dim


# Prefijos recomendados por EmbeddingGemma para búsqueda
EMBEDDINGGEMMA_PREFIXES = {"query_prefix": "task: search result | query: ", "doc_prefix": "title: none | text: "}


def hash_encoder(dim: int = 256) -> tuple[Encoder, int]:
    """Codificador mínimo sin descargas (bolsa de palabras con vectores por hash). Modo de emergencia y pruebas."""
    import hashlib

    def word(w: str) -> np.ndarray:
        seed = int(hashlib.md5(w.encode()).hexdigest()[:8], 16)
        return np.random.default_rng(seed).standard_normal(dim).astype(np.float32)

    def enc(texts):
        out = np.zeros((len(texts), dim), dtype=np.float32)
        for i, t in enumerate(texts):
            for w in t.lower().split():
                out[i] += word(w)
        return out
    return enc, dim
