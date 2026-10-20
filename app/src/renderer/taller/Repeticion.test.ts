// Lo que el creador repite: lo que dice la tarjeta y qué puede hacer con ella.
import { describe, expect, it } from 'vitest'
import type { Necesidad, Repeticion } from '../lib/bridge'
import { encargoNecesidad, fraseNecesidad, fraseRepeticion, sePuedeUsar } from './Repeticion'

const r: Repeticion = {
  titulo: 'readme, proyecto, instalación',
  veces: 3,
  terminos: ['readme', 'proyecto', 'instalación'],
  ejemplo: 'actualiza el README del proyecto con la instalación nueva',
  desde: '2026-10-01',
  hasta: '2026-10-14',
  motores: ['opencode'],
  encargos: ['actualiza el README del proyecto con la instalación nueva'],
}

describe('la tarea repetida', () => {
  it('dice cuántas veces se repitió y desde cuándo', () => {
    const f = fraseRepeticion(r)
    expect(f).toContain('3 veces')
    expect(f).toContain('2026-10-01')
    expect(f).toContain('2026-10-14')
  })

  it('con una sola vez habla en singular', () => {
    expect(fraseRepeticion({ ...r, veces: 1 })).toContain('1 vez,')
  })

  it('se ofrece el encargo sólo si hay algo que lanzar', () => {
    expect(sePuedeUsar(r)).toBe(true)
    expect(sePuedeUsar({ ...r, ejemplo: '' })).toBe(false)
    expect(sePuedeUsar({ ...r, ejemplo: '   ' })).toBe(false)
  })
})

describe('la herramienta que falta', () => {
  const n: Necesidad = {
    titulo: 'pdftotext',
    fallo: "command not found: pdftotext",
    veces: 3,
    motores: ['opencode'],
    herramienta: 'pdftotext',
    encargos: ['extrae el texto del PDF que te paso'],
  }

  it('dice cuántas veces falló y quién', () => {
    const f = fraseNecesidad(n)
    expect(f).toContain('3 veces')
    expect(f).toContain('opencode')
  })

  it('el encargo de la Forja nombra la herramienta que falta', () => {
    const e = encargoNecesidad(n)
    expect(e).toContain('pdftotext')
    expect(e).toContain('extrae el texto del PDF')
  })

  it('si no se sabe el nombre, el encargo lleva el fallo entero', () => {
    const e = encargoNecesidad({ ...n, herramienta: '', titulo: 'algo' })
    expect(e).toContain('command not found: pdftotext')
  })
})
