import { describe, it, expect } from 'vitest'
import { opcionDePermiso, pasoDeEvento, promptDeConversacion } from './conversacion-agente'

describe('la conversación a través de un agente', () => {
  it('el agente recibe quién es, lo hablado y la pregunta, con las órdenes de fuera marcadas como datos', () => {
    const p = promptDeConversacion('Eres Esme.', [{ role: 'user', content: 'hola' }, { role: 'assistant', content: '¡hola!' }, { role: 'user', content: '¿qué día es?' }])
    expect(p).toMatch(/^Eres Esme\./)
    expect(p).toContain('Usuario: hola')
    expect(p).toContain('Esme: ¡hola!')
    expect(p.trim().endsWith('¿qué día es?')).toBe(true)
    expect(p).toMatch(/no escribas ni cambies ficheros salvo que te lo pida/i)
  })
  it('las herramientas del agente se ven como pasos de Esme', () => {
    expect(pasoDeEvento({ tipo: 'herramienta', id: 'a', titulo: 'Leer README', estado: 'pending' })).toEqual({ fase: 'llama', id: 'a', nombre: 'agente__Leer README', args: {} })
    expect(pasoDeEvento({ tipo: 'herramienta', id: 'a', estado: 'completed' })).toEqual({ fase: 'resultado', id: 'a', nombre: 'agente', resumen: '' })
    expect(pasoDeEvento({ tipo: 'herramienta', id: 'a', estado: 'failed' })).toEqual({ fase: 'error', id: 'a', nombre: 'agente', error: 'falló' })
    expect(pasoDeEvento({ tipo: 'texto', texto: 'x' })).toBeNull()
  })
  it('tu respuesta en la tarjeta de permiso se traduce a la opción del agente', () => {
    const op = [{ id: 'o1', nombre: 'Permitir', tipo: 'allow_once' }, { id: 'o2', nombre: 'Siempre', tipo: 'allow_always' }, { id: 'o3', nombre: 'No', tipo: 'reject_once' }]
    expect(opcionDePermiso('una', op)).toBe('o1')
    expect(opcionDePermiso('siempre', op)).toBe('o2')
    expect(opcionDePermiso('no', op)).toBe('o3')
    expect(opcionDePermiso('siempre', [op[0]])).toBe('o1')
    expect(opcionDePermiso('no', [op[0]])).toBe('cancelar')
  })
})
