"""Demostración: la misma IA local, sola y con la memoria de Daimon.

Uso: python scripts/demo.py "pregunta 1" "pregunta 2" ...
"""
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "scripts"))

import prueba0 as P  # noqa: E402
from daimon.bench.run import SYSTEM_ANSWER, prompt_for  # noqa: E402
from daimon.hippocampus import Hippocampus  # noqa: E402
from daimon.lexical import BM25  # noqa: E402
from daimon.teachers import Ollama  # noqa: E402
from daimon.thalamus import Thalamus  # noqa: E402


def main(questions):
    eg = Hippocampus(P.EG_HOME / "mem.db", P.eg_lens())
    th = Thalamus(eg, BM25(eg.events()), mmr_lambda=1.0, max_drop=P.MAX_DROP)
    th.load(P.RUNS / "thalamus_eg.npy")
    contexts = [th.compose(q, P.BUDGET) for q in questions]      # primero todos los contextos (un modelo en GPU)
    ia = Ollama(P.ANSWERER, timeout=300)
    for q, (ctx, used, ids) in zip(questions, contexts):
        t = time.time(); sola = ia.answer(SYSTEM_ANSWER, prompt_for(q, ""), 160); t1 = time.time() - t
        t = time.time(); con = ia.answer(SYSTEM_ANSWER, prompt_for(q, ctx), 160); t2 = time.time() - t
        print(f"\n### {q}\n- IA sola ({t1:.0f}s): {sola}\n- IA + Daimon ({t2:.0f}s, {used} tokens, "
              f"{len(ids)} recuerdos): {con}")


if __name__ == "__main__":
    main(sys.argv[1:])
