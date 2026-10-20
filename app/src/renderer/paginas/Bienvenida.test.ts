import { describe, expect, it } from 'vitest'
import { PRIMEROS_PASES } from './Bienvenida'

describe('la bienvenida', () => {
  it('ofrece tres primeros pases, y no son menos', () => {
    expect(PRIMEROS_PASES).toHaveLength(3)
  })

  it('cada primer paso es real: se puede hacer con lo que hay hoy', () => {
    for (const p of PRIMEROS_PASES) {
      expect(p.texto.length).toBeGreaterThan(20)
      expect(p.pista.length).toBeGreaterThan(3)
    }
    // los tres caminos de Esme: la mente, las manos y el equipo
    const todo = PRIMEROS_PASES.map((p) => p.texto.toLowerCase()).join(' ')
    expect(todo).toContain('recuerdo')
    expect(todo).toContain('busca')
    expect(todo).toContain('equipo')
  })

  it('ninguno promete lo que no existe', () => {
    const todo = PRIMEROS_PASES.map((p) => p.texto.toLowerCase()).join(' ')
    expect(todo).not.toContain('internet seguro')
    expect(todo).not.toContain('perfecto')
  })
})
