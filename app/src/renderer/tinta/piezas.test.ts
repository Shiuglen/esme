import { describe, expect, it } from 'vitest'
import { PIEZAS } from './piezas'
import { PIEL_BASE, validarPiel } from './piel'

describe('las piezas: cada detalle de la interfaz es un hueco con muchas variantes', () => {
  it('cada hueco tiene varias variantes con nombre en español, y la de por defecto existe', () => {
    for (const [hueco, def] of Object.entries(PIEZAS)) {
      expect(def.variantes.length, hueco).toBeGreaterThanOrEqual(2)
      expect(def.variantes.map((v) => v.id), hueco).toContain(PIEL_BASE.piezas[hueco as keyof typeof PIEL_BASE.piezas])
      for (const v of def.variantes) expect(v.nombre, `${hueco}/${v.id}`).toMatch(/^[A-ZÁÉÍÓÚÑ]/)
    }
  })
  it('una piel puede elegir piezas; lo que falta se completa; lo que no existe se rechaza', () => {
    const r = validarPiel({ piezas: { saludo: 'descifrar' } })
    expect(r.ok && r.piel.piezas).toEqual({ ...PIEL_BASE.piezas, saludo: 'descifrar' })
    expect(validarPiel({ piezas: { saludo: 'explotar' } }).ok).toBe(false)
    expect(validarPiel({ piezas: { inventado: 'x' } }).ok).toBe(false)
  })
})
