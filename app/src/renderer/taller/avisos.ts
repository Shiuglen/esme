// Avisos del Taller para el resto de la app: cuándo una tarea termina, te pide permiso o falla.
// Se deciden comparando cada instantánea con la anterior, así no se repiten aunque la tarea emita cambios a menudo.
import type { TareaTaller } from '../lib/bridge'
import { explicarError } from './vista'

export type AvisoTaller = { tipo: 'lista' | 'permiso' | 'error'; id: string; texto: string; detalle?: string }

export function avisosDe(antes: TareaTaller | undefined, ahora: TareaTaller): AvisoTaller[] {
  if (!antes || antes.estado === ahora.estado && (antes.permiso?.titulo ?? null) === (ahora.permiso?.titulo ?? null)) return []
  const quien = ahora.motorNombre, que = `«${ahora.titulo}»`
  if (ahora.estado === 'esperando' && ahora.permiso && antes.estado !== 'esperando')
    return [{ tipo: 'permiso', id: ahora.id, texto: `${quien} te pide permiso`, detalle: ahora.permiso.titulo || undefined }]
  if (ahora.estado === 'lista' && antes.estado !== 'lista') {
    const c = ahora.cambios
    const detalle = c ? (c.ficheros ? `${c.ficheros} ${c.ficheros === 1 ? 'fichero' : 'ficheros'}, +${c.mas} −${c.menos}` : 'Sin cambios en ficheros') : undefined
    return [{ tipo: 'lista', id: ahora.id, texto: `${quien} terminó ${que}`, ...(detalle ? { detalle } : {}) }]
  }
  if (ahora.estado === 'error' && antes.estado !== 'error') {
    const x = ahora.error ? explicarError(ahora.error, quien, '') : null
    return [{ tipo: 'error', id: ahora.id, texto: `${quien} no pudo con ${que}`, detalle: x?.titulo ?? ahora.error }]
  }
  return []
}
