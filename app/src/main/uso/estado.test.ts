import { describe, it, expect } from 'vitest'
import { buscarPrecio, limitesLocales, calcularEstado, hayAlerta, normalizarPresupuesto, resumirProveedores, PRESUPUESTO_DEFECTO } from './estado'
import { RegistroUso } from './registro'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { ProveedorCatalogo } from '../catalogo/modelsdev'

const mod = (id: string, e: number, s: number, gratis = false) => ({ id, nombre: id, proveedor: 'x', contexto: 0, salida: 0, coste: { entrada: e, salida: s }, herramientas: true, razonamiento: false, modalidades: [], pesosAbiertos: false, gratis })
const ps: ProveedorCatalogo[] = [
  { id: 'a', nombre: 'Alfa', env: ['A_KEY'], modelos: [mod('m1', 1, 2)] },
  { id: 'b', nombre: 'Beta', env: [], modelos: [mod('m2', 10, 20), mod('m3', 0, 0, true), mod('m4', 0, 0, true)] },
]

describe('buscarPrecio', () => {
  it('exacto, con respaldo por id de modelo, o nada', () => {
    expect(buscarPrecio(ps, 'a', 'm1')?.coste.entrada).toBe(1)
    expect(buscarPrecio(ps, 'a', 'm2')?.coste.entrada).toBe(10)
    expect(buscarPrecio(ps, 'zz', 'm2')?.coste.entrada).toBe(10)
    expect(buscarPrecio(ps, 'a', 'nada')).toBeUndefined()
  })
})

describe('estado de uso', () => {
  it('límites locales: día y mes', () => {
    const t = new Date(2026, 9, 12, 15, 30).getTime()
    const l = limitesLocales(t)
    expect(new Date(l.inicioDia).getHours()).toBe(0); expect(new Date(l.inicioDia).getDate()).toBe(12)
    expect(new Date(l.inicioMes).getDate()).toBe(1); expect(new Date(l.inicioMes).getMonth()).toBe(9)
  })
  it('calcula hoy/mes y evalúa presupuesto', () => {
    const r = new RegistroUso(join(mkdtempSync(join(tmpdir(), 'uso-')), 'uso.jsonl'))
    const ahora = new Date(2026, 9, 12, 15).getTime()
    r.anotar({ ts: new Date(2026, 9, 12, 9).getTime(), proveedor: 'a', modelo: 'm1', entrada: 1e6, salida: 0, ahorradosMemoria: 5, origen: 'chat' })
    r.anotar({ ts: new Date(2026, 9, 3).getTime(), proveedor: 'a', modelo: 'm1', entrada: 3e6, salida: 0, origen: 'chat' })
    const e = calcularEstado(r, (p, m) => buscarPrecio(ps, p, m), { avisos: [0.5, 1], diarioUSD: 1.5 }, ahora)
    expect(e.hoyUSD).toBeCloseTo(1); expect(e.mesUSD).toBeCloseTo(4); expect(e.tokensHoy).toBe(1e6); expect(e.ahorradosHoy).toBe(5)
    expect(e.evaluacion).toMatchObject({ estado: 'aviso', cual: 'diario' })
  })
  it('hayAlerta solo al empeorar', () => {
    expect(hayAlerta('ok', 'aviso')).toBe(true); expect(hayAlerta('aviso', 'limite')).toBe(true); expect(hayAlerta('ok', 'limite')).toBe(true)
    expect(hayAlerta('aviso', 'aviso')).toBe(false); expect(hayAlerta('limite', 'aviso')).toBe(false); expect(hayAlerta('aviso', 'ok')).toBe(false)
  })
})

describe('presupuesto y proveedores', () => {
  it('normaliza entradas sucias', () => {
    expect(normalizarPresupuesto(null)).toEqual(PRESUPUESTO_DEFECTO)
    expect(normalizarPresupuesto({ diarioUSD: -1, mensualUSD: 20, avisos: [0.9, 'x'] })).toEqual({ avisos: [0.9], mensualUSD: 20 })
  })
  it('resume y ordena por número de modelos', () => {
    expect(resumirProveedores(ps)).toEqual([{ id: 'b', nombre: 'Beta', env: [], modelos: 3, gratis: 2 }, { id: 'a', nombre: 'Alfa', env: ['A_KEY'], modelos: 1, gratis: 0 }])
  })
})
