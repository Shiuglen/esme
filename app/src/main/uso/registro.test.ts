// Tests del registro de uso, el presupuesto y la previsión de cuotas.
import { describe, it, expect } from 'vitest'
import { mkdtempSync, appendFileSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { costeDe, RegistroUso, evaluarPresupuesto, preverCuota, type Consumo } from './registro'

const precio = { coste: { entrada: 3, salida: 15, cacheLectura: 0.3, cacheEscritura: 3.75 } }
const base: Consumo = { ts: 0, proveedor: 'anthropic', modelo: 'sonnet', entrada: 1_000_000, salida: 100_000, origen: 'chat' }
const arch = () => join(mkdtempSync(join(tmpdir(), 'uso-')), 'uso.jsonl')

describe('costeDe', () => {
  it('sin caché', () => expect(costeDe(base, precio)).toBeCloseTo(3 + 1.5))
  it('con caché', () => expect(costeDe({ ...base, cacheLectura: 1_000_000, cacheEscritura: 1_000_000 }, precio)).toBeCloseTo(4.5 + 0.3 + 3.75))
  it('si falta el coste de caché cuenta como entrada', () => {
    const p = { coste: { entrada: 2, salida: 10 } }
    expect(costeDe({ ...base, entrada: 0, salida: 0, cacheLectura: 1_000_000, cacheEscritura: 500_000 }, p)).toBeCloseTo(3)
  })
  it('sin modelo o con datos raros: 0, nunca NaN', () => {
    expect(costeDe(base)).toBe(0)
    expect(costeDe({ ...base, entrada: NaN, salida: undefined as never }, precio)).toBe(0)
  })
  it('el coste directo del motor manda sobre el catálogo, y sin USD honesto es 0', () => {
    expect(costeDe({ ...base, costeDirecto: { cantidad: 0.02, moneda: 'USD' } }, precio)).toBeCloseTo(0.02)
    expect(costeDe({ ...base, costeDirecto: { cantidad: 5, moneda: 'EUR' } }, precio)).toBe(0)
    expect(costeDe({ ...base, costeDirecto: { cantidad: NaN, moneda: 'USD' } }, precio)).toBe(0)
  })
})

describe('RegistroUso', () => {
  it('anota y lee, ignorando líneas corruptas y la última a medio escribir', () => {
    const a = arch(), r = new RegistroUso(a)
    r.anotar({ ...base, ts: 10 }); r.anotar({ ...base, ts: 20 })
    appendFileSync(a, 'esto no es json\n')
    appendFileSync(a, '{"ts":30,"proveedor":"x"')   // corte de luz, sin salto de línea
    expect(r.leer().map(c => c.ts)).toEqual([10, 20])
    r.anotar({ ...base, ts: 40 })                   // sigue pudiendo anotar tras una línea rota
    expect(new RegistroUso(a).leer().map(c => c.ts)).toEqual([10, 20, 40])
    expect(r.leer(15, 30).map(c => c.ts)).toEqual([20])
  })
  it('archivo inexistente: lista vacía', () => expect(new RegistroUso(arch()).leer()).toEqual([]))
  it('resumen agrupado por modelo y por día, con precio desconocido a 0', () => {
    const r = new RegistroUso(arch())
    const d1 = new Date(2026, 9, 1, 10).getTime(), d2 = new Date(2026, 9, 2, 23).getTime()
    r.anotar({ ...base, ts: d1 })
    r.anotar({ ...base, ts: d2, entrada: 0, salida: 1_000_000, ahorradosMemoria: 500 })
    r.anotar({ ...base, ts: d2, proveedor: 'raro', modelo: 'x', entrada: 10, salida: 10, ahorradosMemoria: 100 })
    const res = r.resumen({ desde: 0, hasta: Date.now(), precio: (p, m) => (p === 'anthropic' && m === 'sonnet' ? precio : undefined) })
    expect(res.costeUSD).toBeCloseTo(4.5 + 15)
    expect(res.tokens).toBe(1_100_000 + 1_000_000 + 20)
    expect(res.ahorradosMemoria).toBe(600)
    expect(res.porModelo[0]).toMatchObject({ proveedor: 'anthropic', modelo: 'sonnet', llamadas: 2 })
    expect(res.porModelo[0].costeUSD).toBeCloseTo(19.5)
    expect(res.porModelo[1]).toMatchObject({ proveedor: 'raro', costeUSD: 0, llamadas: 1 })
    expect(res.porDia.map(d => d.dia)).toEqual(['2026-10-01', '2026-10-02'])
    expect(res.porDia[0].costeUSD).toBeCloseTo(4.5)
    expect(Number.isNaN(res.costeUSD)).toBe(false)
  })
  it('las historias del Taller: cada tarea una fila con titulo, motor, turnos y orden del último turno', () => {
    const r = new RegistroUso(arch())
    const temprano = new Date(2026, 9, 1, 10).getTime(), tarde = new Date(2026, 9, 1, 12).getTime()
    r.anotar({ ts: temprano, proveedor: 'qwen-code', modelo: 'poolside/laguna-s-2.1:free', entrada: 1000, salida: 100, origen: 'taller', tarea: 'aaa11111', titulo: 'primer cuento' })
    r.anotar({ ts: tarde, proveedor: 'qwen-code', modelo: 'poolside/laguna-s-2.1:free', entrada: 2000, salida: 50, origen: 'arena', tarea: 'bbb22222', titulo: 'duelo' })
    r.anotar({ ts: tarde, proveedor: 'qwen-code', modelo: 'poolside/laguna-s-2.1:free', entrada: 500, salida: 25, origen: 'arena', tarea: 'bbb22222', titulo: 'duelo' })
    r.anotar({ ts: tarde, proveedor: 'anthropic', modelo: 'sonnet', entrada: 10, salida: 5, origen: 'chat' })   // el chat no entra a historias
    const res = r.resumen({ desde: 0, hasta: Date.now(), precio: () => undefined })
    expect(res.costeUSD).toBe(0)
    expect(res.tokens).toBe(1000 + 100 + 2000 + 50 + 500 + 25 + 15)
    expect(res.porTarea.map(h => h.tarea)).toEqual(['bbb22222', 'aaa11111'])   // el último turno manda
    expect(res.porTarea[0]).toMatchObject({ titulo: 'duelo', motor: 'qwen-code', turnos: 2, tokens: 2575, modelo: 'poolside/laguna-s-2.1:free' })
    expect(res.porTarea[1]).toMatchObject({ titulo: 'primer cuento', motor: 'qwen-code', turnos: 1, tokens: 1100 })
  })
})

describe('evaluarPresupuesto', () => {
  const p = { diarioUSD: 10, mensualUSD: 100, avisos: [0.5, 0.8, 1] }
  it('ok', () => expect(evaluarPresupuesto(1, 10, p)).toEqual({ estado: 'ok' }))
  it('aviso al 80 %', () => expect(evaluarPresupuesto(8, 10, p)).toEqual({ estado: 'aviso', umbral: 0.8, cual: 'diario' }))
  it('límite al llegar al 100 %', () => expect(evaluarPresupuesto(10, 10, p)).toEqual({ estado: 'limite', umbral: 1, cual: 'diario' }))
  it('mensual manda si su umbral es mayor', () => expect(evaluarPresupuesto(1, 95, p)).toEqual({ estado: 'aviso', umbral: 0.8, cual: 'mensual' }))
  it('límite mensual', () => expect(evaluarPresupuesto(1, 120, p).estado).toBe('limite'))
  it('sin topes configurados: ok', () => expect(evaluarPresupuesto(999, 999, { avisos: [0.5] })).toEqual({ estado: 'ok' }))
})

describe('preverCuota', () => {
  const H = 3600e3
  it('se agota antes del reinicio', () => {
    const r = preverCuota([{ ts: 0, restante: 1 }, { ts: H, restante: 0.8 }, { ts: 2 * H, restante: 0.6 }], 20 * H)
    expect(r.ritmoPorHora).toBeCloseTo(0.2)
    expect(r.agotaEn).toBeCloseTo(5 * H)
    expect(r.llegaAlReinicio).toBe(false)
  })
  it('llega al reinicio', () => {
    const r = preverCuota([{ ts: 0, restante: 1 }, { ts: H, restante: 0.99 }], 5 * H)
    expect(r.agotaEn).toBeGreaterThan(5 * H)
    expect(r.llegaAlReinicio).toBe(true)
  })
  it('ordena las muestras por ts', () => {
    const r = preverCuota([{ ts: 2 * H, restante: 0.6 }, { ts: 0, restante: 1 }, { ts: H, restante: 0.8 }])
    expect(r.ritmoPorHora).toBeCloseTo(0.2)
  })
  it('una sola muestra o ninguna', () => {
    expect(preverCuota([{ ts: 0, restante: 0.5 }], H)).toEqual({ ritmoPorHora: 0, agotaEn: undefined, llegaAlReinicio: true })
    expect(preverCuota([]).llegaAlReinicio).toBe(true)
  })
  it('ritmo no positivo (recarga) o ts iguales: sin agotamiento', () => {
    expect(preverCuota([{ ts: 0, restante: 0.5 }, { ts: H, restante: 0.9 }]).agotaEn).toBeUndefined()
    const r = preverCuota([{ ts: 5, restante: 0.5 }, { ts: 5, restante: 0.4 }])
    expect(r.llegaAlReinicio).toBe(true); expect(Number.isNaN(r.ritmoPorHora)).toBe(false)
  })
  it('agotaEn sin reinicio conocido: llegaAlReinicio false', () => {
    expect(preverCuota([{ ts: 0, restante: 1 }, { ts: H, restante: 0.5 }]).llegaAlReinicio).toBe(false)
  })
})
