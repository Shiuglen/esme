// Cliente ACP sobre stdio (ClientSideConnection del SDK): abre un motor, traduce sus eventos y reenvía permisos.
import { spawn as spawnReal } from 'node:child_process'
import { Readable, Writable } from 'node:stream'
import { ClientSideConnection, ndJsonStream, PROTOCOL_VERSION, type McpServer, type SessionConfigOption, type SessionNotification } from '@agentclientprotocol/sdk'

export type OpcionConfig = { id: string; nombre: string; actual: string; valores: { id: string; nombre: string; descripcion?: string }[] }   // solo las de tipo 'select'

export type EventoMotor =
  | { tipo: 'texto'; texto: string } | { tipo: 'pensamiento'; texto: string }
  | { tipo: 'herramienta'; id: string; titulo?: string; estado?: string; clase?: string; diff?: { ruta: string; antes?: string; despues: string }[] }
  | { tipo: 'plan'; pasos: { texto: string; estado: string }[] }
  | { tipo: 'contexto'; usado: number; total: number; coste?: { cantidad: number; moneda: string } }
  | { tipo: 'opciones'; opciones: OpcionConfig[] }
  | { tipo: 'usuario'; texto: string } | { tipo: 'fin'; motivo: string; ms: number } | { tipo: 'fallo'; mensaje: string }   // solo los emite el runtime del Taller, nunca la sesión ACP
  | { tipo: 'uso'; entrada: number; salida: number; pensamiento?: number; cacheLectura?: number; cacheEscritura?: number }

type Opciones = { comando: string; args: string[]; cwd: string; env?: Record<string, string>
  config?: Record<string, string>   // id de opción → valor deseado; se aplica antes de cada pregunta
  mcp?: { nombre: string; url: string; token: string }
  alEvento: (e: EventoMotor) => void
  alPedirPermiso: (p: { titulo: string; opciones: { id: string; nombre: string; tipo: string }[] }) => Promise<string | 'cancelar'>
  lanzar?: typeof spawnReal }

export function traducirOpciones(cfg: SessionConfigOption[]): OpcionConfig[] {
  return cfg.flatMap((c) => {
    if (c.type !== 'select') return []
    const items = c.options.flatMap((x) => ('group' in x ? x.options : [x]))
    return [{ id: c.id, nombre: c.name, actual: c.currentValue,
      valores: items.map((v) => ({ id: v.value, nombre: v.name, ...(v.description ? { descripcion: v.description } : {}) })) }]
  })
}

function traducir(n: SessionNotification): EventoMotor | null {
  const u = n.update
  switch (u.sessionUpdate) {
    case 'agent_message_chunk': return u.content.type === 'text' ? { tipo: 'texto', texto: u.content.text } : null
    case 'agent_thought_chunk': return u.content.type === 'text' ? { tipo: 'pensamiento', texto: u.content.text } : null
    case 'plan': return { tipo: 'plan', pasos: u.entries.map((e) => ({ texto: e.content, estado: e.status })) }
    case 'tool_call': case 'tool_call_update': {
      const diff = (u.content ?? []).flatMap((c) => c.type === 'diff' ? [{ ruta: c.path, ...(c.oldText != null ? { antes: c.oldText } : {}), despues: c.newText }] : [])
      return { tipo: 'herramienta', id: u.toolCallId, ...(u.title ? { titulo: u.title } : {}), ...(u.status ? { estado: u.status } : {}),
        ...(u.kind ? { clase: u.kind } : {}), ...(diff.length ? { diff } : {}) }
    }
    case 'usage_update': return { tipo: 'contexto', usado: u.used, total: u.size, ...(u.cost ? { coste: { cantidad: u.cost.amount, moneda: u.cost.currency } } : {}) }
    case 'config_option_update': return { tipo: 'opciones', opciones: traducirOpciones(u.configOptions) }
    default: return null
  }
}

export async function abrirSesionACP(o: Opciones): Promise<{ preguntar(texto: string): Promise<string>; cancelar(): Promise<void>; cerrar(): void; configurar(id: string, valor: string): Promise<void> }> {
  const hijo = (o.lanzar ?? spawnReal)(o.comando, o.args, { cwd: o.cwd, env: { ...process.env, ...o.env }, stdio: ['pipe', 'pipe', 'ignore'] })
  let causa: Error | null = null
  let avisar!: (e: Error) => void
  const muerte = new Promise<never>((_, rej) => { avisar = rej }); muerte.catch(() => {})
  const caer = (e: Error) => { if (!causa) { causa = e; avisar(e) } }
  hijo.on('error', (e) => caer(new Error(`No se pudo lanzar el motor «${o.comando}»: ${e.message}`)))
  hijo.on('close', (code, sig) => caer(new Error(`El motor terminó inesperadamente (${sig ?? `código ${code}`}).`)))
  hijo.stdin?.on('error', () => {})
  const cerrar = () => { if (hijo.exitCode === null && !hijo.killed) hijo.kill('SIGTERM'); caer(new Error('La sesión del motor está cerrada.')) }

  let opciones: OpcionConfig[] = []
  const deseada: Record<string, string> = { ...o.config }
  let ultimoCambio = Date.now()
  let defender: (() => void) | null = null   // existe cuando la sesión ya está abierta
  const nuevasOpciones = (e: Extract<EventoMotor, { tipo: 'opciones' }>) => {
    opciones = e.opciones; ultimoCambio = Date.now(); o.alEvento(e)
    defender?.()
  }

  const stream = ndJsonStream(Writable.toWeb(hijo.stdin!) as WritableStream<Uint8Array>, Readable.toWeb(hijo.stdout!) as ReadableStream<Uint8Array>)
  const conn = new ClientSideConnection(() => ({
    sessionUpdate: (n) => { const e = traducir(n); if (e?.tipo === 'opciones') nuevasOpciones(e); else if (e) o.alEvento(e) },
    requestPermission: async (p) => {
      const r = await o.alPedirPermiso({ titulo: p.toolCall.title ?? '', opciones: p.options.map((x) => ({ id: x.optionId, nombre: x.name, tipo: x.kind })) })
      return { outcome: r === 'cancelar' ? { outcome: 'cancelled' } : { outcome: 'selected', optionId: r } }
    },
  }), stream)

  // Si la conexión cae, el SDK rechaza antes de que veamos el cierre del proceso: esperamos un instante y damos el error claro.
  const vivo = <T>(p: Promise<T>) => Promise.race([p, muerte]).catch(async (e) => {
    if (!causa) await new Promise((r) => setTimeout(r, 300))
    throw causa ?? e
  })
  try {
    const ini = await vivo(conn.initialize({ protocolVersion: PROTOCOL_VERSION, clientCapabilities: {}, clientInfo: { name: 'esme', version: '0.1.0' } }))
    const mcpServers: McpServer[] = o.mcp && ini.agentCapabilities?.mcpCapabilities?.http
      ? [{ type: 'http', name: o.mcp.nombre, url: o.mcp.url, headers: [{ name: 'Authorization', value: `Bearer ${o.mcp.token}` }] }] : []
    const nueva = await vivo(conn.newSession({ cwd: o.cwd, mcpServers }))
    const { sessionId } = nueva
    if (nueva.configOptions) nuevasOpciones({ tipo: 'opciones', opciones: traducirOpciones(nueva.configOptions) })
    const poner = async (id: string, valor: string) => {
      const r = await vivo(conn.setSessionConfigOption({ sessionId, configId: id, value: valor }))
      nuevasOpciones({ tipo: 'opciones', opciones: traducirOpciones(r.configOptions) })
    }
    // Solo lo que existe, es válido y es distinto del valor actual; un fallo se avisa pero no para la tarea.
    const aplicar = async () => {
      for (const [id, valor] of Object.entries(deseada)) {
        const op = opciones.find((x) => x.id === id)
        if (!op || op.actual === valor || !op.valores.some((v) => v.id === valor)) continue
        try { await poner(id, valor) } catch (e) { o.alEvento({ tipo: 'fallo', mensaje: `No se pudo cambiar «${op.nombre}»: ${e instanceof Error ? e.message : String(e)}` }) }
      }
    }
    // Motores como OpenCode cargan su configuración un instante después de abrir y pisan el modelo elegido.
    // Antes de la primera pregunta se espera a que las opciones dejen de cambiar (400 ms quietas, 2,5 s como mucho)…
    const abierta = Date.now()
    let asentada = false
    const asentar = async () => {
      while (!asentada && opciones.length && Date.now() - ultimoCambio < 400 && Date.now() - abierta < 2500) await new Promise((r) => setTimeout(r, 50))
      asentada = true
    }
    // …y si después el motor cambia una opción por su cuenta, se vuelve a poner la elegida (con tope, para no pelear sin fin).
    let defensas = 0
    defender = () => {
      if (causa || defensas >= 5) return
      const pisada = Object.entries(deseada).some(([id, v]) => { const op = opciones.find((x) => x.id === id); return op && op.actual !== v && op.valores.some((x) => x.id === v) })
      if (pisada) { defensas++; void aplicar() }
    }
    return {
      configurar: async (id, valor) => { deseada[id] = valor; if (!causa) await poner(id, valor) },
      preguntar: async (texto) => {
        if (causa) throw causa
        await asentar()
        await aplicar()
        const r = await vivo(conn.prompt({ sessionId, prompt: [{ type: 'text', text: texto }] }))
        if (r.usage) {
          const x = r.usage
          o.alEvento({ tipo: 'uso', entrada: x.inputTokens, salida: x.outputTokens, ...(x.thoughtTokens != null ? { pensamiento: x.thoughtTokens } : {}),
            ...(x.cachedReadTokens != null ? { cacheLectura: x.cachedReadTokens } : {}), ...(x.cachedWriteTokens != null ? { cacheEscritura: x.cachedWriteTokens } : {}) })
        }
        return r.stopReason
      },
      cancelar: async () => { if (!causa) await conn.cancel({ sessionId }) },
      cerrar,
    }
  } catch (e) { cerrar(); throw causa ?? e }
}
