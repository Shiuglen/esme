#!/usr/bin/env python3
"""Lo que Esme consume cuando no hace nada.

Regla del creador: *«otras apps no consumen prácticamente nada»* — el consumo es un requisito de
primera y **se mide antes y después de cada cambio**. Esta es la regla: suma la memoria (PSS, la
justa) de cada proceso de la app y del cerebro, y mide el CPU en reposo durante unos segundos.

El PSS (Proportional Set Size) es la memoria que un proceso ocupa de verdad: si dos procesos
comparten una biblioteca, cada uno carga la mitad. La suma de los RSS mentiría.

Uso:

    python scripts/medir_reposo.py                 # 10 s de reposo
    python scripts/medir_reposo.py --segundos 30 --json
"""
from __future__ import annotations

import argparse
import json
import os
import time
from pathlib import Path

# Los procesos de la app: electron (main, renderer, gpu, utility) y el cerebro (python).
FIRMA_ELECTRON = "electron"
FIRMA_CEREBRO = "daimon.cli"


def procesos() -> list[dict]:
    """Los procesos de Esme, con su rol deducido de la línea de órdenes."""
    fuera = []
    for pid in os.listdir("/proc"):
        if not pid.isdigit():
            continue
        try:
            cmd = Path(f"/proc/{pid}/cmdline").read_bytes().replace(b"\0", b" ").decode("utf-8", "replace")
        except OSError:
            continue
        if not cmd.strip():
            continue
        rol = None
        if FIRMA_ELECTRON in cmd:
            if "--type=renderer" in cmd:
                rol = "renderer"
            elif "--type=gpu-process" in cmd:
                rol = "gpu"
            elif "--type=utility" in cmd:
                rol = "utilidad"
            elif "--type=zygote" in cmd:
                rol = "zygote"
            else:
                rol = "principal"
        elif FIRMA_CEREBRO in cmd:
            rol = "cerebro"
        if rol:
            fuera.append({"pid": int(pid), "rol": rol, "cmd": cmd.strip()[:160]})
    return fuera


def pss(pid: int) -> int:
    """Memoria proporcional del proceso, en bytes (0 si no se puede leer)."""
    try:
        for linea in Path(f"/proc/{pid}/smaps_rollup").read_text().splitlines():
            if linea.startswith("Pss:"):
                return int(linea.split()[1]) * 1024
    except OSError:
        pass
    return 0


def cpu_total(pid: int) -> float:
    """Segundos de CPU (usuario + sistema) que lleva gastados el proceso."""
    try:
        partes = Path(f"/proc/{pid}/stat").read_text().rsplit(") ", 1)[1].split()
        utime, stime = int(partes[11]), int(partes[12])
        return (utime + stime) / os.sysconf("SC_CLK_TCK")
    except (OSError, IndexError, ValueError):
        return 0.0


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--segundos", type=float, default=10.0, help="cuánto se mira el reposo")
    ap.add_argument("--filtro", default="", help="medir sólo los procesos cuya orden contenga esto")
    ap.add_argument("--json", action="store_true")
    args = ap.parse_args()

    ps = procesos()
    if args.filtro:
        ps = [p for p in ps if args.filtro in p["cmd"]]
    if not ps:
        print("No está corriendo la app de Esme.", file=__import__("sys").stderr)
        return 2
    antes = {p["pid"]: cpu_total(p["pid"]) for p in ps}
    ps_por_pid = {p["pid"]: p for p in ps}
    for p in ps:
        p["pss"] = pss(p["pid"])
    t0 = time.time()
    time.sleep(args.segundos)
    dt = time.time() - t0
    nucleos = os.cpu_count() or 1

    filas = []
    for pid, p in ps_por_pid.items():
        filas.append({"pid": pid, "rol": p["rol"], "pss": p["pss"],
                      "cpu": round(((cpu_total(pid) - antes.get(pid, 0)) / dt) * 100 / nucleos, 2)})
    por_rol: dict[str, dict] = {}
    for f in filas:
        b = por_rol.setdefault(f["rol"], {"rol": f["rol"], "procesos": 0, "pss": 0, "cpu": 0.0})
        b["procesos"] += 1
        b["pss"] += f["pss"]
        b["cpu"] += f["cpu"]
    total_pss = sum(f["pss"] for f in filas)
    total_cpu = sum(f["cpu"] for f in filas)

    if args.json:
        print(json.dumps({"segundos": dt, "nucleos": nucleos, "por_rol": por_rol,
                          "pss_total": total_pss, "cpu_total": total_cpu, "procesos": filas},
                         indent=1, ensure_ascii=False))
        return 0

    print(f"reposo de {dt:.0f} s · {nucleos} núcleos")
    print(f"{'rol':12s} {'procesos':>9s} {'PSS':>10s} {'CPU':>8s}")
    for rol, b in sorted(por_rol.items()):
        print(f"{rol:12s} {b['procesos']:9d} {b['pss'] / 1024 / 1024:9.0f} M {b['cpu']:7.2f} %")
    print(f"{'TOTAL':12s} {len(filas):9d} {total_pss / 1024 / 1024:9.0f} M {total_cpu:7.2f} %")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
