"""Lente personal: codificador de significado + adaptador residual que se entrena con el usuario."""
from __future__ import annotations

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
    import json
    import urllib.request

    def call(texts: list[str]) -> np.ndarray:
        out = []
        for s in range(0, len(texts), batch):
            body = json.dumps({"model": model, "input": texts[s:s + batch]}).encode()
            req = urllib.request.Request(f"{host.rstrip('/')}/api/embed", data=body,
                                         headers={"Content-Type": "application/json"})
            with urllib.request.urlopen(req, timeout=timeout) as r:
                out.extend(json.loads(r.read())["embeddings"])
        return np.asarray(out, dtype=np.float32)

    dim = int(call(["x"]).shape[1])
    return call, dim


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
