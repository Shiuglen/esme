import { describe, it, expect } from 'vitest'
import { alCerrarVentana, resumenBandeja } from './segundo-plano'

describe('al cerrar la ventana', () => {
  it('en automático, se queda junto al reloj solo si hay algo pendiente', () => {
    expect(alCerrarVentana({ preferencia: 'auto', programados: 0, trabajando: 0 })).toBe('salir')
    expect(alCerrarVentana({ preferencia: 'auto', programados: 2, trabajando: 0 })).toBe('ocultar')
    expect(alCerrarVentana({ preferencia: 'auto', programados: 0, trabajando: 1 })).toBe('ocultar')
  })
  it('«siempre» y «nunca» mandan sobre lo pendiente', () => {
    expect(alCerrarVentana({ preferencia: 'siempre', programados: 0, trabajando: 0 })).toBe('ocultar')
    expect(alCerrarVentana({ preferencia: 'nunca', programados: 3, trabajando: 2 })).toBe('salir')
  })
  it('una preferencia desconocida se trata como automático', () => {
    expect(alCerrarVentana({ preferencia: 'quizas' as never, programados: 1, trabajando: 0 })).toBe('ocultar')
  })
})

describe('lo que dice el icono junto al reloj', () => {
  it('cuenta lo que hace el equipo y cuándo toca lo próximo', () => {
    expect(resumenBandeja({ programados: 2, trabajando: 1, proxima: new Date(2026, 9, 18, 7, 0).getTime() }))
      .toBe('Esme · 1 agente trabajando · 2 encargos programados (próximo a las 7:00)')
  })
  it('sin nada pendiente, solo su nombre', () => {
    expect(resumenBandeja({ programados: 0, trabajando: 0, proxima: null })).toBe('Esme')
  })
})
