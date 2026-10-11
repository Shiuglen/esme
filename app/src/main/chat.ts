// Chat con cualquier IA, en streaming hacia la interfaz por IPC. La memoria llega ya compuesta por el Tálamo.
import { streamText, type ModelMessage } from 'ai'
import { ipcMain, type WebContents } from 'electron'
import { keys } from './keys'
import { buildSystem, makeModel, type ProviderId } from './providers'

const running = new Map<string, AbortController>()

export type ChatRequest = { id: string; provider: ProviderId; model: string; messages: ModelMessage[]; memory: { context: string; ids: string[] } | null }

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
    for await (const delta of result.textStream) to.send(`chat:chunk:${req.id}`, delta)
    to.send(`chat:done:${req.id}`)
  } catch (err) {
    to.send(`chat:error:${req.id}`, err instanceof Error ? err.message : String(err))
  }
}
