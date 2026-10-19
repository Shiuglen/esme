import { describe, expect, it } from 'vitest'
import { agotado, cerebrosDeAgentes, esAgente, limite, motorDe, sinSesion } from './cerebro'

describe('hablar a través de tus agentes', () => {
  it('un proveedor «acp:<motor>» es uno de tus agentes', () => {
    expect(esAgente('acp:qwen-code')).toBe(true)
    expect(esAgente('openrouter')).toBe(false)
    expect(esAgente('acp:')).toBe(false)
    expect(esAgente('acp:../malo')).toBe(false)
    expect(motorDe('acp:claude-acp')).toBe('claude-acp')
  })
  it('tus agentes instalados aparecen como cerebros sin clave; los no instalados, no', () => {
    expect(cerebrosDeAgentes([{ id: 'qwen-code', nombre: 'Qwen Code', instalado: true }, { id: 'goose', nombre: 'Goose', instalado: false }]))
      .toEqual([{ id: 'acp:qwen-code', label: 'Qwen Code · tu agente', local: true, needsKey: false, hasKey: true, retainsData: false, agente: true }])
  })
})

describe('cuándo se agotó un cerebro y hay que seguir con otro', () => {
  it('límites, cuotas, créditos y claves que faltan o se rechazan', () => {
    for (const e of ['Rate limit exceeded: free-models-per-day', '429 Too Many Requests', 'You exceeded your current quota', 'Insufficient credits',
      '402 Payment Required', 'Missing API key for openrouter', 'Falta la clave de OpenCode Zen', '401 Unauthorized', 'invalid x-api-key'])
      expect(agotado(e), e).toBe(true)
  })
  it('lo demás no: un fallo de red o del propio mensaje se dice tal cual', () => {
    for (const e of ['fetch failed', 'context length exceeded by 2000 tokens', 'The model produced invalid JSON'])
      expect(agotado(e), e).toBe(false)
  })
})

describe('límite o falta de sesión: se resuelven distinto', () => {
  it('un límite se arregla probando otro modelo gratis; la falta de sesión, con otro agente', () => {
    expect(limite('Internal error: Rate limit exceeded. Please try again later.')).toBe(true)
    expect(sinSesion('Internal error: Rate limit exceeded.')).toBe(false)
    expect(sinSesion('Authentication required')).toBe(true)
    expect(sinSesion('Authentication required: Use Qwen Code CLI to authenticate first.')).toBe(true)
    expect(limite('Authentication required')).toBe(false)
    expect(agotado('Authentication required')).toBe(true)
  })
})
