import { describe, it, expect } from 'vitest'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { proximaVez, tocan, validarProgramado, leerAgenda, guardarAgenda, type Programado } from './agenda'

// sábado 17 oct 2026, 22:30 hora local
const AHORA = new Date(2026, 9, 17, 22, 30).getTime()
const base = (x: Partial<Programado>): Programado =>
  ({ id: 'p-abc123', motor: 'qwen', carpeta: null, texto: 'revisa los tests', cuando: { tipo: 'una', ms: AHORA + 60_000 }, activo: true, creado: AHORA, ...x })

describe('cuándo toca un encargo programado', () => {
  it('una vez: a su hora, y nunca más después de lanzarse', () => {
    const p = base({ cuando: { tipo: 'una', ms: AHORA + 3600_000 } })
    expect(proximaVez(p, AHORA)).toBe(AHORA + 3600_000)
    expect(proximaVez({ ...p, ultima: AHORA + 3600_000 }, AHORA + 7200_000)).toBeNull()
  })
  it('cada día a las 7:00: si ya pasó hoy, mañana', () => {
    const p = base({ cuando: { tipo: 'diaria', hora: 7, minuto: 0 } })
    expect(proximaVez(p, AHORA)).toBe(new Date(2026, 9, 18, 7, 0).getTime())
  })
  it('solo los días elegidos (lunes a viernes): del sábado salta al lunes', () => {
    const p = base({ cuando: { tipo: 'diaria', hora: 7, minuto: 0, dias: [1, 2, 3, 4, 5] } })
    expect(proximaVez(p, AHORA)).toBe(new Date(2026, 9, 19, 7, 0).getTime())
  })
  it('lo que está en pausa no toca nunca', () => {
    expect(proximaVez(base({ activo: false }), AHORA)).toBeNull()
  })
})

describe('qué hay que lanzar ahora', () => {
  it('lanza lo que venció desde la última comprobación, una sola vez', () => {
    const diaria = base({ id: 'p-diaria', cuando: { tipo: 'diaria', hora: 22, minuto: 31 } })
    const una = base({ id: 'p-una1', cuando: { tipo: 'una', ms: AHORA + 30_000 } })
    const luego = base({ id: 'p-luego', cuando: { tipo: 'una', ms: AHORA + 3600_000 } })
    const ids = tocan([diaria, una, luego], AHORA + 90_000).map((p) => p.id)
    expect(ids.sort()).toEqual(['p-diaria', 'p-una1'])
    const yaLanzada = { ...diaria, ultima: AHORA + 60_000 }
    expect(tocan([yaLanzada], AHORA + 120_000)).toEqual([])
  })
  it('si el equipo estuvo apagado, una diaria atrasada se lanza una vez, no una por cada día perdido', () => {
    const p = base({ creado: AHORA - 5 * 86_400_000, ultima: AHORA - 4 * 86_400_000, cuando: { tipo: 'diaria', hora: 7, minuto: 0 } })
    expect(tocan([p], AHORA)).toHaveLength(1)
  })
})

describe('qué se acepta', () => {
  it('rechaza horas imposibles, días fuera de rango y textos vacíos', () => {
    expect(validarProgramado({ motor: 'qwen', carpeta: null, texto: 'hola', cuando: { tipo: 'diaria', hora: 7, minuto: 0 } }).ok).toBe(true)
    expect(validarProgramado({ motor: 'qwen', carpeta: null, texto: 'hola', cuando: { tipo: 'diaria', hora: 25, minuto: 0 } }).ok).toBe(false)
    expect(validarProgramado({ motor: 'qwen', carpeta: null, texto: 'hola', cuando: { tipo: 'diaria', hora: 7, minuto: 0, dias: [9] } }).ok).toBe(false)
    expect(validarProgramado({ motor: 'qwen', carpeta: null, texto: '  ', cuando: { tipo: 'una', ms: AHORA } }).ok).toBe(false)
    expect(validarProgramado({ motor: 'qwen', carpeta: null, texto: 'hola', cuando: { tipo: 'cada-segundo' } }).ok).toBe(false)
  })
})

describe('se guarda en disco', () => {
  it('lo guardado se vuelve a leer igual; un fichero roto da una agenda vacía, sin romperse', () => {
    const dir = mkdtempSync(join(tmpdir(), 'agenda-'))
    const f = join(dir, 'agenda.json')
    guardarAgenda(f, [base({})])
    expect(leerAgenda(f)).toEqual([base({})])
    writeFileSync(f, '{roto')
    expect(leerAgenda(f)).toEqual([])
  })
})
