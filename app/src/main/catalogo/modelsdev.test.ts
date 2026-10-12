// Tests del catálogo models.dev: parseo tolerante y las cuatro ramas de cargarCatalogo.
import { describe, it, expect, vi } from 'vitest'
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { parseModelsDev, cargarCatalogo } from './modelsdev'

const muestra = JSON.parse(readFileSync(join(__dirname, 'fixtures', 'modelsdev-muestra.json'), 'utf8'))
const tmp = () => mkdtempSync(join(tmpdir(), 'cat-'))
const resp = (cuerpo: unknown, ok = true) => ({ ok, status: ok ? 200 : 500, json: async () => cuerpo }) as unknown as Response

describe('parseModelsDev', () => {
  it('parsea el fixture: proveedores, modelos y costes', () => {
    const ps = parseModelsDev(muestra)
    expect(ps.map(p => p.id)).toEqual(['anthropic', 'openai', 'google', 'openrouter', 'opencode'])
    expect(ps.every(p => p.modelos.length === 3)).toBe(true)
    const haiku = ps[0].modelos.find(m => m.id === 'claude-haiku-4-5')!
    expect(haiku.coste).toEqual({ entrada: 1, salida: 5, cacheLectura: 0.1, cacheEscritura: 1.25 })
    expect(haiku.proveedor).toBe('anthropic')
    expect(haiku.contexto).toBe(200000)
    expect(haiku.salida).toBe(64000)
    expect(haiku.herramientas).toBe(true)
    expect(haiku.razonamiento).toBe(true)
    expect(haiku.modalidades).toContain('image')
    expect(haiku.pesosAbiertos).toBe(false)
    expect(ps[0].env).toEqual(['ANTHROPIC_API_KEY'])
    expect(ps[0].npm).toBe('@ai-sdk/anthropic')
  })
  it('marca gratis por coste 0 o sufijo :free, y no por coste ausente', () => {
    const ps = parseModelsDev(muestra)
    const or = ps.find(p => p.id === 'openrouter')!
    expect(or.modelos.find(m => m.id.endsWith(':free'))!.gratis).toBe(true)
    expect(ps.find(p => p.id === 'opencode')!.modelos.find(m => m.id === 'fledge-alpha-free')!.gratis).toBe(true)
    expect(ps[0].modelos.some(m => m.gratis)).toBe(false)
    const sinCoste = ps.find(p => p.id === 'google')!.modelos.find(m => m.id === 'gemma-4-31b-it')!
    expect(sinCoste.coste).toEqual({ entrada: 0, salida: 0 })
    expect(sinCoste.gratis).toBe(false)
  })
  it('es tolerante con campos ausentes y descarta proveedores sin modelos', () => {
    const ps = parseModelsDev({ a: { id: 'a', models: { m: { id: 'm' } } }, b: { id: 'b', models: {} }, c: { id: 'c' }, d: null })
    expect(ps).toHaveLength(1)
    expect(ps[0].modelos[0]).toMatchObject({ id: 'm', contexto: 0, salida: 0, herramientas: false, razonamiento: false, modalidades: [], pesosAbiertos: false })
    expect(ps[0].env).toEqual([])
  })
  it('JSON malformado o vacío devuelve []', () => {
    for (const x of [null, undefined, 42, 'x', [], {}]) expect(parseModelsDev(x)).toEqual([])
  })
})

describe('cargarCatalogo', () => {
  it('caché fresca: no llama a la red', async () => {
    const dir = tmp(); writeFileSync(join(dir, 'catalogo-modelsdev.json'), JSON.stringify(muestra))
    const f = vi.fn()
    const r = await cargarCatalogo({ dirCache: dir, f: f as never, ahora: () => Date.now() })
    expect(f).not.toHaveBeenCalled()
    expect(r.origen).toBe('cache')
    expect(r.proveedores).toHaveLength(5)
  })
  it('red OK: usa la red y escribe la caché', async () => {
    const dir = tmp()
    const f = vi.fn(async () => resp(muestra))
    const r = await cargarCatalogo({ dirCache: dir, f: f as never, ahora: () => 1234 })
    expect(f).toHaveBeenCalledOnce()
    expect(r.origen).toBe('red')
    expect(r.fecha).toBe(1234)
    expect(existsSync(join(dir, 'catalogo-modelsdev.json'))).toBe(true)
  })
  it('red caída con caché vieja: usa la caché', async () => {
    const dir = tmp(); writeFileSync(join(dir, 'catalogo-modelsdev.json'), JSON.stringify(muestra))
    const f = vi.fn(async () => { throw new Error('sin red') })
    const r = await cargarCatalogo({ dirCache: dir, f: f as never, ahora: () => Date.now() + 10 * 24 * 3600e3 })
    expect(f).toHaveBeenCalled()
    expect(r.origen).toBe('cache')
    expect(r.proveedores.length).toBeGreaterThan(0)
  })
  it('sin red ni caché: semilla', async () => {
    const f = vi.fn(async () => resp({}, false))
    const r = await cargarCatalogo({ dirCache: tmp(), f: f as never })
    expect(r.origen).toBe('semilla')
    expect(r.proveedores.length).toBeGreaterThan(0)
  })
  it('red devuelve basura: no pisa la caché y cae a semilla', async () => {
    const dir = tmp()
    const r = await cargarCatalogo({ dirCache: dir, f: (async () => resp({ roto: true })) as never })
    expect(r.origen).toBe('semilla')
    expect(existsSync(join(dir, 'catalogo-modelsdev.json'))).toBe(false)
  })
})
