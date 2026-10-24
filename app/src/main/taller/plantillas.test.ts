import { describe, expect, it } from 'vitest'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { categorias, leePlantillas, PLANTILLAS_CASA } from './plantillas'

const dirConPlantillas = (contenido: string) => {
  const d = mkdtempSync(join(tmpdir(), 'plantillas-'))
  writeFileSync(join(d, 'plantillas.json'), contenido)
  return d
}

describe('las plantillas de casa', () => {
  it('cada una está completa, con id único y un icono', () => {
    const ids = new Set<string>()
    for (const p of PLANTILLAS_CASA) {
      expect(p.id, JSON.stringify(p)).toMatch(/^[a-z][a-z0-9-]+$/)
      expect(ids.has(p.id), `id repetido: ${p.id}`).toBe(false)
      ids.add(p.id)
      expect(p.titulo.length).toBeGreaterThan(0)
      expect(p.encargo.length).toBeGreaterThan(20)
      expect(p.icono.length).toBeGreaterThan(0)
      expect(p.fuente).toBe('casa')
    }
  })
  it('abarca mucho más que programar: emular, datos, devops y flujos', () => {
    const cats = new Set(PLANTILLAS_CASA.map((p) => p.categoria))
    for (const c of ['Construir', 'Calidad', 'Entender', 'Emular', 'Datos', 'DevOps', 'Flujo']) expect(cats.has(c), `falta la categoría ${c}`).toBe(true)
  })
  it('conserva las recetas que ya había (no se pierde ninguna)', () => {
    for (const id of ['web-presentacion', 'app-desde-cero', 'tests-de-lo-que-falta', 'entender-un-programa']) expect(PLANTILLAS_CASA.some((p) => p.id === id), id).toBe(true)
  })
  it('un flujo lleva sus pasos en orden', () => {
    const flujo = PLANTILLAS_CASA.find((p) => p.categoria === 'Flujo')!
    expect(Array.isArray(flujo.pasos)).toBe(true)
    expect(flujo.pasos!.length).toBeGreaterThanOrEqual(2)
  })
})

describe('tus plantillas, sin fin (como roles.json)', () => {
  it('sin archivo, solo las de casa', () => {
    const d = mkdtempSync(join(tmpdir(), 'vacio-'))
    expect(leePlantillas(d)).toEqual(PLANTILLAS_CASA)
  })
  it('las tuyas se suman y se marcan como tuyas', () => {
    const d = dirConPlantillas(JSON.stringify([{ id: 'mi-flujo', titulo: 'Mi flujo', categoria: 'Lo mío', icono: 'Star', descripcion: 'd', encargo: 'haz esto con detalle de verdad' }]))
    const ps = leePlantillas(d)
    const mia = ps.find((p) => p.id === 'mi-flujo')!
    expect(mia.fuente).toBe('tuya')
    expect(mia.categoria).toBe('Lo mío')
    expect(ps.length).toBe(PLANTILLAS_CASA.length + 1)
  })
  it('si repites un id de casa, mandan tus palabras', () => {
    const d = dirConPlantillas(JSON.stringify([{ id: 'web-presentacion', titulo: 'Mi landing', categoria: 'Construir', icono: 'Star', descripcion: 'd', encargo: 'la mía, con todo el detalle que quiero' }]))
    const ps = leePlantillas(d)
    const web = ps.filter((p) => p.id === 'web-presentacion')
    expect(web).toHaveLength(1)
    expect(web[0].titulo).toBe('Mi landing')
    expect(web[0].fuente).toBe('tuya')
  })
  it('lo inválido se ignora sin romper; un archivo roto deja solo las de casa', () => {
    const d = dirConPlantillas(JSON.stringify([{ id: 'ok', titulo: 't', categoria: 'c', icono: 'i', descripcion: 'd', encargo: 'un encargo bastante largo' }, { id: 'malo' }, 42]))
    expect(leePlantillas(d).filter((p) => p.fuente === 'tuya').map((p) => p.id)).toEqual(['ok'])
    expect(leePlantillas(dirConPlantillas('{ roto')).length).toBe(PLANTILLAS_CASA.length)
  })
})

describe('las categorías, en orden de aparición y sin repetir', () => {
  it('casa primero, las tuyas al final', () => {
    const cats = categorias(PLANTILLAS_CASA)
    expect(cats[0]).toBe('Construir')
    expect(new Set(cats).size).toBe(cats.length)
  })
})

import { existsSync, readFileSync as leer } from 'node:fs'
import { borraPlantilla, guardaPlantilla, slug } from './plantillas'

describe('crear y borrar tus plantillas desde la app (escribe plantillas.json)', () => {
  const dir = () => mkdtempSync(join(tmpdir(), 'guarda-'))
  it('el id sale del título si no lo das, sin acentos ni símbolos', () => {
    expect(slug('Emular un iPhone 15 Pro')).toBe('emular-un-iphone-15-pro')
    expect(slug('  ¿Qué hago?  ')).toBe('que-hago')
    expect(slug('—')).toBe('')
  })
  it('guarda una tuya y leePlantillas la trae marcada como tuya', () => {
    const d = dir()
    const r = guardaPlantilla(d, { titulo: 'Mi receta', categoria: 'Lo mío', descripcion: 'd', encargo: 'un encargo con detalle de verdad' })
    expect(r).toMatchObject({ ok: true, id: 'mi-receta' })
    const p = leePlantillas(d).find((x) => x.id === 'mi-receta')!
    expect(p).toMatchObject({ titulo: 'Mi receta', fuente: 'tuya', icono: 'Sparkles' })
    expect(JSON.parse(leer(join(d, 'plantillas.json'), 'utf8'))).toHaveLength(1)
  })
  it('guardar con el id de una de casa la pisa (mandan tus palabras)', () => {
    const d = dir()
    guardaPlantilla(d, { id: 'web-presentacion', titulo: 'Mi landing', categoria: 'Construir', descripcion: 'd', encargo: 'la mía con todo el detalle' })
    const web = leePlantillas(d).filter((x) => x.id === 'web-presentacion')
    expect(web).toHaveLength(1)
    expect(web[0]).toMatchObject({ titulo: 'Mi landing', fuente: 'tuya' })
  })
  it('se niega si falta lo esencial', () => {
    const d = dir()
    expect(guardaPlantilla(d, { titulo: '', categoria: 'c', descripcion: 'd', encargo: 'xxxxxxxxxxxx' })).toMatchObject({ ok: false })
    expect(guardaPlantilla(d, { titulo: 'T', categoria: 'c', descripcion: 'd', encargo: 'corto' })).toMatchObject({ ok: false })
  })
  it('borrar quita solo la tuya; una de casa no se puede borrar', () => {
    const d = dir()
    guardaPlantilla(d, { titulo: 'Mía', categoria: 'c', descripcion: 'd', encargo: 'un encargo con detalle de verdad' })
    expect(borraPlantilla(d, 'mia')).toMatchObject({ ok: true })
    expect(leePlantillas(d).some((x) => x.id === 'mia')).toBe(false)
    expect(borraPlantilla(d, 'web-presentacion')).toMatchObject({ ok: false })
    expect(existsSync(join(d, 'plantillas.json'))).toBe(true)
  })
})
