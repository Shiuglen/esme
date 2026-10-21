"""Tálamo: decide qué recuerdos entran en el mensaje a la IA, en qué orden y con qué presupuesto.

Aprende de resultados: ranker lineal entrenado por pares (evidencia oro) y actualizado en línea con feedback.
"""
from __future__ import annotations

import json
import math
from datetime import datetime, timezone
from pathlib import Path

import numpy as np

from .baselines import SEP, fmt, pack
from .hippocampus import Hippocampus
from .ingest import Event
from .lexical import BM25
from .tokens import count

KINDS = ("note", "doc", "user_msg", "ai_msg")
W0 = np.array([1, 0.6, -0.1, 0.2, 0.1, 0, 0, 0.05, 0, -0.05, 0.5, 0.5], dtype=np.float64)
# Cuántas consultas compuestas se recuerdan para que el feedback siga sirviendo tras reiniciar.
ULTIMAS_GUARDADAS = 200


def _days_since(ts: str, now: datetime) -> float:
    try:
        t = datetime.fromisoformat(ts.replace("Z", "+00:00"))
        if t.tzinfo is None:
            t = t.replace(tzinfo=timezone.utc)
        return max((now - t).total_seconds() / 86400, 0.0)
    except ValueError:
        return 365.0


def features(query: str, cand: Event, dense: float, bm25: float, hop: int,
             now: datetime | None = None, bm25_raw: float = 0.0, dense_rank: int | None = None,
             recencia_dias: float = 90.0) -> np.ndarray:
    """12 rasgos: significado, léxico relativo, salto, confianza, recencia, tipo (4), longitud,
    léxico absoluto (¿la coincidencia es fuerte de verdad?) y rango por significado.

    `recencia_dias` es la vida media de la recencia. **Medido:** con 3650 días el examen baja
    (0,839 → 0,851 al volver a 90), porque un rasgo que ya no distingue nada desplaza el balance
    del resto. Y el peso que aprende el modelo sobre la recencia es minúsculo (0,02), así que la
    recencia nunca llegó a amputar recuerdos: el problema era de congelación, no de ranking.
    Se deja en 90 (lo que el examen premia) y se puede cambiar por configuración."""
    now = now or datetime.now(timezone.utc)
    onehot = [1.0 if cand.kind == k else 0.0 for k in KINDS]
    lex_abs = 1.0 - math.exp(-bm25_raw / 10)
    dense_rr = 1.0 / (1.0 + dense_rank / 5) if dense_rank is not None else 0.0
    return np.array([dense, bm25, hop, cand.trust, math.exp(-_days_since(cand.ts, now) / max(recencia_dias, 1.0)),
                     *onehot, math.log1p(count(cand.text)) / 8, lex_abs, dense_rr], dtype=np.float64)


def _sigmoid(x):
    return 1.0 / (1.0 + np.exp(-x))


class Thalamus:
    def __init__(self, hippo: Hippocampus, bm25: BM25, w: np.ndarray | None = None,
                 mmr_lambda: float = 0.7, k: int = 120, eps: float = 0.05, max_drop: float | None = None,
                 min_candidatos: int = 0,
                 min_dense: float | None = None, max_items: int | None = None,
                 recencia_dias: float = 90.0, hops: int = 2, k_cola: int = 120,
                 tokens_por_recuerdo: int = 50):
        self.hippo, self.bm25 = hippo, bm25
        self.w = (W0.copy() if w is None else np.asarray(w, dtype=np.float64))
        self.mmr_lambda, self.k, self.eps = mmr_lambda, k, eps
        # corte adaptativo: solo entra lo que puntúa a menos de max_drop del mejor (None = llenar el presupuesto)
        self.max_drop = max_drop
        # suelo del corte: aunque la diferencia de puntuación sea enorme, el contexto nunca se
        # queda con un solo recuerdo. Una mente que piensa con 35 tokens de 1500 no está pensando
        # con lo que sabe: el corte puede quitar ruido, pero no puede dejar a la mente ciega.
        # Medido (banco del espejo): con el corte solo, el recall caía a 0,81 y el contexto se
        # quedaba en 363 tokens de 1500; con el suelo, 1,00 y 1316.
        self.min_candidatos = min_candidatos
        # abstención: si nada se parece lo bastante (ni por significado ni por palabras fuertes), no se mete ruido
        self.min_dense = min_dense
        # topes de tamaño: ya no hay un 60 fijo; el presupuesto manda y None = sin tope
        self.max_items = max_items
        # vida media de la recencia: los recuerdos viejos se atenúan, pero no se vuelven invisibles
        self.recencia_dias = recencia_dias
        # saltos en el grafo de la memoria: a cuántos vecinos se llega al recuperar
        self.hops = hops
        # pool ancho (el techo cuando no hay límite) y tokens que ocupa cada recuerdo de media
        self.k_cola, self.tokens_por_recuerdo = k_cola, tokens_por_recuerdo
        self._last: dict[str, dict[str, np.ndarray]] = {}
        self._cabeza: set[str] = set()      # ids de la capa precisa del pool
        self._rng = np.random.default_rng(0)
        # memoria por motor: cada IA tiene su forma de querer el contexto
        self.pesos_motor: dict[str, np.ndarray] = {}      # motor -> pesos propios (nacen de los globales)
        self.senales: dict[str, list[float]] = {}          # motor -> recompensas vistas

    def pesos(self, motor: str | None = None) -> np.ndarray:
        """Los pesos que tocan a este motor: los suyos si ya aprendió, los globales si no."""
        if motor and motor in self.pesos_motor:
            return self.pesos_motor[motor]
        return self.w

    def estadisticas(self) -> dict:
        """Qué motor gana y con qué señal: la orquesta también se mide."""
        out = {}
        for motor, vals in self.senales.items():
            out[motor] = {"señales": len(vals), "media": float(np.mean(vals)) if vals else 0.0,
                          "aciertos": int(sum(1 for v in vals if v >= 0.5)),
                          "peso_propio": motor in self.pesos_motor}
        return out

    def candidates(self, query: str, k: int | None = None, cola: bool = False) -> list[tuple[Event, np.ndarray]]:
        """Candidatos con su rasgo, en dos capas: la **cabeza** (pool corto y preciso) y la **cola**
        (pool ancho, sólo si se pide `cola`).

        El motivo está medido en el examen: un pool más ancho trae más falsos positivos que ganan
        por azar (con 120 candidatos se pierde exactitud). Pero un pool corto deja el presupuesto
        a medias cuando el agente pide mucho contexto. Así: **la cabeza elige, la cola rellena**.

        El ajuste de los pesos se hace **sólo con la cabeza**: si se entrenara con la cola delante,
        los pesos cambiarían y se perdería exactitud (medido)."""
        k = k or self.k
        if len(self.hippo) == 0:
            self._cabeza = set()
            return []
        now = datetime.now(timezone.utc)
        q = self.hippo.lens.encode([query], role="query")[0]
        found: dict[str, tuple[Event, float, int]] = {}
        for h in self.hippo.recall(query, k=k // 2, hops=self.hops):
            found[h.event.id] = (h.event, float(self.hippo.vector(h.event.id) @ q), h.hop)
        lex = self.bm25.search(query, k)
        top = max((s for _, s in lex), default=1.0) or 1.0
        raw = {e.id: s for e, s in lex}
        for e, _ in lex:
            if e.id not in found and self.hippo.get(e.id) is not None:
                found[e.id] = (e, float(self.hippo.vector(e.id) @ q), 0)
        cabeza = set(found)               # lo que reveló el pool corto: lo preciso
        # la capa ancha: los que el pool corto no vio, para llenar el presupuesto sobrante
        if cola and k < self.k_cola:
            for h in self.hippo.recall(query, k=self.k_cola // 2, hops=self.hops):
                if h.event.id not in found:
                    found[h.event.id] = (h.event, float(self.hippo.vector(h.event.id) @ q), h.hop)
            for e, _ in self.bm25.search(query, self.k_cola):
                if e.id not in found and self.hippo.get(e.id) is not None:
                    found[e.id] = (e, float(self.hippo.vector(e.id) @ q), 0)
        self._cabeza = cabeza              # la cabeza es lo que reveló el pool corto; el resto es cola
        order = sorted(found, key=lambda i: -found[i][1])
        drank = {i: r for r, i in enumerate(order)}
        return [(e, features(query, e, d, raw.get(i, 0.0) / top, hop, now, raw.get(i, 0.0), drank[i],
                             recencia_dias=self.recencia_dias))
                for i, (e, d, hop) in found.items()]

    def k_para(self, budget: int) -> int:
        """Cuántos candidatos se miran, según lo que se pide.

        Medido en el examen: con 1500 tokens de presupuesto, un pool de 40 candidatos acierta más
        que uno de 120 (más candidatos = más falsos positivos que ganan por azar). Pero si el agente
        pide 8000 tokens, quedarse en 40 dejaría el presupuesto a medias. Por eso el pool **crece
        con lo que se pide** y el ancho (120) es el techo cuando no hay límite."""
        if budget <= 0:
            return self.k_cola
        return max(self.k, int(budget / self.tokens_por_recuerdo) + 1)

    def rank(self, query: str, motor: str | None = None, budget: int | None = None) -> list[tuple[Event, float, np.ndarray]]:
        cands = self.candidates(query, k=self.k_para(budget if budget is not None else 0), cola=True)
        w = self.pesos(motor)
        return sorted(((e, float(x @ w), x) for e, x in cands), key=lambda t: -t[1])

    def compose(self, query: str, budget: int, explore: bool = False,
                motor: str | None = None) -> tuple[str, int, list[str]]:
        ranked = self.rank(query, motor, budget=budget)
        if not ranked:
            return "", 0, []
        todos = ranked
        # La abstención ya no cierra la puerta: antes devolvía "" y el agente se quedaba parado.
        # Ahora, si nada parece mucho, se devuelve lo mejor que hay y se marca como contexto débil.
        debil = False
        if self.min_dense is not None:
            best_dense = max(x[0] for _, _, x in ranked)
            best_lex = max(x[10] for _, _, x in ranked)
            if best_dense < self.min_dense and best_lex < 0.7:
                debil = True
        if self.max_drop is not None:
            ranked = [t for t in ranked if t[1] >= ranked[0][1] - self.max_drop]
        if self.min_candidatos and len(ranked) < self.min_candidatos:
            # el suelo: el corte puede quitar ruido, pero la mente nunca se queda ciega
            ranked = todos[:self.min_candidatos]
        # MMR: relevancia frente a redundancia con lo ya elegido
        scores = np.array([s for _, s, _ in ranked])
        if explore and self._rng.random() < self.eps:      # exploración: perturba las puntuaciones
            scores = scores + self._rng.normal(0, max(scores.std(), 1e-3), len(scores))
        rel = (scores - scores.min()) / (scores.max() - scores.min() + 1e-9)
        vecs = np.stack([self.hippo.vector(e.id) for e, _, _ in ranked])
        chosen: list[int] = []
        left = list(range(len(ranked)))
        top = self.max_items

        def _elige(candidatos: list[int]) -> bool:
            """MMR dentro de una capa. Devuelve True si el presupuesto se llenó."""
            while candidatos and (top is None or len(chosen) < top):
                if chosen:
                    red = np.max(vecs[candidatos] @ vecs[chosen].T, axis=1)
                else:
                    red = np.zeros(len(candidatos))
                mmr = self.mmr_lambda * rel[candidatos] - (1 - self.mmr_lambda) * red
                pick = candidatos[int(np.argmax(mmr))]
                chosen.append(pick)
                left.remove(pick)
                candidatos.remove(pick)
                if budget > 0 and count(SEP.join(fmt(ranked[i][0]) for i in chosen)) >= budget:
                    return True                 # el presupuesto manda: no se eligen trozos que no caben
            return False

        # Dos capas, por orden: la **cabeza** (pool corto, el preciso) gasta el presupuesto; la
        # **cola** (pool ancho) sólo rellena lo que quede. Medido en el examen: si la cola compite,
        # se cuela por delante de la cabeza y se pierdenexactitud.
        cabeza = [i for i in left if ranked[i][0].id in self._cabeza]
        cola = [i for i in left if ranked[i][0].id not in self._cabeza]
        if not _elige(cabeza):
            _elige(cola)
        texts = [fmt(ranked[i][0]) for i in chosen]
        incluidos: list[int] = []
        text, used = pack(texts, budget, incluidos)
        if debil and text:
            text = "[contexto débil: no hay recuerdos muy parecidos]\n" + text
        # Los ids son los recuerdos que de verdad entraron: antes solo los que sobrevivían al recorte,
        # y los demás se perdían sin que nadie lo supiera.
        ids = [ranked[chosen[i]][0].id for i in incluidos]
        self._last[query] = {e.id: x for e, _, x in ranked}
        return text, used, ids

    def fit(self, examples: list[tuple[str, set[str]]], epochs: int = 200, lr: float = 0.1,
            l2: float = 1e-3) -> float:
        """Regresión logística por pares: la evidencia oro debe puntuar por encima del resto."""
        diffs = []
        for query, gold in examples:
            cands = self.candidates(query)
            pos = [x for e, x in cands if e.id in gold]
            neg = [x for e, x in cands if e.id not in gold]
            for p in pos:
                for n in neg:
                    diffs.append(p - n)
        if not diffs:
            return float("nan")
        D = np.array(diffs)
        loss = float("nan")
        for _ in range(epochs):
            m = D @ self.w
            loss = float(np.mean(np.log1p(np.exp(-m))) + l2 * self.w @ self.w)
            grad = -(D * _sigmoid(-m)[:, None]).mean(0) + 2 * l2 * self.w
            self.w -= lr * grad
        return loss

    def _mover(self, paso: np.ndarray, motor: str | None) -> None:
        """Aplica un paso a los pesos globales y a los del motor (que nacen de los globales)."""
        self.w += paso
        if motor:
            propio = self.pesos_motor.setdefault(motor, self.w.copy())
            propio += paso

    def _rasgos_de(self, query: str, ids: list[str]) -> dict[str, np.ndarray] | None:
        """Los rasgos de la última composición que trae estos ids.

        Antes la señal se perdía si el `query` del feedback no era exactamente el del recall (un
        espacio de diferencia y el aprendizaje se iba). Ahora, si la consulta no coincide, se busca
        entre las composiciones recientes la que traiga esos recuerdos: el aviso manda la verdad."""
        feats = self._last.get(query)
        if feats is not None and any(i in feats for i in ids):
            return feats
        marcados = set(ids)
        for _, otras in reversed(list(self._last.items())):
            if marcados & set(otras):
                return otras
        return feats

    def feedback(self, ids: list[str], reward: float, query: str, lr: float = 0.05, k_alt: int = 10,
                 motor: str | None = None) -> bool:
        """Bandido por pares: lo útil sube frente a las alternativas; lo inútil baja frente a ellas.

        Sin alternativa con la que comparar (un recall que trae un solo recuerdo), se refuerza
        o se penaliza el rasgo del recuerdo marcado: así la señal nunca se pierde.
        Con motor, cada IA aprende su propia forma de querer el contexto: los pesos del motor
        nacen de los globales y se separan a partir de ahí. Devuelve False (sin efecto) si esa
        consulta no se compuso nunca con esos ids."""
        feats = self._rasgos_de(query, ids)
        marked = [i for i in ids if feats and i in feats]
        if not marked:
            return False
        w = self.pesos(motor)
        others = sorted((i for i in feats if i not in ids), key=lambda i: -(feats[i] @ w))[:k_alt]
        pos, neg = (marked, others) if reward >= 0.5 else (others, marked)
        if not neg:                                  # solo hay un camino: refuerza o penaliza el rasgo
            for p in marked:
                self._mover(lr * feats[p] if reward >= 0.5 else -lr * feats[p], motor)
            if motor:
                self.senales.setdefault(motor, []).append(reward)
            return True
        for p in pos:
            for n in neg:
                d = feats[p] - feats[n]
                self._mover(lr * _sigmoid(-(d @ w)) * d, motor)
        if motor:
            self.senales.setdefault(motor, []).append(reward)
        return True

    def save(self, path: Path) -> None:
        """Guarda los pesos globales, los de cada motor y sus señales (un solo fichero .npz)."""
        arrays: dict[str, np.ndarray] = {"global": self.w}
        for motor, w in self.pesos_motor.items():
            arrays[f"motor::{motor}"] = w
        for motor, vals in self.senales.items():
            arrays[f"senal::{motor}"] = np.asarray(vals, dtype=np.float64)
        with open(path, "wb") as fh:          # nombre exacto: np.savez añadiría .npz
            np.savez(fh, **arrays)
        self._guardar_ultimas(path)

    def _guardar_ultimas(self, path: Path) -> None:
        """Guarda las últimas consultas compuestas.

        Antes el feedback solo servía si el recall y el feedback ocurrían en el mismo proceso: al
        reiniciar la app, todo lo aprendido se perdía. Ahora sobrevive al cierre."""
        try:
            data = {q: {i: [float(v) for v in x] for i, x in feats.items()}
                    for q, feats in list(self._last.items())[-ULTIMAS_GUARDADAS:]}
            path.parent.joinpath("ultimas.json").write_text(json.dumps(data), encoding="utf-8")
        except OSError:
            pass

    def _cargar_ultimas(self, path: Path) -> None:
        """Recupera las consultas compuestas de la vez anterior: el feedback no se pierde al reiniciar."""
        f = path.parent / "ultimas.json"
        if not f.exists():
            return
        try:
            data = json.loads(f.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            return
        for q, feats in data.items():
            self._last[q] = {i: np.asarray(v, dtype=np.float64) for i, v in feats.items()}

    def load(self, path: Path) -> None:
        """Lee el formato nuevo (npz) y, si solo hay el viejo (npy), los pesos globales."""
        self._cargar_ultimas(path)
        if not path.exists():
            return
        with open(path, "rb") as fh:
            carga = np.load(fh, allow_pickle=False)
            if isinstance(carga, np.lib.npyio.NpzFile):
                with carga as z:
                    if "global" in z:
                        self.w = z["global"].astype(np.float64)
                    for key in z.files:
                        if key.startswith("motor::"):
                            self.pesos_motor[key[7:]] = z[key].astype(np.float64)
                        elif key.startswith("senal::"):
                            self.senales[key[7:]] = [float(v) for v in z[key]]
                return
            self.w = carga.astype(np.float64)
