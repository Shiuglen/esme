import { describe, expect, it } from 'vitest'
import { impulso, lineasSenal, pulso } from './senal'

describe('pulso (potencial de acción)', () => {
  it('dispara en c, cae bajo la base después y vuelve a cero lejos', () => {
    expect(pulso(0.5, 0.5)).toBeGreaterThan(0.95)
    expect(pulso(0.5 + 0.15, 0.5)).toBeLessThan(0)          // la caída bajo la base que delata a una neurona
    expect(Math.abs(pulso(0.02, 0.5))).toBeLessThan(0.01)
    expect(Math.abs(pulso(0.98, 0.5))).toBeLessThan(0.01)
  })
  it('sube más rápido de lo que baja', () => {
    expect(pulso(0.5 - 0.06, 0.5)).toBeLessThan(pulso(0.5 + 0.06, 0.5))
  })
})

describe('lineasSenal', () => {
  it('devuelve N líneas del fondo al frente, la del frente más gruesa y con la cresta más alta', () => {
    const ls = lineasSenal({ lineas: 5 })
    expect(ls).toHaveLength(5)
    expect(ls[4].grosor).toBeGreaterThan(ls[0].grosor)
    expect(ls[4].f).toBe(1)
    expect(ls[0].d.startsWith('M')).toBe(true)
    const altura = (l: (typeof ls)[number]) => l.base - l.cresta[1]
    expect(altura(ls[4])).toBeGreaterThan(altura(ls[0]))
  })
  it('es estable: misma entrada, mismo trazo (sin azar)', () => {
    expect(lineasSenal({ lineas: 3, t: 1.2 })[1].d).toBe(lineasSenal({ lineas: 3, t: 1.2 })[1].d)
  })
})

describe('impulso', () => {
  it('nace y muere apagado, y brilla a mitad de camino', () => {
    expect(impulso(0).luz).toBeCloseTo(0, 5)
    expect(impulso(0.45).luz).toBeGreaterThan(0.9)
    expect(impulso(1.2).luz).toBe(0)
  })
})
