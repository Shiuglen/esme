import { describe, expect, it } from 'vitest'
import { sombras } from './grabado'

// 0 = sin rayas, 1 = rayado suelto, 2 = rayado medio, 3 = rayado cruzado
describe('grabado: la luz de tu sol en las caras de las máquinas', () => {
  it('por la mañana el sol entra por la izquierda: esa cara queda clara y la derecha en sombra', () => {
    expect(sombras(300, false)).toEqual({ arriba: 1, izquierda: 1, derecha: 3 })
  })
  it('por la tarde, al revés', () => {
    expect(sombras(60, false)).toEqual({ arriba: 1, izquierda: 3, derecha: 1 })
  })
  it('a mediodía la luz viene de arriba: las dos caras a media sombra y la de arriba limpia', () => {
    expect(sombras(0, false)).toEqual({ arriba: 0, izquierda: 2, derecha: 2 })
  })
  it('de noche es un esgrafiado: se raya la luz, así que lo iluminado lleva más líneas y la sombra ninguna', () => {
    expect(sombras(0, true)).toEqual({ arriba: 2, izquierda: 0, derecha: 0 })
    expect(sombras(300, true)).toEqual({ arriba: 1, izquierda: 1, derecha: 0 })
  })
})
