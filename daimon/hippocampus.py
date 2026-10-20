"""Hipocampo: memoria episódica asociativa con procedencia, recuerdo multi-salto y desaprendizaje certificado."""
from __future__ import annotations

import hashlib
import json
import os
import sqlite3
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

import numpy as np

from .ingest import Event
from .lens import Lens

_SCHEMA = """
CREATE TABLE IF NOT EXISTS events(row INTEGER PRIMARY KEY, id TEXT UNIQUE, text TEXT, source TEXT, kind TEXT,
  ts TEXT, trust REAL, compartment TEXT, parent TEXT, deleted INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS deps(child TEXT, parent TEXT, PRIMARY KEY(child, parent));
CREATE TABLE IF NOT EXISTS blocklist(id TEXT PRIMARY KEY, ts TEXT);
"""
_COLS = "id, text, source, kind, ts, trust, compartment, parent"


@dataclass
class Hit:
    event: Event
    score: float
    hop: int


class Hippocampus:
    def __init__(self, db_path: Path, lens: Lens):
        self.db_path, self.lens = Path(db_path), lens
        self.vec_path = self.db_path.with_suffix(".vectors.npy")
        self.db = sqlite3.connect(self.db_path, check_same_thread=False)   # el servidor MCP usa hilos
        self.db.execute("PRAGMA secure_delete=ON")       # lo borrado se sobrescribe en disco
        self.db.executescript(_SCHEMA)
        self._reload()

    def _reload(self) -> None:
        """Relee vectores y vivos desde disco (otro proceso puede haber escrito)."""
        n = self.db.execute("SELECT COUNT(*) FROM events").fetchone()[0]
        V = np.load(self.vec_path) if self.vec_path.exists() else np.zeros((0, self.lens.dim), dtype=np.float32)
        if len(V) and V.shape[1] != self.lens.dim:
            raise ValueError(f"la memoria tiene vectores de {V.shape[1]} dims y la lente produce {self.lens.dim}: "
                             "usa el mismo codificador con el que se creó")
        if len(V) > n:          # un cierre a medias dejó vectores sin fila: se descartan
            V = V[:n]
        if len(V) < n:
            raise RuntimeError("faltan vectores para filas guardadas: memoria corrupta")
        self.V = V.astype(np.float32)
        self._alive = self._load_alive()

    def _save_vectors(self) -> None:
        tmp = self.vec_path.with_name(self.vec_path.name + ".tmp.npy")
        np.save(tmp, self.V)
        os.replace(tmp, self.vec_path)          # escritura atómica

    def _load_alive(self) -> np.ndarray:
        alive = np.zeros(len(self.V), dtype=bool)
        for (row,) in self.db.execute("SELECT row FROM events WHERE deleted=0"):
            alive[row] = True
        return alive

    def __len__(self) -> int:
        return int(self._alive.sum())

    def store(self, events: list[Event]) -> int:
        if self.db.execute("SELECT COUNT(*) FROM events").fetchone()[0] != len(self.V):
            self._reload()
        blocked = {r[0] for r in self.db.execute("SELECT id FROM blocklist")}
        status = {r[0]: r[1] for r in self.db.execute("SELECT id, deleted FROM events")}
        revive = [e.id for e in events if status.get(e.id) == 2 and e.id not in blocked]
        for i in revive:                                   # vuelve un texto que había quedado obsoleto
            self.db.execute("UPDATE events SET deleted=0 WHERE id=?", (i,))
        seen, new = set(), []
        for e in events:
            if e.id not in blocked and e.id not in status and e.id not in seen:
                seen.add(e.id); new.append(e)
        if new:
            vecs = self.lens.encode([e.text for e in new])
            start = len(self.V)
            self.db.executemany(
                f"INSERT INTO events(row, {_COLS}) VALUES (?,?,?,?,?,?,?,?,?)",
                [(start + i, e.id, e.text, e.source, e.kind, e.ts, e.trust, e.compartment, e.parent) for i, e in enumerate(new)])
            self.V = np.vstack([self.V, vecs]).astype(np.float32)
            self._save_vectors()                           # primero los vectores, luego el commit
        self.db.commit()
        self._alive = self._load_alive()
        return len(new)

    def add_source_events(self, events: list[Event]) -> int:
        """Sincroniza por fuente: lo que ya no está en la fuente queda obsoleto (deleted=2), lo nuevo entra."""
        by_src: dict[str, set[str]] = {}
        for e in events:
            by_src.setdefault(e.source, set()).add(e.id)
        for src, ids in by_src.items():
            for (i,) in self.db.execute("SELECT id FROM events WHERE source=? AND deleted=0", (src,)).fetchall():
                if i not in ids:
                    self.db.execute("UPDATE events SET deleted=2 WHERE id=?", (i,))
        self.db.commit()
        n = self.store(events)
        self._alive = self._load_alive()
        return n

    def _event(self, row) -> Event:
        return Event(*row)

    def get(self, event_id: str) -> Event | None:
        r = self.db.execute(f"SELECT {_COLS} FROM events WHERE id=? AND deleted=0", (event_id,)).fetchone()
        return self._event(r) if r else None

    def events(self) -> list[Event]:
        return [self._event(r) for r in self.db.execute(f"SELECT {_COLS} FROM events WHERE deleted=0 ORDER BY row")]

    def por_fuente(self, fuente: str, limite: int = 100) -> list[Event]:
        """Los recuerdos de una fuente concreta (lo que guardaste en X, por ejemplo), los más recientes primero.

        Es una pregunta distinta a «busca esto»: aquí no hay búsqueda, hay una coleta. Por eso va por índice
        (source) y no por similitud: son los eventos de una fuente, tal como entraron."""
        limite = max(1, min(int(limite), 500))
        r = self.db.execute(f"SELECT {_COLS} FROM events WHERE deleted=0 AND source=? ORDER BY row DESC LIMIT ?", (fuente, limite))
        return [self._event(x) for x in r]

    def vector(self, event_id: str) -> np.ndarray:
        (row,) = self.db.execute("SELECT row FROM events WHERE id=?", (event_id,)).fetchone()
        return self.V[row]

    def recall(self, query: str, k: int = 60, hops: int = 3, beta: float = 20.0) -> list[Hit]:
        """Cada salto trae k recuerdos nuevos; la consulta se desplaza hacia lo recordado (Hopfield moderna).
        Por defecto 60 recuerdos y 3 saltos: con el decaimiento 0.9 por salto, el vecino más lejano
        aún pesa 0.73 del primero, así que la búsqueda llega mucho más lejos que antes."""
        if not self._alive.any():
            return []
        q = self.lens.encode([query], role="query")[0]
        taken = ~self._alive.copy()
        best: dict[int, tuple[float, int]] = {}
        for hop in range(hops + 1):
            sims = self.V @ q
            sims[taken] = -np.inf
            avail = int((~taken).sum())
            if avail == 0:
                break
            kk = min(k, avail)
            top = np.argpartition(-sims, kk - 1)[:kk]
            top = top[np.argsort(-sims[top])]
            for r in top:
                best[int(r)] = (float(sims[r]) * (0.9 ** hop), hop)
            taken[top] = True
            w = np.exp(beta * (sims[top] - sims[top].max()))
            w /= w.sum()
            q = q + 0.5 * (w @ self.V[top])
            q = q / max(np.linalg.norm(q), 1e-8)
        rows = sorted(best, key=lambda r: -best[r][0])
        out = []
        for r in rows:
            ev = self._event(self.db.execute(f"SELECT {_COLS} FROM events WHERE row=?", (r,)).fetchone())
            out.append(Hit(ev, best[r][0], best[r][1]))
        return out

    def link(self, child_id: str, parent_id: str) -> None:
        self.db.execute("INSERT OR IGNORE INTO deps VALUES (?,?)", (child_id, parent_id))
        self.db.commit()

    def forget(self, event_id: str) -> dict:
        """Borra el recuerdo y todo lo derivado de él; lo bloquea para siempre y emite un certificado."""
        todo, gone = [event_id], []
        while todo:
            cur = todo.pop()
            if cur in gone:
                continue
            gone.append(cur)
            todo += [r[0] for r in self.db.execute("SELECT child FROM deps WHERE parent=?", (cur,))]
        now = datetime.now(timezone.utc).isoformat()
        for i in gone:
            r = self.db.execute("SELECT row FROM events WHERE id=?", (i,)).fetchone()
            if r:
                self.V[r[0]] = 0.0
                self._alive[r[0]] = False
            self.db.execute("UPDATE events SET deleted=1, text='' WHERE id=?", (i,))
            self.db.execute("INSERT OR IGNORE INTO blocklist VALUES (?,?)", (i, now))
        self.db.commit()
        self._save_vectors()
        ids = sorted(gone)
        return {"forgotten": ids, "sha256": hashlib.sha256(json.dumps(ids).encode()).hexdigest(), "ts": now}
