// El plan en la app: el código se guarda en la carpeta de datos de Esme (solo legible por ti) y se comprueba al leerlo.
import { app, ipcMain } from 'electron'
import { readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { CLAVE_LICENCIA } from '../claves'
import { estadoDe, leerLicencia, type EstadoPlan } from './licencia'

const fichero = () => join(app.getPath('userData'), 'licencia.txt')
const guardado = () => { try { return readFileSync(fichero(), 'utf8').trim() || null } catch { return null } }
export const estadoPlan = (): EstadoPlan => estadoDe(guardado(), CLAVE_LICENCIA)

export function registerLicencia() {
  ipcMain.handle('licencia:estado', () => estadoPlan())
  ipcMain.handle('licencia:activar', (_e, codigo: string) => {
    const r = leerLicencia(String(codigo ?? ''), CLAVE_LICENCIA)
    if (!r.ok) return { ok: false, motivo: r.motivo, estado: estadoPlan() }
    writeFileSync(fichero(), String(codigo).replace(/\s+/g, ''), { mode: 0o600 })
    return { ok: true, estado: estadoPlan() }
  })
  ipcMain.handle('licencia:quitar', () => { rmSync(fichero(), { force: true }); return estadoPlan() })
}
