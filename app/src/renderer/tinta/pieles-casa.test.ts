import { describe, expect, it } from 'vitest'
import { PIELES_CASA } from './pieles-casa'
import { revisarContraste, validarPiel, variablesDePiel } from './piel'

describe('las pieles de casa', () => {
  it('hay muchas y muy distintas, con nombres únicos', () => {
    expect(PIELES_CASA.length).toBeGreaterThanOrEqual(10)
    expect(new Set(PIELES_CASA.map((p) => p.nombre)).size).toBe(PIELES_CASA.length)
  })
  for (const piel of PIELES_CASA) {
    it(`«${piel.nombre}» es válida y se lee de día y de noche`, () => {
      expect(validarPiel(piel)).toEqual({ ok: true, piel })
      if (piel.color.tipo !== 'estilo') for (const tema of ['noche', 'dia'] as const) expect(revisarContraste(variablesDePiel(piel, tema)), tema).toEqual([])
    })
  }
})
