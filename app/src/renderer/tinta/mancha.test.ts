import { describe, expect, it } from 'vitest'
import { forma } from './mancha'

describe('mancha de tinta', () => {
  it('cada recuerdo tiene siempre la misma mancha (sale de su id, no del azar)', () => {
    expect(forma('recuerdo-1', 9, 0.8, 1.1)).toEqual(forma('recuerdo-1', 9, 0.8, 1.1))
    expect(forma('recuerdo-1', 9, 0.8, 1.1)).not.toEqual(forma('recuerdo-2', 9, 0.8, 1.1))
  })
  it('el borde tiembla dentro de lo pedido', () => {
    const f = forma('tema:3', 14, 0.82, 1.1)
    expect(f).toHaveLength(14)
    for (const k of f) { expect(k).toBeGreaterThanOrEqual(0.82); expect(k).toBeLessThanOrEqual(1.1) }
  })
})
