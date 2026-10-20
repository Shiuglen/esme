#!/usr/bin/env python3
"""La curva del Taller: cómo trabajan los motores, medido con las tareas de verdad.

Palanca 5-bis de la tesis de escala: *sin evaluación, «Esme es mejor que el rival» es una creencia*.
Aquí **no hay juez**: la etiqueta es del propio creador (aplicar los cambios de una tarea es un sí;
descartarlos, un no) y las medidas (tiempo, tokens, coste, herramientas, ficheros tocados) las dejó la
app al trabajar. Cuesta 0 € y 0 tokens: sólo lee lo que ya está en disco.

**Un solo formato.** Este script y la app (`app/src/main/taller/curva.ts`) aplican exactamente las
mismas reglas y escriben exactamente la misma forma: aquí no hay traducción, hay la misma cuenta.
No es una promesa, es una prueba: `tests/fixtures/taller-curva/` es un Taller de ejemplo y las dos
pruebas (la de Python y la de la app) lo comparan con el mismo `esperado.json`. Si las reglas se
separan, una de las dos se cae.

De cada tarea sale una fila y de las filas salen cuatro cosas:

1. **La curva**: aciertos por día — la línea que sube o baja cada noche.
2. **Por motor**: quién termina más, quién falla más, quién cuesta más.
3. **El coste del acierto**: tokens y euros por tarea *aplicada* (no por tarea: una tarea que se
   descarta no acertó).
4. **Los fallos**: los mensajes de error más repetidos, que son el trabajo pendiente de verdad.

Uso:

    python scripts/curva_taller.py                       # el Taller de este equipo
    python scripts/curva_taller.py --taller ~/.config/daimon-app/taller --json
    python scripts/curva_taller.py --por-modelo          # además, el desglose por modelo
"""
from __future__ import annotations

import argparse
import json
import math
import sys
from collections import Counter
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def redondea(n: float, d: int = 3) -> float:
    """Como `Math.round` de JavaScript: media hacia arriba, sin el «banco» de Python."""
    return math.floor(n * 10 ** d + 0.5) / 10 ** d


def dia_de(ts: float | int | None) -> str:
    """El día del creador, no el de UTC (igual que `diaDe` de la app)."""
    if ts is None or not isinstance(ts, (int, float)) or not math.isfinite(ts):
        return "1970-01-01"
    return datetime.fromtimestamp(float(ts) / 1000).strftime("%Y-%m-%d")


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


def carga(taller: Path) -> dict:
    """Todo lo que el Taller dejó en disco: tareas, veredictos del creador y fallos.

    Las mismas reglas que `leeCurva` de la app (`app/src/main/taller/curva-io.ts`).
    """
    tareas: list[dict] = []
    f = taller / "tareas.json"
    if f.exists():
        try:
            crudo = json.loads(f.read_text(encoding="utf-8"))
            tareas = crudo if isinstance(crudo, list) else []
        except json.JSONDecodeError:
            tareas = []
    veredictos = _lee_jsonl(taller / "veredictos.jsonl")

    # Los fallos: cada tarea guarda su último error, así que no hace falta leer los historiales
    # (algunos pesan megabytes). Sólo si falta, se mira el registro de esa tarea y de ninguna más.
    fallos: list[str] = []
    for t in tareas:
        if t.get("estado") != "error":
            continue
        if t.get("error"):
            fallos.append(str(t["error"]))
            continue
        for ev in _lee_jsonl(taller / f"{t.get('id') or ''}.jsonl"):
            if ev.get("tipo") == "fallo" and ev.get("mensaje"):
                fallos.append(str(ev["mensaje"]))
    return {"tareas": tareas, "veredictos": veredictos, "fallos": fallos}


def _tarea_del_veredicto(v: dict, tareas: list[dict]) -> dict | None:
    """Qué tarea entregó este veredicto: la que dice, o la que estaba abierta cuando llegó."""
    if v.get("tarea"):
        for t in tareas:
            if t.get("id") == v["tarea"]:
                return t
    ts = v.get("ts")
    if not isinstance(ts, (int, float)) or isinstance(ts, bool):
        return None
    for t in tareas:
        ini = t.get("inicio") or 0
        fin = t.get("fin")
        fin = math.inf if fin is None else fin
        if ini <= ts <= fin:
            return t
    return None


def _caja(nombre: str) -> dict:
    return {"motor": nombre, "tareas": 0, "terminadas": 0, "error": 0, "parada": 0, "trabajando": 0,
            "herramientas": 0, "tokens": 0, "coste": 0.0, "ficheros": 0, "veredictos": 0, "aciertos": 0,
            "aciertosPorTarea": 0, "herramientasPorTarea": 0, "tokensPorTarea": 0, "costePorTarea": 0}


def _por_campo(tareas: list[dict], veredictos: list[dict], campo: str) -> list[dict]:
    """Las tareas agrupadas por un campo (el motor o el modelo) con lo que rindieron."""
    grupos: dict[str, dict] = {}

    def caja(nombre: str) -> dict:
        return grupos.setdefault(nombre, _caja(nombre))

    for t in tareas:
        nombre = t.get(campo) or "desconocido"
        b = caja(nombre)
        b["tareas"] += 1
        estado = t.get("estado") or "lista"
        if estado == "lista":
            b["terminadas"] += 1
        elif estado == "error":
            b["error"] += 1
        elif estado == "parada":
            b["parada"] += 1
        else:
            b["trabajando"] += 1
        b["herramientas"] += int(t.get("herramientas") or 0)
        uso = t.get("uso") or {}
        b["tokens"] += int(uso.get("entrada") or 0) + int(uso.get("salida") or 0)
        b["coste"] += float((uso.get("coste") or {}).get("cantidad") or 0)
        b["ficheros"] += int((t.get("cambios") or {}).get("ficheros") or 0)

    for v in veredictos:
        t = _tarea_del_veredicto(v, tareas)
        if not t:
            continue
        b = grupos.get(t.get(campo) or "desconocido")
        if not b:
            continue
        b["veredictos"] += 1
        if v.get("exito"):
            b["aciertos"] += 1

    for b in grupos.values():
        n = b["tareas"]
        b["aciertosPorTarea"] = redondea(b["aciertos"] / n) if n else 0
        b["herramientasPorTarea"] = redondea(b["herramientas"] / n, 1) if n else 0
        b["tokensPorTarea"] = math.floor(b["tokens"] / n + 0.5) if n else 0
        b["costePorTarea"] = redondea(b["coste"] / n, 6) if n else 0
    return list(grupos.values())


def curva_de(datos: dict) -> dict:
    """La curva, calculada de lo que ya está en disco. La misma forma que la app."""
    tareas = datos.get("tareas") or []
    veredictos = datos.get("veredictos") or []
    fallos = datos.get("fallos") or []

    # 1. La curva: aciertos por día. La etiqueta es del creador (aplicar = sí, descartar = no).
    por_dia: dict[str, dict] = {}
    for v in veredictos:
        d = por_dia.setdefault(dia_de(v.get("ts")), {"positivos": 0, "negativos": 0})
        d["positivos" if v.get("exito") else "negativos"] += 1
    dias = []
    for dia in sorted(por_dia):
        d = por_dia[dia]
        total = d["positivos"] + d["negativos"]
        dias.append({"dia": dia, "positivos": d["positivos"], "negativos": d["negativos"],
                     "aciertos": redondea(d["positivos"] / total) if total else 0})

    # 2. Por motor: quién termina más, quién falla más, quién cuesta más.
    motores = sorted(_por_campo(tareas, veredictos, "motor"), key=lambda m: -m["tareas"])

    # 3. El coste del acierto: lo que costó cada tarea que el creador se quedó.
    aplicadas = [v for v in veredictos if v.get("exito")]
    coste_del_acierto = None
    if aplicadas:
        tokens = 0
        coste = 0.0
        tareas_aplicadas = 0
        for v in aplicadas:
            t = _tarea_del_veredicto(v, tareas)
            if not t:
                continue
            tareas_aplicadas += 1
            uso = t.get("uso") or {}
            tokens += int(uso.get("entrada") or 0) + int(uso.get("salida") or 0)
            coste += float((uso.get("coste") or {}).get("cantidad") or 0)
        coste_del_acierto = {"tareas": tareas_aplicadas, "tokens": tokens, "coste": redondea(coste, 6)}

    # 4. Los fallos: los mensajes repetidos, que son el trabajo pendiente de verdad.
    cuenta: Counter[str] = Counter()
    for m in fallos:
        limpio = (m or "").strip()
        if limpio:
            cuenta[limpio] += 1
    fallos_lista = [{"mensaje": k, "veces": v} for k, v in sorted(cuenta.items(), key=lambda kv: -kv[1])]

    estados: Counter[str] = Counter()
    for t in tareas:
        estados[t.get("estado") or "lista"] += 1

    return {
        "tareas": len(tareas),
        "estados": dict(estados),
        "veredictos": {"total": len(veredictos),
                       "positivos": sum(1 for v in veredictos if v.get("exito")),
                       "negativos": sum(1 for v in veredictos if not v.get("exito"))},
        "porDia": dias,
        "porMotor": motores,
        "fallos": fallos_lista,
        "costeDelAcierto": coste_del_acierto,
    }


def imprime(c: dict, por_modelo: list[dict] | None = None) -> None:
    print(f"tareas: {c['tareas']} · estados: {c['estados']}")
    v = c["veredictos"]
    print(f"veredictos del creador: {v['total']} ({v['positivos']} sí · {v['negativos']} no)")
    if c["porDia"]:
        print("\nla curva (día · aciertos):")
        for d in c["porDia"]:
            total = d["positivos"] + d["negativos"]
            print(f"  {d['dia']}  {d['aciertos']:.2f}  ({d['positivos']}/{total})")
    print("\npor motor:")
    for m in c["porMotor"]:
        print(f"  {m['motor']:12s} tareas {m['tareas']:3d} · error {m['error']:3d} · parada {m['parada']:3d} · "
              f"aciertos {m['aciertosPorTarea']:6.3f} · herramientas/tarea {m['herramientasPorTarea']:7.1f} · "
              f"tokens/tarea {m['tokensPorTarea']:9d} · coste {m['costePorTarea']:.6f} $")
    if por_modelo:
        print("\npor modelo:")
        for m in por_modelo:
            print(f"  {m['motor']:16s} tareas {m['tareas']:3d} · error {m['error']:3d} · "
                  f"tokens/tarea {m['tokensPorTarea']:9d} · coste {m['costePorTarea']:.6f} $")
    if c["costeDelAcierto"]:
        a = c["costeDelAcierto"]
        por_tarea = math.floor(a["tokens"] / a["tareas"] + 0.5) if a["tareas"] else 0
        print(f"\ncoste del acierto: {a['tareas']} tareas aplicadas · {por_tarea} tokens/tarea · "
              f"{a['coste']:.6f} $ en total")
    if c["fallos"]:
        print("\nfallos (lo que hay que arreglar):")
        for f in c["fallos"][:8]:
            print(f"  {f['veces']:3d}× {f['mensaje'][:90]}")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--taller", default="~/.config/daimon-app/taller")
    ap.add_argument("--json", action="store_true", help="volcar el JSON y nada más")
    ap.add_argument("--out", default="runs/taller/curva.json")
    ap.add_argument("--por-modelo", action="store_true", help="desglosar también por modelo")
    args = ap.parse_args()

    taller = Path(args.taller).expanduser()
    if not taller.exists():
        print(f"No está el Taller en {taller}", file=sys.stderr)
        return 2
    datos = carga(taller)
    c = curva_de(datos)
    salida = ROOT / args.out
    salida.parent.mkdir(parents=True, exist_ok=True)
    salida.write_text(json.dumps(c, indent=1, ensure_ascii=False), encoding="utf-8")
    if args.json:
        print(json.dumps(c, indent=1, ensure_ascii=False))
    else:
        por_modelo = _por_campo(datos["tareas"], datos["veredictos"], "modelo") if args.por_modelo else None
        imprime(c, por_modelo)
        print(f"\nescrito: {salida}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
