"""Orquestador de la Prueba 0 (v2: memoria limpia, examen original + paráfrasis).

Uso:
  python scripts/prueba0.py train                       # Tálamo con originales+paráfrasis del VISIBLE; elige max_drop por CV
  python scripts/prueba0.py retrieval --split visible   # recall de evidencia por variante (sin LLM)
  python scripts/prueba0.py contexts --set original|parafrasis --split oculto|visible
  python scripts/prueba0.py answer   --set original|parafrasis --split oculto|visible
  python scripts/prueba0.py judge    --set original|parafrasis
  python scripts/prueba0.py report   --set original|parafrasis
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from daimon.baselines import ctx_none, make_ctx_bm25, make_ctx_dense, make_ctx_long, make_ctx_md  # noqa: E402
from daimon.bench.items import Item, is_hidden, load  # noqa: E402
from daimon.bench.judge import score  # noqa: E402
from daimon.bench.report import report  # noqa: E402
from daimon.bench.run import run  # noqa: E402
from daimon.home import Home  # noqa: E402
from daimon.teachers import Ollama  # noqa: E402
from daimon.thalamus import Thalamus  # noqa: E402

DATA, RUNS = ROOT / "data", ROOT / "runs" / "prueba0_v2"
ITEMS, PARA = DATA / "bench" / "items.jsonl", DATA / "bench" / "parafrasis.jsonl"
HOME = DATA / "mente_v2"
ANSWERER, JUDGE = "qwen3.5-abliterated-truthful:9b-local", "gemma3:4b"
BUDGET, MAX_TOKENS = 1500, 160
MD_FILES = [Path.home() / ".claude/CLAUDE.md",
            Path.home() / ".claude/projects/-home-sakai-Sakoi/memory/MEMORY.md",
            Path.home() / ".claude/projects/-home-sakai-Sakoi/memory/sakoi-estado-migracion.md"]
MAIN = ["ia_sola", "md", "bm25", "bm25_1000", "rag_denso_eg", "contexto_largo", "daimon"]
ABLATIONS = ["daimon_sin_corte", "daimon_solo_original"]


def _para() -> dict[str, str]:
    return {d["id"]: d["question"] for d in map(json.loads, PARA.read_text(encoding="utf-8").splitlines())}


def items_for(qset: str, split: str) -> list[Item]:
    items = [i for i in load(ITEMS) if is_hidden(i.id) == (split == "oculto")]
    if qset == "parafrasis":
        para = _para()
        for i in items:
            i.question = para[i.id]
    return items


def _fit(home: Home, items: list[Item], with_para: bool) -> Thalamus:
    para = _para()
    ex = [(i.question, set(i.evidence)) for i in items]
    if with_para:
        ex += [(para[i.id], set(i.evidence)) for i in items]
    th = Thalamus(home.hippo, home.thalamus.bm25, mmr_lambda=1.0, min_dense=home.config.get("min_dense"))
    th.fit(ex, epochs=300, lr=0.1)
    return th


def _recall(th_or_fn, pairs, texts, budget=BUDGET):
    rec, tok = [], []
    for it, q in pairs:
        out = th_or_fn.compose(q, budget) if isinstance(th_or_fn, Thalamus) else th_or_fn(q, budget)
        ctx, used = out[0], out[1]
        rec.append(sum(texts[e][:60] in ctx for e in it.evidence) / len(it.evidence))
        tok.append(used)
    return float(np.mean(rec)), float(np.mean(tok))


def cmd_train(_):
    """Entrena con el VISIBLE (originales+paráfrasis) y elige max_drop por validación cruzada en el visible."""
    home = Home(HOME)
    texts = {e.id: e.text for e in home.hippo.events()}
    vis_o, vis_p = items_for("original", "visible"), items_for("parafrasis", "visible")
    folds = [list(range(k, len(vis_o), 3)) for k in range(3)]
    grid = [None, 1.0, 1.2, 1.4, 1.6, 2.0]
    res = {d: [] for d in grid}
    for k in range(3):
        tr = [vis_o[j] for f in range(3) if f != k for j in folds[f]]
        th = _fit(home, tr, with_para=True)
        te = [(vis_o[j], vis_o[j].question) for j in folds[k]] + [(vis_p[j], vis_p[j].question) for j in folds[k]]
        for d in grid:
            th.max_drop = d
            res[d].append(_recall(th, te, texts))
    print("CV visible (orig+paráfrasis): max_drop → recall, tokens")
    summary = {}
    for d, v in res.items():
        r, t = np.mean([x[0] for x in v]), np.mean([x[1] for x in v])
        summary[str(d)] = (round(float(r), 3), round(float(t)))
        print(f"  {d}: {r:.3f}  {t:.0f}")
    full = summary["None"][0]
    # el corte más ahorrador que no pierda más de 0.01 de recall frente a llenar el presupuesto
    ok = [d for d in grid if d is not None and summary[str(d)][0] >= full - 0.01]
    best = min(ok, key=lambda d: summary[str(d)][1]) if ok else None
    th = _fit(home, vis_o, with_para=True)
    th.save(HOME / "thalamus.npy")
    RUNS.mkdir(parents=True, exist_ok=True)
    _fit(home, vis_o, with_para=False).save(RUNS / "thalamus_solo_original.npy")
    home.config["max_drop"] = best
    (HOME / "config.json").write_text(json.dumps(home.config, indent=1))
    (RUNS / "cv.json").write_text(json.dumps(summary, indent=1))
    print("max_drop elegido:", best, "| pesos:", np.round(th.w, 2).tolist())


def build_variants():
    home = Home(HOME)
    evs = home.hippo.events()
    bm = home.thalamus.bm25
    two = lambda th: (lambda q, b: th.compose(q, b)[:2])   # noqa: E731 — Tálamo → firma común (texto, tokens)
    sin_corte = Thalamus(home.hippo, bm, mmr_lambda=1.0, min_dense=home.thalamus.min_dense)
    sin_corte.load(HOME / "thalamus.npy")
    solo_orig = Thalamus(home.hippo, bm, mmr_lambda=1.0, max_drop=home.thalamus.max_drop,
                         min_dense=home.thalamus.min_dense)
    solo_orig.load(RUNS / "thalamus_solo_original.npy")
    bm25 = make_ctx_bm25(bm)
    return {
        "ia_sola": ctx_none, "md": make_ctx_md([p for p in MD_FILES if p.exists()]),
        "bm25": bm25, "bm25_1000": lambda q, b: bm25(q, min(b, 1000)),
        "rag_denso_eg": make_ctx_dense(home.hippo), "contexto_largo": make_ctx_long(evs),
        "daimon": two(home.thalamus), "daimon_sin_corte": two(sin_corte), "daimon_solo_original": two(solo_orig),
    }, {e.id: e.text for e in evs}


def cmd_retrieval(a):
    variants, texts = build_variants()
    out = {}
    for qset in ("original", "parafrasis"):
        its = items_for(qset, a.split)
        for n, fn in variants.items():
            if n != "ia_sola":
                r, t = _recall(fn, [(i, i.question) for i in its], texts)
                out.setdefault(qset, {})[n] = {"recall": round(r, 3), "tokens": round(t)}
    RUNS.mkdir(parents=True, exist_ok=True)
    (RUNS / f"retrieval_{a.split}.json").write_text(json.dumps(out, indent=1, ensure_ascii=False))
    print(json.dumps(out, indent=1, ensure_ascii=False))


def _dir(qset):
    d = RUNS / qset
    d.mkdir(parents=True, exist_ok=True)
    return d


def cmd_contexts(a):
    variants, texts = build_variants()
    path = _dir(a.set) / "contexts.jsonl"
    done = {(r["item_id"], r["variant"]) for r in map(json.loads, path.read_text().splitlines())} if path.exists() else set()
    with path.open("a", encoding="utf-8") as f:
        for i in items_for(a.set, a.split):
            for n in MAIN + ABLATIONS:
                if (i.id, n) in done:
                    continue
                ctx, used = variants[n](i.question, BUDGET)
                rec = sum(texts.get(e, "")[:60] in ctx for e in i.evidence) / len(i.evidence)
                f.write(json.dumps({"item_id": i.id, "variant": n, "context": ctx, "tokens": used,
                                    "evidence_recall": rec}, ensure_ascii=False) + "\n")
    print("contextos listos:", a.set, a.split)


def cmd_answer(a):
    its = items_for(a.set, a.split)
    ctx = {(r["item_id"], r["variant"]): (r["context"], r["tokens"])
           for r in map(json.loads, (_dir(a.set) / "contexts.jsonl").read_text(encoding="utf-8").splitlines())}
    qid = {i.question: i.id for i in its}
    variants = {n: (lambda n: (lambda q, b: ctx[(qid[q], n)]))(n) for n in MAIN + ABLATIONS}
    rows = run(its, variants, Ollama(ANSWERER, timeout=300), BUDGET, _dir(a.set) / "answers.jsonl", MAX_TOKENS,
               on_row=lambda r: print(f'{r["item_id"]} {r["variant"]} {r["status"]} {r["latency_s"]}s', flush=True))
    print(f"filas: {len(rows)}; errores: {sum(r['status'] == 'error' for r in rows)}")


def cmd_judge(a):
    d = _dir(a.set)
    rows = [json.loads(l) for l in (d / "answers.jsonl").read_text(encoding="utf-8").splitlines() if l.strip()]
    its = items_for(a.set, "oculto") + items_for(a.set, "visible")
    rows = score(rows, its, Ollama(JUDGE, timeout=120), d / f"judge_{JUDGE.replace(':', '_')}.jsonl")
    (d / "scored.jsonl").write_text("".join(json.dumps(r, ensure_ascii=False) + "\n" for r in rows), encoding="utf-8")
    print(f"puntuadas: {sum('score' in r for r in rows)}")


def cmd_report(a):
    d = _dir(a.set)
    rows = [json.loads(l) for l in (d / "scored.jsonl").read_text(encoding="utf-8").splitlines() if l.strip()]
    its = items_for(a.set, "oculto") + items_for(a.set, "visible")
    out = ROOT / "docs" / "resultados" / f"2026-10-12-prueba0-v2-{a.set}.md"
    s = report(rows, its, out, title=f"Prueba 0 v2 — preguntas {a.set}")
    print(s["verdict"], s["reason"], "→", out)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    sp = ap.add_subparsers(dest="cmd", required=True)
    sp.add_parser("train")
    p = sp.add_parser("retrieval"); p.add_argument("--split", default="visible")
    for c in ("contexts", "answer"):
        p = sp.add_parser(c); p.add_argument("--set", choices=["original", "parafrasis"], required=True)
        p.add_argument("--split", choices=["oculto", "visible"], default="oculto")
    for c in ("judge", "report"):
        p = sp.add_parser(c); p.add_argument("--set", choices=["original", "parafrasis"], required=True)
    a = ap.parse_args()
    {"train": cmd_train, "retrieval": cmd_retrieval, "contexts": cmd_contexts, "answer": cmd_answer,
     "judge": cmd_judge, "report": cmd_report}[a.cmd](a)
