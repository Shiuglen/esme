import { describe, expect, it } from 'vitest'
import { esNegativaTexto } from './negativa'

describe('esNegativaTexto — la negativa por palabras (conservadora)', () => {
  it('un mensaje final corto que dice claramente que no, es negativa', () => {
    expect(esNegativaTexto('No puedo hacer eso.')).toBe(true)
    expect(esNegativaTexto('  Lo siento, no puedo ayudarte con eso.  ')).toBe(true)
    expect(esNegativaTexto('No haré eso.')).toBe(true)
    expect(esNegativaTexto('No me es posible.')).toBe(true)
    expect(esNegativaTexto("I can't do that, Dave.")).toBe(true)
    expect(esNegativaTexto('I cannot comply.')).toBe(true)
    expect(esNegativaTexto("I can't help with that.")).toBe(true)
    expect(esNegativaTexto('I must decline.')).toBe(true)
  })
  it('lo terminado, lo puntual y lo largo no se acusan', () => {
    expect(esNegativaTexto(undefined)).toBe(false)
    expect(esNegativaTexto('')).toBe(false)
    expect(esNegativaTexto('   ')).toBe(false)
    expect(esNegativaTexto('He terminado: arreglé el bug y pasaron las 12 pruebas.')).toBe(false)
    expect(esNegativaTexto('no puedo ejecutar el binario por permisos del sistema; revisa chmod')).toBe(false)
    expect(esNegativaTexto('No puedo hacer eso.'.repeat(40))).toBe(false)   // >400: un mensaje largo no se acusa
  })
})
