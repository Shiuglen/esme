#!/usr/bin/env python3
"""El banco de examen de la memoria: la memoria de la industria, medida con las mismas reglas.

Palanca 5 de la tesis de escala. No se copia el código de nadie: **se mide**. Mismo corpus (los
recuerdos de la mente), mismas preguntas (las de la Prueba 0, la mitad oculta), mismo presupuesto de
contexto (1.500 tokens) y la misma regla para puntuar la evidencia (¿aparece el texto del recuerdo
en el contexto?).

La rival es `mem0` (Apache-2.0), la memoria de agente más usada del mundo, en local:

- **El embedder es el de Esme** (la Lente propia: EmbeddingGemma-300M int8 con ONNX Runtime, los
  mismos vectores que usa la app). mem0 traería el suyo por Ollama, pero el Ollama de esta máquina
  está roto y Esme ya no depende de él; además, dar el mismo codificador a los dos bandos es lo
  justo: lo que se mide es la **recuperación**, no quién codifica mejor.
- **El almacén es el de mem0** (Qdrant local) y la búsqueda es la suya: denso + BM25 híbrido +
  impulsos por entidad, con su propio reordenado y su corte por puntuación.
- **La consolidación se deja fuera** (`infer=False`): mem0 extrae hechos con un LLM, y eso medía
  otra cosa (con 5.768 recuerdos costaría una hora). Lo que se compara es **la recuperación**: qué
  encuentra cada memoria cuando le preguntas.

Uso (necesita mem0; no es dependencia del proyecto, así que va en su propio venv):

    /ruta/al/venv/bin/python scripts/banco_mem0.py --home data/mente_v2 \
        --items data/bench/items.jsonl --split oculto \
        --out runs/prueba0_v2/original/contexts_mem0.jsonl

Las fases se pueden repetir: los vectores se reusan de la app, la ingesta se cuenta en el almacén y
las consultas se guardan pregunta a pregunta (si esto se corta, se sigue donde estaba).
"""
from __future__ import annotations

import argparse
import json
import sqlite3
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import numpy as np  # noqa: E402

from daimon.baselines import fmt, pack  # noqa: E402
from daimon.bench.items import is_hidden, load  # noqa: E402
from daimon.ingest import Event  # noqa: E402

BUDGET = 1500


class LenteCache:
    """El embedder de mem0, pero con los vectores de la Lente de Esme.

    mem0 llama a `embed(texto, acción)`; aquí se le da el vector que la app ya calculó para ese
    recuerdo (los de `mem.vectors.npy`) y, para lo que no esté (una pregunta), se codifica con la
    misma Lente. Mismo codificador para los dos bandos: lo que se mide es la recuperación.
    """

    def __init__(self, cache: dict[str, list[float]], lens=None):
        self.cache = cache
        self.lens = lens
        self.embeddings = cache

    def embed(self, text, memory_action=None):
        v = self.cache.get(text)
        if v is None:
            if self.lens is None:
                raise RuntimeError(f"no hay vector para {text[:60]!r} y no hay Lente para calcularlo")
            rol = "query" if memory_action == "search" else "doc"
            v = self.lens.encode([text], role=rol)[0]
            self.cache[text] = v.astype(np.float32).tolist()
        return list(v)


def corpus(home: Path) -> tuple[list[Event], dict[str, str]]:
    """Los recuerdos vivos de la mente, con su id: el mismo corpus que usa el examen."""
    db = home / "mem.db"
    if not db.exists():
        raise SystemExit(f"No está la mente en {db}")
    con = sqlite3.connect(f"file:{db}?mode=ro", uri=True)
    filas = con.execute("SELECT id, text, source, kind, ts, trust, compartment, parent "
                        "FROM events WHERE deleted=0 ORDER BY row").fetchall()
    eventos = [Event(id=f[0], text=f[1], source=f[2], kind=f[3], ts=f[4], trust=f[5],
                     compartment=f[6], parent=f[7]) for f in filas]
    return eventos, {e.id: e.text for e in eventos}


def vectores_de_la_app(home: Path, vivos: set[str]) -> dict[str, list[float]]:
    """Los vectores que la app ya tiene calculados (`mem.vectors.npy`), por texto de recuerdo.

    Vienen del mismo ONNX, con los mismos prefijos: son los que la app usa para buscar. Reusarlos
    evita pagar 5.768 codificaciones y garantiza que el rival compite con los mismos números.
    """
    vec = home / "mem.vectors.npy"
    if not vec.exists():
        return {}
    V = np.load(vec)
    con = sqlite3.connect(f"file:{home / 'mem.db'}?mode=ro", uri=True)
    filas = con.execute("SELECT row, id, text FROM events ORDER BY row").fetchall()
    if len(filas) != len(V):
        return {}
    salida: dict[str, list[float]] = {}
    for r, eid, texto in filas:
        if eid in vivos:
            salida[texto] = V[r].astype(np.float32).tolist()
    return salida


def banco(ruta: Path, dim: int) -> "object":
    """La memoria de mem0, con su almacén local y su búsqueda.

    El embedder y el LLM se declaran con el proveedor de OpenAI y una clave de mentira: los dos
    quedan fuera de juego (el embedder se sustituye por la Lente de Esme y el LLM no se llama, porque
    la consolidación va con `infer=False` y la búsqueda va sin rerank). Se pone así porque el
    proveedor de Ollama de mem0 comprueba el servidor al construirse y el Ollama de esta máquina
    está roto: mem0 levantaría antes de empezar.
    """
    from mem0 import Memory

    cfg = {
        "embedder": {"provider": "openai", "config": {"model": "text-embedding-3-small",
                                                      "embedding_dims": dim, "api_key": "local"}},
        "llm": {"provider": "openai", "config": {"model": "gpt-4o-mini", "api_key": "local",
                                                 "temperature": 0.0, "max_tokens": 256}},
        "vector_store": {"provider": "qdrant", "config": {"path": str(ruta),
                                                         "collection_name": "banco",
                                                         "embedding_model_dims": dim}},
        "db": {"provider": "sqlite", "config": {"path": str(ruta / "history.db")}},
    }
    return Memory.from_config(cfg)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--home", default="data/mente_v2", help="la mente con el corpus")
    ap.add_argument("--items", default="data/bench/items.jsonl")
    ap.add_argument("--set", default="original", choices=["original", "parafrasis"],
                    help="el juego de preguntas: las literales o sus paráfrasis")
    ap.add_argument("--split", default="oculto", choices=["oculto", "visible"])
    ap.add_argument("--out", default="runs/prueba0_v2/original/contexts_mem0.jsonl")
    ap.add_argument("--budget", type=int, default=BUDGET)
    ap.add_argument("--top-k", type=int, default=20, help="cuántos recuerdos devuelve mem0 por pregunta")
    ap.add_argument("--store", default="runs/prueba0_v2/mem0/store", help="el almacén local de mem0")
    ap.add_argument("--fase", default="todo", choices=["todo", "ingesta", "consulta"])
    args = ap.parse_args()

    home = Path(args.home)
    eventos, textos = corpus(home)
    items = [i for i in load(Path(args.items)) if is_hidden(i.id) == (args.split == "oculto")]
    if args.set == "parafrasis":
        # Las mismas preguntas, dichas de otra manera: donde el léxico se rompe y sólo la
        # understanding por significado llega.
        para = {d["id"]: d["question"] for d in
                map(json.loads, (Path(args.items).parent / "parafrasis.jsonl").read_text(encoding="utf-8").splitlines())}
        for i in items:
            i.question = para[i.id]
    print(f"corpus: {len(eventos)} recuerdos · preguntas ({args.set}/{args.split}): {len(items)}", flush=True)

    # La Lente de Esme: el mismo codificador con el que la app indexa sus recuerdos.
    from daimon.home import encoder_from_config
    from daimon.lens import Lens

    cfg = json.loads((home / "config.json").read_text()) if (home / "config.json").exists() else {}
    enc, dim = encoder_from_config(cfg)
    lens = Lens(enc, dim, query_prefix=cfg.get("query_prefix", ""), doc_prefix=cfg.get("doc_prefix", ""))

    cache = vectores_de_la_app(home, {e.id for e in eventos})
    print(f"vectores de la app: {len(cache)} de {len(eventos)} recuerdos", flush=True)

    store = Path(args.store)
    store.mkdir(parents=True, exist_ok=True)
    memoria = banco(store, dim)
    memoria.embedding_model = LenteCache(cache, lens)

    # ── ingesta: el corpus, tal cual, dentro de la memoria de mem0 ────────────────────────────
    if args.fase in ("todo", "ingesta"):
        ya = memoria.vector_store.client.count(collection_name="banco", exact=True).count
        if ya < len(eventos):
            print(f"metiendo el corpus en mem0 (ya hay {ya})…", flush=True)
            for n, e in enumerate(eventos[ya:], start=ya):
                memoria.add(messages=[{"role": "user", "content": e.text}],
                            metadata={"id": e.id}, infer=False, user_id="esme")
                if n % 500 == 0:
                    print(f"  {n}/{len(eventos)}", flush=True)
            total = memoria.vector_store.client.count(collection_name="banco", exact=True).count
            print(f"corpus dentro: {total}", flush=True)
        else:
            print(f"el corpus ya estaba dentro ({ya})", flush=True)

    if args.fase == "ingesta":
        return 0

    # ── consulta: las mismas preguntas, el mismo presupuesto, la misma regla ──────────────────
    salida = Path(args.out)
    salida.parent.mkdir(parents=True, exist_ok=True)
    hechos = {json.loads(l)["item_id"] for l in salida.read_text(encoding="utf-8").splitlines()} \
        if salida.exists() else set()
    filas = []
    por_texto = {e.text: e for e in eventos}
    if hechos:
        print(f"hay {len(hechos)} preguntas ya contestadas; se siguen las demás", flush=True)
    with salida.open("a", encoding="utf-8") as f:
        for i, item in enumerate(items, 1):
            if item.id in hechos:
                continue
            res = memoria.search(item.question, top_k=args.top_k, filters={"user_id": "esme"})
            resultados = res.get("results", res if isinstance(res, list) else [])
            trozos = []
            for r in resultados:
                # mem0 devuelve el texto del recuerdo; se busca su evento para vestarlo como los
                # demás rivales («[tipo · fecha] texto»), que es lo que ve la IA.
                crudo = r.get("memory") or r.get("content") or ""
                ev = por_texto.get(crudo)
                texto = fmt(ev) if ev else crudo
                if texto and texto not in trozos:
                    trozos.append(texto)
            ctx, usados = pack(trozos, args.budget)
            evidencia = [textos[e] for e in item.evidence if e in textos]
            recall = sum(1 for e in evidencia if e[:60] in ctx) / len(evidencia) if evidencia else 0.0
            # Lo que mem0 encuentra antes de empaquetar: su top-k sin recorte de presupuesto.
            crudo = "".join(trozos)
            rec_topk = sum(1 for e in evidencia if e[:60] in crudo) / len(evidencia) if evidencia else 0.0
            fila = {"item_id": item.id, "variant": "mem0", "context": ctx, "tokens": usados,
                    "evidence_recall": recall, "recall_topk": rec_topk}
            f.write(json.dumps(fila, ensure_ascii=False) + "\n")
            filas.append(fila)
            if i % 20 == 0:
                print(f"  {i}/{len(items)}", flush=True)

    todas = [json.loads(l) for l in salida.read_text(encoding="utf-8").splitlines()]
    medio = sum(r["evidence_recall"] for r in todas) / len(todas)
    tok = sum(r["tokens"] for r in todas) / len(todas)
    topk = sum(r.get("recall_topk", 0) for r in todas) / len(todas)
    resumen = {"mem0": {"recall": round(medio, 3), "tokens": round(tok), "recall_topk": round(topk, 3),
                        "preguntas": len(todas), "set": args.set, "split": args.split, "top_k": args.top_k}}
    Path(salida).parent.parent.joinpath(f"retrieval_mem0_{args.set}_{args.split}.json").write_text(
        json.dumps(resumen, indent=1, ensure_ascii=False), encoding="utf-8")
    print(f"\nmem0: acierto de evidencia {medio:.3f} · tokens medios {tok:.0f} · "
          f"top-{args.top_k} sin empaquetar {topk:.3f} · {len(todas)} preguntas")
    print(f"escrito: {salida}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
