"""¿Por qué la mente no trae una evidencia que sí tiene? (diagnóstico de una pregunta)

Para cada evidencia que faltó: si está entre los candidatos, en qué puesto puntúa, si es de la
cabeza o de la cola, y quéoccupation tenía el presupuesto. Con eso se sabe si el fallo es del
**pool** (no la busca) o del **ranking** (la busca y la deja fuera).

    python scripts/diagnostico_evidencia.py p1-17 p4-23
"""
from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))


def _prueba0():
    spec = importlib.util.spec_from_file_location("prueba0", ROOT / "scripts/prueba0.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def main() -> int:
    p0 = _prueba0()
    from daimon.home import Home

    ids = sys.argv[1:]
    home = Home(p0.HOME)
    texts = {e.id: e.text for e in home.hippo.events()}
    items = {i.id: i for i in p0.items_for("original", "oculto") + p0.items_for("original", "visible")}
    th = p0._fit(home, p0.items_for("original", "visible"), with_para=True)

    for qid in ids:
        it = items[qid]
        print(f"\n===== {qid}: {it.question}")
        ranked = th.rank(it.question, budget=1500)
        ctx, used, incluidos = th.compose(it.question, 1500)
        print(f"candidatos: {len(ranked)} · en el contexto: {len(incluidos)} · tokens: {used}")
        for e in it.evidence:
            pos = next((i for i, (ev, _, _) in enumerate(ranked) if ev.id == e), None)
            cab = e in th._cabeza
            txt = texts.get(e, "")
            en_ctx = txt[:60] in ctx
            print(f"  evidencia {e}: en el contexto={en_ctx} · puesto={pos} · cabeza={cab}")
            print(f"    «{txt[:130]}»")
        print("  top 5 del ranking:")
        for i, (ev, s, _) in enumerate(ranked[:5]):
            print(f"    [{i}] {s:.3f} {'C' if ev.id in th._cabeza else ' '} {ev.text[:80]}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
