// Las conversaciones en la app: viven en la carpeta de datos de Esme (userData/conversaciones).
import { app, ipcMain } from 'electron'
import { join } from 'node:path'
import { borrarHilo, buscarHilos, guardarHilo, leerHilo, listarHilos, nuevoId, type Hilo } from './hilos'

const dir = () => join(app.getPath('userData'), 'conversaciones')
export function registerHilos() {
  ipcMain.handle('hilos:lista', () => listarHilos(dir()))
  ipcMain.handle('hilos:leer', (_e, id: string) => leerHilo(dir(), String(id)))
  ipcMain.handle('hilos:guardar', (_e, h: Hilo) => { guardarHilo(dir(), h); return true })
  ipcMain.handle('hilos:borrar', (_e, id: string) => { borrarHilo(dir(), String(id)); return true })
  ipcMain.handle('hilos:buscar', (_e, q: string) => buscarHilos(dir(), String(q ?? '')))
  ipcMain.handle('hilos:nuevoId', () => nuevoId())
}
