// La lógica de «Mando», la portada que es el centro de mando de todo Esme: la isla de estado (lo que hacen tus agentes)
// y los pasos de cada agente trabajando, sacados de las tareas reales del Taller.
import type { TareaTaller } from '../lib/bridge'
import type { AgentStep } from '../ui/ai-loading'
import type { IslandTask } from '../ui/status-island'
import { recorta } from './diario'

const RECIENTE_MS = 10 * 60_000

/** Lo que la isla enseña, del más antiguo al más nuevo (la isla muestra el último): lo terminado hace poco y lo que trabaja. */
export function islaDe(tareas: TareaTaller[], ahora = Date.now()): IslandTask[] {
  const items: (IslandTask & { ms: number })[] = []
  for (const t of tareas) {
    const base = { id: t.id, label: t.motorNombre, detail: recorta(t.titulo, 40) }
    if (t.estado === 'trabajando' || t.estado === 'preparando' || t.estado === 'esperando') items.push({ ...base, status: 'running', ms: ahora })
    else if ((t.estado === 'lista' || t.estado === 'error') && t.fin && ahora - t.fin < RECIENTE_MS) items.push({ ...base, status: t.estado === 'lista' ? 'done' : 'error', ms: t.fin })
  }
  return items.sort((a, b) => a.ms - b.ms).map(({ ms: _, ...t }) => t)
}

/** Los pasos de una tarea: preparar su copia aislada, trabajar (o esperar tu permiso) y dejarla lista para revisar. */
export function pasosDe(t: TareaTaller): AgentStep[] {
  const prep = t.estado === 'preparando'
  const trabajo = t.estado === 'esperando' && t.permiso ? `Esperando tu permiso: ${t.permiso.titulo}` : t.estado === 'esperando' ? 'Esperando tu respuesta' : `Trabajando en «${recorta(t.titulo, 34)}»`
  const fin = t.estado === 'lista' || t.estado === 'error' || t.estado === 'parada'
  return [
    { id: 'copia', label: 'Preparando una copia aislada', status: prep ? 'running' : 'done' },
    { id: 'trabajo', label: trabajo, status: prep ? 'pending' : fin ? (t.estado === 'error' ? 'error' : 'done') : 'running',
      detail: [`${t.herramientas} ${t.herramientas === 1 ? 'herramienta usada' : 'herramientas usadas'}`, `${t.turnos} ${t.turnos === 1 ? 'turno' : 'turnos'}`] },
    { id: 'revision', label: 'Lista para que la revises', status: t.estado === 'lista' ? 'done' : 'pending' },
  ]
}
