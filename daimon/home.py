"""Hogar de una mente: lente, hipocampo, léxico y tálamo cargados desde una carpeta, con SU configuración."""
from __future__ import annotations

import json
from pathlib import Path

from .hippocampus import Hippocampus
from .ingest import Event
from .lens import Lens, model2vec_encoder, ollama_encoder
from .lexical import BM25
from .thalamus import Thalamus

CONFIG = "config.json"


def encoder_from_config(cfg: dict):
    name = cfg.get("encoder", "model2vec:minishlab/potion-multilingual-128M")
    if name.startswith("ollama:"):
        return ollama_encoder(name.split(":", 1)[1])
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
        self.thalamus = Thalamus(self.hippo, BM25(self.hippo.events()),
                                 mmr_lambda=self.config.get("mmr_lambda", 0.7),
                                 max_drop=self.config.get("max_drop"), min_dense=self.config.get("min_dense"))
        if (self.path / "thalamus.npy").exists():
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
        self.thalamus.save(self.path / "thalamus.npy")
