"""Dónde falla todavía la mente: las preguntas del examen que no llegan a su respuesta.

Se compone el contexto con la configuración real de la mente (la del examen) y se listan las
preguntas cuyo acierto es menor que 1, con la evidencia que faltó. Es el instrumento para
elegir la siguiente palanca con hechos y no conOpiniones.

    python scripts/donde_falla.py [--split visible|oculto] [--set original|parafrasis]
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
    ap = argparse.ArgumentParser(prog="donde_falla", description="las preguntas que la mente no alcanza")
    ap.add_argument("--split", default="oculto", choices=["visible", "oculto"])
    ap.add_argument("--set", dest="qset", default="original", choices=["original", "parafrasis"])
    ap.add_argument("--budget", type=int, default=1500)
    args = ap.parse_args()

    p0 = _prueba0()
    from daimon.home import Home

    home = Home(p0.HOME)
    texts = {e.id: e.text for e in home.hippo.events()}
    items = p0.items_for(args.qset, args.split)
    th = p0._fit(home, p0.items_for("original", "visible"), with_para=True)

    def _acierto(it, ctx):
        """La regla del examen: la evidencia entra si sus primeros 60 caracteres están en el contexto."""
        if not it.evidence:
            return 0.0
        return sum(1 for e in it.evidence if texts.get(e, "")[:60] in ctx) / len(it.evidence)

    fallos, total = [], 0.0
    for it in items:
        ctx, used, ids = th.compose(it.question, args.budget)
        rec = _acierto(it, ctx)
        total += rec
        if rec < 1.0:
            faltan = [e for e in it.evidence if texts.get(e, "")[:60] not in ctx]
            fallos.append({"id": it.id, "pregunta": it.question, "acierto": round(rec, 3),
                           "tokens": used, "faltan": len(faltan), "total_evidencia": len(it.evidence),
                           "evidencia_faltante": [texts.get(e, "")[:110] for e in faltan[:3]]})
    print(f"{args.qset}/{args.split}: acierto medio {total/len(items):.4f} · "
          f"preguntas a medias o peor: {len(fallos)}/{len(items)}\n")
    for f in fallos:
        print(f"· [{f['id']}] {f['acierto']:.2f} ({f['faltan']}/{f['total_evidencia']} evidencias) "
              f"{f['pregunta']}")
        for ev in f["evidencia_faltante"]:
            print(f"    faltaba: {ev[:100]}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
