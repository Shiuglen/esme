// Puente seguro entre la interfaz y el proceso main: solo estas funciones, nada de Node en el renderer.
import { contextBridge, ipcRenderer } from 'electron'

const on = (channel: string, fn: (...a: unknown[]) => void) => {
  const h = (_e: unknown, ...a: unknown[]) => fn(...a)
  ipcRenderer.on(channel, h)
  return () => { ipcRenderer.removeListener(channel, h) }
}

contextBridge.exposeInMainWorld('daimon', {
  brain: { info: () => ipcRenderer.invoke('brain:info'), onChange: (fn: (i: unknown) => void) => on('brain:changed', fn) },
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
    onDone: (id: string, fn: () => void) => on(`chat:done:${id}`, () => fn()),
    onError: (id: string, fn: (m: string) => void) => on(`chat:error:${id}`, (m) => fn(m as string)),
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
