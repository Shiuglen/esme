// La ventana real del navegador: un Chromium propio y aparte (una «partition» separada, para que
// las cookies de la app no se mezclen con las de la web), sin barra ni ventana visible. Se crea
// cuando hace falta y se cierra cuando no.
import { BrowserWindow, session } from 'electron'
import { Navegador, type Ventana } from './navegador'

const PARTICION = 'persist:esme-navegador'

/** La ventana oculta del navegador de Esme. */
export function ventanaNavegador(): Ventana {
  const v = new BrowserWindow({
    show: false,
    width: 1280,
    height: 900,
    webPreferences: {
      partition: PARTICION,
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: false,
      backgroundThrottling: false,
    },
  })
  // Sin ventanas sorpresa: el agente navega, no abre pestañas detrás de tu espalda.
  v.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  // Nada de ficheros locales ni de descargas automáticas.
  v.webContents.on('will-navigate', (e, url) => { if (!/^https?:/i.test(url)) e.preventDefault() })
  session.fromPartition(PARTICION).setPermissionRequestHandler((_wc, _perm, cb) => cb(false))
  return {
    loadURL: (url) => v.loadURL(url).then(() => undefined),
    executeJavaScript: (codigo) => v.webContents.executeJavaScript(codigo) as Promise<unknown>,
    isDestroyed: () => v.isDestroyed(),
    close: () => { if (!v.isDestroyed()) v.close() },
    url: () => v.webContents.getURL(),
  }
}

/** El navegador de Esme: uno solo para toda la app, abierto sólo cuando se usa. */
export const navegador = new Navegador(ventanaNavegador)
