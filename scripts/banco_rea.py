"""El banco del espejo: ¿de qué sirve absorber un programa? Se mide, no se promete.

Se toma la mente real, se copia, se mira un programa con REA (o se usa la evidencia ya guardada)
y se hacen las mismas preguntas sobre el programa a las dos mentes: la de antes de mirarlo y la de
después. La única diferencia es la absorción.

    python scripts/banco_rea.py --programa /home/sakai/Daimon/app/out --home data/mente_v2

Sin juez y sin modelo: se compone el contexto que la IA recibiría y se mira si los hechos clave
están dentro (la misma regla que el banco de memoria contra mem0).
"""
from __future__ import annotations

import argparse
import json
import shutil
import sys
import tempfile
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from daimon.bench import rea as banco  # noqa: E402
from daimon.home import Home  # noqa: E402

BUDGET = 1500


def main() -> int:
    ap = argparse.ArgumentParser(prog="banco_rea", description="Banco del espejo (REA)")
    ap.add_argument("--home", default="data/mente_v2", help="la mente real: se copia, no se toca")
    ap.add_argument("--programa", required=True, help="la carpeta o el .asar del programa")
    ap.add_argument("--evidencia", default=None, help="un sobre de evidencia ya guardado (ahorra el análisis)")
    ap.add_argument("--out", default=None, help="donde dejar las filas (jsonl)")
    ap.add_argument("--budget", type=int, default=BUDGET)
    args = ap.parse_args()

    from daimon import rea as rea_mod

    origen = Path(args.home).expanduser()
    with tempfile.TemporaryDirectory(prefix="banco-rea-") as tmp:
        base = Path(tmp) / "base"
        espejo = Path(tmp) / "espejo"
        shutil.copytree(origen, base)
        shutil.copytree(origen, espejo)

        print(f"mente: {len(Home(base).hippo)} recuerdos (copia de {origen})", flush=True)

        if args.evidencia:
            evidencia = json.loads(Path(args.evidencia).read_text(encoding="utf-8"))
            print("evidencia: de archivo", flush=True)
        else:
            t0 = time.time()
            evidencia = rea_mod.analizar(args.programa)
            print(f"REA: {time.time() - t0:.1f} s", flush=True)

        t0 = time.time()
        r = rea_mod.ingerir(Home(espejo), evidencia, args.programa, motivo="banco del espejo")
        print(f"absorción: {time.time() - t0:.1f} s · {r['added']} recuerdos nuevos", flush=True)

        nombre = Path(args.programa).name or "el programa"
        items = banco.preguntas(evidencia, nombre)
        print(f"preguntas: {len(items)} (derivadas de la evidencia)", flush=True)

        filas = banco.mide(Home(base), Home(espejo), items, args.budget)
        salida = banco.resumen(filas)
        print(json.dumps(salida, ensure_ascii=False, indent=1), flush=True)
        for f in filas:
            print(f"  · {f['base_recall']:.2f} → {f['espejo_recall']:.2f}  ({f['espejo_tokens']} tokens)  {f['question']}",
                  flush=True)

        destino = Path(args.out) if args.out else Path("data/bench") / f"rea-{r['fuente'].replace(':', '-')}.jsonl"
        banco.guarda(filas, destino)
        print(f"filas: {destino}", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
