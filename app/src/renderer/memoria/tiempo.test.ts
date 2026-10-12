import { describe, expect, it } from 'vitest'
import type { NodoRed } from './red'
import { etiquetaFecha, histograma, rangoDe, visiblesEn } from './tiempo'

const DIA = 864e5
const r = (id: string, tema: number, fecha?: number): NodoRed => ({ id, tipo: 'recuerdo', tema, tam: 1, x: 0, y: 0, fecha })
const t = (tema: number): NodoRed => ({ id: `tema:${tema}`, tipo: 'tema', tema, tam: 2, x: 0, y: 0 })
const nodos = [t(0), t(1), r('a', 0, 10 * DIA), r('b', 0, 12 * DIA), r('c', 1, 15 * DIA), r('d', 0)]

describe('el tiempo de la mente', () => {
  it('el rango va del recuerdo con fecha más viejo al más nuevo', () => {
    expect(rangoDe(nodos)).toEqual({ desde: 10 * DIA, hasta: 15 * DIA })
    expect(rangoDe([t(0), r('x', 0)])).toBeNull()
  })
  it('en un instante del pasado solo existe lo ya recordado, y los temas que ya tenían algo', () => {
    const v = visiblesEn(nodos, 12 * DIA)
    expect([...v.ids].sort()).toEqual(['a', 'b', 'd', 'tema:0'])
    expect(v.porTema.get(0)).toBe(3) // d no tiene fecha (atlas viejo): no se puede esconder lo que no sabemos cuándo llegó
    expect(v.porTema.get(1) ?? 0).toBe(0)
  })
  it('el histograma reparte los recuerdos con fecha en cubos iguales', () => {
    expect(histograma(nodos, 10 * DIA, 16 * DIA, 6)).toEqual([1, 0, 1, 0, 0, 1])
    expect(histograma([r('z', 0, 16 * DIA)], 10 * DIA, 16 * DIA, 6)).toEqual([0, 0, 0, 0, 0, 1])
    expect(histograma([r('z', 0, 5 * DIA)], 5 * DIA, 5 * DIA, 3)).toEqual([0, 0, 1])
  })
  it('las fechas se dicen como las diría una persona', () => {
    const ahora = new Date(2026, 9, 12, 18).getTime()
    expect(etiquetaFecha(new Date(2026, 9, 12, 9).getTime(), ahora)).toBe('Hoy')
    expect(etiquetaFecha(new Date(2026, 9, 11, 23).getTime(), ahora)).toBe('Ayer')
    expect(etiquetaFecha(new Date(2026, 8, 27, 12).getTime(), ahora)).toBe('27 sept')
    expect(etiquetaFecha(new Date(2025, 0, 5).getTime(), ahora)).toBe('5 ene 2025')
  })
})
