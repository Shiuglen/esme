import { describe, expect, it } from 'vitest'
import { heightGrid, sampleHeight } from './terrain'

describe('relieve del Atlas', () => {
  it('sin recuerdos el mapa es llano (y no rompe)', () => {
    const g = heightGrid([], 32)
    expect(g.length).toBe(32 * 32)
    expect(Math.max(...g)).toBe(0)
  })

  it('la montaña está donde se concentran los recuerdos y se normaliza a [0,1]', () => {
    const pts = Array.from({ length: 50 }, () => ({ x: 0.5, y: -0.5 }))
    const g = heightGrid(pts, 64)
    expect(Math.max(...g)).toBeCloseTo(1, 5)
    expect(Math.min(...g)).toBeGreaterThanOrEqual(0)
    expect(sampleHeight(g, 64, 0.5, -0.5)).toBeGreaterThan(0.9)
    expect(sampleHeight(g, 64, -0.8, 0.8)).toBeLessThan(0.05)
  })
})
