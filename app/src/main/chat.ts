// Chat con cualquier IA, en streaming hacia la interfaz por IPC. La memoria llega ya compuesta por el Tálamo.
import { streamText, type LanguageModelUsage, type ModelMessage } from 'ai'
import { ipcMain, type WebContents } from 'electron'
import { keys } from './keys'
import { anotarConsumo } from './ipc-proveedores'
import { buildSystem, makeModel, type ProviderId } from './providers'

const running = new Map<string, AbortController>()

export type ChatRequest = { id: string; provider: ProviderId; model: string; messages: ModelMessage[]; memory: { context: string; ids: string[] } | null; ahorrados?: number; panorama?: string; voz?: boolean }

export function registerChat() {
  ipcMain.handle('chat:start', async (e, req: ChatRequest) => {
    const ac = new AbortController(); running.set(req.id, ac)
    void pump(e.sender, req, ac).finally(() => running.delete(req.id))
    return { ok: true }
  })
  ipcMain.handle('chat:stop', (_e, id: string) => { running.get(id)?.abort(); return { ok: true } })
}

async function pump(to: WebContents, req: ChatRequest, ac: AbortController) {
  try {
    const result = streamText({ model: makeModel(req.provider, req.model, (id) => keys.get(id)), system: buildSystem(req.memory, { panorama: req.panorama, voz: req.voz }),
      messages: req.messages, abortSignal: ac.signal })
    const { error } = await bombear(result.fullStream, (canal, x) => to.send(`chat:${canal}:${req.id}`, x))
    if (error) { to.send(`chat:error:${req.id}`, error); return }
    await anotarUso(to, req, result)
    to.send(`chat:done:${req.id}`)
  } catch (err) {
    to.send(`chat:error:${req.id}`, err instanceof Error ? err.message : String(err))
  }
}

/** Recorre el flujo del AI SDK: el texto va por «chunk» y el pensado por «pensamiento» (los modelos que piensan no sueltan
 *  texto hasta el final; sin esto el chat se queda mudo). Ojo: el SDK NO lanza los errores del proveedor (clave rechazada,
 *  límite de los modelos gratis, modelo caído): los manda como una parte más del flujo. Antes se ignoraban y el chat acababa
 *  «bien» y vacío; ahora se devuelven para decirlos. */
export async function bombear(flujo: AsyncIterable<unknown>, enviar: (canal: 'chunk' | 'pensamiento', x: string) => void): Promise<{ error?: string }> {
  for await (const parte of flujo) {
    const p = parte as { type: string; text?: string; error?: unknown }
    if (p.type === 'text-delta') enviar('chunk', p.text ?? '')
    else if (p.type === 'reasoning-delta') enviar('pensamiento', p.text ?? '')
    else if (p.type === 'error') {
      const e = p.error as { message?: unknown } | string | undefined
      return { error: typeof e === 'string' ? e : typeof e?.message === 'string' ? e.message : JSON.stringify(e) }
    }
  }
  return {}
}

// Lee el uso del AI SDK, lo anota y avisa a la interfaz. Si falla, el chat no se rompe.
async function anotarUso(to: WebContents, req: ChatRequest, result: { usage: PromiseLike<LanguageModelUsage> }) {
  try {
    const u = await result.usage
    const cacheLectura = u.inputTokenDetails?.cacheReadTokens, cacheEscritura = u.inputTokenDetails?.cacheWriteTokens
    // inputTokens incluye los de caché; se separan para no cobrarlos dos veces.
    const entrada = u.inputTokenDetails?.noCacheTokens ?? Math.max(0, (u.inputTokens ?? 0) - (cacheLectura ?? 0) - (cacheEscritura ?? 0))
    const salida = u.outputTokens ?? 0
    const costeUSD = anotarConsumo({ ts: Date.now(), proveedor: req.provider, modelo: req.model, entrada, salida,
      ...(cacheLectura ? { cacheLectura } : {}), ...(cacheEscritura ? { cacheEscritura } : {}), ahorradosMemoria: req.ahorrados ?? 0, origen: 'chat' })
    to.send(`chat:usage:${req.id}`, { entrada, salida, costeUSD })
  } catch (err) { console.error('[uso] no se pudo anotar:', err) }
}
