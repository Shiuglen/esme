import { describe, expect, it } from 'vitest'
import { cifra, diaLegible } from './cifras'

describe('las cifras se escriben igual en toda Esme', () => {
  it('con punto de millares también en las de cuatro cifras (2.346, no 2346)', () => {
    expect(cifra(2346)).toBe('2.346')
    expect(cifra(15)).toBe('15')
    expect(cifra(1234567)).toBe('1.234.567')
  })
})

describe('los días se dicen como una persona, no en ISO', () => {
  it('«2026-10-12» es «12 de octubre»; si no es una fecha, se queda como venía', () => {
    expect(diaLegible('2026-10-12')).toBe('12 de octubre')
    expect(diaLegible('2026-01-01')).toBe('1 de enero')
    expect(diaLegible('ayer')).toBe('ayer')
  })
})
