// La regla de qué es un turno: lo dice el mensaje del commit, no el sitio que ocupa.
import { describe, expect, it } from 'vitest'
import { mensajeTurno, numeroTurno, turnosDe } from './turnos'

describe('turnos', () => {
  it('el número de turno sale del mensaje', () => {
    expect(numeroTurno(mensajeTurno(3))).toBe(3)
    expect(numeroTurno('Esme: turno 12')).toBe(12)
    expect(numeroTurno('Esme: guardado en la rama')).toBeNull()
    expect(numeroTurno('Esme: turno')).toBeNull()
    expect(numeroTurno('esme: turno 2')).toBe(2)
  })

  it('los commits que no son turnos no cuentan como turnos', () => {
    const puntos = [{ sha: 'a', turno: 1 }, { sha: 'b', turno: null }, { sha: 'c', turno: 2 }]
    expect(turnosDe(puntos)).toEqual([{ n: 1, sha: 'a' }, { n: 2, sha: 'c' }])
    expect(turnosDe([])).toEqual([])
  })
})
