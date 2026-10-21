#!/usr/bin/env python3
"""Absorbe dos versiones de un programa (con la evidencia de REA ya sacada) y mide el pico.

Es el camino real de la absorción, sin volver a analizar: la evidencia se lee de disco, se
reduce, se escribe el informe y la versión, y la mente se queda con el conocimiento.

Se mide el **pico** (VmHWM) porque es lo que tumba la máquina: el informe entra en la memoria
por billion de tokens si el modelo no está preparado, y la evidencia de REA son cientos de MB.

    python scripts/absorber_version.py --home <mente> ev-1.32.json <ruta> ev-1.37.json <ruta>
"""
from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))


def rss_mb() -> float:
    with open("/proc/self/status", encoding="utf-8") as fh:
        for linea in fh:
            if linea.startswith("VmRSS:"):
                return int(linea.split()[1]) / 1024
    return 0.0


def pico_mb() -> float:
    """El pico de memoria resident del proceso (VmHWM): lo que de verdad da miedo."""
    with open("/proc/self/status", encoding="utf-8") as fh:
        for linea in fh:
            if linea.startswith("VmHWM:"):
                return int(linea.split()[1]) / 1024
    return 0.0


def main() -> int:
    ap = argparse.ArgumentParser(prog="absorber_version", description="absorbe versiones ya analizadas")
    ap.add_argument("--home", required=True)
    ap.add_argument("pares", nargs="+", help="evidencia.json ruta_del_programa (repetido)")
    args = ap.parse_args()

    from daimon.home import Home
    from daimon import rea as rea_mod

    print(f"pico antes: {pico_mb():.0f} M", flush=True)
    home = Home(Path(args.home))
    print(f"la mente cargada: RSS {rss_mb():.0f} M · pico {pico_mb():.0f} M", flush=True)

    for i in range(0, len(args.pares), 2):
        evidencia_path, ruta = args.pares[i], args.pares[i + 1]
        t0 = time.time()
        with open(evidencia_path, encoding="utf-8") as fh:
            evidencia = json.load(fh)
        print(f"\n[{Path(evidencia_path).name}] evidencia leída: {rss_mb():.0f} M (pico {pico_mb():.0f} M)", flush=True)
        r = rea_mod.ingerir(home, evidencia, ruta, motivo="estudio de las prácticas de los demás")
        print(f"  absorber: {time.time() - t0:.1f} s · {r['added']} recuerdos · RSS {rss_mb():.0f} M (pico {pico_mb():.0f} M)", flush=True)
        print(f"  informe: {r['informe']}", flush=True)
        print(f"  versión: {r['version']}", flush=True)
        del evidencia
        rea_mod._soltar_memoria()
        print(f"  tras soltar: RSS {rss_mb():.0f} M", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
