# Prueba 0 v2 — preguntas original

Ítems: 139 (ocultos: 35). Solo agregados; ningún texto privado.

## Veredicto (examen oculto)

**CUMPLE** — daimon empata con rag_denso_eg (Δ -0.057, IC 95 % [-0.171, +0.057]: la diferencia no se distingue) usando 39% menos tokens

> Contraveredicto (si la entrega por la puerta contara como línea base): **NO CUMPLE** — daimon empata con sesion (Δ -0.071, IC 95 % [-0.186, +0.043]) pero no gasta menos tokens (917 frente a 937): no aporta nada

## Examen oculto

| variante | n | acierto (IC 95 %) | hechos | tokens | latencia s | peor que IA sola | errores |
|---|---|---|---|---|---|---|---|
| sesion | 35 | 0.843 (0.729–0.943) | 0.555 | 937 | 8.6 | 0.0% | 0 |
| rag_denso_eg | 35 | 0.829 (0.729–0.929) | 0.531 | 1494 | 9.6 | 2.9% | 0 |
| daimon | 35 | 0.771 (0.657–0.886) | 0.545 | 917 | 8.9 | 2.9% | 0 |
| ia_sola | 35 | 0.143 (0.071–0.214) | 0.064 | 0 | 6.6 | 0.0% | 0 |

## Comparación por pares (daimon contra cada variante)

| variante | Δ acierto (por pares) | IC 95 % | p (exacto) | ítems a favor / en contra | tokens |
|---|---|---|---|---|---|
| sesion (entrega por la puerta) | -0.071 | [-0.186, +0.043] | 0.227 | 3 / 8 | 937 |
| rag_denso_eg | -0.057 | [-0.171, +0.057] | 0.508 | 3 / 6 | 1494 |
| ia_sola | +0.629 | [+0.486, +0.757] | 0.000 | 29 / 1 | 0 |

## Examen visible

| variante | n | acierto (IC 95 %) | hechos | tokens | latencia s | peor que IA sola | errores |
|---|---|---|---|---|---|---|---|

## Repetibilidad del examen (el mismo contexto, otra vez)


El instrumento se mide a sí mismo: la misma pregunta con el mismo contexto, respondida y juzgada otra vez.

Si el acierto se mueve, lo que se mide es el ruido del modelo y del juez — y ninguna tolerancia

del veredicto puede ser más pequeña que ese ruido.


| variante | corrida original | repetición | acierto | Δ |

|---|---|---|---|---|

| daimon | 0.771 | 2 | 0.771 | +0.000 |

| sesion | 0.843 | 2 | 0.843 | +0.000 |

| daimon | 0.771 | 3 | 0.771 | +0.000 |

| sesion | 0.843 | 3 | 0.843 | +0.000 |


Movimiento observado: de +0.000 a +0.000 (rango 0.000).

**El examen es determinista**: con el mismo modelo y el mismo contexto, el acierto sale idéntico. Eso significa que una variación entre dos corridas **no es ruido del instrumento**: es que cambió el modelo que responde (o el contexto). La prueba está en `ia_sola`, que no tiene contexto: si sus respuestas cambian, el modelo es otro.

