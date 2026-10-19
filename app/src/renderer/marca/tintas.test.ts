import { describe, expect, it } from 'vitest'
import { tintaDe } from './tintas'

describe('la tinta de cada agente del equipo', () => {
  it('los conocidos tienen su ángulo de trama fijo; ninguno usa el de Esme (45°)', () => {
    expect(tintaDe('opencode').angulo).toBe(0)
    expect(tintaDe('qwen').angulo).toBe(15)
    expect(tintaDe('cline').angulo).toBe(75)
    expect(tintaDe('claude').angulo).toBe(30)
    for (const id of ['opencode', 'qwen', 'cline', 'claude', 'gemini', 'goose', 'x-desconocido', 'autohand', 'bob']) expect(tintaDe(id).angulo).not.toBe(45)
  })
  it('uno desconocido recibe siempre el mismo ángulo, entre 0 y 90', () => {
    const a = tintaDe('agoragentic').angulo
    expect(tintaDe('agoragentic').angulo).toBe(a)
    expect(a).toBeGreaterThanOrEqual(0); expect(a).toBeLessThan(90)
  })
})
