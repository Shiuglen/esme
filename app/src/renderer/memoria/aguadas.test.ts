import { describe, expect, it } from 'vitest'
import { aguadasDe } from './aguadas'

const DIA = 864e5
describe('aguadas de los temas', () => {
  const p = (tema: number, x: number, y: number, fecha?: number) => ({ tema, x, y, fecha })
  it('cada tema tiene su aguada centrada en sus recuerdos', () => {
    const a = aguadasDe([p(0, 0, 0), p(0, 2, 0), p(1, 10, 10)], 0)
    const t0 = a.find((x) => x.tema === 0)!
    expect([t0.x, t0.y, t0.n]).toEqual([1, 0, 2])
  })
  it('cubre el 80 % de los recuerdos: los sueltos quedan fuera, como islas', () => {
    const pts = [...Array.from({ length: 9 }, (_, i) => p(0, Math.cos(i) * 1, Math.sin(i) * 1)), p(0, 30, 0)]
    const t0 = aguadasDe(pts, 0, 0)[0]
    expect(t0.r).toBeLessThan(10)
  })
  it('lleva la edad media de lo que contiene (sin contar lo que no tiene fecha)', () => {
    const t0 = aguadasDe([p(0, 0, 0, 10 * DIA), p(0, 1, 0, 8 * DIA), p(0, 2, 0)], 12 * DIA)[0]
    expect(t0.dias).toBeCloseTo(3, 5)
  })
})
