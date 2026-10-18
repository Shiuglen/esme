// Qué motor usa la conversación y cómo se explican sus fallos (sin «fetch failed» a pelo).
import type { ProviderView } from '../lib/bridge'

/** El orden en que se prueban los motores: el último que usaste, los locales (privados y gratis) y los de API con clave. */
export function ordenMotores(ps: ProviderView[], ultimo: string | null): ProviderView[] {
  const usable = (x: ProviderView) => x.local || x.hasKey
  const primero = ps.filter((x) => x.id === ultimo && usable(x))
  return [...primero, ...ps.filter((x) => x.local && x.id !== ultimo), ...ps.filter((x) => !x.local && x.hasKey && x.id !== ultimo)]
}

export function explicarFallo(mensaje: string, motor: string): string {
  if (/fetch failed|ECONNREFUSED|ENOTFOUND|network|Failed to fetch/i.test(mensaje)) return `${motor} no responde. Elige otro motor arriba o arráncalo.`
  if (/\b401\b|unauthori[sz]ed|invalid api key|incorrect api key/i.test(mensaje)) return `${motor} rechaza la clave. Revísala en Ajustes.`
  if (/insufficient credits|never purchased credits|\b402\b|payment required/i.test(mensaje)) return `Ese modelo de ${motor} es de pago y tu cuenta no tiene saldo. Elige uno gratis (los que acaban en «:free») arriba, o añade saldo en ${motor}.`
  if (/free-models-per-day/i.test(mensaje)) return `Se acabaron por hoy las peticiones gratis de ${motor}: vuelven mañana. Con 10 $ de saldo en OpenRouter pasan a ser 1000 al día, o elige otro motor arriba.`
  if (/\b429\b|rate limit/i.test(mensaje)) return `${motor} pide esperar un poco (límite de uso). Prueba en un momento o elige otro motor.`
  return mensaje
}

// Los modelos gratis que obedecen el formato a la primera (probados por el puente el 16-17 oct)
export const GRATIS_QUE_OBEDECEN = ['cohere/north-mini-code:free', 'google/gemma-4-31b-it:free', 'google/gemma-4-26b-a4b-it:free', 'poolside/laguna-s-2.1:free']
const NO_CONVERSA = /embed|reasoning|safety|guard|omni|[-/]vl\b/i
/** Con qué modelo empieza la conversación: el que elegiste; si no, el de por defecto del motor; si no, uno gratis que
 *  obedece (nunca uno de pago que no hayas elegido tú); si el motor no tiene gratis, su primero que converse. */
export function modeloInicial(ms: string[], porDefecto: string | undefined, recordado: string | null): string {
  if (recordado && ms.includes(recordado)) return recordado
  if (porDefecto && ms.includes(porDefecto)) return porDefecto
  return GRATIS_QUE_OBEDECEN.find((m) => ms.includes(m)) ?? ms.find((m) => m.endsWith(':free') && !NO_CONVERSA.test(m))
    ?? ms.find((m) => !/embed/i.test(m)) ?? ms[0] ?? ''
}
