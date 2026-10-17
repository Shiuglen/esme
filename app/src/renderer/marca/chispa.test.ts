import { describe, expect, it } from 'vitest'
import { chispaDe } from './chispa'

const radio = ([x, y]: [number, number]) => Math.hypot(x, y)
const diferencia = (a: number, b: number) => { const d = Math.abs(a - b) % (2 * Math.PI); return Math.min(d, 2 * Math.PI - d) }

describe('la chispa nace de tu mente', () => {
  it('una mente sin temas tiene una chispa base, siempre la misma', () => {
    const a = chispaDe([]), b = chispaDe([])
    expect(a.esquirlas).toHaveLength(8)
    expect(a).toEqual(b)
  })
  it('cada tema es una esquirla, y la del tema más grande es la más larga', () => {
    const temas = [{ id: 0, x: 1, y: 0, size: 400 }, { id: 1, x: -1, y: 0, size: 100 }, { id: 2, x: 0, y: 1, size: 25 }, { id: 3, x: 0, y: -1, size: 9 }]
    const c = chispaDe(temas)
    expect(c.esquirlas.map((e) => e.tema).sort()).toEqual([0, 1, 2, 3])
    const largo = (id: number) => c.esquirlas.find((e) => e.tema === id)!.largo
    expect(largo(0)).toBeGreaterThan(largo(1)); expect(largo(1)).toBeGreaterThan(largo(2)); expect(largo(2)).toBeGreaterThan(largo(3))
  })
  it('apunta hacia donde está el tema en tu mapa', () => {
    const c = chispaDe([{ id: 0, x: 5, y: 0, size: 50 }, { id: 1, x: -5, y: 0, size: 50 }, { id: 2, x: 0, y: 5, size: 50 }])
    expect(diferencia(c.esquirlas.find((e) => e.tema === 0)!.angulo, 0)).toBeLessThan(0.6)
    expect(diferencia(c.esquirlas.find((e) => e.tema === 1)!.angulo, Math.PI)).toBeLessThan(0.6)
  })
  it('las esquirlas se apartan para no pisarse, y doce como mucho', () => {
    const temas = Array.from({ length: 20 }, (_, i) => ({ id: i, x: 1 + i * 0.001, y: i * 0.001, size: 20 - i }))
    const c = chispaDe(temas)
    expect(c.esquirlas).toHaveLength(12)
    const angulos = c.esquirlas.map((e) => e.angulo).sort((a, b) => a - b)
    for (let i = 0; i < angulos.length; i++) expect(diferencia(angulos[i], angulos[(i + 1) % angulos.length])).toBeGreaterThan(0.28)
  })
  it('cada esquirla son dos facetas que comparten su lomo, y nada sale del sello', () => {
    const c = chispaDe([{ id: 0, x: 1, y: 0, size: 10 }, { id: 1, x: 0, y: 1, size: 5 }, { id: 2, x: -1, y: -1, size: 3 }])
    for (const e of c.esquirlas) {
      expect(e.clara).toHaveLength(3); expect(e.oscura).toHaveLength(3)
      expect(e.clara).toContainEqual(e.punta); expect(e.oscura).toContainEqual(e.punta)
      for (const p of [...e.clara, ...e.oscura]) expect(radio(p)).toBeLessThanOrEqual(1.05)
    }
  })
})
