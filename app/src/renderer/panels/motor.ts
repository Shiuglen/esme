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
  if (/\b429\b|rate limit/i.test(mensaje)) return `${motor} pide esperar un poco (límite de uso). Prueba en un momento o elige otro motor.`
  return mensaje
}
