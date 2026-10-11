// Proceso principal: lanza el cerebro, abre la ventana y conecta chat, claves y terminales con la interfaz.
import { app, BrowserWindow, ipcMain, utilityProcess, type UtilityProcess } from 'electron'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import { agentCommand, listAgents } from './agents'
import { BrainProcess, type BrainInfo } from './brain-process'
import { registerChat } from './chat'
import { keys } from './keys'
import { listModels, PROVIDERS, type ProviderId } from './providers'

const ROOT = resolve(process.env.DAIMON_ROOT ?? join(homedir(), 'Daimon'))
const HOME = resolve(process.env.DAIMON_HOME ?? join(ROOT, 'data', 'mente_v2'))
let win: BrowserWindow | null = null
let ptyHost: UtilityProcess | null = null

const brain = new BrainProcess(join(ROOT, '.venv', 'bin', 'daimon'), HOME, (info: BrainInfo | null) => win?.webContents.send('brain:changed', info))

function createWindow() {
  win = new BrowserWindow({
    width: 1480, height: 940, minWidth: 980, minHeight: 640, backgroundColor: '#05080a', title: 'Daimon',
    autoHideMenuBar: true,
    webPreferences: { preload: join(__dirname, '../preload/index.mjs'), contextIsolation: true, sandbox: false, nodeIntegration: false },
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
  ipcMain.handle('brain:info', () => brain.info)
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
  registerChat()
}

app.whenReady().then(async () => {
  registerIpc()
  startPtyHost()
  createWindow()
  brain.start().catch((err) => console.error('[cerebro] no arrancó:', err))
})

app.on('window-all-closed', () => { brain.stop(); ptyHost?.kill(); app.quit() })
