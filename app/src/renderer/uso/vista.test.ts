import { describe, expect, it } from 'vitest'
import { diasSeguidos, rejillaActividad } from './vista'

const d = (s: string) => new Date(`${s}T12:00:00`)

describe('diasSeguidos', () => {
  it('rellena los días sin datos con cero y acaba hoy', () => {
    const r = diasSeguidos([{ dia: '2026-10-10', costeUSD: 1, tokens: 100 }], d('2026-10-12'), 3)
    expect(r.map((x) => x.dia)).toEqual(['2026-10-10', '2026-10-11', '2026-10-12'])
    expect(r.map((x) => x.tokens)).toEqual([100, 0, 0])
  })
})

describe('rejillaActividad', () => {
  it('semanas completas que empiezan en lunes, con hoy dentro y el futuro marcado', () => {
    const g = rejillaActividad([], d('2026-10-12'), 4)   // 12-oct-2026 es lunes
    expect(g).toHaveLength(4)
    expect(g.every((s) => s.length === 7)).toBe(true)
    expect(g[3][0].dia).toBe('2026-10-12')
    expect(g[3][1].futuro).toBe(true)
  })
  it('niveles 0..4 por cuantiles; sin actividad, nivel 0', () => {
    const datos = [10, 20, 30, 40, 1000].map((t, i) => ({ dia: `2026-10-0${i + 5}`, costeUSD: 0, tokens: t }))
    const g = rejillaActividad(datos, d('2026-10-12'), 2).flat()
    const nivel = (dia: string) => g.find((c) => c.dia === dia)!.nivel
    expect(nivel('2026-10-12')).toBe(0)
    expect(nivel('2026-10-09')).toBe(4)
    expect(nivel('2026-10-05')).toBeGreaterThanOrEqual(1)
  })
})
