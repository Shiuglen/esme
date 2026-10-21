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
MAIN = ["ia_sola", "md", "bm25", "bm25_1000", "rag_denso_eg", "contexto_largo", "daimon", "sesion"]
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
    # El tálamo del examen se construye con la MISMA configuración que el de la app: si el examen
    # midiera otra cosa, el número no valdría para nada (medido: así se encontró que la recencia
    # larga desplazaba el balance de los pesos y costaba 0,012 de exactitud).
    th = Thalamus(home.hippo, home.thalamus.bm25, mmr_lambda=1.0,
                  min_dense=home.config.get("min_dense"),
                  k=int(home.config.get("k", 40)),
                  k_cola=int(home.config.get("k_cola", 120)),
                  hops=int(home.config.get("hops", 2)),
                  recencia_dias=float(home.config.get("recencia_dias", 90.0)))
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

    def _nuevo(max_drop):
        """Un tálamo con la configuración de la casa (los mismos k, saltos y recencia que la app)."""
        return Thalamus(home.hippo, bm, mmr_lambda=1.0, max_drop=max_drop,
                        min_dense=home.thalamus.min_dense,
                        k=int(home.config.get("k", 40)),
                        k_cola=int(home.config.get("k_cola", 120)),
                        hops=int(home.config.get("hops", 2)),
                        recencia_dias=float(home.config.get("recencia_dias", 90.0)))

    # El tálamo del examen es **el entrenado en esta corrida** (thalamus.npy), no el pesos.npz que
    # hubiera por ahí: si el examen midiera otros pesos, el número no valdría para nada. (Así se
    # descubrió que la app, al guardar pesos.npz, dejaba de usar el tálamo entrenado.)
    base = _nuevo(home.thalamus.max_drop)
    if (HOME / "thalamus.npy").exists():
        base.load(HOME / "thalamus.npy")
    else:
        base = home.thalamus
    sin_corte = _nuevo(None)
    sin_corte.load(HOME / "thalamus.npy")
    solo_orig = _nuevo(home.thalamus.max_drop)
    solo_orig.load(RUNS / "thalamus_solo_original.npy")
    bm25 = make_ctx_bm25(bm)

    def _sesion(q, b):
        """El pack de arranque: lo que recibe el agente **sin que nadie lo pida**.

        No es una variante más de contexto: es la entrada por la puerta. El pack entero (rumbo,
        contexto, compañeros y protocolo) compite por el mismo presupuesto que las otras variantes
        se gastan solo en contexto. Así se mide lo que cuesta de verdad la memoria que entra sola:
        si el acierto no baja, el pack es gratis; si baja, el coste es real y hay que pagarlo.
        """
        from daimon.sesion import pack_de_arranque
        from daimon.tokens import count
        pack = pack_de_arranque(home, q, budget=b)
        return pack, count(pack)

    return {
        "ia_sola": ctx_none, "md": make_ctx_md([p for p in MD_FILES if p.exists()]),
        "bm25": bm25, "bm25_1000": lambda q, b: bm25(q, min(b, 1000)),
        "rag_denso_eg": make_ctx_dense(home.hippo), "contexto_largo": make_ctx_long(evs),
        "daimon": two(base), "daimon_sin_corte": two(sin_corte), "daimon_solo_original": two(solo_orig),
        "sesion": _sesion,
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


def _nombres(a) -> list[str]:
    """Qué variantes entran en la corrida: todas, o sólo las que se pidan con --variants.

    Existe para no gastar la GPU (que aquí es una y con 6 GB) en repetir respuestas de variantes
    que no han cambiado: si sólo cambia la recuperación de Esme, se mide sólo esa, y las demás se
    comparan con lo ya medido.
    """
    pedidos = [v.strip() for v in (getattr(a, "variants", "") or "").split(",") if v.strip()]
    return [n for n in MAIN + ABLATIONS if not pedidos or n in pedidos]


def cmd_contexts(a):
    variants, texts = build_variants()
    path = _dir(a.set) / "contexts.jsonl"
    done = {(r["item_id"], r["variant"]) for r in map(json.loads, path.read_text().splitlines())} if path.exists() else set()
    with path.open("a", encoding="utf-8") as f:
        for i in items_for(a.set, a.split):
            for n in _nombres(a):
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
    variants = {n: (lambda n: (lambda q, b: ctx[(qid[q], n)]))(n) for n in _nombres(a)}
    rows = run(its, variants, Ollama(ANSWERER, timeout=300), BUDGET, _dir(a.set) / "answers.jsonl", MAX_TOKENS,
               on_row=lambda r: print(f'{r["item_id"]} {r["variant"]} {r["status"]} {r["latency_s"]}s', flush=True))
    print(f"filas: {len(rows)}; errores: {sum(r['status'] == 'error' for r in rows)}")


def cmd_repeticion(a):
    """Repite el examen con el MISMO contexto: mide cuánto ruido tiene el instrumento.

    La misma pregunta, el mismo contexto, otra vez. Si el acierto se mueve, lo que se
    está midiendo es el ruido del modelo que responde y del juez, no la memoria: sin
    saber cuánto ruido hay, cualquier tolerancia del veredicto es una suposición al aire.
    (Lo que se descubrió al medirlo: el veredicto exigía 0,02 de diferencia y el
    instrumento se movía 0,08 entre corridas — el número no distinguía memoria de ruido.)

    Los contextos son los de la corrida original: no se recalcula la recuperación.
    """
    d = _dir(a.set)
    ctx = {(r["item_id"], r["variant"]): (r["context"], r["tokens"])
           for r in map(json.loads, [l for l in (d / "contexts.jsonl").read_text(encoding="utf-8").splitlines() if l.strip()])}
    its = items_for(a.set, a.split)
    if a.limite:
        its = its[:a.limite]
    pedidos = [v.strip() for v in (a.variants or "").split(",") if v.strip()] or ["daimon"]
    faltan = {n for i in its for n in pedidos if (i.id, n) not in ctx}
    if faltan:
        print(f"faltan contextos de {sorted(faltan)} — primero: contexts --split {a.split}", file=sys.stderr)
        sys.exit(1)
    qid = {i.question: i.id for i in its}
    for rep in range(2, a.veces + 1):
        sufijo = f"#{rep}"
        variants = {f"{n}{sufijo}": (lambda n=n: (lambda q, b: ctx[(qid[q], n)]))() for n in pedidos}
        print(f"repetición {rep}: {' '.join(pedidos)}", flush=True)
        run(its, variants, Ollama(ANSWERER, timeout=300), BUDGET, d / f"answers_rep{rep}.jsonl",
            MAX_TOKENS, on_row=lambda r: print(f'  {r["item_id"]} {r["variant"]} {r["status"]}', flush=True))
        filas = [json.loads(l) for l in (d / f"answers_rep{rep}.jsonl").read_text(encoding="utf-8").splitlines() if l.strip()]
        filas = score(filas, its, Ollama(JUDGE, timeout=120), d / f"judge_rep{rep}.jsonl")
        (d / f"scored_rep{rep}.jsonl").write_text("".join(json.dumps(r, ensure_ascii=False) + "\n" for r in filas), encoding="utf-8")
    # el resumen: cuánto se mueve el acierto de la misma variante con el mismo contexto
    original = [json.loads(l) for l in (d / "scored.jsonl").read_text(encoding="utf-8").splitlines() if l.strip()]
    ans_orig = {}
    p_orig = d / "answers.jsonl"
    if p_orig.exists():
        for r in map(json.loads, p_orig.read_text(encoding="utf-8").splitlines()):
            ans_orig[(r["item_id"], r["variant"])] = r["answer"]
    for n in pedidos:
        line = [f"{n}"]
        base = [r for r in original if r["variant"] == n and "score" in r]
        if base:
            line.append(f"original={np.mean([r['score'] for r in base]):.3f}")
        for rep in range(2, a.veces + 1):
            p = d / f"scored_rep{rep}.jsonl"
            if not p.exists():
                continue
            rs = [json.loads(l) for l in p.read_text(encoding="utf-8").splitlines() if l.strip()]
            rs = [r for r in rs if r["variant"] == f"{n}#{rep}"]
            if rs:
                line.append(f"rep{rep}={np.mean([r['score'] for r in rs]):.3f}")
        # ¿las respuestas son las mismas? (si no, cambió el modelo, no la memoria)
        p_ans = d / f"answers_rep{a.veces}.jsonl"
        if p_ans.exists() and ans_orig:
            same = tot = 0
            for r in map(json.loads, p_ans.read_text(encoding="utf-8").splitlines()):
                if r["variant"] == f"{n}#{a.veces}":
                    tot += 1
                    if ans_orig.get((r["item_id"], n)) == r["answer"]:
                        same += 1
            if tot:
                line.append(f"mismas respuestas={same}/{tot}")
        print("  ".join(line))


def cmd_judge(a):
    d = _dir(a.set)
    rows = [json.loads(l) for l in (d / "answers.jsonl").read_text(encoding="utf-8").splitlines() if l.strip()]
    its = items_for(a.set, "oculto") + items_for(a.set, "visible")
    rows = score(rows, its, Ollama(JUDGE, timeout=120), d / f"judge_{JUDGE.replace(':', '_')}.jsonl")
    (d / "scored.jsonl").write_text("".join(json.dumps(r, ensure_ascii=False) + "\n" for r in rows), encoding="utf-8")
    print(f"puntuadas: {sum('score' in r for r in rows)}")


def _nota_repetibilidad(d) -> list[str]:
    """La nota que justifica la tolerancia: cuánto se mueve el examen con el MISMO contexto.

    Sin este número, cualquier tolerancia del veredicto es una suposición. Con él, se sabe que
    la diferencia que el veredicto tiene que distinguir es más grande que el ruido del
    instrumento.
    """
    if not d.exists():
        return []
    original = [json.loads(l) for l in (d / "scored.jsonl").read_text(encoding="utf-8").splitlines() if l.strip()]
    por_variante: dict[str, list[float]] = {}
    for r in original:
        if "score" in r:
            por_variante.setdefault(r["variant"], []).append(r["score"])
    base = {k: float(np.mean(v)) for k, v in por_variante.items()}
    lineas = []
    for p in sorted(d.glob("scored_rep*.jsonl")):
        rep = p.stem.replace("scored_rep", "")
        filas = [json.loads(l) for l in p.read_text(encoding="utf-8").splitlines() if l.strip()]
        for v in sorted({r["variant"] for r in filas}):
            rs = [r for r in filas if r["variant"] == v and "score" in r]
            if not rs:
                continue
            v0 = v.split("#")[0]
            if v0 not in base:
                continue
            delta = float(np.mean([r["score"] for r in rs])) - float(base[v0])
            lineas.append(f"| {v0} | {base[v0]:.3f} | {rep} | {float(np.mean([r['score'] for r in rs])):.3f} | {delta:+.3f} |")
    if not lineas:
        return []
    deltas = [float(l.rsplit("|", 2)[1]) for l in lineas]
    rango = max(deltas) - min(deltas)
    cierre = (f"\nMovimiento observado: de {min(deltas):+.3f} a {max(deltas):+.3f} (rango {rango:.3f}).\n")
    if rango < 1e-9:
        cierre += ("\n**El examen es determinista**: con el mismo modelo y el mismo contexto, el acierto sale "
                   "idéntico. Eso significa que una variación entre dos corridas **no es ruido del "
                   "instrumento**: es que cambió el modelo que responde (o el contexto). La prueba está en "
                   "`ia_sola`, que no tiene contexto: si sus respuestas cambian, el modelo es otro.\n")
    else:
        cierre += (f"\nEl instrumento se mueve {rango:.3f} con el mismo contexto: ninguna diferencia "
                   "menor que eso se puede afirmar.\n")
    return ["## Repetibilidad del examen (el mismo contexto, otra vez)\n",
            "El instrumento se mide a sí mismo: la misma pregunta con el mismo contexto, respondida y juzgada otra vez.",
            "Si el acierto se mueve, lo que se mide es el ruido del modelo y del juez — y ninguna tolerancia",
            "del veredicto puede ser más pequeña que ese ruido.\n",
            "| variante | corrida original | repetición | acierto | Δ |",
            "|---|---|---|---|---|",
            *lineas,
            cierre]


def cmd_report(a):
    d = _dir(a.set)
    rows = [json.loads(l) for l in (d / "scored.jsonl").read_text(encoding="utf-8").splitlines() if l.strip()]
    its = items_for(a.set, "oculto") + items_for(a.set, "visible")
    out = ROOT / "docs" / "resultados" / f"2026-10-12-prueba0-v2-{a.set}.md"
    s = report(rows, its, out, title=f"Prueba 0 v2 — preguntas {a.set}", notas=_nota_repetibilidad(d))
    print(s["verdict"], s["reason"], "→", out)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    sp = ap.add_subparsers(dest="cmd", required=True)
    sp.add_parser("train")
    p = sp.add_parser("retrieval"); p.add_argument("--split", default="visible")
    for c in ("contexts", "answer"):
        p = sp.add_parser(c); p.add_argument("--set", choices=["original", "parafrasis"], required=True)
        p.add_argument("--split", choices=["oculto", "visible"], default="oculto")
        p.add_argument("--variants", default="", help="sólo estas variantes (a,b). Vacío = todas")
    p = sp.add_parser("repeticion"); p.add_argument("--set", choices=["original", "parafrasis"], required=True)
    p.add_argument("--split", choices=["oculto", "visible"], default="oculto")
    p.add_argument("--variants", default="daimon", help="variantes a repetir (a,b)")
    p.add_argument("--veces", type=int, default=2, help="cuántas repeticiones (la original va por la cuenta)")
    p.add_argument("--limite", type=int, default=0, help="sólo los primeros N ítems (prueba rápida)")
    for c in ("judge", "report"):
        p = sp.add_parser(c); p.add_argument("--set", choices=["original", "parafrasis"], required=True)
    a = ap.parse_args()
    {"train": cmd_train, "retrieval": cmd_retrieval, "contexts": cmd_contexts, "answer": cmd_answer,
     "repeticion": cmd_repeticion, "judge": cmd_judge, "report": cmd_report}[a.cmd](a)
