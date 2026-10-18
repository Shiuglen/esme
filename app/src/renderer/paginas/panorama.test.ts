import { describe, expect, it } from 'vitest'
import type { TareaTaller } from '../lib/bridge'
import type { Atlas } from '../lib/brain'
import { panoramaDe } from './panorama'

const AHORA = Date.UTC(2026, 9, 17, 22)
const atlas: Atlas = {
  clusters: [{ id: 0, label: 'pruebas', terms: ['pytest', 'assert'], x: 0, y: 0, size: 420 }, { id: 1, label: 'git', x: 0, y: 0, size: 310 }, { id: 2, label: 'Caracas', x: 0, y: 0, size: 12 }],
  points: [
    { id: 'a', x: 0, y: 0, h: 0, cluster: 0, kind: 'note', source: 'x', ts: new Date(AHORA - 3600e3).toISOString() },
    { id: 'b', x: 0, y: 0, h: 0, cluster: 1, kind: 'note', source: 'x', ts: new Date(AHORA - 30 * 864e5).toISOString() },
  ],
}
const tarea = (p: Partial<TareaTaller>) => ({ id: 't', titulo: 'tests', motorNombre: 'Qwen Code', estado: 'trabajando', ...p }) as TareaTaller

describe('el panorama de tu mente para Esme', () => {
  it('los temas por peso, con sus palabras clave', () => {
    const p = panoramaDe(atlas, [], AHORA)
    expect(p).toMatch(/pruebas \(420; pytest, assert\), git \(310\), Caracas \(12\)/)
  })
  it('lo reciente: cuántos recuerdos llegaron hoy y de qué tema', () => {
    expect(panoramaDe(atlas, [], AHORA)).toMatch(/Hoy llegaron 1 recuerdos?, sobre todo de «pruebas»/)
  })
  it('el Taller: lo que trabaja, lo que espera y lo listo para revisar', () => {
    const p = panoramaDe(null, [tarea({}), tarea({ id: 'b', estado: 'esperando' }), tarea({ id: 'c', estado: 'lista', titulo: 'modo oscuro' })], AHORA)
    expect(p).toMatch(/Taller: 1 trabajando \(Qwen Code: «tests»\), 1 esperando tu permiso, 1 listas para revisar/)
  })
  it('sin cerebro ni tareas, no inventa nada', () => {
    expect(panoramaDe(null, [], AHORA)).toBe('')
  })
})
