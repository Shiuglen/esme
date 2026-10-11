"""Informe de la Prueba 0 (solo agregados: ningún texto privado) y veredicto del criterio de éxito F1."""
from __future__ import annotations

from pathlib import Path

import numpy as np

from .items import Item, is_hidden
from .metrics import bootstrap_ci, worse_rate

BASE = "ia_sola"


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


def _verdict(s: dict) -> tuple[bool, str]:
    d = s.get("daimon")
    bases = {k: v for k, v in s.items() if not k.startswith("daimon") and v["n"]}
    if not d or not d["n"] or not bases:
        return False, "faltan filas de daimon o de líneas base en el examen oculto"
    bname, b = max(bases.items(), key=lambda kv: kv[1]["acc"])
    if d["worse"] > 0.05:
        return False, f"daimon empeora frente a la IA sola en {d['worse']:.0%} de los ítems (>5 %)"
    if d["lo"] > b["hi"]:
        return True, f"daimon supera a la mejor línea base ({bname}) con IC 95 % sin solapamiento"
    overlap = d["hi"] >= b["lo"] and d["lo"] <= b["hi"]
    if overlap and d["acc"] >= b["acc"] - 0.02 and d["tokens"] <= 0.7 * b["tokens"]:
        return True, f"daimon empata con {bname} usando {1 - d['tokens'] / b['tokens']:.0%} menos tokens"
    return False, f"daimon no supera a {bname} (acierto {d['acc']:.3f} vs {b['acc']:.3f}; tokens {d['tokens']:.0f} vs {b['tokens']:.0f})"


def _table(s: dict) -> str:
    lines = ["| variante | n | acierto (IC 95 %) | hechos | tokens | latencia s | peor que IA sola | errores |",
             "|---|---|---|---|---|---|---|---|"]
    for v, x in sorted(s.items(), key=lambda kv: -kv[1]["acc"] if kv[1]["n"] else 1):
        lines.append(f"| {v} | {x['n']} | {x['acc']:.3f} ({x['lo']:.3f}–{x['hi']:.3f}) | {x['facts']:.3f} | "
                     f"{x['tokens']:.0f} | {x['lat']:.1f} | {x['worse']:.1%} | {x['err']} |")
    return "\n".join(lines)


def report(rows: list[dict], items: list[Item], out_md: Path, title: str = "Prueba 0") -> dict:
    hidden_ids = {i.id for i in items if is_hidden(i.id)}
    vis = _summ([r for r in rows if r["item_id"] not in hidden_ids])
    hid = _summ([r for r in rows if r["item_id"] in hidden_ids])
    ok, reason = _verdict(hid)
    md = (f"# {title}\n\nÍtems: {len(items)} (ocultos: {len(hidden_ids)}). Solo agregados; ningún texto privado.\n\n"
          f"## Veredicto (examen oculto)\n\n**{'CUMPLE' if ok else 'NO CUMPLE'}** — {reason}\n\n"
          f"## Examen oculto\n\n{_table(hid)}\n\n## Examen visible\n\n{_table(vis)}\n")
    Path(out_md).parent.mkdir(parents=True, exist_ok=True)
    Path(out_md).write_text(md, encoding="utf-8")
    return {"verdict": ok, "reason": reason, "hidden": hid, "visible": vis}
