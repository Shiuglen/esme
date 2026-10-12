// Canales IPC del Taller: motores detectados, tareas, permisos, diff y eventos en vivo hacia las ventanas.
import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import { access, constants } from 'node:fs/promises'
import { join } from 'node:path'
import { detectarMotores, type Cumplimiento } from './motores/acp-motores'
import { crearWhich, extsPlataforma } from './motores/which'
import { Taller, type MotorElegido } from './taller/taller'

export type MotorTaller = { id: string; nombre: string; instalado: boolean; cumplimiento: Cumplimiento; login: string; nota: string }

const ID = /^[a-z0-9]{6,16}$/
const MAX_TEXTO = 20_000
let taller: Taller | null = null

const emitir = (canal: string, dato: unknown) => { for (const w of BrowserWindow.getAllWindows()) if (!w.isDestroyed()) w.webContents.send(canal, dato) }
const mensaje = (e: unknown) => (e instanceof Error ? e.message : String(e))
const idValido = (v: unknown): v is string => typeof v === 'string' && ID.test(v)
const textoValido = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0 && v.length <= MAX_TEXTO

function detectar() {
  const existe = (r: string) => access(r, constants.X_OK).then(() => true, () => false)
  return detectarMotores(crearWhich(process.env.PATH, existe, { exts: extsPlataforma(process.platform, process.env.PATHEXT) }))
}

async function motoresTaller(): Promise<MotorTaller[]> {
  const todos = await detectar()
  return todos.map((m) => ({ id: m.id, nombre: m.nombre, instalado: m.instalado, cumplimiento: m.cumplimiento, login: m.login, nota: m.nota }))
    .sort((a, b) => Number(b.instalado) - Number(a.instalado))
}

async function elegirMotor(id: unknown): Promise<MotorElegido | { error: string }> {
  if (typeof id !== 'string') return { error: 'Motor no válido.' }
  const m = (await detectar()).find((x) => x.id === id)
  if (!m) return { error: 'Motor no válido.' }
  if (!m.instalado || !m.ruta) return { error: `«${m.nombre}» no está instalado en este equipo.` }
  return { id: m.id, nombre: m.nombre, comando: m.ruta, args: m.args }
}

export function registerTaller(o: { brainInfo: () => { url: string; token: string } | null }) {
  const t = new Taller({
    dir: join(app.getPath('userData'), 'taller'),
    emitir: (canal, dato) => emitir(`taller:${canal}`, dato),
    mcp: () => { const i = o.brainInfo(); return i ? { nombre: 'esme', url: `${i.url}/mcp`, token: i.token } : null },
    resolverMotor: async (id) => { const m = await elegirMotor(id); return 'error' in m ? null : m },
  })
  taller = t
  void t.cargar().catch((e) => console.error('[taller] no cargó:', mensaje(e)))

  const accion = async (f: () => Promise<unknown> | unknown) => {
    try { await f(); return { ok: true } } catch (e) { return { ok: false, error: mensaje(e) } }
  }
  const entrada = { ok: false, error: 'Datos no válidos.' }

  ipcMain.handle('taller:motores', () => motoresTaller())
  ipcMain.handle('taller:lista', () => t.lista())
  ipcMain.handle('taller:eventos', async (_e, id: unknown) => (idValido(id) ? t.eventos(id).catch(() => []) : []))
  ipcMain.handle('taller:crear', async (_e, p: { motor?: unknown; carpeta?: unknown; texto?: unknown } | null) => {
    if (!p || !textoValido(p.texto) || !(p.carpeta === null || (typeof p.carpeta === 'string' && p.carpeta.length > 0))) return entrada
    const motor = await elegirMotor(p.motor)
    if ('error' in motor) return { ok: false, error: motor.error }
    try { return { ok: true, tarea: t.crear({ motor, carpeta: p.carpeta, texto: p.texto }) } } catch (e) { return { ok: false, error: mensaje(e) } }
  })
  ipcMain.handle('taller:seguir', (_e, id: unknown, texto: unknown) => (idValido(id) && textoValido(texto) ? accion(() => t.seguir(id, texto)) : entrada))
  ipcMain.handle('taller:parar', (_e, id: unknown) => (idValido(id) ? accion(() => t.parar(id)) : entrada))
  ipcMain.handle('taller:descartar', (_e, id: unknown) => (idValido(id) ? accion(() => t.descartar(id)) : entrada))
  ipcMain.handle('taller:responder', (_e, id: unknown, opcion: unknown) => {
    if (!idValido(id) || typeof opcion !== 'string' || opcion.length === 0 || opcion.length > 200) return entrada
    t.responder(id, opcion)
    return { ok: true }
  })
  ipcMain.handle('taller:diff', async (_e, id: unknown) => {
    if (!idValido(id)) return { texto: '', truncado: false }
    try { return await t.diff(id) } catch { return { texto: '', truncado: false } }
  })
  ipcMain.handle('taller:carpeta', async () => {
    const r = await dialog.showOpenDialog({ properties: ['openDirectory'] })
    return r.canceled || !r.filePaths[0] ? null : r.filePaths[0]
  })
  ipcMain.handle('taller:abrir', async (_e, id: unknown) => {
    if (!idValido(id)) return entrada
    const copia = t.lista().find((x) => x.id === id)?.copia
    if (!copia) return { ok: false, error: 'La tarea no tiene copia.' }
    const fallo = await shell.openPath(copia.ruta)
    return fallo ? { ok: false, error: fallo } : { ok: true }
  })
}

export function cerrar() { taller?.cerrarTodo() }
