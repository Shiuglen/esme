import { describe, expect, it } from 'vitest'
import { firmaDe, giroSello, trazosSello } from './sello'

describe('el sello nace de tu mente', () => {
  const firma = [{ x: 0, y: 0, size: 100 }, { x: 1, y: 0, size: 25 }, { x: 0, y: 1, size: 4 }]
  it('cada tema es un punto dentro del sello, con margen, y el tema más grande es el punto más grande', () => {
    const { puntos } = trazosSello(firma)
    for (const p of puntos) for (const v of [p.x, p.y]) { expect(v).toBeGreaterThanOrEqual(20); expect(v).toBeLessThanOrEqual(80) }
    expect(puntos[0].r).toBeGreaterThan(puntos[1].r)
    expect(puntos[1].r).toBeGreaterThan(puntos[2].r)
  })
  it('cada punto se une a su vecino más cercano, sin repetir trazos', () => {
    expect(trazosSello(firma).lineas).toHaveLength(2)
  })
  it('una mente sin temas aún tiene sello: un punto en el centro', () => {
    expect(trazosSello([])).toEqual({ puntos: [{ x: 50, y: 50, r: 9 }], lineas: [] })
  })
  it('la misma tarea se sella siempre con la misma inclinación, y apenas torcida', () => {
    expect(giroSello('t1')).toBe(giroSello('t1'))
    expect(Math.abs(giroSello('t1'))).toBeLessThanOrEqual(4)
    expect(giroSello('t1')).not.toBe(giroSello('otra'))
  })
  it('la firma son los temas más grandes del atlas, doce como mucho', () => {
    const clusters = Array.from({ length: 20 }, (_, i) => ({ id: i, label: '', x: i, y: 0, size: i + 1 }))
    const f = firmaDe({ points: [], clusters })
    expect(f).toHaveLength(12)
    expect(f[0].size).toBe(20)
  })
})
