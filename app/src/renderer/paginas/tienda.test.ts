import { describe, expect, it } from 'vitest'
import { PIELES_TIENDA } from '../tinta/pieles-tienda'
import { buscarEnTienda, familiaDe, sorprendeme, type ItemTienda } from './tienda'

const items: ItemTienda[] = PIELES_TIENDA.map((p) => ({ ...p, tipo: 'piel', origen: 'casa' }))

describe('descubrir en la Tienda', () => {
  it('por palabras, en nombre, descripción o etiquetas, sin importar tildes ni mayúsculas', () => {
    expect(buscarEnTienda(items, { texto: 'oceano' }).map((i) => i.id)).toEqual(['oceano'])
    expect(buscarEnTienda(items, { texto: 'NEÓN' }).map((i) => i.id)).toContain('neon-tokio')
    expect(buscarEnTienda(items, { texto: 'proyector' }).map((i) => i.id)).toEqual(['cine'])
  })
  it('por familia de color del acento', () => {
    expect(familiaDe('#ff7a2f')).toBe('naranja'); expect(familiaDe('#3cff7a')).toBe('verde'); expect(familiaDe('#a5a5ad')).toBe('gris')
    expect(familiaDe('#ff3fd2')).toBe('rosa'); expect(familiaDe('#9b8cff')).toBe('violeta'); expect(familiaDe('#3fd0e8')).toBe('cian')
    const verdes = buscarEnTienda(items, { color: 'verde' }).map((i) => i.id)
    expect(verdes).toEqual(expect.arrayContaining(['matrix', 'boreal']))
  })
  it('sin filtros devuelve todo; «Sorpréndeme» elige una que no es la que llevas', () => {
    expect(buscarEnTienda(items, {})).toHaveLength(items.length)
    const s = sorprendeme(items, 'neon-tokio', () => 0)
    expect(s && s.id).not.toBe('neon-tokio')
  })
})
