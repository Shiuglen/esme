"""Codificador falso y determinista para tests: bolsa de palabras con vectores por hash."""
import hashlib

import numpy as np


def fake_encoder(dim: int = 32):
    def word_vec(w: str) -> np.ndarray:
        seed = int(hashlib.md5(w.encode()).hexdigest()[:8], 16)
        return np.random.default_rng(seed).standard_normal(dim).astype(np.float32)

    def enc(texts):
        out = np.zeros((len(texts), dim), dtype=np.float32)
        for i, t in enumerate(texts):
            for w in t.lower().split():
                out[i] += word_vec(w)
        return out

    return enc, dim
