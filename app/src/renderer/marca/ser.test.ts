// El nacimiento es determinista: mismo atlas y semilla, misma criatura; distinta semilla, bichito distinto.
import { describe, expect, it } from 'vitest'
import type { Firma } from './sello'
import { nacer, huella, rio } from './ser'

const firma: Firma = [
  { id: 0, label: 'motores', x: 0.2, y: 0.3, size: 3 },
  { id: 1, label: 'app', x: 0.7, y: 0.2, size: 1.2 },
  { id: 2, label: 'diseño', x: 0.5, y: 0.7, size: 2.6 },
  { id: 3, label: 'memoria', x: 0.8, y: 0.6, size: 1.8 },
  { id: 4, label: 'taller', x: 0.3, y: 0.8, size: 2.2 },
  { id: 5, label: 'uso', x: 0.9, y: 0.4, size: 1 },
  { id: 6, label: 'chat', x: 0.4, y: 0.45, size: 1.4 },
  { id: 7, label: 'red', x: 0.6, y: 0.65, size: 0.9 },
]

describe('huella y rio', () => {
  it('la huella es estable y el río determinista', () => {
    expect(huella('esme')).toBe(huella('esme'))
    expect(huella('a')).not.toBe(huella('b'))
    const a = rio(huella('x')), b = rio(huella('x'))
    expect([...Array(6)].map(() => a())).toEqual([...Array(6)].map(() => b()))
    expect([...Array(20)].map(() => a()).every((v) => v >= 0 && v < 1)).toBe(true)
  })
})

describe('nacer', () => {
  it('misma firma y semilla: misma criatura; otra semilla: otra criatura', () => {
    const a = nacer(firma, 'motor:qwen-code'), b = nacer(firma, 'motor:qwen-code')
    expect(a).toEqual(b)
    expect(nacer(firma, 'motor:pi-acp').cuerpo).not.toBe(a.cuerpo)
  })

  it('la forma de casa (sin mente) es un panal digno con dos ojos', () => {
    const f = nacer([], 'la-casa')
    expect(f.cuerpo.startsWith('M')).toBe(true)
    expect(f.cuerpo.endsWith('Z')).toBe(true)
    expect(f.ojos).toHaveLength(2)
    expect(f.asientos).toEqual([])
  })

  it('el bichito carga sus temas como trama, lleva ojos y patas dentro de rangos sanos', () => {
    const f = nacer(firma, 'motor:qwen-code')
    expect(f.cuerpo).not.toContain('NaN')
    expect(f.ojos.length).toBeGreaterThanOrEqual(1)
    expect(f.ojos.length).toBeLessThanOrEqual(3)
    expect(f.patas.length).toBeGreaterThanOrEqual(2)
    expect(f.patas.length).toBeLessThanOrEqual(4)
    expect(f.giro).toBeGreaterThanOrEqual(-5)
    expect(f.giro).toBeLessThanOrEqual(5)
    expect(f.pulso).toBeGreaterThan(2.3)
    expect(f.pulso).toBeLessThan(4.5)
    // la trama son los temas del trozo: en 0–100 y dentro del cuerpo
    expect(f.asientos.length).toBeGreaterThan(0)
    for (const [x, y] of f.asientos) { expect(x).toBeGreaterThanOrEqual(10); expect(x).toBeLessThanOrEqual(90); expect(y).toBeGreaterThan(15); expect(y).toBeLessThan(90) }
  })
})
