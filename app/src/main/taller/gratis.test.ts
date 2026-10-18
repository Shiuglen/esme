import { describe, it, expect } from 'vitest'
import { otroModeloGratis } from './gratis'
import type { OpcionConfig } from '../motores/sesion-acp'

const modelo = (actual: string, ids: string[]): OpcionConfig[] => [{ id: 'model', nombre: 'Model', actual, valores: ids.map((id) => ({ id, nombre: id })) }]

describe('cuando un modelo gratis llega a su límite', () => {
  it('pasa a otro gratis que aún no se probó, nunca a uno de pago', () => {
    const o = modelo('opencode/glm-5.3-flash-free', ['agentrouter/claude-opus-5', 'opencode/glm-5.3-flash-free', 'opencode/nemotron-3.5-super-vl-free', 'openrouter/qwen3:free'])
    expect(otroModeloGratis(o, new Set(['opencode/glm-5.3-flash-free']))).toBe('opencode/nemotron-3.5-super-vl-free')
    expect(otroModeloGratis(o, new Set(['opencode/glm-5.3-flash-free', 'opencode/nemotron-3.5-super-vl-free']))).toBe('openrouter/qwen3:free')
  })
  it('si no quedan gratis por probar, o el motor no tiene selector de modelo, no cambia', () => {
    expect(otroModeloGratis(modelo('a-free', ['a-free', 'b-pago']), new Set(['a-free']))).toBeNull()
    expect(otroModeloGratis([], new Set())).toBeNull()
    expect(otroModeloGratis(undefined, new Set())).toBeNull()
  })
})
