# Prueba 0 v2 — preguntas original

Ítems: 139 (ocultos: 35). Solo agregados; ningún texto privado.

## Veredicto (examen oculto)

**CUMPLE** — daimon empata con bm25 usando 39% menos tokens

## Examen oculto

| variante | n | acierto (IC 95 %) | hechos | tokens | latencia s | peor que IA sola | errores |
|---|---|---|---|---|---|---|---|
| daimon_sin_corte | 35 | 0.943 (0.857–1.000) | 0.602 | 1496 | 10.2 | 0.0% | 0 |
| daimon | 35 | 0.929 (0.857–0.986) | 0.621 | 917 | 9.5 | 0.0% | 0 |
| bm25 | 35 | 0.900 (0.800–0.986) | 0.581 | 1497 | 13.4 | 0.0% | 0 |
| rag_denso_eg | 35 | 0.886 (0.786–0.971) | 0.602 | 1494 | 11.9 | 0.0% | 0 |
| daimon_solo_original | 35 | 0.871 (0.771–0.957) | 0.595 | 833 | 9.4 | 0.0% | 0 |
| bm25_1000 | 35 | 0.843 (0.714–0.943) | 0.576 | 997 | 9.8 | 0.0% | 0 |
| ia_sola | 35 | 0.129 (0.043–0.229) | 0.055 | 0 | 7.1 | 0.0% | 0 |
| md | 35 | 0.114 (0.029–0.214) | 0.095 | 1499 | 15.2 | 5.7% | 0 |
| contexto_largo | 35 | 0.071 (0.014–0.129) | 0.088 | 1498 | 12.1 | 17.1% | 0 |

## Examen visible

| variante | n | acierto (IC 95 %) | hechos | tokens | latencia s | peor que IA sola | errores |
|---|---|---|---|---|---|---|---|
