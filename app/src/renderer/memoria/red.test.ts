import { describe, expect, it } from 'vitest'
import { construirRed } from './red'

const atlas = {
  clusters: [{ id: 0, label: 'código', x: 0, y: 0, size: 3 }, { id: 1, label: 'diseño', x: 10, y: 0, size: 2 }],
  points: [
    { id: 'a', x: 0, y: 0, h: 0, cluster: 0, kind: 'note', source: 's' },
    { id: 'b', x: 1, y: 0, h: 0, cluster: 0, kind: 'note', source: 's' },
    { id: 'c', x: 0, y: 1, h: 0, cluster: 0, kind: 'note', source: 's' },
    { id: 'd', x: 10, y: 0, h: 0, cluster: 1, kind: 'note', source: 's' },
    { id: 'e', x: 11, y: 0, h: 0, cluster: 1, kind: 'note', source: 's' },
  ],
}

describe('construirRed', () => {
  it('crea un nodo por recuerdo y uno por tema', () => {
    const r = construirRed(atlas)
    expect(r.nodes.filter((n) => n.tipo === 'recuerdo')).toHaveLength(5)
    expect(r.nodes.filter((n) => n.tipo === 'tema').map((n) => n.etiqueta)).toEqual(['código', 'diseño'])
  })

  it('enlaza cada recuerdo con el tema al que pertenece', () => {
    const r = construirRed(atlas)
    const aTema = r.links.filter((l) => l.tipo === 'tema')
    expect(aTema).toHaveLength(5)
    expect(aTema.find((l) => l.source === 'd')?.target).toBe('tema:1')
  })

  it('une vecinos cercanos sin bucles ni duplicados', () => {
    const r = construirRed(atlas, { vecinos: 2 })
    const vecinos = r.links.filter((l) => l.tipo === 'vecino')
    expect(vecinos.every((l) => l.source !== l.target)).toBe(true)
    const claves = vecinos.map((l) => [l.source, l.target].sort().join('|'))
    expect(new Set(claves).size).toBe(claves.length)
    expect(claves).toContain('a|b')
  })

  it('conecta cada tema con el tema más cercano para que la red sea una sola', () => {
    const r = construirRed(atlas)
    expect(r.links.some((l) => l.tipo === 'puente' && [l.source, l.target].sort().join('|') === 'tema:0|tema:1')).toBe(true)
  })

  it('no rompe con una memoria vacía', () => {
    expect(construirRed({ clusters: [], points: [] })).toEqual({ nodes: [], links: [] })
  })
})
