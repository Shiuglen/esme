import { describe, expect, it } from 'vitest'
import { errorDelProveedor, esTemporal, necesitaSesion, sesionMuerta } from './fallos'

describe('qué fallos se van solos', () => {
  it('la red y el proveedor caídos son temporales', () => {
    expect(esTemporal('getaddrinfo ETIMEOUT opencode.ai')).toBe(true)
    expect(esTemporal('connect ECONNREFUSED 127.0.0.1:11434')).toBe(true)
    expect(esTemporal('socket hang up')).toBe(true)
    expect(esTemporal('fetch failed')).toBe(true)
    expect(esTemporal('Internal error: 503 Service Unavailable')).toBe(true)
  })

  it('lo que no se va solo no se reintenta', () => {
    expect(esTemporal('Model is unavailable')).toBe(false)
    expect(esTemporal('Authentication required: provider authentication required')).toBe(false)
    expect(esTemporal('la tarea ya existe')).toBe(false)
  })

  it('el «Internal error» del proveedor es temporal a medias (se reintenta una vez)', () => {
    expect(errorDelProveedor('Internal error')).toBe(true)
    expect(errorDelProveedor('Internal error: Rate limit exceeded')).toBe(true)
    expect(errorDelProveedor('no pudo')).toBe(false)
  })

  it('una sesión cerrada se puede volver a abrir', () => {
    expect(sesionMuerta('La sesión del motor está cerrada.')).toBe(true)
    expect(sesionMuerta('session closed')).toBe(true)
    expect(sesionMuerta('Internal error')).toBe(false)
  })

  it('lo que necesita al creador se distingue: entrar en su cuenta', () => {
    expect(necesitaSesion('Authentication required: provider authentication required')).toBe(true)
    expect(necesitaSesion('not authenticated')).toBe(true)
    expect(necesitaSesion('Internal error')).toBe(false)
  })
})
