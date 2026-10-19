import { describe, it, expect } from 'vitest'
import { historiaDeUso } from './historia-uso'

const m = (modelo: string, proveedor: string, tokens: number, costeUSD = 0, llamadas = 1) => ({ modelo, proveedor, tokens, costeUSD, llamadas })

describe('la historia de tu uso, en una frase', () => {
  it('sin gasto: lo celebra y dice quién trabajó más', () => {
    const h = historiaDeUso({ costeUSD: 0, tokens: 259_500, porModelo: [m('laguna-s-2.1:free', 'qwen-code', 209_000, 0, 12), m('nemotron', 'openrouter', 50_500, 0, 10)] })
    expect(h.titular).toBe('22 respuestas y 259,5 mil tokens, sin gastar un céntimo.')
    expect(h.detalle).toBe('Quien más trabajó: Laguna S 2.1 (qwen-code), con el 81 % de los tokens.')
  })
  it('con gasto: dónde se fue tu dinero', () => {
    const h = historiaDeUso({ costeUSD: 4.2, tokens: 900_000, porModelo: [m('claude-opus', 'anthropic', 300_000, 3.5, 4), m('gpt', 'openai', 600_000, 0.7, 6)] })
    expect(h.titular).toBe('Gastaste $4,20 en 10 respuestas.')
    expect(h.detalle).toBe('El 83 % se fue en Claude Opus (anthropic).')
  })
  it('sin nada aún, invita a empezar', () => {
    expect(historiaDeUso({ costeUSD: 0, tokens: 0, porModelo: [] }).titular).toBe('Aún no hay uso en este rango.')
  })
})
