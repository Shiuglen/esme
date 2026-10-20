// La Tienda en la app: el catálogo remoto (firmado) se descarga desde el proceso principal —la ventana no puede salir a
// internet— y se guarda una copia para usarla sin conexión. Si no hay catálogo remoto, la Tienda enseña lo de casa.
import { app, BrowserWindow, ipcMain } from 'electron'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { CLAVES_TIENDA } from '../claves'
import type { BrainInfo } from '../brain-process'
import { ClienteCerebro } from '../mente/cliente'
import { verificarCatalogo, type Producto } from './catalogo'
import { deseosDe, type Deseo } from './deseos'
import { coloresDeUrl } from './colores'
import { parseaCache, pendientes, serializaCache, type Cache } from './referencias'

export const URL_CATALOGO = 'https://raw.githubusercontent.com/Shiuglen/esme-tienda/main/catalogo.json'
const copia = () => join(app.getPath('userData'), 'tienda-catalogo.json')

export type RespuestaCatalogo = { productos: Producto[]; origen: 'red' | 'copia' | 'ninguno'; aviso?: string }

export async function catalogo(): Promise<RespuestaCatalogo> {
  try {
    const r = await fetch(URL_CATALOGO, { signal: AbortSignal.timeout(8000) })
    if (r.ok) {
      const texto = await r.text(), v = verificarCatalogo(texto, CLAVES_TIENDA)
      if (v.ok) { writeFileSync(copia(), texto); return { productos: v.productos, origen: 'red' } }
      return { productos: [], origen: 'ninguno', aviso: v.motivo }
    }
  } catch { /* sin conexión: la copia */ }
  try { const v = verificarCatalogo(readFileSync(copia(), 'utf8'), CLAVES_TIENDA); if (v.ok) return { productos: v.productos, origen: 'copia' } } catch { /* sin copia */ }
  return { productos: [], origen: 'ninguno' }
}

// La cache de paletas: un fichero en tu carpeta de datos. Las referencias que guardaste se van viendo poco a poco
// (no se descargan veinte webs de golpe) y, cuando llega una, la ventana se entera.
const rutaCache = () => join(app.getPath('userData'), 'referencias.json')
const leerCache = (): Cache => { try { return parseaCache(readFileSync(rutaCache(), 'utf8')) } catch { return { version: 1, entradas: {} } } }
const escribirCache = (c: Cache) => { try { writeFileSync(rutaCache(), serializaCache(c)) } catch { /* sin disco: en memoria */ } }

export function registerTienda(o: { brainInfo: () => BrainInfo | null } = { brainInfo: () => null }) {
  // Las paletas que ya se saben: para pintarlas sin volver a pedir nada.
  ipcMain.handle('tienda:paletas', () => leerCache().entradas)
  // Mirar lo que falta, a trozos. Cuando llega una, se avisa a las ventanas.
  ipcMain.handle('tienda:mirar', async (_e, urls: unknown) => {
    const lista = Array.isArray(urls) ? urls.map(String).filter((u) => /^https?:\/\//i.test(u)).slice(0, 20) : []
    if (!lista.length) return { ok: true, vistas: 0 }
    const cache = leerCache()
    const faltan = pendientes(cache, lista, Date.now(), 4)
    let vistas = 0
    for (const u of faltan) {
      const r = await coloresDeUrl(u)
      if (!r.ok) continue
      cache.entradas[u] = { url: u, colores: r.colores, titulo: r.titulo, vista: Date.now() }
      vistas++
      escribirCache(cache)
      for (const w of BrowserWindow.getAllWindows()) if (!w.isDestroyed()) w.webContents.send('tienda:paleta', { url: u, colores: r.colores, titulo: r.titulo })
    }
    return { ok: true, vistas }
  })
  ipcMain.handle('tienda:catalogo', () => catalogo())
  // Los colores de una referencia: de una web guardada sale una piel que te puedes poner.
  ipcMain.handle('tienda:colores', async (_e, url: unknown): Promise<{ ok: true; colores: string[]; titulo: string } | { ok: false; error: string }> => {
    const u = String(url ?? '')
    if (!/^https?:\/\//i.test(u)) return { ok: false, error: 'eso no es una dirección web' }
    return coloresDeUrl(u)
  })
  // Lo que guardaste en X: tu lista de deseos. La Tienda la cumple: cada deseo se puede buscar en el registro.
  ipcMain.handle('tienda:deseos', async (): Promise<{ ok: true; deseos: Deseo[] } | { ok: false; error: string }> => {
    const i = o.brainInfo()
    if (!i) return { ok: false, error: 'Tu mente está apagada: no puedo leer lo que guardaste.' }
    try {
      const rs = await new ClienteCerebro(i).recuerdosDeFuente('x:bookmarks', 80)
      return { ok: true, deseos: deseosDe(rs.map((r) => String(r.text ?? ''))) }
    } catch (e) { return { ok: false, error: e instanceof Error ? e.message : 'no pude leer lo que guardaste' } }
  })
}
