// La memoria como red neuronal: cada recuerdo es un nodo, cada tema un centro.
// Conexiones: recuerdo → su tema, recuerdo ↔ sus vecinos más cercanos (por significado: posición en el mapa)
// y tema ↔ el tema más cercano, para que la red sea una sola.
import type { Atlas } from '../lib/brain'

export type NodoRed = { id: string; tipo: 'recuerdo' | 'tema'; etiqueta?: string; tema: number; tam: number; x: number; y: number }
export type EnlaceRed = { source: string; target: string; tipo: 'tema' | 'vecino' | 'puente' }
export type Red = { nodes: NodoRed[]; links: EnlaceRed[] }

export function construirRed(atlas: Pick<Atlas, 'points' | 'clusters'>, { vecinos = 2, escala = 60 }: { vecinos?: number; escala?: number } = {}): Red {
  if (!atlas.points.length && !atlas.clusters.length) return { nodes: [], links: [] }
  const temas: NodoRed[] = atlas.clusters.map((c) => ({ id: `tema:${c.id}`, tipo: 'tema', etiqueta: c.label, tema: c.id, tam: c.size, x: c.x * escala, y: c.y * escala }))
  const recuerdos: NodoRed[] = atlas.points.map((p) => ({ id: p.id, tipo: 'recuerdo', tema: p.cluster, tam: 1, x: p.x * escala, y: p.y * escala }))
  const links: EnlaceRed[] = []
  const hayTema = new Set(atlas.clusters.map((c) => c.id))
  for (const r of recuerdos) if (hayTema.has(r.tema)) links.push({ source: r.id, target: `tema:${r.tema}`, tipo: 'tema' })

  // vecinos: para cada recuerdo, los k más cercanos (sin duplicar el par en ambos sentidos)
  const vistos = new Set<string>()
  for (let i = 0; i < recuerdos.length; i++) {
    const a = recuerdos[i]
    const cerca: [number, number][] = []
    for (let j = 0; j < recuerdos.length; j++) {
      if (i === j) continue
      const b = recuerdos[j], d = (a.x - b.x) ** 2 + (a.y - b.y) ** 2
      if (cerca.length < vecinos) { cerca.push([d, j]); cerca.sort((p, q) => p[0] - q[0]) }
      else if (d < cerca[cerca.length - 1][0]) { cerca[cerca.length - 1] = [d, j]; cerca.sort((p, q) => p[0] - q[0]) }
    }
    for (const [, j] of cerca) {
      const clave = i < j ? `${i}|${j}` : `${j}|${i}`
      if (vistos.has(clave)) continue
      vistos.add(clave); links.push({ source: a.id, target: recuerdos[j].id, tipo: 'vecino' })
    }
  }

  // puentes: cada tema con su tema más cercano
  const puentes = new Set<string>()
  for (const a of temas) {
    let mejor: NodoRed | null = null, dm = Infinity
    for (const b of temas) { if (b === a) continue; const d = (a.x - b.x) ** 2 + (a.y - b.y) ** 2; if (d < dm) { dm = d; mejor = b } }
    if (!mejor) continue
    const clave = [a.id, mejor.id].sort().join('|')
    if (!puentes.has(clave)) { puentes.add(clave); links.push({ source: a.id, target: mejor.id, tipo: 'puente' }) }
  }
  return { nodes: [...temas, ...recuerdos], links }
}
