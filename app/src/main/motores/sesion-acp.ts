// Cliente ACP sobre stdio (ClientSideConnection del SDK): abre un motor, traduce sus eventos y reenvía permisos.
import { spawn as spawnReal } from 'node:child_process'
import { Readable, Writable } from 'node:stream'
import { ClientSideConnection, ndJsonStream, PROTOCOL_VERSION, type McpServer, type SessionNotification } from '@agentclientprotocol/sdk'

export type EventoMotor =
  | { tipo: 'texto'; texto: string } | { tipo: 'pensamiento'; texto: string }
  | { tipo: 'herramienta'; id: string; titulo: string; estado: string; diff?: { ruta: string; antes?: string; despues: string }[] }
  | { tipo: 'plan'; pasos: { texto: string; estado: string }[] }

type Opciones = { comando: string; args: string[]; cwd: string; env?: Record<string, string>
  mcp?: { nombre: string; url: string; token: string }
  alEvento: (e: EventoMotor) => void
  alPedirPermiso: (p: { titulo: string; opciones: { id: string; nombre: string; tipo: string }[] }) => Promise<string | 'cancelar'>
  lanzar?: typeof spawnReal }

function traducir(n: SessionNotification): EventoMotor | null {
  const u = n.update
  switch (u.sessionUpdate) {
    case 'agent_message_chunk': return u.content.type === 'text' ? { tipo: 'texto', texto: u.content.text } : null
    case 'agent_thought_chunk': return u.content.type === 'text' ? { tipo: 'pensamiento', texto: u.content.text } : null
    case 'plan': return { tipo: 'plan', pasos: u.entries.map((e) => ({ texto: e.content, estado: e.status })) }
    case 'tool_call': case 'tool_call_update': {
      const diff = (u.content ?? []).flatMap((c) => c.type === 'diff' ? [{ ruta: c.path, ...(c.oldText != null ? { antes: c.oldText } : {}), despues: c.newText }] : [])
      return { tipo: 'herramienta', id: u.toolCallId, titulo: u.title ?? '', estado: u.status ?? '', ...(diff.length ? { diff } : {}) }
    }
    default: return null
  }
}

export async function abrirSesionACP(o: Opciones): Promise<{ preguntar(texto: string): Promise<string>; cancelar(): Promise<void>; cerrar(): void }> {
  const hijo = (o.lanzar ?? spawnReal)(o.comando, o.args, { cwd: o.cwd, env: { ...process.env, ...o.env }, stdio: ['pipe', 'pipe', 'ignore'] })
  let causa: Error | null = null
  let avisar!: (e: Error) => void
  const muerte = new Promise<never>((_, rej) => { avisar = rej }); muerte.catch(() => {})
  const caer = (e: Error) => { if (!causa) { causa = e; avisar(e) } }
  hijo.on('error', (e) => caer(new Error(`No se pudo lanzar el motor «${o.comando}»: ${e.message}`)))
  hijo.on('close', (code, sig) => caer(new Error(`El motor terminó inesperadamente (${sig ?? `código ${code}`}).`)))
  hijo.stdin?.on('error', () => {})
  const cerrar = () => { if (hijo.exitCode === null && !hijo.killed) hijo.kill('SIGTERM'); caer(new Error('La sesión del motor está cerrada.')) }

  const stream = ndJsonStream(Writable.toWeb(hijo.stdin!) as WritableStream<Uint8Array>, Readable.toWeb(hijo.stdout!) as ReadableStream<Uint8Array>)
  const conn = new ClientSideConnection(() => ({
    sessionUpdate: (n) => { const e = traducir(n); if (e) o.alEvento(e) },
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
    const { sessionId } = await vivo(conn.newSession({ cwd: o.cwd, mcpServers }))
    return {
      preguntar: async (texto) => {
        if (causa) throw causa
        return (await vivo(conn.prompt({ sessionId, prompt: [{ type: 'text', text: texto }] }))).stopReason
      },
      cancelar: async () => { if (!causa) await conn.cancel({ sessionId }) },
      cerrar,
    }
  } catch (e) { cerrar(); throw causa ?? e }
}
