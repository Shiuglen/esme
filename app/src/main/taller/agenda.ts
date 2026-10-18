// La agenda del Taller: encargos que tu equipo de agentes hace solo, a una hora («esta noche a las 3») o cada día («a las
// 7, de lunes a viernes»). Cada minuto se mira qué toca y se lanza como una tarea normal (con su copia aislada y sus
// permisos). Si el equipo estuvo apagado, lo atrasado se lanza una vez al volver, no una por cada vez perdida.
import { randomBytes } from 'node:crypto'
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

export type Cuando = { tipo: 'una'; ms: number } | { tipo: 'diaria'; hora: number; minuto: number; dias?: number[] }
export type Programado = { id: string; motor: string; carpeta: string | null; texto: string; cuando: Cuando; activo: boolean; creado: number; ultima?: number }
export type NuevoProgramado = Pick<Programado, 'motor' | 'carpeta' | 'texto' | 'cuando'>

export const nuevoIdProgramado = () => `p-${randomBytes(4).toString('hex')}`

// la primera vez que toca estrictamente después de «desde» (para una diaria) o su hora fija (para una de una vez)
function siguienteTras(p: Programado, desde: number): number | null {
  const c = p.cuando
  if (c.tipo === 'una') return p.ultima === undefined ? c.ms : null
  const d = new Date(desde)
  for (let i = 0; i <= 8; i++) {
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate() + i, c.hora, c.minuto)
    if (x.getTime() > desde && (!c.dias?.length || c.dias.includes(x.getDay()))) return x.getTime()
  }
  return null
}

/** Cuándo se lanzará la próxima vez (para mostrarlo); null si ya no toca más o está en pausa. */
export function proximaVez(p: Programado, ahora: number): number | null {
  if (!p.activo) return null
  return siguienteTras(p, p.cuando.tipo === 'una' ? ahora : Math.max(ahora, p.ultima ?? 0))
}

/** Los encargos que vencieron desde la última vez que se lanzaron (o desde que se crearon). */
export function tocan(lista: Programado[], ahora: number): Programado[] {
  return lista.filter((p) => { if (!p.activo) return false; const s = siguienteTras(p, p.ultima ?? p.creado); return s !== null && s <= ahora })
}

const entero = (v: unknown, min: number, max: number): v is number => Number.isInteger(v) && (v as number) >= min && (v as number) <= max
export function validarProgramado(v: unknown): { ok: true; valor: NuevoProgramado } | { ok: false; motivo: string } {
  const x = v as Partial<NuevoProgramado> | null
  if (!x || typeof x !== 'object') return { ok: false, motivo: 'Datos no válidos.' }
  if (typeof x.motor !== 'string' || !/^[a-z0-9._@/-]{1,80}$/i.test(x.motor)) return { ok: false, motivo: 'Elige un agente.' }
  if (!(x.carpeta === null || (typeof x.carpeta === 'string' && x.carpeta.length > 0 && x.carpeta.length < 4096))) return { ok: false, motivo: 'La carpeta no es válida.' }
  if (typeof x.texto !== 'string' || !x.texto.trim() || x.texto.length > 20_000) return { ok: false, motivo: 'Escribe qué tiene que hacer.' }
  const c = x.cuando as Partial<Cuando & { dias: unknown }> | undefined
  if (c?.tipo === 'una' && typeof (c as { ms?: unknown }).ms === 'number' && Number.isFinite((c as { ms: number }).ms)) return { ok: true, valor: { motor: x.motor, carpeta: x.carpeta, texto: x.texto, cuando: { tipo: 'una', ms: (c as { ms: number }).ms } } }
  if (c?.tipo === 'diaria') {
    const { hora, minuto, dias } = c as { hora: unknown; minuto: unknown; dias?: unknown }
    if (!entero(hora, 0, 23) || !entero(minuto, 0, 59)) return { ok: false, motivo: 'Esa hora no existe.' }
    if (dias !== undefined && !(Array.isArray(dias) && dias.length <= 7 && dias.every((d) => entero(d, 0, 6)))) return { ok: false, motivo: 'Esos días no existen.' }
    return { ok: true, valor: { motor: x.motor, carpeta: x.carpeta, texto: x.texto, cuando: { tipo: 'diaria', hora, minuto, ...(Array.isArray(dias) && dias.length ? { dias: [...new Set(dias as number[])].sort() } : {}) } } }
  }
  return { ok: false, motivo: 'Elige cuándo.' }
}

export function leerAgenda(fichero: string): Programado[] {
  try { const l = JSON.parse(readFileSync(fichero, 'utf8')); return Array.isArray(l) ? l : [] } catch { return [] }
}

// se escribe a un temporal y se renombra: un cierre a medias no deja la agenda rota
export function guardarAgenda(fichero: string, lista: Programado[]): void {
  mkdirSync(dirname(fichero), { recursive: true })
  writeFileSync(`${fichero}.tmp`, JSON.stringify(lista), { mode: 0o600 })
  renameSync(`${fichero}.tmp`, fichero)
}

