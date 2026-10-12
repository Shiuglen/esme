// El trazo de un recuerdo dice dos verdades: su edad (el color de la tinta) y su confianza (el grosor,
// o grafito si aún nadie lo ha verificado). Ver docs/superpowers/specs/2026-10-12-tinta-y-luz.md §1.
import { mezclar } from './luz'

const UN_AÑO = 365
/** Cuánto ha envejecido la tinta: 0 hoy, 1 al año o más. Rápido al principio y luego se asienta, como la ferrogálica. */
export const envejecimiento = (dias: number) => Math.min(1, Math.log1p(Math.max(0, dias)) / Math.log1p(UN_AÑO))
/** La tinta en pocos tonos, de fresca a vieja: el lienzo agrupa los trazos del mismo color y los pinta de una vez. */
export const NIVELES_TINTA = 24
export const paletaTinta = (tonos: { fresca: string; vieja: string }, niveles = NIVELES_TINTA) =>
  Array.from({ length: niveles }, (_, i) => mezclar(tonos.fresca, tonos.vieja, i / (niveles - 1)))
export const nivelTinta = (dias: number, niveles = NIVELES_TINTA) => Math.round(envejecimiento(dias) * (niveles - 1))

/** Por debajo de esta confianza el recuerdo sigue en grafito: lo dijo una IA o vino de fuera y nadie lo ha confirmado. */
export const UMBRAL_TINTA = 0.6
export const esGrafito = (confianza?: number) => confianza !== undefined && confianza < UMBRAL_TINTA
export const radioTrazo = (confianza = 0.8) => 0.9 + 1.4 * confianza
