import { describe, expect, it } from 'vitest'
import { deshacer, historialDe, rehacer, vestir } from './historial'
import { PIEL_BASE, type Piel } from './piel'

const p = (nombre: string): Piel => ({ ...PIEL_BASE, nombre })
describe('el historial de pieles', () => {
  it('vestir guarda la anterior; deshacer y rehacer van y vuelven', () => {
    let h = historialDe(p('A'))
    h = vestir(h, p('B')); h = vestir(h, p('C'))
    expect(h.actual.nombre).toBe('C')
    h = deshacer(h); expect(h.actual.nombre).toBe('B')
    h = deshacer(h); expect(h.actual.nombre).toBe('A')
    expect(deshacer(h)).toBe(h) // no hay más atrás
    h = rehacer(h); expect(h.actual.nombre).toBe('B')
  })
  it('vestir algo nuevo después de deshacer borra lo que había adelante', () => {
    let h = vestir(vestir(historialDe(p('A')), p('B')), p('C'))
    h = vestir(deshacer(h), p('D'))
    expect(h.futuro).toEqual([])
    expect(h.pasado.map((x) => x.nombre)).toEqual(['A', 'B'])
  })
  it('recuerda como mucho 30 pasos', () => {
    let h = historialDe(p('0'))
    for (let i = 1; i <= 40; i++) h = vestir(h, p(String(i)))
    expect(h.pasado).toHaveLength(30)
    expect(h.pasado[0].nombre).toBe('10')
  })
})
