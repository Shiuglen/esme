import { describe, it, expect } from 'vitest'
import { deltaDeUso } from './uso'

describe('el uso que cuenta el motor, sin creérselo a ciegas', () => {
  it('el primer informe es el del turno (la sesión acaba de empezar)', () => {
    const d = deltaDeUso({ entrada: 1_000, salida: 50, pensamiento: 0 }, undefined, 200_000)
    expect(d.delta).toEqual({ entrada: 1_000, salida: 50, pensamiento: 0 })
    expect(d.sospechoso).toBe(false)
  })
  it('un motor que informa acumulado: lo que pasó es la diferencia', () => {
    const primero = deltaDeUso({ entrada: 1_000, salida: 50, pensamiento: 0 }, undefined, 200_000)
    const segundo = deltaDeUso({ entrada: 3_500, salida: 180, pensamiento: 20 }, primero.estado, 200_000)
    expect(segundo.delta).toEqual({ entrada: 2_500, salida: 130, pensamiento: 20 })
    expect(segundo.sospechoso).toBe(false)
  })
  it('un motor que informa por turno (el contador baja): vale el valor entero', () => {
    const primero = deltaDeUso({ entrada: 200, salida: 30, pensamiento: 1 }, undefined, 200_000)
    const segundo = deltaDeUso({ entrada: 50, salida: 3, pensamiento: 0 }, primero.estado, 200_000)
    expect(segundo.delta).toEqual({ entrada: 50, salida: 3, pensamiento: 0 })
    expect(segundo.estado.modo).toBe('turno')
    // y sigue en modo turno aunque el valor suba
    const tercero = deltaDeUso({ entrada: 900, salida: 40, pensamiento: 0 }, segundo.estado, 200_000)
    expect(tercero.delta.entrada).toBe(900)
  })
  it('un salto mayor que la ventana del modelo no es de este turno: se descarta', () => {
    const antes = deltaDeUso({ entrada: 1_000, salida: 50, pensamiento: 0 }, undefined, 200_000)
    const salto = deltaDeUso({ entrada: 7_445_991, salida: 2_303_209, pensamiento: 0 }, antes.estado, 1_000_000)
    expect(salto.delta.entrada).toBe(0)
    expect(salto.sospechoso).toBe(true)
    // y se vuelve a basar en lo que dice el motor: el turno siguiente ya sale bien
    const siguiente = deltaDeUso({ entrada: 7_500_000, salida: 2_400_000, pensamiento: 0 }, salto.estado, 1_000_000)
    expect(siguiente.delta.entrada).toBe(54_009)
    expect(siguiente.sospechoso).toBe(false)
  })
  it('el primer informe que ya supera la ventana tampoco se cuenta', () => {
    const d = deltaDeUso({ entrada: 6_766_390, salida: 1_587_251, pensamiento: 0 }, undefined, 1_000_000)
    expect(d.delta.entrada).toBe(0)
    expect(d.sospechoso).toBe(true)
  })
  it('sin ventana conocida, el salto se cuenta tal cual (no se inventa una regla)', () => {
    const antes = deltaDeUso({ entrada: 1_000, salida: 5, pensamiento: 0 }, undefined, 0)
    const d = deltaDeUso({ entrada: 5_000_000, salida: 10, pensamiento: 0 }, antes.estado, 0)
    expect(d.delta.entrada).toBe(4_999_000)
    expect(d.sospechoso).toBe(false)
  })
})
