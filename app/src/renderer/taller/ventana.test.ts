import { describe, expect, it } from 'vitest'
import { VENTANA, ventanaDe, visiblesDe } from './ventana'
import type { ItemLinea } from './linea'

const linea = (n: number): ItemLinea[] =>
  Array.from({ length: n }, (_, k) => ({ tipo: 'texto', clave: `t${k}`, texto: `trozo ${k}` }) as ItemLinea)

describe('ventanaDe', () => {
  it('pinta sólo la cola: una línea de 17.000 elementos no se pinta entera', () => {
    const v = ventanaDe(linea(17000), VENTANA, null)
    expect(v.desde).toBe(17000 - VENTANA)
    expect(v.hasta).toBe(17000)
    expect(v.hayAntes).toBe(true)
    expect(visiblesDe(linea(17000), v)).toHaveLength(VENTANA)
  })

  it('si la línea es corta, se pinta entera (no hay ventana que hacer)', () => {
    const v = ventanaDe(linea(10), VENTANA, null)
    expect(v.desde).toBe(0)
    expect(v.hasta).toBe(10)
    expect(v.hayAntes).toBe(false)
  })

  it('con el ancla puesta, la ventana no se mueve aunque lleguen cosas nuevas', () => {
    const antes = linea(1000)
    const v1 = ventanaDe(antes, 100, 1000)
    const despues = linea(1200)                       // llegaron 200 más
    const v2 = ventanaDe(despues, 100, 1000)
    expect(v2.desde).toBe(v1.desde)
    expect(v2.hasta).toBe(v1.hasta)
    expect(ventanaDe(despues, 100, null).hasta).toBe(1200)   // sin ancla, la cola se mueve
  })

  it('el ancla nunca se sale de la línea', () => {
    const v = ventanaDe(linea(10), 100, 9999)
    expect(v.hasta).toBe(10)
    expect(v.desde).toBe(0)
  })

  it('pide siempre al menos un elemento', () => {
    const v = ventanaDe(linea(10), 0, null)
    expect(v.hasta - v.desde).toBe(1)
  })
})
