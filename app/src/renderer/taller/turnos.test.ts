// Los turnos en la vista: qué puntos dejó cada turno, a cuáles se puede volver y qué se dice
// cuando se vuelve. El proceso principal dice qué es un turno; aquí se cuenta y se explica.
import { describe, expect, it } from 'vitest'
import { aDondeVolver, fraseVuelta, sePuedeDeshacer, turnos, type Punto } from './turnos'

const punto = (n: number, sha = `sha${n}`): Punto => ({ sha, mensaje: `Esme: turno ${n}`, turno: n })

describe('turnos', () => {
  it('sólo cuenta los puntos que son turnos, en orden', () => {
    const p = [punto(1), { sha: 'x', mensaje: 'Esme: guardado', turno: null }, punto(2)]
    expect(turnos(p).map((t) => t.n)).toEqual([1, 2])
    expect(turnos([])).toEqual([])
  })

  it('se puede volver a todos menos el último: volver al último no deshace nada', () => {
    const t = turnos([punto(1), punto(2), punto(3)])
    expect(aDondeVolver(t).map((x) => x.n)).toEqual([1, 2])
    expect(aDondeVolver(turnos([punto(1)]))).toEqual([])
  })

  it('deshacer el último turno necesita un punto anterior', () => {
    expect(sePuedeDeshacer(turnos([punto(1)]))).toBe(false)
    expect(sePuedeDeshacer(turnos([punto(1), punto(2)]))).toBe(true)
    expect(sePuedeDeshacer([])).toBe(false)
  })

  it('la frase dice qué vuelve y qué se queda fuera, sin prometer más', () => {
    const t = turnos([punto(1), punto(2), punto(3)])
    expect(fraseVuelta(t[0], 3)).toBe('La copia vuelve a como estaba al terminar el turno 1: los 2 turnos siguientes ya no están en ella. Tu carpeta no se toca.')
    expect(fraseVuelta(t[1], 3)).toContain('el turno siguiente ya no está en ella')
    expect(fraseVuelta(t[1], 3)).toContain('Tu carpeta no se toca.')
  })
})
