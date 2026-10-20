// La colección de pieles: el fichero, el IPC y las reglas.
import { ipcMain } from 'electron'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { app } from 'electron'
import { idDe, MAX_PIELES, parseaColeccion, serializaColeccion, type OrigenPiel, type PielPropia } from './datos'

const ruta = () => join(app.getPath('userData'), 'pieles.json')

export const leerPieles = (): PielPropia[] => {
  try { return parseaColeccion(readFileSync(ruta(), 'utf8')) } catch { return [] }
}

export const escribirPieles = (pieles: PielPropia[]) => {
  const r = ruta()
  mkdirSync(dirname(r), { recursive: true })
  writeFileSync(r, serializaColeccion(pieles))
}

/** Guarda una piel propia. Si ya hay una con el mismo id, la sustituye (no duplica). */
export function guardarPiel(piel: Record<string, unknown>, o: { nombre: string; origen?: OrigenPiel; ahora?: number }): { ok: true; piel: PielPropia } | { ok: false; error: string } {
  const nombre = String(o.nombre ?? '').trim().slice(0, 60) || 'Piel sin nombre'
  const creada = o.ahora ?? Date.now()
  const lista = leerPieles()
  const id = idDe(nombre, creada)
  const entrada: PielPropia = { id, nombre, creada, origen: o.origen ?? { tipo: 'propia' }, piel }
  const resto = lista.filter((p) => p.id !== id)
  if (resto.length >= MAX_PIELES) return { ok: false, error: `ya tienes ${MAX_PIELES} pieles: borra alguna antes de guardar otra` }
  escribirPieles([...resto, entrada])
  return { ok: true, piel: entrada }
}

export function borrarPiel(id: string): { ok: boolean; error?: string } {
  const lista = leerPieles()
  const resto = lista.filter((p) => p.id !== id)
  if (resto.length === lista.length) return { ok: false, error: 'esa piel no estaba' }
  escribirPieles(resto)
  return { ok: true }
}

export function registerPieles() {
  ipcMain.handle('pieles:listar', () => leerPieles())
  ipcMain.handle('pieles:guardar', (_e, piel: unknown, o: unknown) => {
    if (!piel || typeof piel !== 'object') return { ok: false, error: 'eso no es una piel' }
    const meta = (o ?? {}) as { nombre?: string; origen?: OrigenPiel }
    return guardarPiel(piel as Record<string, unknown>, { nombre: String(meta.nombre ?? ''), origen: meta.origen })
  })
  ipcMain.handle('pieles:borrar', (_e, id: unknown) => borrarPiel(String(id ?? '')))
}
