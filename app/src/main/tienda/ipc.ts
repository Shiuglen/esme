// La Tienda en la app: el catálogo remoto (firmado) se descarga desde el proceso principal —la ventana no puede salir a
// internet— y se guarda una copia para usarla sin conexión. Si no hay catálogo remoto, la Tienda enseña lo de casa.
import { app, ipcMain } from 'electron'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { CLAVES_TIENDA } from '../claves'
import { verificarCatalogo, type Producto } from './catalogo'

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

export function registerTienda() { ipcMain.handle('tienda:catalogo', () => catalogo()) }
