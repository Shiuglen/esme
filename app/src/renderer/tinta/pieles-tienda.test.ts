import { describe, expect, it } from 'vitest'
import { PIELES_TIENDA } from './pieles-tienda'
import { revisarContraste, validarPiel, variablesDePiel } from './piel'

describe('la colección de lanzamiento de la Tienda', () => {
  it('al menos doce pieles, muy distintas (nombres, superficies y escenas variadas)', () => {
    expect(PIELES_TIENDA.length).toBeGreaterThanOrEqual(12)
    expect(new Set(PIELES_TIENDA.map((p) => p.piel.nombre)).size).toBe(PIELES_TIENDA.length)
    expect(new Set(PIELES_TIENDA.map((p) => p.piel.piezas.superficie)).size).toBeGreaterThanOrEqual(5)
    expect(new Set(PIELES_TIENDA.map((p) => p.piel.escena)).size).toBeGreaterThanOrEqual(8)
  })
  it('todas son válidas y se leen de día y de noche', () => {
    for (const { piel } of PIELES_TIENDA) {
      expect(validarPiel(piel), piel.nombre).toEqual({ ok: true, piel })
      if (piel.color.tipo !== 'estilo') for (const t of ['noche', 'dia'] as const) expect(revisarContraste(variablesDePiel(piel, t)), `${piel.nombre} ${t}`).toEqual([])
    }
  })
  it('cada una tiene descripción y etiquetas para buscarla', () => {
    for (const p of PIELES_TIENDA) { expect(p.descripcion.length, p.piel.nombre).toBeGreaterThan(10); expect(p.etiquetas.length).toBeGreaterThan(0) }
  })
})
