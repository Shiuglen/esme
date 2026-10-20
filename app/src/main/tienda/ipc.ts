// La Tienda en la app: el catálogo remoto (firmado) se descarga desde el proceso principal —la ventana no puede salir a
// internet— y se guarda una copia para usarla sin conexión. Si no hay catálogo remoto, la Tienda enseña lo de casa.
import { app, ipcMain } from 'electron'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { CLAVES_TIENDA } from '../claves'
import type { BrainInfo } from '../brain-process'
import { ClienteCerebro } from '../mente/cliente'
import { verificarCatalogo, type Producto } from './catalogo'
import { deseosDe, type Deseo } from './deseos'

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

export function registerTienda(o: { brainInfo: () => BrainInfo | null } = { brainInfo: () => null }) {
  ipcMain.handle('tienda:catalogo', () => catalogo())
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
