// Chat con cualquier IA, en streaming hacia la interfaz por IPC. La memoria llega ya compuesta por el Tálamo.
// Con manos (docs/superpowers/specs/2026-10-18-manos.md): la conversación busca, lee, recuerda, encarga y programa;
// cada paso se ve en la interfaz y lo que actúa pide permiso por el canal chat:permiso.
import { stepCountIs, streamText, type LanguageModelUsage, type ModelMessage } from 'ai'
import { app, ipcMain, type WebContents } from 'electron'
import { join } from 'node:path'
import type { BrainInfo } from './brain-process'
import { ClienteCerebro, mcpDeEsme } from './mente/cliente'
import { leerConfig, guardarConfig } from './herramientas/config'
import { Conocidas } from './herramientas/permisos'
import { herramientasPropias, type Manos, type Respuesta } from './herramientas/propias'
import { herramientasConectadas } from './herramientas/ipc'
import { buscarWeb, leerPagina } from './herramientas/web'
import { encargarDesdeChat, equipoParaChat, programarDesdeChat } from './ipc-taller'
import { forjarDesdeChat } from './forja-ipc'
import { keys } from './keys'
import { anotarConsumo } from './ipc-proveedores'
import { decidirMotor } from './router/motor'
import { buildSystem, makeModel, type ProviderId } from './providers'
import { conversarConAgente } from './conversacion-agente'
import { agentesDeRespaldo, motorParaConversar } from './ipc-taller'
import { mcpParaTaller } from './herramientas/ipc'
import { agotado, esAgente, motorDe } from './router/cerebro'
import { skillsParaEsme, usarSkill } from './skills/esme'
import type { MotorElegido } from './taller/taller'

const running = new Map<string, AbortController>()
const esperando = new Map<string, (r: Respuesta) => void>()   // `${chat}:${llamada}` → quien espera el permiso

export type ChatRequest = { id: string; provider: ProviderId | `acp:${string}` | 'auto'; model: string; messages: ModelMessage[]; memory: { context: string; ids: string[] } | null; ahorrados?: number; panorama?: string; voz?: boolean; herramientas?: boolean }
type Deps = { brainInfo: () => BrainInfo | null }

export function registerChat(d: Deps) {
  ipcMain.handle('chat:start', async (e, req: ChatRequest) => {
    const ac = new AbortController(); running.set(req.id, ac)
    void pump(e.sender, req, ac, d).finally(() => running.delete(req.id))
    return { ok: true }
  })
  ipcMain.handle('chat:stop', (_e, id: string) => { running.get(id)?.abort(); return { ok: true } })
  ipcMain.handle('chat:responder', (_e, chat: unknown, llamada: unknown, r: unknown) => {
    const f = esperando.get(`${chat}:${llamada}`)
    if (!f || (r !== 'una' && r !== 'siempre' && r !== 'no')) return { ok: false }
    esperando.delete(`${chat}:${llamada}`); f(r); return { ok: true }
  })
}

const texto = (c: unknown) => (typeof c === 'string' ? c : JSON.stringify(c))

function manosPara(to: WebContents, req: ChatRequest, ac: AbortController, d: Deps): Manos {
  const fichero = join(app.getPath('userData'), 'herramientas.json')
  const cfg = leerConfig(fichero)
  const conocidas = new Conocidas()
  for (const m of req.messages) if (m.role === 'user') conocidas.anotarTexto(texto(m.content))
  return {
    buscarMemoria: async (q) => {
      const i = d.brainInfo()
      if (!i) throw new Error('La memoria no está disponible ahora mismo.')
      const r = await new ClienteCerebro(i).recuerdos(q, 8)
      return r.map((x) => ({ texto: x.text.slice(0, 600), tema: x.source }))
    },
    verEquipo: equipoParaChat,
    encargar: encargarDesdeChat,
    programar: programarDesdeChat,
    forjar: forjarDesdeChat,
    usarSkill: (nombre, fichero) => usarSkill(app.getPath('userData'), nombre, fichero),
    // la clave de Brave vive en el llavero como la de cualquier proveedor
    buscarWeb: (q) => buscarWeb(q, { brave: keys.get('brave'), searxng: cfg.searxng }),
    leerWeb: (u) => leerPagina(u),
    preguntar: (nombre, args, id) => pedirPermiso(to, req, ac, nombre, args, id),
    politicas: cfg.politicas,
    guardarPolitica: (n, p) => { const c = leerConfig(fichero); c.politicas[n] = p; guardarConfig(fichero, c) },
    conocidas,
    alPaso: (p) => to.send(`chat:paso:${req.id}`, p),
  }
}

function pedirPermiso(to: WebContents, req: ChatRequest, ac: AbortController, nombre: string, args: unknown, id: string) {
  return new Promise<Respuesta>((res) => {
    const k = `${req.id}:${id}`
    esperando.set(k, res)
    ac.signal.addEventListener('abort', () => { esperando.delete(k); res('no') }, { once: true })
    to.send(`chat:permiso:${req.id}`, { id, nombre, args })
  })
}

async function pump(to: WebContents, req: ChatRequest, ac: AbortController, d: Deps) {
  try {
    if (esAgente(req.provider)) {
      const motor = await motorParaConversar(motorDe(req.provider))
      if ('error' in motor) { to.send(`chat:error:${req.id}`, motor.error); return }
      return await conAgentes(to, req, ac, d, [motor])
    }
    let proveedor = req.provider
    let modelo = req.model
    const conManos = req.herramientas !== false
    let tools = {}
    if (conManos) {
      const manos = manosPara(to, req, ac, d)
      // las propias de Esme y las que conectaste en la Tienda; lo que no arranca se dice como un paso fallido
      const { tools: conectadas, fallos } = await herramientasConectadas(manos).catch((e) => ({ tools: {}, fallos: [String(e)] }))
      // las que esperan a que inicies sesión no ensucian la conversación: eso se ve y se arregla en la Tienda
      fallos.filter((f) => !/401|unauthori[sz]ed|iniciar sesión/i.test(f)).forEach((f, i) => to.send(`chat:paso:${req.id}`, { fase: 'error', id: `mcp-${i}`, nombre: 'herramienta conectada', error: f }))
      tools = { ...conectadas, ...herramientasPropias(manos) }
    }
    // «que Esme elija»: si no le fijaste motor, decide ella según la tarea y te explica por qué
    if (proveedor === 'auto') {
      const d = await decidirMotor({ mensajes: req.messages, herramientas: conManos })
      if (!d) { to.send(`chat:error:${req.id}`, 'No hay ningún motor con el que responder. Conecta uno en Ajustes.'); return }
      proveedor = d.proveedor as ProviderId
      modelo = d.modelo
      to.send(`chat:paso:${req.id}`, { fase: 'resultado', id: 'motor', nombre: 'elegir_motor', resumen: d.motivo, args: { modelo: d.modelo } })
    }
    const result = streamText({ model: makeModel(proveedor, modelo, (id) => keys.get(id)),
      system: buildSystem(req.memory, { panorama: req.panorama, voz: req.voz, herramientas: conManos, skills: conManos ? skillsParaEsme(app.getPath('userData')).filter((s) => !s.soloManual) : [] }),
      messages: req.messages, abortSignal: ac.signal,
      ...(conManos ? { tools, stopWhen: stepCountIs(8) } : {}) })
    let hablo = false
    const { error } = await bombear(result.fullStream, (canal, x) => { if (canal === 'chunk' && x) hablo = true; to.send(`chat:${canal}:${req.id}`, x) })
    // hay modelos que no aceptan herramientas: se repite sin ellas en vez de dejar al usuario sin respuesta
    if (error && conManos && !hablo && /tool|function call|herramient/i.test(error)) return pump(to, { ...req, herramientas: false }, ac, d)
    // lo gratis se agotó, la cuota o la clave fallan: la conversación sigue con tu mejor agente en vez de quedarse muda
    if (error && !hablo && agotado(error)) {
      const respaldo = await agentesDeRespaldo()
      if (respaldo.length) return await conAgentes(to, req, ac, d, respaldo, error)
    }
    if (error) { to.send(`chat:error:${req.id}`, error); return }
    await anotarUso(to, req, result)
    to.send(`chat:done:${req.id}`)
  } catch (err) {
    to.send(`chat:error:${req.id}`, err instanceof Error ? err.message : String(err))
  }
}

/** La respuesta a través de uno de tus agentes: recibe tu memoria (el MCP del cerebro) y tus herramientas conectadas;
 *  sus pasos y permisos salen en la conversación igual que los de Esme. */
async function conAgentes(to: WebContents, req: ChatRequest, ac: AbortController, d: Deps, motores: MotorElegido[], motivo?: string) {
  // si un agente no tiene sesión o se agotó sin decir nada, el turno pasa al siguiente; el último error es el que se dice
  let ultimo = ''
  const fallos: string[] = []
  for (const [k, motor] of motores.entries()) {
    if (motivo || k > 0) {
      to.send(`chat:paso:${req.id}`, { fase: 'llama', id: `cerebro-${k}`, nombre: 'cambio_de_cerebro', args: { agente: motor.nombre, motivo: motivo ?? ultimo } })
      to.send(`chat:paso:${req.id}`, { fase: 'resultado', id: `cerebro-${k}`, nombre: 'cambio_de_cerebro', resumen: motor.nombre })
    }
    const r = await pumpAgente(to, req, ac, d, motor)
    if (!r.error) return
    ultimo = r.error; fallos.push(r.error)
    if (r.hablo || !agotado(r.error) || ac.signal.aborted) break
  }
  // si probó varios, se dice qué le falta a cada uno (sesión, límite…) en vez de solo el último error
  to.send(`chat:error:${req.id}`, fallos.length > 1 ? `Ninguno de tus agentes pudo responder ahora:\n${fallos.map((f) => `- ${f}`).join('\n')}` : ultimo)
}

async function pumpAgente(to: WebContents, req: ChatRequest, ac: AbortController, d: Deps, motor: MotorElegido): Promise<{ error?: string; hablo?: boolean }> {
  const i = d.brainInfo()
  let n = 0, hablo = false
  const r = await conversarConAgente({
    motor, cwd: join(app.getPath('userData'), 'conversacion'), mensajes: req.messages, senal: ac.signal,
    sistema: buildSystem(req.memory, { panorama: req.panorama, voz: req.voz, herramientas: false }),
    ...(i ? { mcp: mcpDeEsme(i)! } : {}),
    masMcp: (() => { try { return mcpParaTaller() } catch { return [] } })(),
    enviar: (canal, x) => { if (canal === 'chunk') hablo = true; to.send(`chat:${canal}:${req.id}`, x) },
    permiso: (titulo) => pedirPermiso(to, req, ac, `agente__${titulo}`, {}, `agente-permiso-${motor.id}-${++n}`),
  })
  if (r.error) return { error: `${motor.nombre}: ${r.error}`, hablo }
  if (r.uso) {
    const costeUSD = anotarConsumo({ ts: Date.now(), proveedor: `acp:${motor.id}`, modelo: motor.nombre, entrada: r.uso.entrada, salida: r.uso.salida,
      ahorradosMemoria: req.ahorrados ?? 0, origen: 'chat' })
    to.send(`chat:usage:${req.id}`, { entrada: r.uso.entrada, salida: r.uso.salida, costeUSD })
  }
  to.send(`chat:done:${req.id}`)
  return {}
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

// Lee el uso del AI SDK (todos los pasos, también los de herramientas), lo anota y avisa a la interfaz. Si falla, el chat no se rompe.
async function anotarUso(to: WebContents, req: ChatRequest, result: { totalUsage: PromiseLike<LanguageModelUsage> }) {
  try {
    const u = await result.totalUsage
    const cacheLectura = u.inputTokenDetails?.cacheReadTokens, cacheEscritura = u.inputTokenDetails?.cacheWriteTokens
    // inputTokens incluye los de caché; se separan para no cobrarlos dos veces.
    const entrada = u.inputTokenDetails?.noCacheTokens ?? Math.max(0, (u.inputTokens ?? 0) - (cacheLectura ?? 0) - (cacheEscritura ?? 0))
    const salida = u.outputTokens ?? 0
    const costeUSD = anotarConsumo({ ts: Date.now(), proveedor: req.provider, modelo: req.model, entrada, salida,
      ...(cacheLectura ? { cacheLectura } : {}), ...(cacheEscritura ? { cacheEscritura } : {}), ahorradosMemoria: req.ahorrados ?? 0, origen: 'chat' })
    to.send(`chat:usage:${req.id}`, { entrada, salida, costeUSD })
  } catch (err) { console.error('[uso] no se pudo anotar:', err) }
}
