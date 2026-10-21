"""Informe de la Prueba 0 (solo agregados: ningún texto privado) y veredicto del criterio de éxito F1.

El veredicto se decide **por pares** (los mismos ítems) y contra el ruido, no contra un
número redondeado: el 20-oct el veredicto exigía 0,02 de diferencia mientras el
propio instrumento se movía 0,08 entre corridas, así que una empate acababa contando como
derrota y la memoria «no cumplía» sin que nadie pudiera decir por qué.
"""
from __future__ import annotations

from pathlib import Path

import numpy as np

from .items import Item, is_hidden
from .metrics import bootstrap_ci, paired_diff_ci, sign_test_p, worse_rate

BASE = "ia_sola"

# La entrega por la puerta (el pack de `sesion`) NO es una línea base: es Esme sirviéndose a sí
# mismo. Comparar la memoria desnuda contra ella no responde «¿sirve la memoria?», responde
# «¿sirve el protocolo?». Se mide aparte y se cuenta aparte.
ENTREGA = ("sesion",)

# Cuánto más barato tiene que ser el contexto de la memoria para que un empate sea un empate
# bueno. Es el listón de siempre: el examen de octubre dio 39 % menos tokens con el acierto igual.
BARATO = 0.7


def _summ(rows: list[dict]) -> dict:
    out = {}
    for v in sorted({r["variant"] for r in rows}):
        rs = [r for r in rows if r["variant"] == v]
        ok = [r for r in rs if r["status"] == "ok" and "score" in r]
        m, lo, hi = bootstrap_ci([r["score"] for r in ok])
        out[v] = {"n": len(ok), "err": len(rs) - len(ok), "acc": m, "lo": lo, "hi": hi,
                  "facts": float(np.mean([r["facts"] for r in ok])) if ok else float("nan"),
                  "tokens": float(np.mean([r["context_tokens"] for r in ok])) if ok else float("nan"),
                  "lat": float(np.mean([r["latency_s"] for r in ok])) if ok else float("nan"),
                  "scores": {r["item_id"]: r["score"] for r in ok}}
    base = out.get(BASE, {}).get("scores", {})
    for v in out:
        out[v]["worse"] = worse_rate(out[v]["scores"], base) if base else float("nan")
    return out


def _pareado(a: dict, b: dict) -> tuple[float, float, float, float, int, int]:
    """(Δ, IC bajo, IC alto, p, gana, pierde) de `a` frente a `b`, por pares de ítem."""
    comunes = [k for k in a if k in b]
    dif, lo, hi = paired_diff_ci(a, b)
    difs = [a[k] - b[k] for k in comunes]
    return dif, lo, hi, sign_test_p(difs), sum(1 for d in difs if d > 0), sum(1 for d in difs if d < 0)


def _verdict(s: dict, entrega=ENTREGA) -> tuple[bool, str]:
    d = s.get("daimon")
    bases = {k: v for k, v in s.items() if not k.startswith("daimon") and k not in entrega and v["n"]}
    if not d or not d["n"] or not bases:
        return False, "faltan filas de daimon o de líneas base en el examen oculto"
    if d["worse"] > 0.05:
        return False, f"daimon empeora frente a la IA sola en {d['worse']:.0%} de los ítems (>5 %)"
    bname, b = max(bases.items(), key=lambda kv: kv[1]["acc"])
    dif, lo, hi, p, gana, pierde = _pareado(d["scores"], b["scores"])
    ic = f"IC 95 % [{lo:+.3f}, {hi:+.3f}]"
    if lo > 0:
        return True, (f"daimon supera a la mejor línea base ({bname}) por {dif:+.3f} "
                      f"({ic}, p={p:.3f}, {gana} ítems a favor / {pierde} en contra)")
    if hi < 0:
        return False, (f"daimon es peor que {bname} por {-dif:.3f} ({ic}, p={p:.3f}, "
                       f"{gana} ítems a favor / {pierde} en contra)")
    # Empate: la diferencia no se distingue con estos ítems. Entonces lo que decide es el precio.
    if b["tokens"] > 0 and d["tokens"] <= BARATO * b["tokens"]:
        return True, (f"daimon empata con {bname} (Δ {dif:+.3f}, {ic}: la diferencia no se distingue) "
                      f"usando {1 - d['tokens'] / b['tokens']:.0%} menos tokens")
    return False, (f"daimon empata con {bname} (Δ {dif:+.3f}, {ic}) pero no gasta menos tokens "
                   f"({d['tokens']:.0f} frente a {b['tokens']:.0f}): no aporta nada")

def _table(s: dict) -> str:
    lines = ["| variante | n | acierto (IC 95 %) | hechos | tokens | latencia s | peor que IA sola | errores |",
             "|---|---|---|---|---|---|---|---|"]
    for v, x in sorted(s.items(), key=lambda kv: -kv[1]["acc"] if kv[1]["n"] else 1):
        lines.append(f"| {v} | {x['n']} | {x['acc']:.3f} ({x['lo']:.3f}–{x['hi']:.3f}) | {x['facts']:.3f} | "
                     f"{x['tokens']:.0f} | {x['lat']:.1f} | {x['worse']:.1%} | {x['err']} |")
    return "\n".join(lines)


def _tabla_pareada(s: dict, entrega=ENTREGA) -> str:
    """La comparación honesta: cada variante contra daimon, por pares de ítem."""
    d = s.get("daimon")
    if not d or not d["n"]:
        return ""
    lines = ["| variante | Δ acierto (por pares) | IC 95 % | p (exacto) | ítems a favor / en contra | tokens |",
             "|---|---|---|---|---|---|"]
    for v, x in sorted(s.items(), key=lambda kv: -kv[1]["acc"] if kv[1]["n"] else 1):
        if v == "daimon" or not x["n"]:
            continue
        dif, lo, hi, p, gana, pierde = _pareado(d["scores"], x["scores"])
        nombre = f"{v} (entrega por la puerta)" if v in entrega else v
        lines.append(f"| {nombre} | {dif:+.3f} | [{lo:+.3f}, {hi:+.3f}] | {p:.3f} | {gana} / {pierde} | {x['tokens']:.0f} |")
    return "\n".join(lines)


def report(rows: list[dict], items: list[Item], out_md: Path, title: str = "Prueba 0",
           entrega=ENTREGA, notas: list[str] | None = None) -> dict:
    hidden_ids = {i.id for i in items if is_hidden(i.id)}
    vis = _summ([r for r in rows if r["item_id"] not in hidden_ids])
    hid = _summ([r for r in rows if r["item_id"] in hidden_ids])
    ok, reason = _verdict(hid, entrega)
    # El contraveredicto: qué pasaría si la entrega por la puerta contara como línea base.
    # Se publica aunque no cambie el veredicto: el que lee tiene que ver las dos lecturas.
    ok2, reason2 = _verdict(hid, entrega=())
    md = (f"# {title}\n\nÍtems: {len(items)} (ocultos: {len(hidden_ids)}). Solo agregados; ningún texto privado.\n\n"
          f"## Veredicto (examen oculto)\n\n**{'CUMPLE' if ok else 'NO CUMPLE'}** — {reason}\n\n"
          f"> Contraveredicto (si la entrega por la puerta contara como línea base): "
          f"**{'CUMPLE' if ok2 else 'NO CUMPLE'}** — {reason2}\n\n"
          f"## Examen oculto\n\n{_table(hid)}\n\n"
          f"## Comparación por pares (daimon contra cada variante)\n\n{_tabla_pareada(hid, entrega)}\n\n"
          f"## Examen visible\n\n{_table(vis)}\n")
    for n in notas or []:
        md += f"\n{n}\n"
    Path(out_md).parent.mkdir(parents=True, exist_ok=True)
    Path(out_md).write_text(md, encoding="utf-8")
    return {"verdict": ok, "reason": reason, "contraveredicto": (ok2, reason2), "hidden": hid, "visible": vis}
