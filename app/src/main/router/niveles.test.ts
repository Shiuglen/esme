// Tests del router en tres niveles: nivelDe, clasificarModelo, elegir, escalar y Aprendizaje.
import { describe, it, expect } from 'vitest'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { nivelDe, clasificarModelo, elegir, escalar, Aprendizaje, type Candidato, type TipoPaso } from './niveles'
import type { ModeloCatalogo } from '../catalogo/modelsdev'

const mc = (id: string, salida: number, extra: Partial<ModeloCatalogo> = {}): ModeloCatalogo => ({ id, nombre: id, proveedor: 'p', contexto: 100000, salida: 4096,
  coste: { entrada: salida / 5, salida }, herramientas: true, razonamiento: false, modalidades: ['text'], pesosAbiertos: false, gratis: false, ...extra })
const cand = (modelo: string, nivel: Candidato['nivel'], coste: number, extra: Partial<Candidato> = {}): Candidato =>
  ({ proveedor: 'p', modelo, nivel, costeEntrada: coste, costeSalida: coste, gratis: false, herramientas: true, contexto: 100000, ...extra })

describe('nivelDe', () => {
  it.each<[TipoPaso, string]>([['planificar', 'alto'], ['juzgar', 'alto'], ['construir', 'medio'], ['escribir', 'medio'], ['conversar', 'medio'],
    ['leer', 'bajo'], ['ordenar', 'bajo'], ['condensar', 'bajo'], ['enrutar', 'bajo']])('%s → %s', (t, n) => expect(nivelDe(t)).toBe(n))
})

describe('clasificarModelo', () => {
  it.each([['claude-opus-4-5', 25, 'alto'], ['gpt-5.4-pro', 180, 'alto'], ['o3-pro', 80, 'alto'], ['deepseek-deepthink', 2, 'alto'], ['gpt-6', 20, 'alto'],
    ['gpt-6-mini', 2, 'bajo'], ['claude-haiku-4-5', 5, 'bajo'], ['gemini-flash-lite', 0.4, 'bajo'], ['gpt-5-nano', 0.4, 'bajo'], ['l3-lunaris-8b', 0.05, 'bajo'], ['llama-12b', 3, 'bajo']] as const)(
    'por nombre: %s → %s', (id, sal, esp) => expect(clasificarModelo(mc(id, sal))).toBe(esp))
  it('"gemini" no cuenta como "mini"', () => expect(clasificarModelo(mc('gemini-flash-latest', 3.75))).toBe('medio'))
  it('por coste de salida si el nombre no da pistas', () => {
    expect(clasificarModelo(mc('x1', 10))).toBe('alto')
    expect(clasificarModelo(mc('x2', 1.2))).toBe('bajo')
    expect(clasificarModelo(mc('x3', 5))).toBe('medio')
  })
  it('gratis sin pistas en el nombre → medio', () => expect(clasificarModelo(mc('poolside/laguna:free', 0, { gratis: true }))).toBe('medio'))
  it('el nombre manda sobre el coste', () => expect(clasificarModelo(mc('claude-haiku-9', 50))).toBe('bajo'))
})

describe('elegir', () => {
  const opts = { preferirGratis: false }
  it('sin candidatos: null, no excepción', () => expect(elegir('leer', [], opts)).toBeNull())
  it('si todos se filtran: null', () => expect(elegir('leer', [cand('a', 'bajo', 1, { herramientas: false })], { ...opts, requiereHerramientas: true })).toBeNull())
  it('elige en el nivel objetivo, el mejor calidad/precio', () => {
    const r = elegir('condensar', [cand('caro', 'bajo', 1), cand('barato', 'bajo', 0.1), cand('medio', 'medio', 0.01)], opts)!
    expect(r.candidato.modelo).toBe('barato'); expect(r.nivel).toBe('bajo'); expect(r.degradado).toBe(false)
    expect(r.motivo).toMatch(/^bajo/); expect(r.motivo).toMatch(/condensar/)
  })
  it('un solo candidato de otro nivel: lo usa, degradado', () => {
    const r = elegir('planificar', [cand('solo', 'bajo', 0.1)], opts)!
    expect(r.candidato.modelo).toBe('solo'); expect(r.degradado).toBe(true); expect(r.nivel).toBe('bajo')
  })
  it('sube un nivel antes de bajar', () => {
    const r = elegir('leer', [cand('alto', 'alto', 9), cand('medio', 'medio', 1)], opts)!
    expect(r.candidato.modelo).toBe('medio'); expect(r.degradado).toBe(true)
    expect(elegir('construir', [cand('alto', 'alto', 9), cand('bajo', 'bajo', 1)], opts)!.candidato.modelo).toBe('alto')
    expect(elegir('planificar', [cand('medio', 'medio', 1), cand('bajo', 'bajo', 0.1)], opts)!.candidato.modelo).toBe('medio')
  })
  it('filtros: herramientas, contexto y retención', () => {
    const cs = [cand('a', 'bajo', 0.1, { herramientas: false }), cand('b', 'bajo', 0.2, { contexto: 1000 }), cand('c', 'bajo', 0.3, { retieneDatos: true }), cand('d', 'bajo', 5)]
    expect(elegir('leer', cs, { ...opts, requiereHerramientas: true, contextoMinimo: 50000, evitarRetencion: true })!.candidato.modelo).toBe('d')
    expect(elegir('leer', cs, { ...opts, requiereHerramientas: true })!.candidato.modelo).toBe('b')
  })
  it('fijado gana siempre; si no existe en la lista, se ignora', () => {
    const cs = [cand('a', 'bajo', 0.1), cand('b', 'alto', 50)]
    const r = elegir('leer', cs, { ...opts, fijado: { proveedor: 'p', modelo: 'b' } })!
    expect(r.candidato.modelo).toBe('b'); expect(r.motivo).toMatch(/fijado/)
    expect(elegir('leer', cs, { ...opts, fijado: { proveedor: 'p', modelo: 'zzz' } })!.candidato.modelo).toBe('a')
  })
  it('preferirGratis: el gratis del nivel gana al de pago', () => {
    const cs = [cand('pago', 'bajo', 0.01), cand('gratis', 'bajo', 0, { gratis: true })]
    expect(elegir('leer', cs, { preferirGratis: true })!.candidato.modelo).toBe('gratis')
    expect(elegir('leer', cs, { preferirGratis: true })!.motivo).toMatch(/gratis/)
  })
  it('preferirGratis: no si su calidad es 0,2 o más baja', () => {
    const cs = [cand('pago', 'bajo', 1), cand('gratis', 'bajo', 0, { gratis: true })]
    const calidad = (_t: TipoPaso, c: Candidato) => (c.gratis ? 0.4 : 0.7)
    expect(elegir('leer', cs, { preferirGratis: true, calidad })!.candidato.modelo).toBe('pago')
    const casi = (_t: TipoPaso, c: Candidato) => (c.gratis ? 0.55 : 0.7)
    expect(elegir('leer', cs, { preferirGratis: true, calidad: casi })!.candidato.modelo).toBe('gratis')
  })
  it('sin preferirGratis un gratis compite solo por calidad/precio', () => {
    const cs = [cand('pago', 'bajo', 1), cand('gratis', 'bajo', 0, { gratis: true })]
    expect(elegir('leer', cs, opts)!.candidato.modelo).toBe('gratis')
  })
  it('el aprendizaje mueve la elección tras varios rechazos', () => {
    const ap = new Aprendizaje()
    const cs = [cand('a', 'medio', 1), cand('b', 'medio', 1)]
    const calidad = (t: TipoPaso, c: Candidato) => ap.calidad(t, c.proveedor, c.modelo)
    expect(elegir('construir', cs, { ...opts, calidad })!.candidato.modelo).toBe('a')
    for (let i = 0; i < 4; i++) ap.registrar('construir', 'p', 'a', 'rechazado')
    expect(elegir('construir', cs, { ...opts, calidad })!.candidato.modelo).toBe('b')
  })
})

describe('escalar', () => {
  it('sensible → persona', () => { const r = escalar({ nivel: 'bajo', fallos: 0, sensible: true })!; expect(r.a).toBe('persona'); expect(r.motivo).toMatch(/dinero/) })
  it('bajo con poca confianza o comprobación fallida → medio', () => {
    expect(escalar({ nivel: 'bajo', fallos: 0, confianza: 0.5 })!.a).toBe('medio')
    expect(escalar({ nivel: 'bajo', fallos: 0, comprobacionOk: false })!.a).toBe('medio')
    expect(escalar({ nivel: 'bajo', fallos: 0, confianza: 0.7, comprobacionOk: true })).toBeNull()
  })
  it('medio con 2 fallos → alto; alto con 2 fallos → persona', () => {
    expect(escalar({ nivel: 'medio', fallos: 2 })!.a).toBe('alto')
    expect(escalar({ nivel: 'medio', fallos: 1 })).toBeNull()
    expect(escalar({ nivel: 'alto', fallos: 2 })!.a).toBe('persona')
    expect(escalar({ nivel: 'alto', fallos: 1, confianza: 0.1 })).toBeNull()
  })
})

describe('Aprendizaje', () => {
  it('Beta(2,2): sin datos 0,5; aprobado sube; editado cuenta 0,5; rechazado baja', () => {
    const ap = new Aprendizaje()
    expect(ap.calidad('leer', 'p', 'm')).toBe(0.5)
    ap.registrar('leer', 'p', 'm', 'aprobado'); expect(ap.calidad('leer', 'p', 'm')).toBeCloseTo(3 / 5)
    ap.registrar('leer', 'p', 'm', 'editado'); expect(ap.calidad('leer', 'p', 'm')).toBeCloseTo(3.5 / 6)
    ap.registrar('leer', 'p', 'm', 'rechazado'); expect(ap.calidad('leer', 'p', 'm')).toBeCloseTo(3.5 / 7)
    expect(ap.calidad('escribir', 'p', 'm')).toBe(0.5)
  })
  it('persiste en el archivo y se recarga', () => {
    const f = join(mkdtempSync(join(tmpdir(), 'apr-')), 'aprendizaje.json')
    const a = new Aprendizaje(f); a.registrar('leer', 'p', 'm', 'aprobado'); a.registrar('leer', 'p', 'm', 'aprobado')
    expect(JSON.parse(readFileSync(f, 'utf8'))).toBeTruthy()
    expect(new Aprendizaje(f).calidad('leer', 'p', 'm')).toBeCloseTo(4 / 6)
  })
  it('archivo corrupto: empieza vacío sin explotar', () => {
    const f = join(mkdtempSync(join(tmpdir(), 'apr-')), 'a.json'); writeFileSync(f, '{roto')
    const a = new Aprendizaje(f); expect(a.calidad('leer', 'p', 'm')).toBe(0.5)
    a.registrar('leer', 'p', 'm', 'aprobado'); expect(new Aprendizaje(f).calidad('leer', 'p', 'm')).toBeCloseTo(0.6)
  })
})
