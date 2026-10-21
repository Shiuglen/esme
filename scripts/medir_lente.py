#!/usr/bin/env python3
"""Cuánta memoria reserva ONNX Runtime al codificar, y cuánto cuesta quitarle la reserva.

La lente propia (`daimon/lens.py`) corre EmbeddingGemma dentro del cerebro con ONNX Runtime. Con el modelo
cargado el cerebro ocupa ~360 MB, pero **tras absorber** salta a ~1,5 GB: no es el modelo, es la **reserva del
arena de ONNX Runtime**, que crece por potencias de dos y no devuelve lo que sobra.

Este script mide las tres maneras de montar la sesión y dice, para cada una, la memoria que queda resident y lo
que cuesta en tiempo. Mide el código de verdad (`onnx_encoder`), no una imitación suya: si esto miente, miente
sobre lo que corre en el cerebro.

    python scripts/medir_lente.py                 # el cuadro
    python scripts/medir_lente.py --json
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))


def rss_mb() -> float:
    """La memoria resident del proceso, en MiB (no la virtual: la virtual miente)."""
    with open("/proc/self/status", encoding="utf-8") as fh:
        for linea in fh:
            if linea.startswith("VmRSS:"):
                return int(linea.split()[1]) / 1024
    return 0.0


def textos(n: int = 300) -> list[str]:
    """Lo que se codifica al absorber: trozos de informe, prosa y código, de un par de cientos de tokens."""
    prosa = (
        "El espejo mira el programa y se queda con lo que vio: los canales que expone, las ventanas con sus "
        "preferencias y las funciones que más se llaman. Lo que no se pudo ver también se guarda, con su razón. "
    )
    return [f"{prosa * 3}## Fragmento {i}\nfunction alfa_{i}(x) {{ return x * {i}; }}" for i in range(n)]


def medir(variante: str, rondas: int, tokens: int = 2048) -> dict:
    from daimon.lens import onnx_encoder

    antes = rss_mb()
    t0 = time.perf_counter()
    enc, dim = onnx_encoder(reserva=variante, tokens_por_lote=tokens)
    abierta = time.perf_counter() - t0
    tras_abrir = rss_mb()

    ts = textos()
    t0 = time.perf_counter()
    for _ in range(rondas):
        enc(ts)
    elapsed = time.perf_counter() - t0
    pico = rss_mb()
    return {"variante": variante, "tokens_por_lote": tokens, "rss_antes_mb": round(antes, 1),
            "rss_al_abrir_mb": round(tras_abrir, 1),
            "rss_despues_mb": round(pico, 1), "delta_mb": round(pico - antes, 1),
            "abrir_s": round(abierta, 2), "codificar_s": round(elapsed, 2),
            "textos_por_ronda": len(ts), "rondas": rondas, "dim": dim}


def main() -> int:
    ap = argparse.ArgumentParser(prog="medir_lente", description="la reserva de ONNX Runtime")
    ap.add_argument("--rondas", type=int, default=3)
    ap.add_argument("--repetir", type=int, default=1, help="veces que se mide cada variante (se toma la más rápida)")
    ap.add_argument("--tokens", type=int, default=2048, help="tokens por lote (el presupuesto del lote)")
    ap.add_argument("--json", action="store_true")
    ap.add_argument("--solo", default=None, help="medir una sola variante (para el proceso hijo)")
    args = ap.parse_args()

    if args.solo:
        print(json.dumps(medir(args.solo, args.rondas, args.tokens), ensure_ascii=False))
        return 0

    filas = []
    # Cada variante en su propio proceso: si no, la memoria de la anterior se queda y se miente.
    # Y se alternan las variantes: el equipo está ocupado, así que el mínimo es la única medida justa.
    for _ in range(args.repetir):
        for variante in ("normal", "entorno", "sin-arena"):
            filas.append(json.loads(subprocess.run(
                [sys.executable, __file__, "--rondas", str(args.rondas), "--tokens", str(args.tokens),
                 "--json", "--solo", variante],
                capture_output=True, text=True, check=True).stdout))
    if args.json:
        print(json.dumps(filas, indent=1, ensure_ascii=False))
        return 0
    print(f"{'variante':10s} {'lote':>6s} {'al abrir':>9s} {'después':>9s} {'delta':>8s} {'abrir':>7s} {'codificar (mín)':>16s} {'n':>3s}")
    for variante in ("normal", "entorno", "sin-arena"):
        vs = [f for f in filas if f["variante"] == variante]
        if not vs:
            continue
        print(f"{variante:10s} {vs[0]['tokens_por_lote']:6d} {min(f['rss_al_abrir_mb'] for f in vs):8.0f} M "
              f"{min(f['rss_despues_mb'] for f in vs):8.0f} M {min(f['delta_mb'] for f in vs):7.0f} M "
              f"{min(f['abrir_s'] for f in vs):6.2f}s {min(f['codificar_s'] for f in vs):15.2f}s {len(vs):3d}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
