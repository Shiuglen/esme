// Agente ACP falso para tests: usa el AgentSideConnection del SDK sobre stdio. Prompt "morir" mata el proceso; "mcp" devuelve los mcpServers recibidos.
import { AgentSideConnection, ndJsonStream, PROTOCOL_VERSION } from '@agentclientprotocol/sdk'
import { Readable, Writable } from 'node:stream'

const stream = ndJsonStream(Writable.toWeb(process.stdout), Readable.toWeb(process.stdin))
let mcp = []
new AgentSideConnection((conn) => ({
  async initialize() {
    return { protocolVersion: PROTOCOL_VERSION, agentCapabilities: { mcpCapabilities: { http: !process.env.FALSO_SIN_HTTP } } }
  },
  async newSession(p) { mcp = p.mcpServers; return { sessionId: 's1' } },
  async authenticate() {},
  async cancel() {},
  async prompt(p) {
    const texto = p.prompt.map((b) => (b.type === 'text' ? b.text : '')).join('')
    const upd = (u) => conn.sessionUpdate({ sessionId: 's1', update: u })
    if (texto === 'morir') process.exit(3)
    if (texto === 'mcp') {
      await upd({ sessionUpdate: 'agent_message_chunk', content: { type: 'text', text: JSON.stringify(mcp) } })
      return { stopReason: 'end_turn' }
    }
    await upd({ sessionUpdate: 'agent_thought_chunk', content: { type: 'text', text: 'pienso' } })
    await upd({ sessionUpdate: 'agent_message_chunk', content: { type: 'text', text: 'hola ' } })
    await upd({ sessionUpdate: 'plan', entries: [{ content: 'paso uno', priority: 'high', status: 'pending' }] })
    await upd({ sessionUpdate: 'tool_call', toolCallId: 't1', title: 'Editar a.txt', status: 'in_progress',
      content: [{ type: 'diff', path: '/a.txt', oldText: 'viejo', newText: 'nuevo' }] })
    const r = await conn.requestPermission({ sessionId: 's1', toolCall: { toolCallId: 't1', title: 'Editar a.txt' },
      options: [{ optionId: 'si', name: 'Permitir', kind: 'allow_once' }, { optionId: 'no', name: 'Rechazar', kind: 'reject_once' }] })
    const elegido = r.outcome.outcome === 'selected' ? r.outcome.optionId : 'cancelado'
    await upd({ sessionUpdate: 'tool_call_update', toolCallId: 't1', status: 'completed' })
    await upd({ sessionUpdate: 'agent_message_chunk', content: { type: 'text', text: 'permiso:' + elegido } })
    return { stopReason: 'end_turn' }
  },
}), stream)
