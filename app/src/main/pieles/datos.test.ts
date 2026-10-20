// La colección de pieles: el formato, a solas.
import { describe, expect, it } from 'vitest'
import { esPielPropia, idDe, parseaColeccion, serializaColeccion, type PielPropia } from './datos'

const piel = (id: string, nombre = 'Veste 60fps'): PielPropia => ({
  id, nombre, creada: 1792474644259, origen: { tipo: 'referencia', url: 'https://60fps.design', dominio: '60fps.design' },
  piel: { version: 1, nombre, color: { tipo: 'libre', noche: { fondo: '#000', superficie: '#111', texto: '#eee', acento: '#0f0' } } },
})

describe('tu colección de pieles', () => {
  it('lee una colección bien formada', () => {
    const c = parseaColeccion(JSON.stringify({ version: 1, pieles: [piel('a'), piel('b')] }))
    expect(c.map((p) => p.id)).toEqual(['a', 'b'])
  })

  it('un fichero dañado no tira el resto: se descarta lo que no sirve', () => {
    const c = parseaColeccion(JSON.stringify({ version: 1, pieles: [piel('a'), { id: 'x' }, null, 7, piel('b')] }))
    expect(c.map((p) => p.id)).toEqual(['a', 'b'])
  })

  it('un texto que no es JSON no rompe nada', () => {
    expect(parseaColeccion('esto no es json')).toEqual([])
    expect(parseaColeccion('')).toEqual([])
    expect(parseaColeccion('null')).toEqual([])
  })

  it('sin ids repetidos: la primera gana', () => {
    const c = parseaColeccion(JSON.stringify({ pieles: [piel('a', 'una'), piel('a', 'dos')] }))
    expect(c).toHaveLength(1)
    expect(c[0].nombre).toBe('una')
  })

  it('una piel sin lo mínimo no es una piel', () => {
    expect(esPielPropia(piel('a'))).toBe(true)
    expect(esPielPropia({ ...piel('a'), id: '' })).toBe(false)
    expect(esPielPropia({ ...piel('a'), creada: 'ayer' })).toBe(false)
    expect(esPielPropia({ ...piel('a'), piel: 'rojo' })).toBe(false)
    expect(esPielPropia({ ...piel('a'), origen: { tipo: 'inventado' } })).toBe(false)
  })

  it('el id sale del nombre y de la fecha (nada de números raros)', () => {
    expect(idDe('Veste 60fps.design', 1792474644259)).toMatch(/^veste-60fps-design-[a-z0-9]+$/)
    expect(idDe('¡Qué skin!', 1792474644259)).toMatch(/^que-skin-[a-z0-9]+$/)
    // dos pieles del mismo nombre en momentos distintos no se pisan
    expect(idDe('Igual', 1)).not.toBe(idDe('Igual', 2))
  })

  it('escribir y volver a leer da lo mismo', () => {
    const lista = [piel('a'), piel('b')]
    expect(parseaColeccion(serializaColeccion(lista))).toEqual(lista)
  })
})
