import { describe, expect, it } from 'vitest'
import { anguloSol } from './sol'

const a = (h: number, m = 0) => anguloSol(new Date(2026, 9, 12, h, m))

describe('anguloSol', () => {
  it('la luz entra por un lado al amanecer, de arriba a mediodía y por el otro al atardecer', () => {
    expect(a(6)).toBe(300)
    expect(a(12)).toBe(0)
    expect(a(18)).toBe(60)
    expect(a(9)).toBe(330)
  })
  it('de noche se queda donde se puso el sol (o donde saldrá)', () => {
    expect(a(21)).toBe(60)
    expect(a(3)).toBe(300)
  })
  it('se mueve poco a poco con los minutos', () => {
    expect(a(12, 30)).toBeCloseTo(5, 5)
  })
})
