import { describe, expect, it } from 'vitest'
import { cifra } from './cifras'

describe('las cifras se escriben igual en toda Esme', () => {
  it('con punto de millares también en las de cuatro cifras (2.346, no 2346)', () => {
    expect(cifra(2346)).toBe('2.346')
    expect(cifra(15)).toBe('15')
    expect(cifra(1234567)).toBe('1.234.567')
  })
})
