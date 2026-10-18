import { describe, it, expect } from 'vitest'
import { posicionLanzador } from './posicion'

describe('dónde aparece el lanzador', () => {
  it('centrado y en el tercio superior de la pantalla en la que estás', () => {
    expect(posicionLanzador({ x: 0, y: 0, width: 1920, height: 1080 })).toEqual({ x: 580, y: 216, width: 760, height: 520 })
  })
  it('en una segunda pantalla, dentro de ella; en pantallas pequeñas no se sale', () => {
    expect(posicionLanzador({ x: 1920, y: 0, width: 1280, height: 800 })).toMatchObject({ x: 1920 + 260, y: 160 })
    const p = posicionLanzador({ x: 0, y: 0, width: 700, height: 500 })
    expect(p.width).toBeLessThanOrEqual(700 - 32); expect(p.y + p.height).toBeLessThanOrEqual(500)
  })
})
