import { describe, expect, it } from 'vitest'
import { CATEGORIAS, RECETAS } from './recetas'

describe('las recetas del Taller: encargos completos listos para lanzar', () => {
  it('al menos doce, con títulos únicos y en categorías conocidas', () => {
    expect(RECETAS.length).toBeGreaterThanOrEqual(12)
    expect(new Set(RECETAS.map((r) => r.titulo)).size).toBe(RECETAS.length)
    for (const r of RECETAS) expect(CATEGORIAS, r.titulo).toContain(r.categoria)
  })
  it('cada encargo es concreto: dice qué hacer, cómo comprobarlo y qué entregar', () => {
    for (const r of RECETAS) {
      expect(r.encargo.length, r.titulo).toBeGreaterThan(160)
      expect(r.descripcion.length, r.titulo).toBeGreaterThan(20)
    }
  })
})
