// Las conversaciones de Esme, guardadas en disco (una por fichero JSON en la carpeta de datos de la app) para que nada de
// lo hablado se pierda al cerrar o recargar. El id es el nombre del fichero: se valida estrictamente para que nadie pueda
// escribir ni leer fuera de su carpeta. Se escribe a un temporal y se renombra: un cierre a medias no deja un hilo roto.
import { randomBytes } from 'node:crypto'
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

export type TurnoHilo = { role: 'user' | 'assistant'; content: string; who?: string; ids?: string[]; query?: string; abstained?: boolean; tokens?: number; error?: boolean; judged?: boolean; pensamiento?: string
  pasos?: { id: string; nombre: string; estado: 'pide' | 'haciendo' | 'hecho' | 'error'; args?: unknown; resumen?: string; error?: string }[] }
export type Hilo = { id: string; titulo: string; creado: number; actualizado: number; motor: string; modelo: string; turnos: TurnoHilo[] }
export type ResumenHilo = { id: string; titulo: string; actualizado: number; mensajes: number }

const ID = /^[a-z0-9-]{6,40}$/
const ruta = (dir: string, id: string) => { if (!ID.test(id)) throw new Error('id de conversación no válido'); return join(dir, `${id}.json`) }
export const nuevoId = () => `c-${Date.now().toString(36)}-${randomBytes(3).toString('hex')}`

export function tituloDe(turnos: Pick<TurnoHilo, 'role' | 'content'>[], max = 55): string {
  const t = turnos.find((x) => x.role === 'user')?.content.replace(/\s+/g, ' ').trim()
  if (!t) return 'Conversación nueva'
  if (t.length <= max) return t
  let r = ''
  for (const w of t.split(' ')) { if ((r ? r.length + 1 : 0) + w.length > max) break; r = r ? `${r} ${w}` : w }
  return `${(r || t.slice(0, max)).replace(/[,.;:]$/, '')}…`
}

export function guardarHilo(dir: string, h: Hilo): void {
  const f = ruta(dir, h.id)
  mkdirSync(dir, { recursive: true })
  writeFileSync(`${f}.tmp`, JSON.stringify(h), { mode: 0o600 })
  renameSync(`${f}.tmp`, f)
}

export function leerHilo(dir: string, id: string): Hilo | null {
  try { return JSON.parse(readFileSync(ruta(dir, id), 'utf8')) as Hilo } catch { return null }
}

export function borrarHilo(dir: string, id: string): void { rmSync(ruta(dir, id), { force: true }) }

const todos = (dir: string): Hilo[] => {
  if (!existsSync(dir)) return []
  return readdirSync(dir).filter((f) => f.endsWith('.json')).flatMap((f) => { const h = leerHilo(dir, f.slice(0, -5)); return h ? [h] : [] })
}

export function listarHilos(dir: string): ResumenHilo[] {
  return todos(dir).sort((a, b) => b.actualizado - a.actualizado).map((h) => ({ id: h.id, titulo: h.titulo, actualizado: h.actualizado, mensajes: h.turnos.length }))
}

/** Busca en lo hablado (sin distinguir mayúsculas ni tildes) y devuelve un trozo alrededor de lo encontrado. */
export function buscarHilos(dir: string, q: string): (ResumenHilo & { trozo: string })[] {
  const norm = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
  const n = norm(q.trim())
  if (!n) return []
  return todos(dir).sort((a, b) => b.actualizado - a.actualizado).flatMap((h) => {
    for (const t of [{ content: h.titulo }, ...h.turnos]) {
      const i = norm(t.content).indexOf(n)
      if (i >= 0) return [{ id: h.id, titulo: h.titulo, actualizado: h.actualizado, mensajes: h.turnos.length, trozo: t.content.slice(Math.max(0, i - 40), i + n.length + 60).replace(/\s+/g, ' ') }]
    }
    return []
  })
}
