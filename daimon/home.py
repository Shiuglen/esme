"""Hogar de una mente: lente, hipocampo, léxico y tálamo cargados desde una carpeta, con SU configuración."""
from __future__ import annotations

import json
from pathlib import Path

from .hippocampus import Hippocampus
from .ingest import Event
from .lens import Lens, hash_encoder, model2vec_encoder, ollama_encoder, onnx_encoder, ruta_modelo

# Modelos de Ollama que la Lente propia sabe correr sin Ollama (mismo modelo, motor propio)
PROPIOS = {"embeddinggemma": "embeddinggemma-300m"}
# La reserva de ONNX Runtime que el cerebro se aguanta por defecto. Se mide en `scripts/medir_lente.py`.
RESERVA_POR_DEFECTO = "sin-arena"
from .lexical import BM25
from .thalamus import Thalamus

CONFIG = "config.json"


def encoder_from_config(cfg: dict):
    name = cfg.get("encoder", "model2vec:minishlab/potion-multilingual-128M")
    # Lo que ONNX Runtime se guarda a sí mismo. La reserva por defecto de ONNX grows por potencias de
    # dos y tras absorber deja al cerebro con 1,5 GB de los suyos: se mide en `scripts/medir_lente.py`.
    reserva = cfg.get("reserva", RESERVA_POR_DEFECTO)
    if name.startswith("onnx:"):
        return onnx_encoder(name.split(":", 1)[1], reserva=reserva)
    if name.startswith("ollama:"):
        modelo = name.split(":", 1)[1]
        propio = PROPIOS.get(modelo.split(":")[0])
        if propio and (ruta_modelo(propio) / "tokenizer.json").exists():
            return onnx_encoder(propio, reserva=reserva)    # la red no depende de Ollama
        return ollama_encoder(modelo)
    if name.startswith("hash:"):
        return hash_encoder(int(name.split(":", 1)[1]))
    return model2vec_encoder(name.split(":", 1)[1] if ":" in name else name)


class Home:
    def __init__(self, path: Path, encoder=None):
        self.path = Path(path).expanduser().resolve()
        self.path.mkdir(parents=True, exist_ok=True)
        cfg_file = self.path / CONFIG
        self.config = json.loads(cfg_file.read_text()) if cfg_file.exists() else {}
        enc, dim = encoder or encoder_from_config(self.config)
        lens_file = self.path / "lens.npz"
        prefixes = {k: self.config.get(k, "") for k in ("query_prefix", "doc_prefix")}
        self.lens = Lens.load(lens_file, enc) if lens_file.exists() else Lens(enc, dim, **prefixes)
        if lens_file.exists() and any(prefixes.values()):
            self.lens.query_prefix, self.lens.doc_prefix = prefixes["query_prefix"], prefixes["doc_prefix"]
        self.hippo = Hippocampus(self.path / "mem.db", self.lens)
        # Todos los topes que la mente tenía hardcodeados pasan a ser configuración:
        # candidatos (k), tope de recuerdos (max_items, None = sin tope) y vida de la recencia.
        self.thalamus = Thalamus(self.hippo, BM25(self.hippo.events()),
                                 mmr_lambda=self.config.get("mmr_lambda", 0.7),
                                 max_drop=self.config.get("max_drop"), min_dense=self.config.get("min_dense"),
                                 k=int(self.config.get("k", 40)),
                                 max_items=self.config.get("max_items"),
                                 hops=int(self.config.get("hops", 2)),
                                 k_cola=int(self.config.get("k_cola", 120)),
                                 tokens_por_recuerdo=int(self.config.get("tokens_por_recuerdo", 50)),
                                 recencia_dias=float(self.config.get("recencia_dias", 90.0)))
        pesos = self.path / "pesos.npz"
        if pesos.exists():
            self.thalamus.load(pesos)
        elif (self.path / "thalamus.npy").exists():
            self.thalamus.load(self.path / "thalamus.npy")

    def add(self, events: list[Event]) -> int:
        n = self.hippo.store(events)
        if n:
            self.thalamus.bm25 = BM25(self.hippo.events())
        return n

    def ingest(self, events: list[Event]) -> int:
        """Ingesta sincronizada por fuente (lo editado se actualiza, lo desaparecido queda obsoleto)."""
        n = self.hippo.add_source_events(events)
        self.thalamus.bm25 = BM25(self.hippo.events())
        return n

    def save_thalamus(self) -> None:
        self.thalamus.save(self.path / "pesos.npz")
