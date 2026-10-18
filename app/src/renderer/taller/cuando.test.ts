import { describe, it, expect } from 'vitest'
import { cuandoDe, fraseCuando } from './cuando'

const SAB_2230 = new Date(2026, 9, 17, 22, 30).getTime()   // sábado
const SAB_0200 = new Date(2026, 9, 17, 2, 0).getTime()

describe('de la opción elegida a la regla de la agenda', () => {
  it('ahora no programa nada', () => { expect(cuandoDe({ modo: 'ahora' }, SAB_2230)).toBeNull() })
  it('esta noche: las 3:00 que vienen (si ya es de madrugada antes de las 3, hoy mismo)', () => {
    expect(cuandoDe({ modo: 'noche' }, SAB_2230)).toEqual({ tipo: 'una', ms: new Date(2026, 9, 18, 3, 0).getTime() })
    expect(cuandoDe({ modo: 'noche' }, SAB_0200)).toEqual({ tipo: 'una', ms: new Date(2026, 9, 17, 3, 0).getTime() })
  })
  it('mañana a las 9:00', () => {
    expect(cuandoDe({ modo: 'manana' }, SAB_2230)).toEqual({ tipo: 'una', ms: new Date(2026, 9, 18, 9, 0).getTime() })
  })
  it('cada día a una hora, todos los días o solo laborables', () => {
    expect(cuandoDe({ modo: 'diaria', hora: '07:30' }, SAB_2230)).toEqual({ tipo: 'diaria', hora: 7, minuto: 30 })
    expect(cuandoDe({ modo: 'diaria', hora: '07:30', laborables: true }, SAB_2230)).toEqual({ tipo: 'diaria', hora: 7, minuto: 30, dias: [1, 2, 3, 4, 5] })
    expect(cuandoDe({ modo: 'diaria', hora: 'nada' }, SAB_2230)).toBeNull()
  })
})

describe('la regla dicha en una frase', () => {
  it('se lee como lo dirías tú', () => {
    expect(fraseCuando({ tipo: 'diaria', hora: 7, minuto: 5 })).toBe('Cada día a las 7:05')
    expect(fraseCuando({ tipo: 'diaria', hora: 7, minuto: 0, dias: [1, 2, 3, 4, 5] })).toBe('De lunes a viernes a las 7:00')
    expect(fraseCuando({ tipo: 'diaria', hora: 20, minuto: 0, dias: [0, 6] })).toBe('Sábados y domingos a las 20:00')
    expect(fraseCuando({ tipo: 'una', ms: new Date(2026, 9, 18, 3, 0).getTime() }, SAB_2230)).toBe('Mañana a las 3:00')
    expect(fraseCuando({ tipo: 'una', ms: new Date(2026, 9, 17, 23, 15).getTime() }, SAB_2230)).toBe('Hoy a las 23:15')
  })
})
