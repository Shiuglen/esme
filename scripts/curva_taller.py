#!/usr/bin/env python3
"""La curva del Taller: cómo trabajan los motores, medido con las tareas de verdad.

Palanca 5-bis de la tesis de escala: *sin evaluación, «Esme es mejor que el rival» es una creencia*.
Aquí **no hay juez**: la etiqueta es del propio creador (aplicar los cambios de una tarea es un sí;
descartarlos, un no) y las medidas (tiempo, tokens, coste, herramientas, ficheros tocados) las dejó la
app al trabajar. Cuesta 0 € y 0 tokens: sólo lee lo que ya está en disco.

La app hace la misma cuenta en vivo (Uso › La curva del Taller, `app/src/main/taller/curva.ts`): las
dos deben dar el mismo número. Si cambian las reglas, cambian las dos.

De cada tarea sale una fila y de las filas salen cuatro cosas:

1. **La curva**: aciertos por tarea, por día — la línea que sube o baja cada noche.
2. **Por motor y por modelo**: quién termina más, quién falla más, quién cuesta más.
3. **El coste del acierto**: tokens y euros por tarea *aplicada* (no por tarea: una tarea que se
   descarta no acertó).
4. **Los fallos**: los mensajes de error más repetidos, que son el trabajo pendiente de verdad.

Uso:

    python scripts/curva_taller.py                       # el Taller de este equipo
    python scripts/curva_taller.py --taller ~/.config/daimon-app/taller --json
"""
from __future__ import annotations

import argparse
import collections
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))


def _lee_jsonl(ruta: Path) -> list[dict]:
    if not ruta.exists():
        return []
    filas = []
    for linea in ruta.read_text(encoding="utf-8", errors="replace").splitlines():
        linea = linea.strip()
        if not linea:
            continue
        try:
            filas.append(json.loads(linea))
        except json.JSONDecodeError:
            continue          # una línea rota no tira el resto: el registro es append-only
    return filas


def _dia(ts: int | float | None) -> str:
    if not ts:
        return "sin fecha"
    return datetime.fromtimestamp(ts / 1000, tz=timezone.utc).strftime("%Y-%m-%d")


def carga(taller: Path) -> dict:
    """Todo lo que el Taller dejó en disco: tareas, veredictos del creador y fallos."""
    tareas = []
    f = taller / "tareas.json"
    if f.exists():
        try:
            tareas = json.loads(f.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            tareas = []
    veredictos = _lee_jsonl(taller / "veredictos.jsonl")

    fallos: list[dict] = []
    fines: dict[str, dict] = {}
    for tarea in tareas:
        id_ = tarea.get("id") or ""
        for ev in _lee_jsonl(taller / f"{id_}.jsonl"):
            if ev.get("tipo") == "fallo":
                fallos.append({"tarea": id_, "motor": tarea.get("motor"), "mensaje": ev.get("mensaje") or ""})
            elif ev.get("tipo") == "fin":
                fines[id_] = {"motivo": ev.get("motivo"), "ms": ev.get("ms")}

    # Cada veredicto cae dentro de la ventana de su tarea: así se sabe qué motor deliveró.
    for v in veredictos:
        v["tarea"] = None
        for tarea in tareas:
            ini = tarea.get("inicio") or 0
            fin = tarea.get("fin") or ini + 10 ** 12
            if ini <= (v.get("ts") or 0) <= fin:
                v["tarea"] = tarea.get("id")
                break

    return {"tareas": tareas, "veredictos": veredictos, "fallos": fallos, "fines": fines}


def metricas(datos: dict) -> dict:
    """Las cuatro cosas que importan, calculadas sobre las tareas de verdad."""
    tareas = datos["tareas"]
    veredictos = datos["veredictos"]
    por_id = {t.get("id"): t for t in tareas}

    # ── 1. la curva: aciertos por día ────────────────────────────────────────────────────────
    curva: dict[str, dict] = {}
    for v in veredictos:
        d = curva.setdefault(_dia(v.get("ts")), {"positivos": 0, "negativos": 0})
        d["positivos" if v.get("exito") else "negativos"] += 1
    for d in curva.values():
        total = d["positivos"] + d["negativos"]
        d["total"] = total
        d["aciertos"] = round(d["positivos"] / total, 3) if total else 0.0

    # ── 2. por motor y por modelo ────────────────────────────────────────────────────────────
    def _grupo(clave: str) -> dict:
        g: dict[str, dict] = {}
        for t in tareas:
            k = t.get(clave) or "desconocido"
            b = g.setdefault(k, {"tareas": 0, "terminadas": 0, "error": 0, "parada": 0, "trabajando": 0,
                                 "herramientas": 0, "turnos": 0, "entrada": 0, "salida": 0, "coste": 0.0,
                                 "ficheros": 0, "mas": 0, "veredictos": 0, "aciertos": 0})
            b["tareas"] += 1
            estado = t.get("estado") or "lista"
            if estado in b:
                b[estado] += 1
            b["herramientas"] += int(t.get("herramientas") or 0)
            b["turnos"] += int(t.get("turnos") or 0)
            uso = t.get("uso") or {}
            b["entrada"] += int(uso.get("entrada") or 0)
            b["salida"] += int(uso.get("salida") or 0)
            coste = (uso.get("coste") or {}).get("cantidad") or 0
            b["coste"] += float(coste)
            cambios = t.get("cambios") or {}
            b["ficheros"] += int(cambios.get("ficheros") or 0)
            b["mas"] += int(cambios.get("mas") or 0)
        for v in veredictos:
            t = por_id.get(v.get("tarea"))
            if not t:
                continue
            k = t.get(clave) or "desconocido"
            b = g.setdefault(k, {"tareas": 0, "terminadas": 0, "error": 0, "parada": 0, "trabajando": 0,
                                 "herramientas": 0, "turnos": 0, "entrada": 0, "salida": 0, "coste": 0.0,
                                 "ficheros": 0, "mas": 0, "veredictos": 0, "aciertos": 0})
            b["veredictos"] += 1
            if v.get("exito"):
                b["aciertos"] += 1
        for b in g.values():
            b["aciertos_pct"] = round(b["aciertos"] / b["veredictos"], 3) if b["veredictos"] else None
            b["herramientas_por_tarea"] = round(b["herramientas"] / b["tareas"], 1) if b["tareas"] else 0
            b["tokens_por_tarea"] = round((b["entrada"] + b["salida"]) / b["tareas"], 0) if b["tareas"] else 0
            b["coste_por_tarea"] = round(b["coste"] / b["tareas"], 6) if b["tareas"] else 0.0
            b["ficheros_por_tarea"] = round(b["ficheros"] / b["tareas"], 1) if b["tareas"] else 0
            b["aciertos_por_tarea"] = round(b["aciertos"] / b["tareas"], 3) if b["tareas"] else 0
        return g

    # ── 3. el coste del acierto ──────────────────────────────────────────────────────────────
    aplicado = [v for v in veredictos if v.get("exito")]
    coste_por_acierto = None
    if aplicado:
        tokens = 0
        coste = 0.0
        for v in aplicado:
            t = por_id.get(v.get("tarea"))
            if not t:
                continue
            uso = t.get("uso") or {}
            tokens += int(uso.get("entrada") or 0) + int(uso.get("salida") or 0)
            coste += float((uso.get("coste") or {}).get("cantidad") or 0)
        if aplicado:
            coste_por_acierto = {"tareas": len(aplicado), "tokens": tokens,
                                  "tokens_por_tarea": round(tokens / len(aplicado)),
                                  "coste": round(coste, 6)}

    # ── 4. los fallos ─────────────────────────────────────────────────────────────────────────
    fallos = collections.Counter(f["mensaje"] for f in datos["fallos"] if f.get("mensaje"))

    estados = collections.Counter(t.get("estado") or "lista" for t in tareas)
    return {
        "tareas": len(tareas),
        "estados": dict(estados),
        "veredictos": {"total": len(veredictos),
                       "positivos": sum(1 for v in veredictos if v.get("exito")),
                       "negativos": sum(1 for v in veredictos if not v.get("exito"))},
        "curva": dict(sorted(curva.items())),
        "por_motor": _grupo("motor"),
        "por_modelo": _grupo("modelo"),
        "coste_del_acierto": coste_por_acierto,
        "fallos": dict(fallos.most_common()),
    }


def imprime(m: dict) -> None:
    print(f"tareas: {m['tareas']} · estados: {m['estados']}")
    v = m["veredictos"]
    print(f"veredictos del creador: {v['total']} ({v['positivos']} sí · {v['negativos']} no)")
    if m["curva"]:
        print("\nla curva (día · aciertos):")
        for dia, d in m["curva"].items():
            print(f"  {dia}  {d['aciertos']:.2f}  ({d['positivos']}/{d['total']})")
    print("\npor motor:")
    for nombre, b in sorted(m["por_motor"].items()):
        print(f"  {nombre:12s} tareas {b['tareas']:3d} · error {b['error']:3d} · parada {b['parada']:3d} · "
              f"aciertos {str(b['aciertos_por_tarea']):>6s} · herramientas/tarea {b['herramientas_por_tarea']:7.1f} · "
              f"tokens/tarea {b['tokens_por_tarea']:9.0f} · coste {b['coste_por_tarea']:.6f} $")
    if m["coste_del_acierto"]:
        c = m["coste_del_acierto"]
        print(f"\ncoste del acierto: {c['tareas']} tareas aplicadas · {c['tokens_por_tarea']} tokens/task · "
              f"{c['coste']:.6f} $ en total")
    if m["fallos"]:
        print("\nfallos (lo que hay que arreglar):")
        for msg, n in list(m["fallos"].items())[:8]:
            print(f"  {n:3d}× {msg[:90]}")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--taller", default="~/.config/daimon-app/taller")
    ap.add_argument("--json", action="store_true", help="volcar el JSON y nada más")
    ap.add_argument("--out", default="runs/taller/curva.json")
    args = ap.parse_args()

    taller = Path(args.taller).expanduser()
    if not taller.exists():
        print(f"No está el Taller en {taller}", file=sys.stderr)
        return 2
    datos = carga(taller)
    m = metricas(datos)
    salida = ROOT / args.out
    salida.parent.mkdir(parents=True, exist_ok=True)
    salida.write_text(json.dumps(m, indent=1, ensure_ascii=False), encoding="utf-8")
    if args.json:
        print(json.dumps(m, indent=1, ensure_ascii=False))
    else:
        imprime(m)
        print(f"\nescrito: {salida}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
