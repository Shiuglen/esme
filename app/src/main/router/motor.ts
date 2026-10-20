// El motor que usa la conversación cuando no le fijas uno: Esme elige según la tarea y lo explica.
//
// Vive aquí (y no en chat.ts) porque necesita el llavero (qué motores tienes con clave) y el catálogo de models.dev
// (qué modelos hay y qué cuestan). Nunca elige un motor sin clave, y si no hay ninguno utilizable, lo dice.
import { keys } from '../keys'
import { catalogoProveedores } from '../ipc-proveedores'
import { PROVIDERS, type ProviderId } from '../providers'
import { decidir, type Decision } from './auto'
import type { ModelMessage } from 'ai'

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
  return decidir({
    mensaje: ultimaPeticion(o.mensajes),
    herramientas: o.herramientas,
    motores: motores.filter((m) => conocidos.has(m.id)),
    catalogo: catalogo.filter((p) => conocidos.has(p.id)),
    fijado: o.fijado,
  })
}

