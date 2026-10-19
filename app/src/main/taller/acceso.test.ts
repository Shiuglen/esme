import { describe, expect, it } from 'vitest'
import { accesoValido, autoRespuesta } from './acceso'

const opciones = [{ id: 'si', tipo: 'allow_once' }, { id: 'siempre', tipo: 'allow_always' }, { id: 'no', tipo: 'reject_once' }]

describe('modos de acceso por tarea (idea de MonoCode, MIT; reescrito para Esme)', () => {
  it('«preguntar» nunca aprueba solo', () => {
    expect(autoRespuesta('preguntar', 'edit', opciones)).toBeNull()
  })
  it('«ediciones» aprueba leer, editar, buscar y mover dentro de la copia; pregunta lo que ejecuta o sale a la red', () => {
    for (const c of ['read', 'edit', 'search', 'delete', 'move', 'think']) expect(autoRespuesta('ediciones', c, opciones), c).toBe('si')
    for (const c of ['execute', 'fetch', 'other', undefined]) expect(autoRespuesta('ediciones', c, opciones), String(c)).toBeNull()
  })
  it('«todo» aprueba cualquier cosa, siempre una sola vez (nunca «siempre» por su cuenta)', () => {
    expect(autoRespuesta('todo', 'execute', opciones)).toBe('si')
    expect(autoRespuesta('todo', undefined, [{ id: 'ok', tipo: 'allow_always' }])).toBe('ok')
  })
  it('si el agente no ofrece cómo aprobar, pregunta', () => {
    expect(autoRespuesta('todo', 'edit', [{ id: 'no', tipo: 'reject_once' }])).toBeNull()
  })
  it('solo valen los tres modos', () => {
    expect(accesoValido('ediciones')).toBe(true)
    expect(accesoValido('root')).toBe(false)
  })
})
