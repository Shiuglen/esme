# Prueba 0 v2 — preguntas parafrasis

Ítems: 139 (ocultos: 35). Solo agregados; ningún texto privado.

## Veredicto (examen oculto)

**NO CUMPLE** — daimon no supera a rag_denso_eg (acierto 0.818 vs 1.000; tokens 1131 vs 1490)

## Examen oculto

| variante | n | acierto (IC 95 %) | hechos | tokens | latencia s | peor que IA sola | errores |
|---|---|---|---|---|---|---|---|
| rag_denso_eg | 11 | 1.000 (1.000–1.000) | 0.682 | 1490 | 14.8 | 0.0% | 0 |
| daimon_sin_corte | 11 | 0.909 (0.727–1.000) | 0.712 | 1496 | 13.5 | 0.0% | 0 |
| bm25 | 12 | 0.875 (0.667–1.000) | 0.514 | 1497 | 14.6 | 0.0% | 0 |
| daimon_solo_original | 11 | 0.864 (0.636–1.000) | 0.500 | 1039 | 14.2 | 0.0% | 0 |
| daimon | 11 | 0.818 (0.545–1.000) | 0.591 | 1131 | 14.0 | 0.0% | 0 |
| bm25_1000 | 12 | 0.750 (0.542–0.958) | 0.458 | 996 | 12.9 | 0.0% | 0 |
| ia_sola | 12 | 0.208 (0.042–0.417) | 0.000 | 0 | 7.8 | 0.0% | 0 |
| md | 12 | 0.083 (0.000–0.208) | 0.083 | 1499 | 17.7 | 25.0% | 0 |
| contexto_largo | 11 | 0.000 (0.000–0.000) | 0.000 | 1498 | 14.2 | 36.4% | 0 |

## Examen visible

| variante | n | acierto (IC 95 %) | hechos | tokens | latencia s | peor que IA sola | errores |
|---|---|---|---|---|---|---|---|
