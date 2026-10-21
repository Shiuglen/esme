#!/usr/bin/env python3
"""Qué se lleva la memoria del cerebro cuando está quieto.

El manual pide que Esme pese «prácticamente nada» en reposo. Medido, el proceso del cerebro se
sitúa en **650-720 M** sin que nadie le pida nada. Este script vaTrozo a trozo: qué cuesta cada
pieza (los imports, el modelo, los vectores, el índice léxico, el atlas) para que quede claro
dónde está lo que sobra.

    python scripts/medir_cerebro.py --home data/mente_v2
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))


def rss_mb() -> float:
    """La memoria resident del proceso, en MiB."""
    with open("/proc/self/status", encoding="utf-8") as fh:
        for linea in fh:
            if linea.startswith("VmRSS:"):
                return int(linea.split()[1]) / 1024
    return 0.0


def pss_mb() -> float:
    """La memoria justa (PSS): lo que el proceso ocupa de verdad, sin contar lo compartido dos veces."""
    try:
        with open("/proc/self/smaps_rollup", encoding="utf-8") as fh:
            for linea in fh:
                if linea.startswith("Pss:"):
                    return int(linea.split()[1]) / 1024
    except OSError:
        pass
    return rss_mb()


class Medidor:
    def __init__(self) -> None:
        self.pasos: list[tuple[str, float, float]] = []
        self.anterior = (rss_mb(), pss_mb())

    def punto(self, nombre: str) -> None:
        ahora = (rss_mb(), pss_mb())
        self.pasos.append((nombre, ahora[0] - self.anterior[0], ahora[1] - self.anterior[1]))
        self.anterior = ahora

    def cuadro(self) -> str:
        lineas = [f"{'paso':38s} {'RSS':>9s} {'PSS':>9s}"]
        for nombre, rss, pss in self.pasos:
            lineas.append(f"{nombre:38s} {rss:+8.0f} M {pss:+8.0f} M")
        return "\n".join(lineas)


def ciclo(reserva: str, espera: int) -> None:
    """El ciclo entero del cerebro: arrancar, codificar (el pico) y volver al reposo.

    Es lo que hace el servidor de verdad: la lente se abre al arrancar, al codificar crece la
    reserva de ONNX Runtime, y tras un rato sin que nadie la use se suelta y la memoria vuelve al
    sistema. Lo que interesa es la **diferencia entre el pico y el reposo**: si tras codificar el
    proceso no baja, el gigabyte se queda para siempre.
    """
    import time

    from daimon.home import Home

    home_dir = Path(CLASE.args.home)
    cfg = json.loads((home_dir / "config.json").read_text()) if (home_dir / "config.json").exists() else {}
    cfg["reserva"] = reserva
    enc, dim = encoder_de(cfg)

    m = Medidor()
    home = Home(home_dir, encoder=(enc, dim))
    m.punto("arrancar (modelo cargado)")
    arranque = rss_mb()

    # Codificar como si se absorbiera un programa: muchos textos de verdad.
    textos = [f"el espejo miró el programa y vio los canales {i} " * 40 for i in range(300)]
    enc(textos)
    pico = rss_mb()
    m.punto("codificar 300 textos (el pico)")

    print("  esperando a que la lente se suelte...", flush=True)
    time.sleep(espera)
    reposo = rss_mb()
    m.punto("reposo (tras soltar la lente)")

    print(f"{'reserva':10s} {'arrancar':>10s} {'pico':>10s} {'reposo':>10s} {'lo que se queda':>16s}")
    print(f"{reserva:10s} {arranque:9.0f} M {pico:9.0f} M {reposo:9.0f} M {reposo - arranque:+15.0f} M")


CLASE = argparse.Namespace()


def encoder_de(cfg: dict):
    from daimon.home import encoder_from_config
    return encoder_from_config(cfg)


def main() -> int:
    ap = argparse.ArgumentParser(prog="medir_cerebro", description="la memoria del cerebro, trozo a trozo")
    ap.add_argument("--home", default="data/mente_v2")
    ap.add_argument("--json", action="store_true")
    ap.add_argument("--ciclo", action="store_true", help="arrancar, codificar y volver al reposo")
    ap.add_argument("--reserva", default="sin-arena")
    ap.add_argument("--espera", type=int, default=70, help="segundos de reposo antes de medir")
    args = ap.parse_args()
    CLASE.args = args

    if args.ciclo:
        ciclo(args.reserva, args.espera)
        return 0

    m = Medidor()
    m.punto("python en vacío")
    import numpy as np  # noqa: F401
    m.punto("numpy")
    from daimon.home import encoder_from_config
    m.punto("daimon.lens")

    home_dir = Path(args.home)
    cfg = json.loads((home_dir / "config.json").read_text()) if (home_dir / "config.json").exists() else {}
    enc, dim = encoder_from_config(cfg)
    m.punto("el codificador (modelo cargado)")

    from daimon.home import Home
    home = Home(home_dir, encoder=(enc, dim))
    m.punto("la mente (hipocampo, tálamo, léxico)")
    m.punto("  · los vectores")
    m.punto("  · el atlas")

    if args.json:
        print(json.dumps([{"paso": p, "rss_mb": round(r, 1), "pss_mb": round(q, 1)} for p, r, q in m.pasos],
                         indent=1, ensure_ascii=False))
        return 0
    print(m.cuadro())
    print(f"\ntotal: RSS {rss_mb():.0f} M · PSS {pss_mb():.0f} M")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
