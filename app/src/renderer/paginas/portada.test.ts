import { describe, expect, it } from 'vitest'
import { fechaLarga, frasesTaller, historiaMente } from './portada'

const HORA = 36e5
describe('la portada cuenta, no enumera', () => {
  it('la fecha se escribe como en una carta', () => {
    expect(fechaLarga(new Date(2026, 9, 12))).toBe('Lunes, 12 de octubre')
  })
  it('la mente se resume en frases con lo que de verdad importa', () => {
    const ahora = Date.now()
    expect(historiaMente({ recuerdos: 2346, temas: 17, ultimo: ahora - 3 * HORA, grafito: 412 }, ahora))
      .toBe('Tu mente guarda 2346 recuerdos en 17 temas. El último llegó hace 3 horas. 412 siguen en grafito: los dijo una IA y aún no los has confirmado.')
    expect(historiaMente({ recuerdos: 1, temas: 1, ultimo: ahora - 30_000, grafito: 0 }, ahora))
      .toBe('Tu mente guarda 1 recuerdo en 1 tema. El último llegó hace un momento.')
  })
  it('una mente vacía invita a empezar', () => {
    expect(historiaMente({ recuerdos: 0, temas: 0, grafito: 0 }, Date.now())).toBe('Tu mente está en blanco. Empieza dándole tus notas desde Memoria.')
  })
  it('el Taller dice primero lo que te necesita y luego lo que puedes revisar', () => {
    const f = frasesTaller({ trabajando: 1, esperando: 2, listas: 6, errores: 1 })
    expect(f.map((x) => x.texto)).toEqual(['2 tareas te necesitan', '1 trabajando ahora', '6 listas para revisar', '1 con error'])
    expect(f[0].tono).toBe('atencion')
    expect(frasesTaller({ trabajando: 0, esperando: 0, listas: 0, errores: 0 })).toEqual([{ texto: 'En calma. Pídele algo a Esme y montará una copia aislada para trabajar.', tono: 'calma' }])
  })
})
