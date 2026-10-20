// La puerta, del lado de la app: el renderer NO habla con el cerebro (que es Python). Pide por IPC y el proceso
// principal habla con el cerebro por la puerta (`mente/cliente.ts`). Así el token de la mente no sale del proceso
// principal: la ventana es la parte menos de fiar de la casa y no necesita la llave de la memoria.
import { ipcMain } from 'electron'
import type { BrainInfo } from '../brain-process'
import { ClienteCerebro } from './cliente'

export type Resultado<T> = { ok: true; dato: T } | { ok: false; error: string }

export type Opciones = {
  brainInfo: () => BrainInfo | null
  /** Para los tests: la puerta con un fetch falso. */
  http?: typeof fetch
  /** A dónde se reenvían los eventos de la mente (SSE) para que la ventana los vea. */
  emitir?: (evento: unknown) => void
}

export function registerMente(o: Opciones) {
  const conMente = async <T>(fn: (c: ClienteCerebro) => Promise<T>): Promise<Resultado<T>> => {
    const i = o.brainInfo()
    if (!i) return { ok: false, error: 'La mente no está disponible ahora mismo.' }
    try { return { ok: true, dato: await fn(new ClienteCerebro(i, o.http)) } }
    catch (e) { return { ok: false, error: e instanceof Error ? e.message : 'el cerebro falló' } }
  }

  ipcMain.handle('mente:salud', () => conMente((c) => c.salud()))
  // el rumbo: para qué trabaja esta mente
  ipcMain.handle('mente:rumbo', () => conMente((c) => c.rumbo()))
  ipcMain.handle('mente:rumbo:mover', (_e, accion: unknown, datos: unknown) =>
    conMente((c) => c.moverRumbo(String(accion ?? ''), (datos ?? {}) as Record<string, unknown>)))
  ipcMain.handle('mente:recuerdos', (_e, q: unknown, limit: unknown) => conMente((c) => c.recuerdos(String(q ?? ''), Number(limit) || 20)))
  ipcMain.handle('mente:recordar', (_e, query: unknown, opts: unknown) => conMente((c) => c.recordar(String(query ?? ''), (opts ?? {}) as { motor?: string; budget?: number; who?: string })))
  ipcMain.handle('mente:escribir', (_e, texto: unknown, kind: unknown) => conMente((c) => c.escribir(String(texto ?? ''), String(kind ?? 'note'))))
  ipcMain.handle('mente:feedback', (_e, ids: unknown, useful: unknown, query: unknown) => conMente((c) => c.feedback(Array.isArray(ids) ? ids.map(String) : [], Boolean(useful), String(query ?? ''))))
  ipcMain.handle('mente:olvidar', (_e, id: unknown) => conMente((c) => c.olvidar(String(id ?? ''))))
  ipcMain.handle('mente:ingerir', (_e, paths: unknown) => conMente((c) => c.ingerir(Array.isArray(paths) ? paths.map(String) : [])))
  ipcMain.handle('mente:atlas', () => conMente((c) => c.atlas()))
  // Las tareas que el creador repite: la mente propone la skill, el usuario la decide.
  ipcMain.handle('mente:repeticiones', () => conMente((c) => c.repeticiones()))
  // Las herramientas que el equipo echa de menos: lo que falló y se repitió.
  ipcMain.handle('mente:necesidad', () => conMente((c) => c.necesidad()))
  ipcMain.handle('mente:memoria', (_e, id: unknown) => conMente((c) => c.memoria(String(id ?? ''))))
  ipcMain.handle('mente:oir', (_e, pcm: unknown, idioma: unknown) => conMente((c) => c.oir(pcm as ArrayBuffer, String(idioma ?? 'es'))))
  ipcMain.handle('mente:decir', (_e, texto: unknown) => conMente((c) => c.decir(String(texto ?? ''))))

  // Los eventos (SSE) los lee el proceso principal y los reenvía: la ventana no abre flujos ni lleva el token.
  let lector: AbortController | null = null
  ipcMain.handle('mente:eventos', async () => {
    const i = o.brainInfo()
    if (!i) return { ok: false, error: 'La mente no está disponible ahora mismo.' }
    lector?.abort()
    const ctrl = new AbortController()
    lector = ctrl
    const c = new ClienteCerebro(i, o.http)
    void c.eventos((e) => o.emitir?.(e), ctrl.signal).catch(() => { /* se cerró la mente */ })
    return { ok: true }
  })
  ipcMain.handle('mente:eventos:parar', () => { lector?.abort(); lector = null; return { ok: true } })
}
