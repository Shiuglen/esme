import { describe, expect, it } from 'vitest'
import { marcoDe } from './marcos'

describe('el sitio que deja libre cada navegación', () => {
  it('la leyenda y el riel ocupan una columna a la izquierda: las hojas empiezan después', () => {
    for (const nav of ['leyenda', 'riel'] as const) {
      expect(marcoDe(nav).izquierda).toBe(76)
      expect(marcoDe(nav).abajo).toBe(12)
    }
  })
  it('en reposo la leyenda abierta es ancha; el riel siempre es fino', () => {
    expect(marcoDe('leyenda').inicio).toBe(300)
    expect(marcoDe('riel').inicio).toBe(76)
    expect(marcoDe('riel').portada.izquierda).toBeLessThan(marcoDe('leyenda').portada.izquierda)
  })
  it('el saludo nunca queda debajo del riel (columna de 12 a 64 px)', () => {
    expect(marcoDe('riel').portada.cabecera).toBeGreaterThanOrEqual(76)
    expect(marcoDe('leyenda').portada.cabecera).toBe(28)
  })
  it('el muelle vive abajo: libera la izquierda y reserva su franja inferior', () => {
    const m = marcoDe('muelle')
    expect(m.izquierda).toBe(12)
    expect(m.abajo).toBeGreaterThanOrEqual(70)
    expect(m.portada.abajo).toBeGreaterThan(m.abajo - 12)
  })
})
