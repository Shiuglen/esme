// Proceso principal: lanza el cerebro, abre la ventana y conecta chat, claves y terminales con la interfaz.
import { app, BrowserWindow, ipcMain, shell, utilityProcess, type UtilityProcess } from 'electron'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import { agentCommand, listAgents } from './agents'
import { BrainProcess, type BrainInfo } from './brain-process'
import { registerChat } from './chat'
import { cerrar as cerrarTaller, registerTaller } from './ipc-taller'
import { registerProveedores } from './ipc-proveedores'
import { keys } from './keys'
import { registerLicencia } from './licencia/ipc'
import { registerHilos } from './hilos/ipc'
import { registerTienda } from './tienda/ipc'
import { listModels, PROVIDERS, type ProviderId } from './providers'

const ROOT = resolve(process.env.DAIMON_ROOT ?? join(homedir(), 'Daimon'))
const HOME = resolve(process.env.DAIMON_HOME ?? join(ROOT, 'data', 'mente_v2'))
let win: BrowserWindow | null = null
let ptyHost: UtilityProcess | null = null

const brain = new BrainProcess(join(ROOT, '.venv', 'bin', 'daimon'), HOME, (info: BrainInfo | null) => win?.webContents.send('brain:changed', info))

const MAC = process.platform === 'darwin'
// Una sola Esme: si ya está abierta (por ejemplo, al pulsar otra vez el icono del escritorio), la abierta se trae al frente
// y la nueva se va. Dos Esmes pelearían por la misma mente (el cerebro rechaza a la segunda).
const UNICA = app.requestSingleInstanceLock()
if (!UNICA) app.quit()
app.on('second-instance', () => { if (!win) return; if (win.isMinimized()) win.restore(); win.show(); win.focus() })
const ALTO_BARRA = 48

// Sin barra del sistema: la barra superior de esme hace de barra de la ventana. En macOS quedan los semáforos;
// en Windows y Linux, los botones del sistema se superponen a la derecha y la interfaz les pone el color del tema.
function createWindow() {
  win = new BrowserWindow({
    width: 1480, height: 940, minWidth: 980, minHeight: 640, backgroundColor: '#07080b', title: 'esme', show: false,
    autoHideMenuBar: true, titleBarStyle: 'hidden', icon: join(__dirname, '../../resources/esme.png'),
    ...(MAC ? { trafficLightPosition: { x: 18, y: 16 } } : { titleBarOverlay: { color: '#0e1015', symbolColor: '#a3a9b4', height: ALTO_BARRA } }),
    webPreferences: { preload: join(__dirname, '../preload/index.mjs'), contextIsolation: true, sandbox: false, nodeIntegration: false },
  })
  win.once('ready-to-show', () => win?.show())
  // Ni ventanas nuevas ni navegar fuera de la app: los enlaces web (por ejemplo, los que escribe una IA) se abren en tu navegador.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) void shell.openExternal(url)
    return { action: 'deny' }
  })
  win.webContents.on('will-navigate', (e, url) => {
    const propia = process.env.ELECTRON_RENDERER_URL ? url.startsWith(process.env.ELECTRON_RENDERER_URL) : url.startsWith('file://')
    if (propia) return
    e.preventDefault()
    if (/^https?:\/\//i.test(url)) void shell.openExternal(url)
  })
  if (process.env.ELECTRON_RENDERER_URL) void win.loadURL(process.env.ELECTRON_RENDERER_URL)
  else void win.loadFile(join(__dirname, '../renderer/index.html'))
}

function startPtyHost() {
  ptyHost = utilityProcess.fork(join(__dirname, 'pty-host.js'))
  ptyHost.on('message', (m: { type: string; id: string; data?: string; code?: number }) => {
    if (m.type === 'data') win?.webContents.send(`pty:data:${m.id}`, m.data)
    else if (m.type === 'exit') win?.webContents.send(`pty:exit:${m.id}`, m.code)
  })
}

function registerIpc() {
  registerLicencia()
  registerHilos()
  registerTienda()
  ipcMain.handle('brain:info', () => brain.info)
  ipcMain.on('ventana:colores', (_e, c: { fondo: string; simbolos: string }) => {
    // un color impuro (mezcla cruda, variable, vacío) no puede tumbar el proceso: se suelta y se cuenta
    try {
      if (!MAC && win && !win.isDestroyed()) win.setTitleBarOverlay({ color: c.fondo, symbolColor: c.simbolos, height: ALTO_BARRA })
    } catch (e) {
      console.error('[ventana] la barra no aceptó colores:', JSON.stringify(c))
    }
  })
  ipcMain.handle('providers:list', () => PROVIDERS.map((p) => ({ ...p, hasKey: !p.needsKey || keys.has(p.id) })))
  ipcMain.handle('models:list', async (_e, id: ProviderId) => {
    try { return { ok: true, models: await listModels(id, (k) => keys.get(k)) } }
    catch (err) { return { ok: false, error: err instanceof Error ? err.message : String(err) } }
  })
  ipcMain.handle('keys:status', () => ({ secure: keys.secure(), backend: keys.backend() }))
  ipcMain.handle('keys:set', (_e, id: ProviderId, value: string) => { keys.set(id, value); return { ok: true } })
  ipcMain.handle('keys:remove', (_e, id: ProviderId) => { keys.remove(id); return { ok: true } })
  ipcMain.handle('agents:list', () => listAgents())
  ipcMain.handle('pty:spawn', (_e, p: { id: string; agent: string; cwd?: string; cols: number; rows: number }) => {
    const { cmd, args, env } = agentCommand(p.agent, brain.info)
    ptyHost?.postMessage({ type: 'spawn', id: p.id, cmd, args, env, cwd: p.cwd ?? ROOT, cols: p.cols, rows: p.rows })
    return { ok: true }
  })
  ipcMain.on('pty:write', (_e, id: string, data: string) => ptyHost?.postMessage({ type: 'write', id, data }))
  ipcMain.on('pty:resize', (_e, id: string, cols: number, rows: number) => ptyHost?.postMessage({ type: 'resize', id, cols, rows }))
  ipcMain.on('pty:kill', (_e, id: string) => ptyHost?.postMessage({ type: 'kill', id }))
  registerProveedores()
  registerChat()
  registerTaller({ brainInfo: () => brain.info })
}

app.whenReady().then(async () => {
  if (!UNICA) return
  registerIpc()
  startPtyHost()
  createWindow()
  brain.start().catch((err) => console.error('[cerebro] no arrancó:', err))
})

app.on('window-all-closed', () => { cerrarTaller(); brain.stop(); ptyHost?.kill(); app.quit() })
