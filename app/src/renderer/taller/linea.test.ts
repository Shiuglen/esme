import { describe, expect, it } from 'vitest'
import { actividadActual, aplicar, plegar, type Evento } from './linea'

describe('plegar', () => {
  it('une los trozos de texto seguidos y separa por tipo', () => {
    const l = plegar([
      { tipo: 'usuario', texto: 'hazlo' },
      { tipo: 'pensamiento', texto: 'pien' }, { tipo: 'pensamiento', texto: 'so' },
      { tipo: 'texto', texto: 'Ho' }, { tipo: 'texto', texto: 'la' },
    ])
    expect(l.map((i) => i.tipo)).toEqual(['usuario', 'pensamiento', 'texto'])
    expect(l[1]).toMatchObject({ texto: 'pienso' })
    expect(l[2]).toMatchObject({ texto: 'Hola' })
  })

  it('una herramienta se actualiza en su sitio por id sin perder el título', () => {
    const l = plegar([
      { tipo: 'herramienta', id: 't1', titulo: 'Leer a.ts', estado: 'pending', clase: 'read' },
      { tipo: 'texto', texto: 'mientras' },
      { tipo: 'herramienta', id: 't1', estado: 'completed' },
    ])
    expect(l).toHaveLength(2)
    expect(l[0]).toMatchObject({ tipo: 'herramienta', titulo: 'Leer a.ts', estado: 'completed', clase: 'read' })
  })

  it('el plan se sustituye dentro del turno y cada turno nuevo tiene el suyo', () => {
    const p = (estado: string) => ({ tipo: 'plan' as const, pasos: [{ texto: 'uno', estado }] })
    const l = plegar([{ tipo: 'usuario', texto: 'a' }, p('pending'), p('completed'), { tipo: 'usuario', texto: 'b' }, p('pending')])
    expect(l.map((i) => i.tipo)).toEqual(['usuario', 'plan', 'usuario', 'plan'])
    expect(l[1]).toMatchObject({ pasos: [{ estado: 'completed' }] })
  })

  it('uso y contexto no cambian la línea', () => {
    const l = plegar([{ tipo: 'texto', texto: 'x' }])
    expect(aplicar(l, { tipo: 'uso', entrada: 1, salida: 2 })).toBe(l)
    expect(aplicar(l, { tipo: 'contexto', usado: 1, total: 9 })).toBe(l)
  })

  it('cada elemento tiene una clave estable y única', () => {
    const ev: Evento[] = [{ tipo: 'usuario', texto: 'a' }, { tipo: 'texto', texto: 'b' }, { tipo: 'herramienta', id: 'h', titulo: 'c' }, { tipo: 'fin', motivo: 'end_turn', ms: 5 }]
    const claves = plegar(ev).map((i) => i.clave)
    expect(new Set(claves).size).toBe(claves.length)
    expect(plegar(ev).map((i) => i.clave)).toEqual(claves)
  })
})

describe('actividadActual', () => {
  it('cuenta qué está haciendo el motor ahora mismo', () => {
    expect(actividadActual(plegar([{ tipo: 'herramienta', id: 'a', titulo: 'Editar app.tsx', estado: 'in_progress' }]))).toBe('Editar app.tsx')
    expect(actividadActual(plegar([{ tipo: 'pensamiento', texto: 'mmm' }]))).toBe('Pensando…')
    expect(actividadActual(plegar([{ tipo: 'texto', texto: 'Primera línea\nÚltima línea' }]))).toBe('Última línea')
    expect(actividadActual(plegar([{ tipo: 'texto', texto: 'x' }, { tipo: 'fin', motivo: 'end_turn', ms: 9 }]))).toBeNull()
  })
})
