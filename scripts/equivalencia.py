#!/usr/bin/env python3
"""Equivalencia económica: qué costaría en APIs de pago lo que ya se hizo en local.

Lee el uso real que registró la app (`uso.jsonl`: cada turno, con sus tokens) y calcula lo que
habría costado con las APIs de pago. Los precios salen de models.dev (el mismo catálogo que usa la
app para el panel de Uso) y la memoria se mide con el examen.

La tabla de equivalencias es explícita a propósito: si un modelo no tiene hermano de pago, se dice
y no se cuenta (nada de inventarse un precio).

Uso: python3 scripts/equivalencia.py [uso.jsonl] [modelsdev.json]
"""
from __future__ import annotations

import json
import sys
from collections import defaultdict
from pathlib import Path

USO = Path(sys.argv[1] if len(sys.argv) > 1 else "/home/sakai/.config/daimon-app/uso.jsonl")
CATALOGO = Path(sys.argv[2] if len(sys.argv) > 2 else "/tmp/opencode/modelsdev.json")

# modelo usado -> (id en models.dev de su versión de pago, proveedor de esa versión).
# None = no tiene equivalente de pago: no se cuenta en el total.
EQUIVALENCIAS: dict[str, tuple[str, str] | None] = {
    "opencode/GLM-5.3-Flash Free": ("z-ai/glm-5.3-flash", "iteracompute"),
    "opencode/MiniMax M3.1 Flash Free": ("minimax/minimax-m3.1-flash", "merge-gateway"),
    "opencode/LongCat 2.5 Preview Free": ("meituan/longcat-2.5-preview", "vercel"),
    "nvidia/nemotron-3.5-lightning:free": ("nvidia/nemotron-3.5-lightning", "vercel"),
    "nvidia/nemotron-3.5-super-vl:free": ("nvidia/nemotron-3.5-super-vl", "vercel"),
    "poolside/laguna-xs-2.1:free": ("poolside/laguna-xs-2.1", "kilo"),
    "minimax/minimax-m3.1-flash:free": ("minimax/minimax-m3.1-flash", "merge-gateway"),
    "Qwen3 Coder (OpenRouter · poolside/laguna-s-2.1:free)": ("qwen/qwen3-coder", "fastrouter"),
    # sin equivalente de pago conocido: se excluyen y se declaran
    "opencode/Beam Free": None,
    "cohere/north-mini-code:free": None,
    "xingchen-agi/xing4.0-29b-a4b:free": None,
}


def precios(catalogo: dict, mid: str, pid: str) -> tuple[float, float, float]:
    m = (catalogo.get(pid, {}).get("models") or {}).get(mid)
    if not m:
        return 0.0, 0.0, 0.0
    c = m.get("cost") or {}
    return float(c.get("input") or 0), float(c.get("output") or 0), float(c.get("cache_read") or 0)


def main() -> int:
    catalogo = json.loads(CATALOGO.read_text(encoding="utf-8"))
    filas = [json.loads(l) for l in USO.read_text(encoding="utf-8").splitlines() if l.strip()]
    agg: dict[tuple[str, str], dict] = defaultdict(lambda: {"n": 0, "entrada": 0, "salida": 0, "usd": 0.0, "precio": None})
    fuera: dict[str, dict] = defaultdict(lambda: {"n": 0, "entrada": 0, "salida": 0})
    for f in filas:
        modelo = str(f.get("modelo") or "")
        equiv = EQUIVALENCIAS.get(modelo, "SIN-TABLA")
        if equiv == "SIN-TABLA":
            # un modelo que no está en la tabla: se cuenta aparte, sin precio, para que se vea
            k = (str(f.get("proveedor")), modelo)
            a = agg[k]
            a["n"] += 1
            a["entrada"] += int(f.get("entrada") or 0)
            a["salida"] += int(f.get("salida") or 0)
            continue
        if equiv is None:
            fuera[modelo]["n"] += 1
            fuera[modelo]["entrada"] += int(f.get("entrada") or 0)
            fuera[modelo]["salida"] += int(f.get("salida") or 0)
            continue
        mid, pid = equiv
        ci, co, cr = precios(catalogo, mid, pid)
        k = (str(f.get("proveedor")), modelo)
        a = agg[k]
        a["n"] += 1
        a["entrada"] += int(f.get("entrada") or 0)
        a["salida"] += int(f.get("salida") or 0)
        a["precio"] = (pid, mid, ci, co, cr)
    total = 0.0
    total_cache = 0.0
    CACHE = 0.9   # con caché de contexto, el 90 % de la entrada se lee de la caché (la de verdad, no la nueva)
    print(f"{'proveedor':12} {'modelo':40} {'n':>3} {'entrada':>12} {'salida':>11} {'$ con API de pago':>19}")
    for (prov, modelo), a in sorted(agg.items(), key=lambda x: -x[1]["entrada"]):
        if not a["precio"]:
            print(f"{prov:12} {modelo[:40]:40} {a['n']:3} {a['entrada']:12,} {a['salida']:11,} {'(local: 0,00 €)':>19}")
            continue
        pid, mid, ci, co, cr = a["precio"]
        usd = a["entrada"] / 1e6 * ci + a["salida"] / 1e6 * co
        total += usd
        if cr:
            usd_cache = (a["entrada"] * (1 - CACHE) / 1e6 * ci + a["entrada"] * CACHE / 1e6 * cr + a["salida"] / 1e6 * co)
        else:
            usd_cache = usd
        total_cache += usd_cache
        print(f"{prov:12} {modelo[:40]:40} {a['n']:3} {a['entrada']:12,} {a['salida']:11,} {usd:>19.4f}   [{pid}/{mid} {ci}/{co} $/M]")
    print("\nSin equivalente de pago conocido (no se cuentan):")
    for modelo, f in fuera.items():
        print(f"  {modelo:40} n={f['n']:3} entrada={f['entrada']:,} salida={f['salida']:,}")
    print(f"\nturnos: {len(filas)} · coste con API de pago: ${total:.4f} · coste real (local o gratis): $0.0000")
    print(f"con el 90 % de la entrada leída de caché: ${total_cache:.4f}  (los modelos que no tienen caché de precio se quedan como están)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
