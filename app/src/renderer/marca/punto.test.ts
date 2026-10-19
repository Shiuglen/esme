import { describe, expect, it } from 'vitest'
import { puntosDe, tramaPara, trazoDe } from './punto'

const media = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(xs.length, 1)

describe('el Punto: Esme dibujada en trama de imprenta', () => {
  it('todos los puntos caben en el disco y ninguno es más pequeño que el umbral', () => {
    const { puntos, paso } = puntosDe({ n: 400 })
    expect(puntos.length).toBeGreaterThan(200)
    for (const p of puntos) {
      expect(Math.hypot(p.x, p.y) + p.r).toBeLessThanOrEqual(1.0001)
      expect(p.r).toBeGreaterThanOrEqual(0.09 * paso)
    }
  })
  it('la rejilla tiene el paso que da N celdas en el disco', () => {
    expect(puntosDe({ n: 400 }).paso).toBeCloseTo(Math.sqrt(Math.PI / 400), 6)
  })
  it('la luz viene de arriba a la izquierda: allí los puntos son más gruesos', () => {
    const { puntos } = puntosDe({ n: 900 })
    const arribaIzq = puntos.filter((p) => p.x < -0.2 && p.y < -0.2).map((p) => p.r)
    const abajoDer = puntos.filter((p) => p.x > 0.2 && p.y > 0.2).map((p) => p.r)
    expect(media(arribaIzq)).toBeGreaterThan(media(abajoDer) * 1.4)
  })
  it('el centro de la luz se cierra en sólido (los puntos se tocan) y el borde se deshace', () => {
    const { puntos, paso } = puntosDe({ n: 900 })
    const max = Math.max(...puntos.map((p) => p.r))
    expect(max).toBeGreaterThanOrEqual(paso / Math.SQRT2 - 1e-9)   // en la rejilla a 45° se tocan en diagonal
    const borde = puntos.filter((p) => Math.hypot(p.x, p.y) > 0.9).map((p) => p.r)
    expect(media(borde)).toBeLessThan(max * 0.5)
  })
  it('el ángulo de la trama mueve los puntos, no cuántos hay', () => {
    const a = puntosDe({ n: 400, angulo: 45 }).puntos, b = puntosDe({ n: 400, angulo: 15 }).puntos
    expect(Math.abs(a.length - b.length)).toBeLessThan(a.length * 0.08)
    expect(a[0]).not.toEqual(b[0])
  })
  it('es determinista: mismo dibujo, mismos puntos', () => {
    expect(puntosDe({ n: 160, angulo: 30 })).toEqual(puntosDe({ n: 160, angulo: 30 }))
  })
})

describe('qué trama toca a cada tamaño', () => {
  it('pequeño: sólido; mediano: trama gruesa; grande: trama fina', () => {
    expect(tramaPara(16)).toBe(0); expect(tramaPara(24)).toBe(0)
    const m = tramaPara(64); expect(m).toBeGreaterThanOrEqual(60); expect(m).toBeLessThanOrEqual(160)
    const g = tramaPara(240); expect(g).toBeGreaterThanOrEqual(400); expect(g).toBeLessThanOrEqual(1400)
    expect(tramaPara(32)).toBeLessThan(tramaPara(96))
  })
})

describe('el trazado: todos los puntos en un solo path', () => {
  it('dos arcos por punto, con su radio; vacío si no hay puntos', () => {
    expect(trazoDe([{ x: 0, y: 0, r: 0.5 }])).toBe('M-0.5 0a0.5 0.5 0 1 0 1 0a0.5 0.5 0 1 0 -1 0')
    expect(trazoDe([])).toBe('')
    const { puntos } = puntosDe({ n: 160 })
    expect(trazoDe(puntos).match(/a/g)!.length).toBe(puntos.length * 2)
  })
})
