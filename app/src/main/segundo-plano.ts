// Esme en segundo plano: al cerrar la ventana, si tu equipo tiene encargos programados o agentes trabajando, Esme se queda
// junto al reloj para que la agenda siga corriendo. Se elige: automático (solo si hay algo pendiente), siempre o nunca.
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

export type PreferenciaCierre = 'auto' | 'siempre' | 'nunca'
type Pendiente = { programados: number; trabajando: number }

export function alCerrarVentana(o: Pendiente & { preferencia: PreferenciaCierre }): 'ocultar' | 'salir' {
  if (o.preferencia === 'siempre') return 'ocultar'
  if (o.preferencia === 'nunca') return 'salir'
  return o.programados > 0 || o.trabajando > 0 ? 'ocultar' : 'salir'
}

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`
const hora = (ms: number) => { const d = new Date(ms); return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}` }

export function resumenBandeja(o: Pendiente & { proxima: number | null }): string {
  const partes = ['Esme']
  if (o.trabajando) partes.push(plural(o.trabajando, 'agente trabajando', 'agentes trabajando'))
  if (o.programados) partes.push(`${plural(o.programados, 'encargo programado', 'encargos programados')}${o.proxima ? ` (próximo a las ${hora(o.proxima)})` : ''}`)
  return partes.join(' · ')
}

export function leerPreferencia(fichero: string): PreferenciaCierre {
  try { const v = JSON.parse(readFileSync(fichero, 'utf8')).alCerrar; return v === 'siempre' || v === 'nunca' ? v : 'auto' } catch { return 'auto' }
}

export function guardarPreferencia(fichero: string, v: PreferenciaCierre): void {
  let previo: Record<string, unknown> = {}
  try { previo = JSON.parse(readFileSync(fichero, 'utf8')) } catch { /* primera vez */ }
  mkdirSync(dirname(fichero), { recursive: true })
  writeFileSync(`${fichero}.tmp`, JSON.stringify({ ...previo, alCerrar: v }), { mode: 0o600 })
  renameSync(`${fichero}.tmp`, fichero)
}
