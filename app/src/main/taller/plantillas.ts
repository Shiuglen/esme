// Tus plantillas, sin fin: el patrón es el de los oficios (roles.json). Las de casa viven en plantillas-casa.ts; si
// pones un `plantillas.json` en la carpeta del Taller, las tuyas se suman a las de casa, y si repites un id mandan tus
// palabras. Se crean y se borran también desde la app (guardaPlantilla/borraPlantilla), y el Sueño deja ahí lo que repites.
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { PLANTILLAS_CASA, slug, type Plantilla } from './plantillas-casa'

export { categorias, PLANTILLAS_CASA, slug } from './plantillas-casa'
export type { Plantilla } from './plantillas-casa'

export type NuevaPlantilla = { id?: string; titulo: string; categoria: string; icono?: string; descripcion: string; encargo: string; pasos?: string[]; oficios?: string[] }
type Cruda = Omit<Plantilla, 'fuente'>

const valida = (x: unknown): x is Cruda =>
  !!x && typeof x === 'object' && ['id', 'titulo', 'categoria', 'icono', 'descripcion', 'encargo'].every((k) => typeof (x as Record<string, unknown>)[k] === 'string' && ((x as Record<string, string>)[k]).trim().length > 0)

const fichero = (dir: string) => join(dir, 'plantillas.json')

/** Las plantillas que escribiste tú (lo que hay en plantillas.json), sin las de casa. */
function leeCrudas(dir: string): Cruda[] {
  try {
    const crudo: unknown = JSON.parse(readFileSync(fichero(dir), 'utf8'))
    return Array.isArray(crudo) ? crudo.filter(valida) : []
  } catch { return [] }
}

function escribe(dir: string, tuyas: Cruda[]): void {
  mkdirSync(dir, { recursive: true })
  writeFileSync(`${fichero(dir)}.tmp`, `${JSON.stringify(tuyas, null, 1)}\n`)
  renameSync(`${fichero(dir)}.tmp`, fichero(dir))
}

/** Las plantillas de este Taller: las de casa, más las tuyas de `plantillas.json` (si repites un id, mandan las tuyas). */
export function leePlantillas(dir: string): Plantilla[] {
  const tuyas: Plantilla[] = leeCrudas(dir).map((p) => ({ ...p, fuente: 'tuya' as const }))
  const idsTuyos = new Set(tuyas.map((p) => p.id))
  return [...PLANTILLAS_CASA.filter((p) => !idsTuyos.has(p.id)), ...tuyas]
}

/** Guarda una plantilla tuya (crea o pisa por id, también sobre una de casa). El id sale del título si no lo das. */
export function guardaPlantilla(dir: string, p: NuevaPlantilla): { ok: true; id: string } | { ok: false; error: string } {
  const id = slug(p.id?.trim() ? p.id : p.titulo)
  if (!/^[a-z][a-z0-9-]+$/.test(id)) return { ok: false, error: 'El título no da un nombre válido (hace falta algo con letras).' }
  if (!p.titulo.trim()) return { ok: false, error: 'Falta el título.' }
  if (!p.categoria.trim()) return { ok: false, error: 'Falta la categoría.' }
  if (!p.descripcion.trim()) return { ok: false, error: 'Falta la descripción.' }
  if (p.encargo.trim().length < 10) return { ok: false, error: 'El encargo es demasiado corto: describe qué hacer con detalle.' }
  const pasos = p.pasos?.map((x) => x.trim()).filter(Boolean)
  const oficios = p.oficios?.map((x) => x.trim()).filter(Boolean)
  const nueva: Cruda = {
    id, titulo: p.titulo.trim(), categoria: p.categoria.trim(), icono: p.icono?.trim() || 'Sparkles',
    descripcion: p.descripcion.trim(), encargo: p.encargo.trim(),
    ...(pasos?.length ? { pasos } : {}), ...(oficios?.length ? { oficios } : {}),
  }
  escribe(dir, [...leeCrudas(dir).filter((x) => x.id !== id), nueva])
  return { ok: true, id }
}

/** Borra una plantilla tuya. Las de casa no se tocan (si quieres cambiar una, guárdala con su id y la pisas). */
export function borraPlantilla(dir: string, id: string): { ok: true } | { ok: false; error: string } {
  const crudas = leeCrudas(dir)
  if (!crudas.some((x) => x.id === id)) return { ok: false, error: 'Esa plantilla no es tuya: las de casa no se borran.' }
  escribe(dir, crudas.filter((x) => x.id !== id))
  return { ok: true }
}

