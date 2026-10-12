// Agente ACP falso para tests: usa el AgentSideConnection del SDK sobre stdio. Prompt "morir" mata el proceso; "mcp" devuelve los mcpServers recibidos; "uso" emite usage_update y devuelve usage; "modelo" responde con el modelo actual.
import { AgentSideConnection, ndJsonStream, PROTOCOL_VERSION } from '@agentclientprotocol/sdk'
import { Readable, Writable } from 'node:stream'

const stream = ndJsonStream(Writable.toWeb(process.stdout), Readable.toWeb(process.stdin))
let mcp = []
let cwd = ''
let modelo = 'lento'
const configOptions = () => [{ type: 'select', id: 'model', name: 'Modelo', category: 'model', currentValue: modelo,
  options: [{ value: 'lento', name: 'Lento' }, { value: 'rapido', name: 'Rápido', description: 'Responde antes' }] }]
new AgentSideConnection((conn) => ({
  async initialize() {
    return { protocolVersion: PROTOCOL_VERSION, agentCapabilities: { mcpCapabilities: { http: !process.env.FALSO_SIN_HTTP } } }
  },
  async newSession(p) {
    mcp = p.mcpServers
    cwd = p.cwd
    // Como OpenCode: poco después de abrir, el motor vuelve a poner su modelo de la configuración del usuario.
    setTimeout(() => { modelo = 'lento'; conn.sessionUpdate({ sessionId: 's1', update: { sessionUpdate: 'config_option_update', configOptions: configOptions() } }).catch(() => {}) }, 50)
    return { sessionId: 's1', configOptions: configOptions() }
  },
  async setSessionConfigOption(p) { if (p.configId === 'model') modelo = p.value; return { configOptions: configOptions() } },
  async authenticate() {},
  async cancel() {},
  async prompt(p) {
    const texto = p.prompt.map((b) => (b.type === 'text' ? b.text : '')).join('')
    const upd = (u) => conn.sessionUpdate({ sessionId: 's1', update: u })
    if (texto === 'morir') process.exit(3)
    if (texto === 'herramientas-ricas') {   // como OpenCode: títulos escuetos, rutas absolutas y la entrada cruda (con contenido que no debe salir)
      await upd({ sessionUpdate: 'tool_call', toolCallId: 'w1', title: 'write', name: 'write', kind: 'edit', status: 'completed',
        locations: [{ path: `${cwd}/src/a.txt` }], rawInput: { filePath: `${cwd}/src/a.txt`, content: 'SECRETO-NO-SALE' } })
      await upd({ sessionUpdate: 'tool_call', toolCallId: 'x1', title: 'bash', name: 'bash', kind: 'execute', status: 'completed',
        rawInput: { command: 'npm test', description: 'Corre los tests' } })
      await upd({ sessionUpdate: 'tool_call', toolCallId: 'r1', title: 'read', kind: 'read', status: 'completed', locations: [{ path: '/etc/fuera.txt' }] })
      return { stopReason: 'end_turn' }
    }
    if (texto === 'modelo-tarde') {   // como OpenCode: tarda en responder y entretanto su configuración pisa el modelo
      await new Promise((r) => setTimeout(r, 120))
      await upd({ sessionUpdate: 'agent_message_chunk', content: { type: 'text', text: modelo } })
      return { stopReason: 'end_turn' }
    }
    if (texto === 'modelo') {
      await upd({ sessionUpdate: 'agent_message_chunk', content: { type: 'text', text: modelo } })
      return { stopReason: 'end_turn' }
    }
    if (texto === 'mcp') {
      await upd({ sessionUpdate: 'agent_message_chunk', content: { type: 'text', text: JSON.stringify(mcp) } })
      return { stopReason: 'end_turn' }
    }
    if (texto === 'uso') {
      await upd({ sessionUpdate: 'tool_call', toolCallId: 't2', title: 'Ejecutar ls', kind: 'execute', status: 'pending' })
      await upd({ sessionUpdate: 'usage_update', used: 1200, size: 200000, cost: { amount: 0.0123, currency: 'USD' } })
      return { stopReason: 'end_turn', usage: { totalTokens: 150, inputTokens: 100, outputTokens: 50, thoughtTokens: 7, cachedReadTokens: 30, cachedWriteTokens: 5 } }
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
