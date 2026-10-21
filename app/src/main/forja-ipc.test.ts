// El bucle de la Forja: lo que el agente recibe de un programa concreto.
//
// La regla que se comprueba aquí: si la mente **no** conoce el programa, el encargo se lo dice
// (míralo primero con el espejo). Antes se callaba y el agente adivinaba.
import { describe, expect, it } from 'vitest'
import { textoDePrograma } from './forja-ipc'

describe('lo que el encargo le dice al agente de un programa', () => {
  it('si la mente lo conoce, le da lo que sabe', () => {
    const t = textoDePrograma('/app/out', ['el canal X', 'el canal Y'])
    expect(t).toContain('Lo que Esme sabe de /app/out')
    expect(t).toContain('2 recuerdos')
    expect(t).toContain('el canal X')
    expect(t).not.toContain('espejo')
  })

  it('si la mente no lo conoce, le dice que lo mire antes', () => {
    const t = textoDePrograma('/app/out', [])
    expect(t).toContain('todavía NO es conocimiento de Esme')
    expect(t).toContain('esme_absorbe_programa')
    expect(t).toContain('/app/out')
  })

  it('si no hay recuerdos y no hay programa, tampoco inventa', () => {
    const t = textoDePrograma('/app/out', undefined)
    expect(t).toContain('todavía NO es conocimiento de Esme')
  })
})
