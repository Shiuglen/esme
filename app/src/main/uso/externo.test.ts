import { describe, it, expect, beforeEach } from 'vitest'
import { cpSync, mkdtempSync, utimesSync, appendFileSync, readdirSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { leerUsoClaudeCode, leerUsoCodex, ventanas, vaciarCacheExterno, usoExterno, type ConsumoExterno } from './externo'

const aqui = dirname(fileURLToPath(import.meta.url))
const ahora = Date.parse('2026-10-12T13:00:00.000Z')
const H = 3600e3, D = 24 * H
const copia = (sub: string) => { const d = mkdtempSync(join(tmpdir(), 'ext-')); cpSync(join(aqui, 'fixtures', sub), d, { recursive: true }); return d }
const todos = (d: string): string[] => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? todos(p) : [p] })
const ordenar = (cs: ConsumoExterno[]) => [...cs].sort((a, b) => a.ts - b.ts)

beforeEach(() => vaciarCacheExterno())

describe('leerUsoClaudeCode', () => {
  it('deduplica por id de mensaje + requestId (máximo por campo), omite sintéticos y líneas rotas, y no mira el texto', async () => {
    const r = ordenar(await leerUsoClaudeCode(copia('claude'), ahora - 30 * D))
    expect(r).toEqual([
      { herramienta: 'claude-code', ts: Date.parse('2026-10-08T09:00:00.000Z'), modelo: 'claude-opus-5-5', entrada: 5, salida: 7, cacheLectura: 20, cacheEscritura: 10 },
      { herramienta: 'claude-code', ts: Date.parse('2026-10-12T10:00:00.000Z'), modelo: 'claude-opus-5-5', entrada: 10, salida: 40, cacheLectura: 50, cacheEscritura: 100 },
      { herramienta: 'claude-code', ts: Date.parse('2026-10-12T12:00:00.000Z'), modelo: 'claude-sonnet-5-5', entrada: 1, salida: 2, cacheLectura: 1000, cacheEscritura: 0 },
    ])
    expect(JSON.stringify(r)).not.toContain('sintetico')
  })
  it('filtra por desde (ts) e ignora ficheros con mtime anterior', async () => {
    const d = copia('claude')
    expect((await leerUsoClaudeCode(d, Date.parse('2026-10-10T00:00:00Z'))).length).toBe(2)
    const viejo = new Date('2026-01-01T00:00:00Z')
    for (const f of todos(d)) utimesSync(f, viejo, viejo)
    expect(await leerUsoClaudeCode(d, Date.parse('2026-10-10T00:00:00Z'))).toEqual([])
  })
  it('directorio inexistente: []', async () => {
    expect(await leerUsoClaudeCode(join(tmpdir(), 'no-existe-xyz'), 0)).toEqual([])
    expect(await leerUsoCodex(join(tmpdir(), 'no-existe-xyz'), 0)).toEqual([])
  })
  it('lectura incremental: solo lee lo añadido y completa líneas partidas', async () => {
    const d = copia('claude')
    const f = join(d, 'proyecto-a', 'sesion.jsonl')
    const l = (id: string, out: number) => JSON.stringify({ type: 'assistant', timestamp: '2026-10-12T12:45:00.000Z', requestId: 'r-' + id, message: { id, model: 'claude-opus-5-5', usage: { input_tokens: 1, output_tokens: out, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 } } })
    expect((await leerUsoClaudeCode(d, 0)).length).toBe(4)
    const x = l('msg_n', 77)
    appendFileSync(f, x.slice(0, 30))                       // línea a medias: no cuenta todavía
    expect((await leerUsoClaudeCode(d, 0)).length).toBe(4)
    appendFileSync(f, x.slice(30) + '\n')                   // se completa
    const r = await leerUsoClaudeCode(d, 0)
    expect(r.length).toBe(5)
    expect(r.filter((c) => c.salida === 77).length).toBe(1)
    expect((await leerUsoClaudeCode(d, 0)).length).toBe(5) // sin cambios: no duplica
  })
})

describe('leerUsoCodex', () => {
  it('usa last_token_usage, descuenta lo cacheado de la entrada, ignora token_count repetidos y sin info', async () => {
    const r = ordenar(await leerUsoCodex(copia('codex'), Date.parse('2026-10-05T00:00:00Z')))
    expect(r).toEqual([
      { herramienta: 'codex', ts: Date.parse('2026-10-12T11:01:00.000Z'), modelo: 'gpt-5-codex', entrada: 600, salida: 50, cacheLectura: 400, cacheEscritura: 0 },
      { herramienta: 'codex', ts: Date.parse('2026-10-12T12:30:00.000Z'), modelo: 'gpt-5-codex', entrada: 1000, salida: 100, cacheLectura: 1000, cacheEscritura: 0 },
    ])
  })
})

describe('ventanas', () => {
  const c = (herramienta: ConsumoExterno['herramienta'], ts: number, modelo: string, entrada: number, salida = 0, cacheLectura = 0, cacheEscritura = 0): ConsumoExterno => ({ herramienta, ts, modelo, entrada, salida, cacheLectura, cacheEscritura })
  const cs = [
    c('claude-code', ahora - 1 * H, 'm1', 1_000_000, 0),
    c('claude-code', ahora - 4 * H, 'm1', 0, 1_000_000),
    c('claude-code', ahora - 6 * H, 'm1', 500, 500),             // fuera de 5 h, dentro de 7 d
    c('claude-code', ahora - 8 * D, 'm1', 7_000),                // fuera de 7 d
    c('codex', ahora - 2 * H, 'm2', 100, 100, 100, 100),
  ]
  const precio = (m: string) => (m === 'm1' ? { coste: { entrada: 2, salida: 10 } } : undefined)

  it('suma tokens en 5 h y 7 d, ritmo por hora y coste equivalente (undefined si no hay precio)', () => {
    const v = ventanas(cs, ahora, precio)
    expect(v['claude-code'].h5).toEqual({ tokens: 2_000_000, costeUSD: 12 })
    expect(v['claude-code'].d7.tokens).toBe(2_001_000)
    expect(v['claude-code'].d7.costeUSD).toBeCloseTo(12 + (500 * 2 + 500 * 10) / 1e6)
    expect(v['claude-code'].ritmoPorHora).toBe(400_000)
    expect(v.codex.h5.tokens).toBe(400)
    expect(v.codex.h5.costeUSD).toBeUndefined()
  })
  it('sin precio inyectado no hay coste', () => {
    expect(ventanas(cs, ahora)['claude-code'].h5).toEqual({ tokens: 2_000_000 })
  })
  it('porDia: 30 días ascendentes en hora local, con ceros', () => {
    const noche = new Date(2026, 9, 11, 23, 59).getTime(), madrugada = new Date(2026, 9, 12, 0, 1).getTime()
    const hoy = new Date(2026, 9, 12, 15).getTime()
    const v = ventanas([c('codex', noche, 'x', 10), c('codex', madrugada, 'x', 3), c('codex', madrugada + 1000, 'x', 4)], hoy)
    const p = v.codex.porDia
    expect(p.length).toBe(30)
    expect(p[29]).toEqual({ dia: '2026-10-12', tokens: 7 })
    expect(p[28]).toEqual({ dia: '2026-10-11', tokens: 10 })
    expect(p[0].dia).toBe('2026-09-13')
    expect(p[0].tokens).toBe(0)
    expect(v['claude-code'].porDia.every((x) => x.tokens === 0)).toBe(true)
  })
})

describe('usoExterno', () => {
  it('disponibilidad por directorio y ventanas de los últimos 30 días', async () => {
    const r = await usoExterno({ claudeCode: copia('claude'), codex: join(tmpdir(), 'no-existe-xyz') }, ahora)
    expect(r.disponible).toEqual({ claudeCode: true, codex: false })
    expect(r.ventanas['claude-code'].h5.tokens).toBe(1 + 2 + 1000 + 10 + 40 + 50 + 100)
    expect(r.ventanas.codex.d7.tokens).toBe(0)
  })
})
