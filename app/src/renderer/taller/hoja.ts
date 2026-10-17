// La hoja de servicio: cuando una tarea termina, una hoja nace y te lo cuenta en prosa — la interfaz generativa
// de la era agentiva hecha tinta: nace al pedir (al terminar), se adapta (frase según lo que pasó) y muere al cerrar.
import type { TareaTaller } from '../lib/bridge'
import { duracion } from './vista'

export type Hoja = { id: string; ts: number; motivo: 'lista' | 'error' }

const FINALES = new Set(['lista', 'error', 'parada'])

/** Los nacimientos: tareas que pasaron a lista o error en este latido (comparado con el mapa anterior). */
export function nacidos(prev: Record<string, string>, tareas: TareaTaller[]): { ids: string[]; mapa: Record<string, string> } {
  const mapa: Record<string, string> = {}
  const ids: string[] = []
  for (const t of tareas) {
    mapa[t.id] = t.estado
    if (FINALES.has(t.estado) && prev[t.id] !== undefined && prev[t.id] !== t.estado && (t.estado === 'lista' || t.estado === 'error')) ids.push(t.id)
  }
  return { ids, mapa }
}

const unidades = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`

/** La frase de servicio: lo que pasó, contado como se lo contarías a un colega, no como lo dice un sistema. */
export function fraseServicio(t: TareaTaller, ahora: number): string {
  const ms = (t.fin ?? ahora) - t.inicio
  const tiempo = `${duracion(Math.max(0, ms))} · ${unidades(t.turnos, 'turno', 'turnos')}`
  if (t.estado === 'error') return `Se cayó${t.error ? `: ${t.error.slice(0, 70)}` : ''} · ${tiempo}`
  if (t.estado === 'parada') return `Se detuvo a mitad · ${tiempo}`
  const c = t.cambios
  if (!c || c.ficheros === 0) return `Terminó sin tocar ficheros · ${tiempo}`
  const deltas = c.mas || c.menos ? ` (+${c.mas} −${c.menos})` : ''
  return `Tocó ${unidades(c.ficheros, 'fichero', 'ficheros')}${deltas} · ${tiempo}`
}

/** El título breve de la tarea (su encargo, no el MotorElegido). */
export const encargoDe = (t: TareaTaller): string => (t.titulo || t.texto || 'Tarea').slice(0, 60)
