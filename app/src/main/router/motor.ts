// El motor que usa la conversación cuando no le fijas uno: Esme elige según la tarea y lo explica.
//
// Vive aquí (y no en chat.ts) porque necesita el llavero (qué motores tienes con clave) y el catálogo de models.dev
// (qué modelos hay y qué cuestan). Nunca elige un motor sin clave, y si no hay ninguno utilizable, lo dice.
import { keys } from '../keys'
import { catalogoProveedores } from '../ipc-proveedores'
import { PROVIDERS, type ProviderId } from '../providers'
import { decidir, type Decision } from './auto'
import { Aprendizaje } from './niveles'
import { app } from 'electron'
import { join } from 'node:path'
import type { ModelMessage } from 'ai'

// Lo que Esme aprende: qué motor sirvió para qué tipo de tarea. Vive en tu equipo (un fichero en tu carpeta de datos).
let aprendizaje: Aprendizaje | null = null
export const aprende = (): Aprendizaje => (aprendizaje ??= new Aprendizaje(join(app.getPath('userData'), 'router-aprendizaje.json')))

/** La última respuesta con la que puedes opinar: qué motor respondió y de qué tipo era la tarea. */
let ultima: { proveedor: string; modelo: string; tipo: Decision['tipo'] } | null = null
export const recordarDecision = (d: { proveedor: string; modelo: string; tipo: Decision['tipo'] }) => { ultima = d }
export const ultimaDecision = () => ultima

/** Registra tu veredicto: «sirvió» o «no sirvió». Con eso el router deja de repetirte lo mismo. */
export function registrarJuicio(useful: boolean) {
  if (!ultima) return false
  aprende().registrar(ultima.tipo, ultima.proveedor, ultima.modelo, useful ? 'aprobado' : 'rechazado')
  return true
}

/** El último mensaje del usuario: lo que dice la tarea. */
const ultimaPeticion = (mensajes: ModelMessage[]): string => {
  for (let i = mensajes.length - 1; i >= 0; i--) {
    const m = mensajes[i]
    if (m.role !== 'user') continue
    const c = m.content
    if (typeof c === 'string') return c
    if (Array.isArray(c)) {
      const t = c.map((p) => (typeof p === 'object' && p && 'text' in p ? String((p as { text: unknown }).text) : '')).join(' ').trim()
      if (t) return t
    }
  }
  return ''
}

export async function decidirMotor(o: { mensajes: ModelMessage[]; herramientas?: boolean; fijado?: { proveedor: string; modelo: string } }): Promise<Decision | null> {
  const motores = PROVIDERS.map((p) => ({ id: p.id as string, local: p.local, hasKey: !!keys.get(p.id as never), modelo: p.defaultModel }))
  const catalogo = await catalogoProveedores()
  // solo los proveedores que la app conoce de verdad: el catálogo trae más de los que la app puede usar
  const conocidos = new Set(PROVIDERS.map((p) => p.id as string))
  const d = decidir({
    mensaje: ultimaPeticion(o.mensajes),
    herramientas: o.herramientas,
    motores: motores.filter((m) => conocidos.has(m.id)),
    catalogo: catalogo.filter((p) => conocidos.has(p.id)),
    fijado: o.fijado,
    // lo que aprendió de ti: el motor que sirvió para esta clase de tarea vale más
    calidad: (t, c) => aprende().calidad(t, c.proveedor, c.modelo),
  })
  if (d) recordarDecision(d)
  return d
}

