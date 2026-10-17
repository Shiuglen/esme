// Puente seguro entre la interfaz y el proceso main: solo estas funciones, nada de Node en el renderer.
import { contextBridge, ipcRenderer, webFrame } from 'electron'

const on = (channel: string, fn: (...a: unknown[]) => void) => {
  const h = (_e: unknown, ...a: unknown[]) => fn(...a)
  ipcRenderer.on(channel, h)
  return () => { ipcRenderer.removeListener(channel, h) }
}

contextBridge.exposeInMainWorld('daimon', {
  brain: { info: () => ipcRenderer.invoke('brain:info'), onChange: (fn: (i: unknown) => void) => on('brain:changed', fn) },
  ventana: { plataforma: process.platform, colores: (c: { fondo: string; simbolos: string }) => ipcRenderer.send('ventana:colores', c),
    // el tamaño de una piel: el zoom de verdad de la ventana (como Ctrl +), entre 85 % y 120 %
    zoom: (f: number) => webFrame.setZoomFactor(Math.min(1.2, Math.max(0.85, f))) },
  providers: { list: () => ipcRenderer.invoke('providers:list'), models: (id: string) => ipcRenderer.invoke('models:list', id) },
  keys: {
    status: () => ipcRenderer.invoke('keys:status'),
    set: (id: string, v: string) => ipcRenderer.invoke('keys:set', id, v),
    remove: (id: string) => ipcRenderer.invoke('keys:remove', id),
  },
  chat: {
    start: (req: unknown) => ipcRenderer.invoke('chat:start', req),
    stop: (id: string) => ipcRenderer.invoke('chat:stop', id),
    onChunk: (id: string, fn: (d: string) => void) => on(`chat:chunk:${id}`, (d) => fn(d as string)),
    onPensamiento: (id: string, fn: (d: string) => void) => on(`chat:pensamiento:${id}`, (d) => fn(d as string)),
    onDone: (id: string, fn: () => void) => on(`chat:done:${id}`, () => fn()),
    onError: (id: string, fn: (m: string) => void) => on(`chat:error:${id}`, (m) => fn(m as string)),
    onUsage: (id: string, fn: (u: unknown) => void) => on(`chat:usage:${id}`, (u) => fn(u)),
  },
  catalogo: { proveedores: () => ipcRenderer.invoke('catalogo:proveedores'), modelos: (id: string) => ipcRenderer.invoke('catalogo:modelos', id), origen: () => ipcRenderer.invoke('catalogo:origen') },
  uso: {
    estado: () => ipcRenderer.invoke('uso:estado'),
    resumen: (desde: number, hasta: number) => ipcRenderer.invoke('uso:resumen', desde, hasta),
    presupuesto: (p: unknown) => ipcRenderer.invoke('uso:presupuesto', p),
    externo: () => ipcRenderer.invoke('uso:externo'),
    onConsumo: (fn: (c: unknown) => void) => on('uso:consumo', (c) => fn(c)),
    onAlerta: (fn: (e: unknown) => void) => on('uso:alerta', (e) => fn(e)),
  },
  motores: { detectar: () => ipcRenderer.invoke('motores:detectar') },
  taller: {
    motores: () => ipcRenderer.invoke('taller:motores'), lista: () => ipcRenderer.invoke('taller:lista'),
    instalarMotor: (id: string) => ipcRenderer.invoke('taller:instalarMotor', id),
    onInstalacion: (fn: (p: unknown) => void) => on('taller:instalar-progreso', (p) => fn(p)),
    eventos: (id: string) => ipcRenderer.invoke('taller:eventos', id), crear: (p: unknown) => ipcRenderer.invoke('taller:crear', p),
    seguir: (id: string, texto: string) => ipcRenderer.invoke('taller:seguir', id, texto), responder: (id: string, opcion: string) => ipcRenderer.invoke('taller:responder', id, opcion),
    configurar: (id: string, opcion: string, valor: string) => ipcRenderer.invoke('taller:configurar', id, opcion, valor),
    vistaPrevia: (id: string) => ipcRenderer.invoke('taller:vistaPrevia', id),
    cerrarVista: (id: string) => ipcRenderer.invoke('taller:cerrarVista', id),
    opcionesMotor: (motor: string) => ipcRenderer.invoke('taller:opcionesMotor', motor),
    aplicar: (id: string) => ipcRenderer.invoke('taller:aplicar', id), deshacer: (id: string) => ipcRenderer.invoke('taller:deshacer', id),
    guardarRama: (id: string, mensaje?: string) => ipcRenderer.invoke('taller:guardarRama', id, mensaje),
    exportar: (id: string) => ipcRenderer.invoke('taller:exportar', id), veredictos: () => ipcRenderer.invoke('taller:veredictos'),
    parar: (id: string) => ipcRenderer.invoke('taller:parar', id), descartar: (id: string) => ipcRenderer.invoke('taller:descartar', id),
    diff: (id: string) => ipcRenderer.invoke('taller:diff', id), carpeta: () => ipcRenderer.invoke('taller:carpeta'), abrir: (id: string) => ipcRenderer.invoke('taller:abrir', id),
    onCambio: (fn: (t: unknown) => void) => on('taller:cambio', (t) => fn(t)),
    onEvento: (fn: (e: unknown) => void) => on('taller:evento', (e) => fn(e)),
    onQuitada: (fn: (id: string) => void) => on('taller:quitada', (id) => fn(id as string)),
  },
  agents: { list: () => ipcRenderer.invoke('agents:list') },
  pty: {
    spawn: (p: unknown) => ipcRenderer.invoke('pty:spawn', p),
    write: (id: string, d: string) => ipcRenderer.send('pty:write', id, d),
    resize: (id: string, c: number, r: number) => ipcRenderer.send('pty:resize', id, c, r),
    kill: (id: string) => ipcRenderer.send('pty:kill', id),
    onData: (id: string, fn: (d: string) => void) => on(`pty:data:${id}`, (d) => fn(d as string)),
    onExit: (id: string, fn: (c: number) => void) => on(`pty:exit:${id}`, (c) => fn(c as number)),
  },
})
