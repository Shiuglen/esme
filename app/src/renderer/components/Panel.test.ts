import { describe, expect, it } from 'vitest'
import { clampRect } from './Panel'

describe('paneles siempre visibles', () => {
  it('un panel calculado con ventana de ancho 0 vuelve a la vista', () => {
    const r = clampRect({ x: -470, y: 76, w: 440, h: -170 }, 953, 918)
    expect(r.x).toBeGreaterThanOrEqual(8)
    expect(r.x + r.w).toBeLessThanOrEqual(953)
    expect(r.h).toBeGreaterThanOrEqual(180)
  })
  it('un panel válido no se toca', () => {
    expect(clampRect({ x: 40, y: 80, w: 400, h: 300 }, 1400, 900)).toEqual({ x: 40, y: 80, w: 400, h: 300 })
  })
})
