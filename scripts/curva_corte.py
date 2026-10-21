"""La curva del corte: cuánto contexto se come el tálamo y cuánto acierto cuesta.

El corte adaptativo (`max_drop`) quita los recuerdos que puntúan lejos del mejor. Medido: con la
mente ya grande, ese corte dejaba la pregunta del programa con **35 tokens de 1500** y el acierto
en 0,00 — el corte se comía el contexto. El suelo (`min_candidatos`) es el seguro: aunque el corte
sea cerrado, la mente nunca se queda con un solo trozo.

Este script deja la curva a la vista con los dos instrumentos de la casa:
  - el EXAMEN (prueba0): se entrena con el visible y se mide en el oculto y en el visible;
  - el BANCO DEL ESPEJO: se absorbe el programa y se mira si los hechos clave están en el contexto.

    python scripts/curva_corte.py --evidencia data/bench/evidencia/out.json --programa app/out

Nada se escribe: la mente real no se toca.
"""
from __future__ import annotations

import argparse
import importlib.util
import json
import shutil
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))


def _prueba0():
    spec = importlib.util.spec_from_file_location("prueba0", ROOT / "scripts/prueba0.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def main() -> int:
    ap = argparse.ArgumentParser(prog="curva_corte", description="curva del corte del tálamo")
    ap.add_argument("--home", default="data/mente_v2", help="la mente real: se copia, no se toca")
    ap.add_argument("--programa", default=None, help="el programa que se absorbe (banco del espejo)")
    ap.add_argument("--evidencia", default=None, help="un sobre de evidencia ya guardado")
    ap.add_argument("--budget", type=int, default=1500)
    ap.add_argument("--suelos", default="0,8,12,16,20,24,30", help="suelos a comparar")
    args = ap.parse_args()

    p0 = _prueba0()
    from daimon import rea as rea_mod
    from daimon.bench import rea as banco
    from daimon.home import Home

    home = Home(Path(args.home))
    texts = {e.id: e.text for e in home.hippo.events()}
    vis_o, vis_p = p0.items_for("original", "visible"), p0.items_for("parafrasis", "visible")
    ocu_o, ocu_p = p0.items_for("original", "oculto"), p0.items_for("parafrasis", "oculto")
    th = p0._fit(home, vis_o, with_para=True)
    print(f"mente: {len(home.hippo)} recuerdos · max_drop={home.thalamus.max_drop} · "
          f"suelo={home.config.get('min_candidatos', 20)} · presupuesto={args.budget}\n")

    politicas = [(f"suelo {s}", float(home.thalamus.max_drop or 0) or None, int(s))
                 for s in args.suelos.split(",") if s.strip()]

    def _mide(thalamus):
        rec_o, tok_o = p0._recall(thalamus, [(i, i.question) for i in ocu_o], texts, args.budget)
        rec_p, tok_p = p0._recall(thalamus, [(i, i.question) for i in ocu_p], texts, args.budget)
        rec_v, tok_v = p0._recall(thalamus, [(i, i.question) for i in vis_o] + [(i, i.question) for i in vis_p],
                                  texts, args.budget)
        return (rec_o + rec_p) / 2, (tok_o + tok_p) / 2, rec_v, tok_v

    print(f"{'política':<14} {'oculto':>7} {'tokens':>7} {'visible':>8} {'tokens':>7}")
    for nombre, corte, suelo in politicas:
        th.max_drop, th.min_candidatos = corte, suelo
        rec_oc, tok_oc, rec_v, tok_v = _mide(th)
        print(f"{nombre:<14} {rec_oc:>7.4f} {tok_oc:>7.0f} {rec_v:>8.4f} {tok_v:>7.0f}")

    if args.evidencia and args.programa:
        ev = json.loads(Path(args.evidencia).read_text(encoding="utf-8"))
        with tempfile.TemporaryDirectory(prefix="curva-corte-") as tmp:
            base, espejo = Path(tmp) / "base", Path(tmp) / "espejo"
            shutil.copytree(args.home, base)
            shutil.copytree(args.home, espejo)
            rea_mod.ingerir(Home(espejo), ev, Path(args.programa), motivo="curva del corte")
            home_base, home = Home(base), Home(espejo)
            items = banco.preguntas(ev, Path(args.programa).name)
            print(f"\nbanco del espejo ({len(items)} preguntas):")
            print(f"{'política':<14} {'acierto':>8} {'tokens':>7}")
            for nombre, corte, suelo in politicas:
                for h in (home_base, home):
                    h.thalamus.max_drop, h.thalamus.min_candidatos = corte, suelo
                filas = banco.mide(home_base, home, items, args.budget)
                rec = sum(f["espejo_recall"] for f in filas) / len(filas)
                tok = sum(f["espejo_tokens"] for f in filas) / len(filas)
                print(f"{nombre:<14} {rec:>8.4f} {tok:>7.0f}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
