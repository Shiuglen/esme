import { describe, it, expect } from 'vitest'
import { brilloDe, estadoDelDia, nombreDeTema, temasVisibles } from './mando-vivo'

const AHORA = new Date(2026, 9, 18, 17, 0).getTime()
const base = { listas: 0, trabajando: 0, esperan: 0, programados: [] as { texto: string; proxima: number | null }[], temas: 17, recuerdos: 2346, ahora: AHORA }

describe('lo que cuenta la portada de tu mundo', () => {
  it('lo urgente primero: quién te espera, luego quién trabaja y lo que está listo', () => {
    const f = estadoDelDia({ ...base, esperan: 1, trabajando: 2, listas: 15 })
    expect(f[0]).toBe('1 agente te espera.')
    expect(f[1]).toBe('2 agentes trabajan para ti ahora mismo.')
    expect(f[2]).toBe('15 tareas están listas para que las revises.')
  })
  it('cuenta lo que hará el equipo solo, con su hora', () => {
    const f = estadoDelDia({ ...base, programados: [{ texto: 'revisa los tests', proxima: new Date(2026, 9, 19, 3, 0).getTime() }, { texto: 'x', proxima: null }] })
    expect(f).toContain('Mañana a las 3:00 tu equipo hará «revisa los tests» solo.')
  })
  it('sin nada pendiente, habla de tu mente; como mucho tres frases', () => {
    expect(estadoDelDia(base)).toEqual(['Tu mente guarda 2.346 recuerdos en 17 temas.'])
    expect(estadoDelDia({ ...base, esperan: 2, trabajando: 1, listas: 3, programados: [{ texto: 'y', proxima: AHORA + 3600_000 }] })).toHaveLength(3)
  })
  it('sin mente no dice que tiene cero recuerdos: eso es mentir', () => {
    expect(estadoDelDia({ ...base, recuerdos: 0, temas: 0, mente: 'apagado' })).toEqual(['Tu mente está apagada: enciéndela y vuelve a acordarse de ti.'])
    expect(estadoDelDia({ ...base, recuerdos: 0, temas: 0, mente: 'conectando' })).toEqual(['Despertando tu mente…'])
  })
  it('con la mente en blanco dice que está en blanco (y no que guarda cero)', () => {
    expect(estadoDelDia({ ...base, recuerdos: 0, temas: 0, mente: 'viva' })).toEqual(['Tu mente está en blanco: todavía no recuerda nada de ti. Cuéntale algo y guárdalo.'])
  })
})

describe('los temas de la constelación', () => {
  it('un tema se nombra con la palabra que más dice, no con verbos sueltos', () => {
    expect(nombreDeTema({ terms: ['quieras', 'necesitamos'], label: 'quieras · necesitamos' })).toBe('Necesitamos')
    expect(nombreDeTema({ terms: ['git', 'diff'], label: 'git · diff' })).toBe('Git')
    expect(nombreDeTema({ terms: ['dragón', 'renders'], label: 'dragón · renders' })).toBe('Dragón')
    expect(nombreDeTema({ terms: ['Sakoi', 'DeepSeek'], label: 'Sakoi · DeepSeek' })).toBe('Sakoi')
    expect(nombreDeTema({ terms: [], label: '' })).toBe('')
  })
  it('se rotulan solo los más grandes', () => {
    const c = [{ id: 0, label: 'a', terms: ['alfa'], x: 0, y: 0, size: 5 }, { id: 1, label: 'b', terms: ['beta'], x: 0, y: 0, size: 50 }, { id: 2, label: 'c', terms: ['gamma'], x: 0, y: 0, size: 20 }]
    expect(temasVisibles(c, 2).map((t) => t.nombre)).toEqual(['Beta', 'Gamma'])
  })
})

describe('el brillo de lo reciente', () => {
  it('lo de hoy brilla del todo, lo de hace un mes casi nada, sin fecha nada', () => {
    expect(brilloDe(new Date(AHORA - 3600_000).toISOString(), AHORA)).toBeGreaterThan(0.9)
    expect(brilloDe(new Date(AHORA - 30 * 864e5).toISOString(), AHORA)).toBeLessThan(0.1)
    expect(brilloDe(undefined, AHORA)).toBe(0)
  })
})
