// Chat con cualquier IA, en streaming hacia la interfaz por IPC. La memoria llega ya compuesta por el Tálamo.
import { streamText, type LanguageModelUsage, type ModelMessage } from 'ai'
import { ipcMain, type WebContents } from 'electron'
import { keys } from './keys'
import { anotarConsumo } from './ipc-proveedores'
import { buildSystem, makeModel, type ProviderId } from './providers'

const running = new Map<string, AbortController>()

export type ChatRequest = { id: string; provider: ProviderId; model: string; messages: ModelMessage[]; memory: { context: string; ids: string[] } | null; ahorrados?: number }

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
    const result = streamText({ model: makeModel(req.provider, req.model, (id) => keys.get(id)), system: buildSystem(req.memory),
      messages: req.messages, abortSignal: ac.signal })
    // El pensado también viaja: los modelos que piensan (deepseek, nemotron) no sueltan texto hasta el final y sin
    // esto el chat se queda mudo. El texto va por chat:chunk como siempre; el razonamiento por chat:pensamiento.
    for await (const part of result.fullStream) {
      if (part.type === 'text-delta') to.send(`chat:chunk:${req.id}`, part.text)
      else if (part.type === 'reasoning-delta') to.send(`chat:pensamiento:${req.id}`, part.text)
    }
    await anotarUso(to, req, result)
    to.send(`chat:done:${req.id}`)
  } catch (err) {
    to.send(`chat:error:${req.id}`, err instanceof Error ? err.message : String(err))
  }
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
