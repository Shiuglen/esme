"""El banco del espejo: ¿de qué sirve absorber un programa? Se mide, no se promete.

Se toma la mente real, se copia, se mira un programa con REA (o se usa la evidencia ya guardada)
y se hacen las mismas preguntas sobre el programa a las dos mentes: la de antes de mirarlo y la de
después. La única diferencia es la absorción.

    python scripts/banco_rea.py --programa app/out /usr/local/bin/ollama --home data/mente_v2

Varios programas, no uno: el número de un solo programa es una anécdota. Cada programa da su
fila y al final hay una fila de conjunto. La evidencia se guarda, así que repetir la medición no
vuelve a pagar el análisis.

Sin juez y sin modelo: se compone el contexto que la IA recibiría y se mira si los hechos clave
están dentro (la misma regla que el banco de memoria contra mem0).
"""
from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import subprocess
import sys
import tempfile
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from daimon.bench import rea as banco  # noqa: E402
from daimon.home import Home  # noqa: E402

BUDGET = 1500


def _huella(origen: Path, cache: Path, programas: list[Path], recuerdos: int) -> dict:
    """La huella del montaje: **con qué se midió ese número**.

    Un número sin huella no se puede comparar con otro: la mente cambia, la configuración cambia y
    la evidencia se vuelve a mirar. Con la huella, dos números sólo se comparan si el montaje es el
    mismo; y si no lo es, se ve en qué se diferenciaron."""
    cfg = {}
    if (origen / "config.json").exists():
        cfg = json.loads((origen / "config.json").read_text(encoding="utf-8"))
    ev = {}
    for p in programas:
        f = Path(cache) / f"{p.name}.json"
        ev[p.name] = hashlib.sha1(f.read_bytes()).hexdigest()[:12] if f.exists() else None
    try:
        codigo = subprocess.run(["git", "rev-parse", "--short", "HEAD"], cwd=str(Path(__file__).resolve().parent.parent),
                                 capture_output=True, text=True, timeout=10).stdout.strip() or None
    except Exception:
        codigo = None
    return {"config": cfg, "recuerdos": recuerdos, "evidencia": ev, "codigo": codigo,
            "presupuesto": BUDGET}


def _evidencia_de(programa: Path, cache: Path, evidencia: str | None = None, sin_cache: bool = False) -> dict:
    """La evidencia del programa: se analiza una vez y se guarda (repetir no vuelve a pagar)."""
    from daimon import rea as rea_mod

    if evidencia:
        return json.loads(Path(evidencia).read_text(encoding="utf-8"))
    fichero = cache / f"{programa.name}.json"
    if fichero.exists() and not sin_cache:
        print(f"evidencia: {fichero} (de la caché)", flush=True)
        return json.loads(fichero.read_text(encoding="utf-8"))
    t0 = time.time()
    ev = rea_mod.analizar(programa)
    print(f"REA: {time.time() - t0:.1f} s · {programa}", flush=True)
    cache.mkdir(parents=True, exist_ok=True)
    fichero.write_text(json.dumps(ev, ensure_ascii=False), encoding="utf-8")
    return ev


def medir(origen: Path, cache: Path, programas: list[Path], budget: int = BUDGET,
          sin_cache: bool = False, evidencia: str | None = None) -> tuple[list[dict], list[dict], dict]:
    """El banco, medido: la misma pregunta a la mente de antes y a la de después.

    Devuelve las filas por programa, todas las preguntas y la **huella** del montaje (con qué se
    midió): sin huella, dos números no se comparan."""
    from daimon import rea as rea_mod

    todos: list[dict] = []
    filas: list[dict] = []
    recuerdos = 0
    base = Path(tempfile.mkdtemp(prefix="banco-rea-"))
    espejo = base / "espejo"
    try:
        shutil.copytree(origen, base / "base")
        base = base / "base"
        recuerdos = len(Home(base).hippo)
        print(f"mente: {recuerdos} recuerdos (copia de {origen})", flush=True)
        for ruta in programas:
            nombre = ruta.name or "el programa"
            print(f"\n=== {nombre} ===", flush=True)
            ev = _evidencia_de(ruta, cache, evidencia, sin_cache)
            if not isinstance(ev, dict) or ev.get("error"):
                print(f"  la evidencia no sirve: {ev.get('error') if isinstance(ev, dict) else '?'}", flush=True)
                continue
            if espejo.exists():
                shutil.rmtree(espejo)
            shutil.copytree(base, espejo)
            t0 = time.time()
            r = rea_mod.ingerir(Home(espejo), ev, ruta, motivo="banco del espejo")
            print(f"absorción: {time.time() - t0:.1f} s · {r['added']} recuerdos nuevos", flush=True)
            items = banco.preguntas(ev, nombre)
            print(f"preguntas: {len(items)} (derivadas de la evidencia · forma «{r.get('clase', '?')}»)", flush=True)
            if not items:
                print("  sin preguntas: esta evidencia no da nada que preguntar", flush=True)
                continue
            propias = banco.mide(Home(base), Home(espejo), items, budget)
            salida = banco.resumen(propias)
            salida["programa"] = nombre
            salida["ruta"] = str(ruta)
            salida["clase"] = r.get("clase")
            salida["recuerdos"] = r["added"]
            todos.append(salida)
            filas.extend(propias)
            print(json.dumps(salida, ensure_ascii=False, indent=1), flush=True)
            for f in propias:
                print(f"  · {f['base_recall']:.2f} → {f['espejo_recall']:.2f}  ({f['espejo_tokens']} tokens)  {f['question']}",
                      flush=True)
    finally:
        shutil.rmtree(base.parent, ignore_errors=True)
    return todos, filas, _huella(origen, cache, programas, recuerdos)


def main() -> int:
    ap = argparse.ArgumentParser(prog="banco_rea", description="Banco del espejo (REA)")
    ap.add_argument("--home", default="data/mente_v2", help="la mente real: se copia, no se toca")
    ap.add_argument("--programa", required=True, nargs="+", help="los programas a mirar (uno o varios)")
    ap.add_argument("--evidencia", default=None, help="un sobre de evidencia ya guardado (ahorra el análisis)")
    ap.add_argument("--out", default=None, help="donde dejar las filas (jsonl)")
    ap.add_argument("--cache", default="data/bench/evidencia", help="dónde se guarda la evidencia")
    ap.add_argument("--sin-cache", action="store_true", help="analizar aunque ya haya evidencia")
    ap.add_argument("--budget", type=int, default=BUDGET)
    args = ap.parse_args()

    from daimon import rea as rea_mod

    origen = Path(args.home).expanduser()
    cache = Path(args.cache)
    programas = [Path(p).expanduser() for p in args.programa]

    todos, filas, huella = medir(origen, cache, programas, args.budget, args.sin_cache, args.evidencia)

    if not todos:
        print("\nno hay ningún programa que mirar", flush=True)
        return 1

    print("\n=== el número ===", flush=True)
    print(f"{'programa':<28} {'clase':<10} {'preguntas':>9} {'sin mirar':>10} {'con espejo':>11} {'tokens':>8}")
    for s in todos:
        print(f"{s['programa'][:27]:<28} {str(s.get('clase')):<10} {s['preguntas']:>9} "
              f"{s['base_recall']:>10.4f} {s['espejo_recall']:>11.4f} {s['espejo_tokens']:>8}")
    conjunto = banco.resumen(filas)
    print(f"{'CONJUNTO':<28} {'':<10} {conjunto['preguntas']:>9} {conjunto['base_recall']:>10.4f} "
          f"{conjunto['espejo_recall']:>11.4f} {conjunto['espejo_tokens']:>8}")
    print(f"mejora: {conjunto['mejora']:+.4f}")
    print(f"huella: {json.dumps(huella, ensure_ascii=False)}")

    destino = Path(args.out) if args.out else Path("data/bench") / "rea-banco.jsonl"
    banco.guarda(filas, destino)
    resumen = Path("data/bench") / "rea-banco-resumen.json"
    resumen.parent.mkdir(parents=True, exist_ok=True)
    resumen.write_text(json.dumps({"programas": todos, "conjunto": conjunto, "huella": huella},
                                  ensure_ascii=False, indent=1),
                       encoding="utf-8")
    print(f"filas: {destino}\nresumen: {resumen}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
