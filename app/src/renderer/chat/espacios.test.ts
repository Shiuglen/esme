import { describe, expect, it } from 'vitest'
import { espaciosLegibles } from './espacios'

describe('los espacios raros de algunos modelos se ven como espacios', () => {
  it('el espacio fino sin corte (U+202F) pasa a espacio sin corte normal: «el 10 de diciembre», no «el10dediciembre»', () => {
    expect(espaciosLegibles('el 10 de diciembre de 1815')).toBe('el 10 de diciembre de 1815')
  })
  it('los espacios finos y de cifra pasan a espacio normal y los de ancho cero desaparecen', () => {
    expect(espaciosLegibles('a b c​d⁠e')).toBe('a b cde')
  })
  it('el texto normal no cambia', () => {
    expect(espaciosLegibles('Electron v44.9.0 — hola')).toBe('Electron v44.9.0 — hola')
  })
})
