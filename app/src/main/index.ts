// Proceso principal: lanza el cerebro, abre la ventana y conecta chat, claves y terminales con la interfaz.
import { app, BrowserWindow, ipcMain, Menu, nativeImage, Notification, shell, Tray, utilityProcess, type UtilityProcess } from 'electron'
import { homedir } from 'node:os'
import { randomBytes } from 'node:crypto'
import { join } from 'node:path'
import { agentCommand, listAgents } from './agents'
import { BrainProcess, type BrainInfo } from './brain-process'
import { configMcp } from './mente/cliente'
import { registerChat } from './chat'
import { registerMente } from './mente/ipc'
import { alLanzar, aprenderEquipo, cerrar as cerrarTaller, pendienteTaller, registerTaller, agentesParaConversar } from './ipc-taller'
import { alCerrarVentana, guardarPreferencia, leerPreferencia, resumenBandeja, type PreferenciaCierre } from './segundo-plano'
import { registerProveedores } from './ipc-proveedores'
import { keys } from './keys'
import { registerLicencia } from './licencia/ipc'
import { registerHilos } from './hilos/ipc'
import { registerTienda } from './tienda/ipc'
import { registerPieles } from './pieles/propias'
import { cerrarHerramientas, registerHerramientas } from './herramientas/ipc'
import { registerForja } from './forja-ipc'
import { registrarLanzador } from './lanzador/ventana'
import { encargarDesdeChat } from './ipc-taller'
import { AGENTES, conectar as conectarMente, desconectar as desconectarMente, estados as estadosMente } from './mente/compartir'
import { listModels, PROVIDERS, type ProviderId } from './providers'
import { cerebrosDeAgentes, esAgente } from './router/cerebro'
import { rutasDe } from './rutas'
import { prepararPath } from './motores/path-login'
import { registerSkills } from './skills/ipc'

const RUTAS = rutasDe({ empaquetada: app.isPackaged, plataforma: process.platform, home: homedir(), userData: app.getPath('userData'), resources: process.resourcesPath, env: process.env })
let win: BrowserWindow | null = null
let ptyHost: UtilityProcess | null = null
let bandeja: Tray | null = null
let lanzador: ReturnType<typeof registrarLanzador> | null = null
let saliendo = false
let avisadoSegundoPlano = false
const ficheroAjustes = () => join(app.getPath('userData'), 'ajustes.json')
const ICONO = join(__dirname, '../../resources/esme.png')

// tu mente siempre en el mismo sitio (127.0.0.1:47321) y con su token fijo en el llavero: así tus otras IAs la encuentran
const MENTE_PUERTO = 47321
const tokenMente = () => { let t = keys.get('mente'); if (!t) { t = randomBytes(32).toString('hex'); keys.set('mente', t) } return t }
const brain = new BrainProcess({ python: RUTAS.python, extraPython: RUTAS.extraPython, puerto: MENTE_PUERTO, token: tokenMente }, RUTAS.mente, (info: BrainInfo | null) => {
  win?.webContents.send('brain:changed', { url: brain.info?.url ?? null, estado: brain.estado })
  // La mente despierta: es cuando puede aprender del equipo (qué motor acierta contigo y qué se rompe).
  if (info) void aprenderEquipo().catch(() => {})
})

const MAC = process.platform === 'darwin'
// Una sola Esme: si ya está abierta (por ejemplo, al pulsar otra vez el icono del escritorio), la abierta se trae al frente
// y la nueva se va. Dos Esmes pelearían por la misma mente (el cerebro rechaza a la segunda).
const UNICA = app.requestSingleInstanceLock()
if (!UNICA) app.quit()
app.on('second-instance', () => mostrar())
app.on('before-quit', () => { saliendo = true })
const avisar = (title: string, body: string) => { if (Notification.isSupported()) new Notification({ title, body, icon: ICONO }).show() }

function mostrar() {
  if (!win || win.isDestroyed()) { createWindow(); return }
  if (win.isMinimized()) win.restore()
  win.show(); win.focus()
}

// El icono junto al reloj: dice qué hace tu equipo y deja volver a la ventana o salir del todo.
function crearBandeja() {
  if (bandeja) return
  bandeja = new Tray(nativeImage.createFromPath(ICONO).resize({ width: 22, height: 22 }))
  const pintar = () => {
    if (!bandeja || bandeja.isDestroyed()) return
    const r = resumenBandeja(pendienteTaller())
    bandeja.setToolTip(r)
    bandeja.setContextMenu(Menu.buildFromTemplate([
      { label: r, enabled: false }, { type: 'separator' },
      { label: 'Abrir Esme', click: mostrar },
      { label: 'Salir del todo', click: () => { saliendo = true; app.quit() } },
    ]))
  }
  pintar()
  setInterval(pintar, 30_000).unref()
  bandeja.on('click', mostrar)
}
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
  // Cerrar la ventana no apaga a tu equipo: si hay encargos programados o agentes trabajando, Esme se queda junto al reloj.
  win.on('close', (e) => {
    if (saliendo) return
    const pendiente = pendienteTaller()
    if (alCerrarVentana({ preferencia: leerPreferencia(ficheroAjustes()), ...pendiente }) === 'salir') return
    e.preventDefault()
    win?.hide()
    crearBandeja()
    if (!avisadoSegundoPlano) { avisadoSegundoPlano = true; avisar('Esme sigue aquí, junto al reloj', `${resumenBandeja(pendiente)}. Para cerrarla del todo: icono → Salir del todo.`) }
  })
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
  registerTienda({ brainInfo: () => brain.info })
  registerPieles()
  registerHerramientas({ python: { python: RUTAS.python, extraPython: RUTAS.extraPython } })
  registerSkills()
  registerForja()
  // tu mente para todas tus IAs: se registra en la configuración de cada agente que uses fuera de Esme
  ipcMain.handle('mente:agentes', () => estadosMente(homedir()))
  ipcMain.handle('mente:conectar', (_e, id: unknown, conectada: unknown) => {
    const a = AGENTES.find((x) => x.id === id)
    if (!a || typeof conectada !== 'boolean') return { ok: false, error: 'Datos no válidos.' }
    if (conectada && !brain.info) return { ok: false, error: 'Tu mente aún no está despierta: espera unos segundos.' }
    try { if (conectada) conectarMente(a, homedir(), configMcp(brain.info!).url, tokenMente()); else desconectarMente(a, homedir()); return { ok: true } }
    catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) } }
  })
  // el renderer recibe en qué está la mente, no su llave: la llave se queda en este proceso
  ipcMain.handle('brain:info', () => ({ url: brain.info?.url ?? null, estado: brain.estado }))
  ipcMain.handle('ajustes:alCerrar', () => leerPreferencia(ficheroAjustes()))
  ipcMain.handle('ajustes:ponerAlCerrar', (_e, v: unknown) => {
    if (v !== 'auto' && v !== 'siempre' && v !== 'nunca') return { ok: false, error: 'Valor no válido.' }
    guardarPreferencia(ficheroAjustes(), v as PreferenciaCierre); return { ok: true }
  })
  ipcMain.on('ventana:colores', (_e, c: { fondo: string; simbolos: string }) => {
    // un color impuro (mezcla cruda, variable, vacío) no puede tumbar el proceso: se suelta y se cuenta
    try {
      if (!MAC && win && !win.isDestroyed()) win.setTitleBarOverlay({ color: c.fondo, symbolColor: c.simbolos, height: ALTO_BARRA })
    } catch (e) {
      console.error('[ventana] la barra no aceptó colores:', JSON.stringify(c))
    }
  })
  // las IAs con clave y, detrás, tus agentes instalados (hablan por tu suscripción o tu sesión)
  ipcMain.handle('providers:list', async () => [...PROVIDERS.map((p) => ({ ...p, hasKey: !p.needsKey || keys.has(p.id) })),
    ...cerebrosDeAgentes(await agentesParaConversar().catch(() => []))])
  ipcMain.handle('models:list', async (_e, id: ProviderId | `acp:${string}`) => {
    if (esAgente(id)) return { ok: true, models: ['el de tu sesión'] }
    try { return { ok: true, models: await listModels(id, (k) => keys.get(k)) } }
    catch (err) { return { ok: false, error: err instanceof Error ? err.message : String(err) } }
  })
  ipcMain.handle('keys:status', () => ({ secure: keys.secure(), backend: keys.backend() }))
  ipcMain.handle('keys:set', (_e, id: ProviderId, value: string) => { keys.set(id, value); return { ok: true } })
  ipcMain.handle('keys:remove', (_e, id: ProviderId) => { keys.remove(id); return { ok: true } })
  ipcMain.handle('agents:list', () => listAgents())
  ipcMain.handle('pty:spawn', (_e, p: { id: string; agent: string; cwd?: string; cols: number; rows: number }) => {
    const { cmd, args, env } = agentCommand(p.agent, brain.info)
    ptyHost?.postMessage({ type: 'spawn', id: p.id, cmd, args, env, cwd: p.cwd ?? RUTAS.cwdTerminal, cols: p.cols, rows: p.rows })
    return { ok: true }
  })
  ipcMain.on('pty:write', (_e, id: string, data: string) => ptyHost?.postMessage({ type: 'write', id, data }))
  ipcMain.on('pty:resize', (_e, id: string, cols: number, rows: number) => ptyHost?.postMessage({ type: 'resize', id, cols, rows }))
  ipcMain.on('pty:kill', (_e, id: string) => ptyHost?.postMessage({ type: 'kill', id }))
  registerProveedores()
  registerChat({ brainInfo: () => brain.info })
  // la puerta de la mente: el renderer pide por IPC y el proceso principal habla con el cerebro (Python)
  registerMente({ brainInfo: () => brain.info, emitir: (evento) => win?.webContents.send('mente:evento', evento) })
  registerTaller({ brainInfo: () => brain.info })
  // lo que la agenda lanza sola se avisa fuera de la ventana si no la estás mirando
  alLanzar((p) => { if (!win?.isFocused()) avisar('Tu equipo empezó un encargo programado', p.texto.replace(/\s+/g, ' ').slice(0, 140)) })
}

// el PATH de tu shell de login, cuanto antes (los agentes y el terminal lo necesitan)
void prepararPath()
app.whenReady().then(async () => {
  if (!UNICA) return
  registerIpc()
  startPtyHost()
  createWindow()
  // el lanzador: Esme desde cualquier app con Ctrl+Mayús+Espacio
  lanzador = registrarLanzador({ preload: join(__dirname, '../preload/index.mjs'), encargar: (t) => encargarDesdeChat(t),
    abrirEsme: (x) => { mostrar(); win?.webContents.send('lanzador:ir', x) } })
  brain.start().catch((err) => console.error('[cerebro] no arrancó:', err))
})

app.on('will-quit', () => lanzador?.cerrar())
app.on('window-all-closed', () => { void cerrarHerramientas(); cerrarTaller(); brain.stop(); ptyHost?.kill(); app.quit() })
