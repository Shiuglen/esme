// El historial de pieles: cada cambio de piel se puede deshacer y rehacer (hasta 30 pasos atrás).
import type { Piel } from './piel'

export type Historial = { pasado: Piel[]; actual: Piel; futuro: Piel[] }
const PASOS = 30

export const historialDe = (p: Piel): Historial => ({ pasado: [], actual: p, futuro: [] })
export const vestir = (h: Historial, p: Piel): Historial => ({ pasado: [...h.pasado, h.actual].slice(-PASOS), actual: p, futuro: [] })
export const deshacer = (h: Historial): Historial =>
  h.pasado.length ? { pasado: h.pasado.slice(0, -1), actual: h.pasado[h.pasado.length - 1], futuro: [h.actual, ...h.futuro] } : h
export const rehacer = (h: Historial): Historial =>
  h.futuro.length ? { pasado: [...h.pasado, h.actual], actual: h.futuro[0], futuro: h.futuro.slice(1) } : h
