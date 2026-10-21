"""Dos formas de medir lo mismo: ¿el contexto trae el TROZO del oro o trae los HECHOS?

El examen (prueba0) mide si el trozo de evidencia del oro está, tal cual, en el contexto.
El juez real (con LLM) puntúa la respuesta contra `key_facts`. Medir los hechos en el contexto
es el mismo criterio del juez, pero sin gastar modelo: la pregunta es si el contexto trae la
RESPUESTA o sólo el trozo que el examen señalaba.

    python scripts/examen_hechos.py --split oculto
"""
from __future__ import annotations

import argparse
import importlib.util
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))


def _prueba0():
    spec = importlib.util.spec_from_file_location("prueba0", ROOT / "scripts/prueba0.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def main() -> int:
    ap = argparse.ArgumentParser(prog="examen_hechos", description="trozo vs hechos")
    ap.add_argument("--split", default="oculto", choices=["visible", "oculto"])
    ap.add_argument("--set", dest="qset", default="original", choices=["original", "parafrasis"])
    ap.add_argument("--budget", type=int, default=1500)
    args = ap.parse_args()

    p0 = _prueba0()
    from daimon.bench.judge import fact_recall
    from daimon.home import Home

    home = Home(p0.HOME)
    texts = {e.id: e.text for e in home.hippo.events()}
    items = p0.items_for(args.qset, args.split)
    th = p0._fit(home, p0.items_for("original", "visible"), with_para=True)

    trozo, hechos, n_fallos = 0.0, 0.0, []
    for it in items:
        ctx, used, _ = th.compose(it.question, args.budget)
        r_trozo = (sum(1 for e in it.evidence if texts.get(e, "")[:60] in ctx) / len(it.evidence)
                   if it.evidence else 0.0)
        r_hechos = fact_recall(it, ctx)
        trozo += r_trozo
        hechos += r_hechos
        if r_trozo < 1.0 or r_hechos < 1.0:
            n_fallos.append((it.id, r_trozo, r_hechos, it.question, it.key_facts))
    n = len(items)
    print(f"{args.qset}/{args.split}: {n} preguntas")
    print(f"  acierto por TROZO (el que usa el examen hoy): {trozo/n:.4f}")
    print(f"  acierto por HECHOS (el criterio del juez):   {hechos/n:.4f}")
    print(f"\npreguntas donde los dos no llegan a 1,00 ({len(n_fallos)}):")
    for qid, rt, rh, q, facts in n_fallos:
        print(f"· [{qid}] trozo {rt:.2f} · hechos {rh:.2f}  {q[:70]}")
        if rt < 1.0 <= rh:
            print(f"    ← el contexto SÍ trae la respuesta: {facts}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
