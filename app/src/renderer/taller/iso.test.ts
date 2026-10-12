import { describe, expect, it } from 'vitest'
import { asignarLugares, caja, conducto, iso, longitud, lugares, muestrear, ruta } from './iso'

describe('iso', () => {
  it('proyecta en 2:1 con la altura hacia arriba', () => {
    expect(iso(0, 0)).toEqual([0, 0])
    expect(iso(1, 0)).toEqual([50, 25])
    expect(iso(0, 1)).toEqual([-50, 25])
    expect(iso(1, 1, 1)).toEqual([0, 0])
  })
})

describe('caja', () => {
  it('da la cara de arriba y las dos caras visibles', () => {
    const c = caja(0, 0, 1, 1, 1)
    expect(c.arriba).toBe('M0 -50L50 -25L0 0L-50 -25Z')
    expect(c.derecha).toBe('M50 25L0 50L0 0L50 -25Z')
    expect(c.izquierda).toBe('M-50 25L0 50L0 0L-50 -25Z')
  })
})

describe('lugares', () => {
  it('ocho celdas alrededor del núcleo: primero los ejes, luego las diagonales', () => {
    const l = lugares()
    expect(l).toHaveLength(8)
    expect(l.slice(0, 4)).toEqual([{ x: 6, y: 4 }, { x: 4, y: 6 }, { x: 2, y: 4 }, { x: 4, y: 2 }])
    expect(new Set(l.map((p) => `${p.x},${p.y}`)).size).toBe(8)
    expect(l.every((p) => Math.max(Math.abs(p.x - 4), Math.abs(p.y - 4)) === 2)).toBe(true)
  })
})

describe('ruta', () => {
  it('en línea recta si la máquina está en un eje', () => {
    expect(ruta({ x: 6, y: 4 })).toEqual([{ x: 4.5, y: 4.5 }, { x: 6.5, y: 4.5 }])
    expect(ruta({ x: 4, y: 2 })).toEqual([{ x: 4.5, y: 4.5 }, { x: 4.5, y: 2.5 }])
  })
  it('por la calle libre si está en diagonal, sin cruzar otras máquinas', () => {
    expect(ruta({ x: 6, y: 6 })).toEqual([{ x: 4.5, y: 4.5 }, { x: 5.5, y: 4.5 }, { x: 5.5, y: 6.5 }, { x: 6.5, y: 6.5 }])
    expect(ruta({ x: 2, y: 2 })).toEqual([{ x: 4.5, y: 4.5 }, { x: 3.5, y: 4.5 }, { x: 3.5, y: 2.5 }, { x: 2.5, y: 2.5 }])
  })
})

describe('muestrear y longitud', () => {
  const l = [{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 2, y: 2 }]
  it('mide la polilínea', () => expect(longitud(l)).toBe(4))
  it('reparte puntos a la misma distancia, con u de 0 a 1', () => {
    expect(muestrear(l, 4)).toEqual([
      { x: 0, y: 0, u: 0 }, { x: 1, y: 0, u: 0.25 }, { x: 2, y: 0, u: 0.5 }, { x: 2, y: 1, u: 0.75 }, { x: 2, y: 2, u: 1 },
    ])
  })
})

describe('conducto', () => {
  const l = [{ x: 4.5, y: 4.5 }, { x: 6.5, y: 4.5 }]
  it('sin impulso es la línea plana del suelo y no tiene cresta', () => {
    const c = conducto(l, { c: -1, alto: 0.6, n: 4 })
    expect(c.d).toBe('M0 225L25 237.5L50 250L75 262.5L100 275')
    expect(c.cresta).toBeNull()
  })
  it('con el impulso en medio, el punto central sube y hay cresta', () => {
    const c = conducto(l, { c: 0.5, alto: 0.6, n: 4 })
    const medio = c.d.split('L')[2]
    expect(medio).toMatch(/^50 2[12]\d/)                 // 250 − ~0.6·50 = ~220
    expect(c.cresta).not.toBeNull()
  })
})

describe('asignarLugares', () => {
  it('cada tarea conserva su sitio y las nuevas ocupan el primer hueco', () => {
    const a = asignarLugares(new Map(), ['a', 'b'])
    expect([...a]).toEqual([['a', 0], ['b', 1]])
    const b = asignarLugares(a, ['c', 'b'])
    expect(b.get('b')).toBe(1)
    expect(b.get('c')).toBe(0)
    expect(b.has('a')).toBe(false)
  })
  it('no pasa de ocho', () => {
    const ids = Array.from({ length: 11 }, (_, i) => `t${i}`)
    expect(asignarLugares(new Map(), ids).size).toBe(8)
  })
})
