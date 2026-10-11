"""Orquestador de la Prueba 0 con los datos reales del usuario.

Uso:
  python scripts/prueba0.py items       # une, valida y divide el examen; exporta CSV para validar el oro
  python scripts/prueba0.py train       # entrena adaptador de la Lente y Tálamos (solo examen visible)
  python scripts/prueba0.py retrieval   # recall de evidencia por variante (sin LLM)
  python scripts/prueba0.py answer --split oculto|visible [--variants a,b]
  python scripts/prueba0.py judge
  python scripts/prueba0.py report
"""
from __future__ import annotations

import argparse
import csv
import json
import sqlite3
import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from daimon.baselines import ctx_none, make_ctx_bm25, make_ctx_dense, make_ctx_long, make_ctx_md  # noqa: E402
from daimon.bench.items import Item, is_hidden, load, save, validate  # noqa: E402
from daimon.bench.judge import score  # noqa: E402
from daimon.bench.report import report  # noqa: E402
from daimon.bench.run import run  # noqa: E402
from daimon.hippocampus import Hippocampus  # noqa: E402
from daimon.lens import EMBEDDINGGEMMA_PREFIXES, Lens, model2vec_encoder, ollama_encoder  # noqa: E402
from daimon.lexical import BM25  # noqa: E402
from daimon.teachers import Ollama  # noqa: E402
from daimon.thalamus import Thalamus  # noqa: E402

DATA, RUNS = ROOT / "data", ROOT / "runs" / "prueba0"
ITEMS = DATA / "bench" / "items.jsonl"
BASE_HOME, ADAPT_HOME, EG_HOME = DATA / "mente", DATA / "mente_adapt", DATA / "mente_eg"
ANSWERER, JUDGE = "qwen3.5-abliterated-truthful:9b-local", "gemma3:4b"
BUDGET, MAX_TOKENS, MAX_DROP = 1500, 160, 1.3   # MAX_DROP elegido en el examen visible
MD_FILES = [Path.home() / ".claude/CLAUDE.md",
            Path.home() / ".claude/projects/-home-sakai-Sakoi/memory/MEMORY.md",
            Path.home() / ".claude/projects/-home-sakai-Sakoi/memory/sakoi-estado-migracion.md"]
MAIN = ["ia_sola", "md", "bm25", "rag_denso", "rag_denso_eg", "contexto_largo", "daimon"]
ABLATIONS = ["daimon_sin_corte", "daimon_sin_entrenar", "daimon_m2v"]

_ENC = None


def encoder():
    global _ENC
    _ENC = _ENC or model2vec_encoder()
    return _ENC


def cmd_items(_):
    raw, seen = [], set()
    for f in sorted((DATA / "bench" / "gen").glob("*.jsonl")):
        for line in f.read_text(encoding="utf-8").splitlines():
            if not line.strip():
                continue
            try:
                d = json.loads(line)
                it = Item(**{k: d[k] for k in ("id", "question", "gold", "key_facts", "evidence", "type", "origin")})
            except (json.JSONDecodeError, KeyError, TypeError):
                continue
            key = it.question.strip().lower()
            if key in seen or validate(it):
                continue
            seen.add(key)
            raw.append(it)
    db = sqlite3.connect(BASE_HOME / "mem.db")
    known = {r[0] for r in db.execute("SELECT id FROM events WHERE deleted=0")}
    items = [i for i in raw if i.evidence and all(e in known for e in i.evidence)]
    save(items, ITEMS)
    hidden = sum(is_hidden(i.id) for i in items)
    with (DATA / "bench" / "validar.csv").open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["id", "oculto", "tipo", "origen", "pregunta", "respuesta_oro", "valida (si/no)"])
        for i in items:
            w.writerow([i.id, "sí" if is_hidden(i.id) else "no", i.type, i.origin, i.question, i.gold, ""])
    from collections import Counter
    print(f"ítems válidos: {len(items)} de {len(raw)} (ocultos {hidden}); tipos {dict(Counter(i.type for i in items))}; "
          f"origen {dict(Counter(i.origin for i in items))}")


def eg_lens():
    enc, dim = ollama_encoder("embeddinggemma")
    return Lens(enc, dim, **EMBEDDINGGEMMA_PREFIXES)


def cmd_build_eg(_):
    enc, dim = encoder()
    base = Hippocampus(BASE_HOME / "mem.db", Lens(enc, dim))
    EG_HOME.mkdir(parents=True, exist_ok=True)
    eg = Hippocampus(EG_HOME / "mem.db", eg_lens())
    print("recuerdos con EmbeddingGemma:", eg.store(base.events()), "total", len(eg))
    items = load(ITEMS)
    th = Thalamus(eg, BM25(eg.events()))
    l = th.fit([(i.question, set(i.evidence)) for i in items if not is_hidden(i.id)], epochs=300, lr=0.1)
    th.save(RUNS / "thalamus_eg.npy")
    print(f"tálamo eg: pérdida {l:.3f}; pesos {np.round(th.w, 2).tolist()}")


def _hidden_evidence(items):
    return {e for i in items if is_hidden(i.id) for e in i.evidence}


def cmd_train(_):
    items = load(ITEMS)
    visible = [i for i in items if not is_hidden(i.id)]
    forbidden = _hidden_evidence(items)
    enc, dim = encoder()
    # 1) pares autosupervisados: mensaje del usuario → respuesta de la IA que lo siguió (sin evidencia oculta)
    db = sqlite3.connect(BASE_HOME / "mem.db")
    rows = db.execute("SELECT id, text, source, kind FROM events WHERE deleted=0 ORDER BY source, row").fetchall()
    pairs = []
    for a, b in zip(rows, rows[1:]):
        if a[2] == b[2] and a[3] == "user_msg" and b[3] == "ai_msg" and a[0] not in forbidden and b[0] not in forbidden:
            pairs.append((a[1], b[1]))
    lens = Lens(enc, dim)
    loss = lens.train_adapter(pairs, epochs=40, lr=0.05)
    ADAPT_HOME.mkdir(parents=True, exist_ok=True)
    lens.save(ADAPT_HOME / "lens.npz")
    base = Hippocampus(BASE_HOME / "mem.db", Lens(enc, dim))
    adapt = Hippocampus(ADAPT_HOME / "mem.db", lens)
    adapt.store(base.events())
    print(f"adaptador: {len(pairs)} pares, pérdida final {loss:.3f}; hipocampo adaptado: {len(adapt)} recuerdos")
    # 2) tálamos entrenados con la evidencia del examen VISIBLE
    ex = [(i.question, set(i.evidence)) for i in visible]
    RUNS.mkdir(parents=True, exist_ok=True)
    for name, hippo in (("base", base), ("adapt", adapt)):
        th = Thalamus(hippo, BM25(hippo.events()))
        l = th.fit(ex, epochs=300, lr=0.1)
        th.save(RUNS / f"thalamus_{name}.npy")
        print(f"tálamo {name}: pérdida {l:.3f}; pesos {np.round(th.w, 2).tolist()}")


def build_variants():
    enc, dim = encoder()
    base = Hippocampus(BASE_HOME / "mem.db", Lens(enc, dim))
    evs = base.events()
    bm = BM25(evs)
    th_base = Thalamus(base, bm, mmr_lambda=1.0); th_base.load(RUNS / "thalamus_base.npy")
    two = lambda th: (lambda q, b: th.compose(q, b)[:2])   # noqa: E731 — Tálamo → firma común (texto, tokens)
    eg = Hippocampus(EG_HOME / "mem.db", eg_lens())
    bm_eg = BM25(eg.events())
    final = Thalamus(eg, bm_eg, mmr_lambda=1.0, max_drop=MAX_DROP); final.load(RUNS / "thalamus_eg.npy")
    sin_corte = Thalamus(eg, bm_eg, mmr_lambda=1.0); sin_corte.load(RUNS / "thalamus_eg.npy")
    sin_entrenar = Thalamus(eg, bm_eg, mmr_lambda=1.0)
    return {
        "ia_sola": ctx_none, "md": make_ctx_md([p for p in MD_FILES if p.exists()]),
        "bm25": make_ctx_bm25(bm), "rag_denso": make_ctx_dense(base), "rag_denso_eg": make_ctx_dense(eg),
        "contexto_largo": make_ctx_long(evs),
        "daimon": two(final), "daimon_sin_corte": two(sin_corte), "daimon_sin_entrenar": two(sin_entrenar),
        "daimon_m2v": two(th_base),
    }, {e.id: e.text for e in evs}


def cmd_retrieval(a):
    items = load(ITEMS)
    variants, texts = build_variants()
    out = {}
    for split in a.splits.split(","):
        sub = [i for i in items if is_hidden(i.id) == (split == "oculto")]
        for name, fn in variants.items():
            if name == "ia_sola":
                continue
            rec = []
            for i in sub:
                ctx, _ = fn(i.question, BUDGET)
                hits = [e for e in i.evidence if texts.get(e, "")[:60] in ctx]
                rec.append(len(hits) / len(i.evidence))
            out.setdefault(split, {})[name] = round(float(np.mean(rec)), 3)
    RUNS.mkdir(parents=True, exist_ok=True)
    (RUNS / "retrieval.json").write_text(json.dumps(out, indent=1, ensure_ascii=False))
    print(json.dumps(out, indent=1, ensure_ascii=False))


def _names(a):
    return a.variants.split(",") if a.variants else (MAIN + ABLATIONS if a.split == "oculto" else MAIN)


def cmd_contexts(a):
    """Precalcula el contexto de cada (ítem, variante): evita alternar modelos en la GPU y deja registro exacto."""
    items = [i for i in load(ITEMS) if is_hidden(i.id) == (a.split == "oculto")]
    variants, texts = build_variants()
    path = RUNS / "contexts.jsonl"
    done = set()
    if path.exists():
        done = {(r["item_id"], r["variant"]) for r in map(json.loads, path.read_text(encoding="utf-8").splitlines())}
    with path.open("a", encoding="utf-8") as f:
        for i in items:
            for n in _names(a):
                if (i.id, n) in done:
                    continue
                ctx, used = variants[n](i.question, BUDGET)
                rec = sum(texts.get(e, "")[:60] in ctx for e in i.evidence) / len(i.evidence)
                f.write(json.dumps({"item_id": i.id, "variant": n, "context": ctx, "tokens": used,
                                    "evidence_recall": rec}, ensure_ascii=False) + "\n")
    print("contextos listos:", a.split)


def cmd_answer(a):
    items = load(ITEMS)
    sub = [i for i in items if is_hidden(i.id) == (a.split == "oculto")]
    ctx = {(r["item_id"], r["variant"]): (r["context"], r["tokens"])
           for r in map(json.loads, (RUNS / "contexts.jsonl").read_text(encoding="utf-8").splitlines())}
    qid = {i.question: i.id for i in items}
    names = _names(a)
    variants = {n: (lambda n: (lambda q, b: ctx[(qid[q], n)]))(n) for n in names}
    rows = run(sub, variants, Ollama(ANSWERER, timeout=300), BUDGET,
               RUNS / "answers.jsonl", MAX_TOKENS,
               on_row=lambda r: print(f'{r["item_id"]} {r["variant"]} {r["status"]} {r["latency_s"]}s', flush=True))
    print(f"filas: {len(rows)}; errores: {sum(r['status'] == 'error' for r in rows)}")


def _all_rows():
    return [json.loads(l) for l in (RUNS / "answers.jsonl").read_text(encoding="utf-8").splitlines() if l.strip()]


def cmd_judge(_):
    rows = score(_all_rows(), load(ITEMS), Ollama(JUDGE, timeout=120), RUNS / "judge.jsonl")
    (RUNS / "scored.jsonl").write_text("".join(json.dumps(r, ensure_ascii=False) + "\n" for r in rows), encoding="utf-8")
    print(f"puntuadas: {sum('score' in r for r in rows)}")


def cmd_report(a):
    rows = [json.loads(l) for l in (RUNS / "scored.jsonl").read_text(encoding="utf-8").splitlines() if l.strip()]
    out = ROOT / "docs" / "resultados" / a.out
    s = report(rows, load(ITEMS), out, title="Prueba 0 — Daimon frente a las líneas base")
    print(s["verdict"], s["reason"], "→", out)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    sp = ap.add_subparsers(dest="cmd", required=True)
    for c in ("items", "train", "judge", "build-eg"):
        sp.add_parser(c)
    p = sp.add_parser("retrieval"); p.add_argument("--splits", default="visible")
    for c in ("answer", "contexts"):
        p = sp.add_parser(c); p.add_argument("--split", choices=["oculto", "visible"], required=True); p.add_argument("--variants")
    p = sp.add_parser("report"); p.add_argument("--out", default="2026-10-12-prueba0.md")
    args = ap.parse_args()
    {"items": cmd_items, "train": cmd_train, "build-eg": cmd_build_eg, "retrieval": cmd_retrieval, "answer": cmd_answer,
     "judge": cmd_judge, "report": cmd_report, "contexts": cmd_contexts}[args.cmd](args)
