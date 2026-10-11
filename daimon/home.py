"""Hogar de una mente: lente, hipocampo, léxico y tálamo cargados desde una carpeta."""
from __future__ import annotations

from pathlib import Path

from .hippocampus import Hippocampus
from .ingest import Event
from .lens import Lens, model2vec_encoder
from .lexical import BM25
from .thalamus import Thalamus


class Home:
    def __init__(self, path: Path, encoder=None):
        self.path = Path(path)
        self.path.mkdir(parents=True, exist_ok=True)
        enc, dim = encoder or model2vec_encoder()
        lens_file = self.path / "lens.npz"
        self.lens = Lens.load(lens_file, enc) if lens_file.exists() else Lens(enc, dim)
        self.hippo = Hippocampus(self.path / "mem.db", self.lens)
        self.thalamus = Thalamus(self.hippo, BM25(self.hippo.events()))
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
