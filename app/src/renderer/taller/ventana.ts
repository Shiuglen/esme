// La ventana de la línea en vivo: una sesión larga trae 17.000 elementos (78.134 eventos) y pintarlos
// todos en cada fotograma era lo que se comía la memoria del renderer (2,7 GB y subiendo) y un núcleo
// entero de CPU. Ahora sólo se pinta la cola, y la cola se congela si quien mira sube a leer.
//
// La ventana no borra nada: la línea entera sigue en la memoria (unos 20 MB de texto); lo que se
// evita es dibujar 17.000 elementos por fotograma. Lo que se ve antes se pide con «ver más».
import type { ItemLinea } from './linea'

/** Cuántos elementos se pintan de golpe. Es un margen de sobra para lo que se ve en pantalla. */
export const VENTANA = 250

export type Ventana = {
  /** El primer elemento que se pinta (índice en la línea). */
  desde: number
  /** El último elemento que se pinta (excluido). */
  hasta: number
  /** Si hay más cosas antes de la ventana: se pueden pedir. */
  hayAntes: boolean
  /** Cuántos elementos tiene la línea entera. */
  total: number
}

/**
 * Calcula la ventana a pintar.
 *
 * @param linea      la línea entera
 * @param cuantas    cuántos elementos se pintan como mucho
 * @param ancla      dónde se termina la ventana: `null` es la cola viva (se mueve sola);
 *                   con un número, la ventana se queda quieta aunque lleguen cosas nuevas
 */
export function ventanaDe(linea: ItemLinea[], cuantas: number, ancla: number | null): Ventana {
  const total = linea.length
  const fin = ancla === null ? total : Math.min(Math.max(ancla, 0), total)
  const n = Math.max(1, Math.min(cuantas, fin))
  const desde = Math.max(0, fin - n)
  return { desde, hasta: fin, hayAntes: desde > 0, total }
}

/** Los elementos de la ventana, sin copiar los que no se pintan. */
export function visiblesDe(linea: ItemLinea[], ventana: Ventana): ItemLinea[] {
  return linea.slice(ventana.desde, ventana.hasta)
}
