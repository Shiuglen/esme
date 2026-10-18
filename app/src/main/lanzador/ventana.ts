// La ventana del lanzador: sin marco, siempre encima y ligera (su propia página, no la app entera). Aparece en la
// pantalla donde está el ratón con Ctrl+Mayús+Espacio y se esconde al perder el foco o con Esc.
import { BrowserWindow, globalShortcut, ipcMain, screen } from 'electron'
import { join } from 'node:path'
import { posicionLanzador } from './posicion'

export const ATAJO_LANZADOR = 'CommandOrControl+Shift+Space'

export function registrarLanzador(o: { preload: string; abrirEsme(x: { seccion?: string; pregunta?: string }): void; encargar(texto: string): Promise<{ titulo: string; agente: string }> }) {
  let v: BrowserWindow | null = null
  const crear = () => {
    v = new BrowserWindow({ width: 760, height: 520, frame: false, transparent: true, resizable: false, alwaysOnTop: true, skipTaskbar: true, show: false, hasShadow: false,
      backgroundColor: '#00000000', title: 'Esme', webPreferences: { preload: o.preload, contextIsolation: true, sandbox: false, nodeIntegration: false } })
    v.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
    v.on('blur', () => v?.hide())
    if (process.env.ELECTRON_RENDERER_URL) void v.loadURL(`${process.env.ELECTRON_RENDERER_URL}/lanzador.html`)
    else void v.loadFile(join(__dirname, '../renderer/lanzador.html'))
  }
  const alternar = () => {
    if (!v || v.isDestroyed()) crear()
    if (v!.isVisible()) { v!.hide(); return }
    v!.setBounds(posicionLanzador(screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).workArea))
    v!.show(); v!.focus(); v!.webContents.send('lanzador:abierto')
  }
  ipcMain.on('lanzador:ocultar', () => v?.hide())
  ipcMain.on('lanzador:alternar', () => alternar())
  ipcMain.on('lanzador:abrirEsme', (_e, x: unknown) => {
    v?.hide()
    const d = (x && typeof x === 'object' ? x : {}) as { seccion?: unknown; pregunta?: unknown }
    o.abrirEsme({ ...(typeof d.seccion === 'string' ? { seccion: d.seccion } : {}), ...(typeof d.pregunta === 'string' ? { pregunta: d.pregunta.slice(0, 4000) } : {}) })
  })
  ipcMain.handle('lanzador:encargar', async (_e, t: unknown) => {
    if (typeof t !== 'string' || t.trim().length < 3) return { ok: false, error: 'Escribe qué tiene que hacer tu equipo.' }
    try { return { ok: true, ...(await o.encargar(t.trim())) } } catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) } }
  })
  const ok = globalShortcut.register(ATAJO_LANZADOR, alternar)
  ipcMain.handle('lanzador:estado', () => ({ atajo: 'Ctrl+Mayús+Espacio', registrado: ok }))
  if (!ok) console.error(`[lanzador] el atajo ${ATAJO_LANZADOR} lo usa otra app`)
  return { ok, alternar, cerrar: () => { globalShortcut.unregister(ATAJO_LANZADOR); v?.destroy() } }
}
