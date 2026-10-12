// Deslizar el tiempo: la mente tal como era en cualquier día de su vida.
import type { NodoRed } from './red'

export function rangoDe(nodos: NodoRed[]): { desde: number; hasta: number } | null {
  let desde = Infinity, hasta = -Infinity
  for (const n of nodos) if (n.fecha !== undefined) { if (n.fecha < desde) desde = n.fecha; if (n.fecha > hasta) hasta = n.fecha }
  return desde === Infinity ? null : { desde, hasta }
}

/** Lo que existía en el instante `corte`: los recuerdos ya hechos (los que no tienen fecha, siempre) y los temas con algo dentro. */
export function visiblesEn(nodos: NodoRed[], corte: number): { ids: Set<string>; porTema: Map<number, number> } {
  const ids = new Set<string>(), porTema = new Map<number, number>()
  for (const n of nodos) {
    if (n.tipo !== 'recuerdo' || (n.fecha !== undefined && n.fecha > corte)) continue
    ids.add(n.id); porTema.set(n.tema, (porTema.get(n.tema) ?? 0) + 1)
  }
  for (const n of nodos) if (n.tipo === 'tema' && porTema.get(n.tema)) ids.add(n.id)
  return { ids, porTema }
}

export function histograma(nodos: NodoRed[], desde: number, hasta: number, cubos: number): number[] {
  const h = new Array<number>(cubos).fill(0), lapso = hasta - desde
  for (const n of nodos) {
    if (n.tipo !== 'recuerdo' || n.fecha === undefined) continue
    const i = lapso > 0 ? Math.floor(((n.fecha - desde) / lapso) * cubos) : cubos - 1
    h[Math.min(cubos - 1, Math.max(0, i))]++
  }
  return h
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic']
const dia = (ms: number) => { const d = new Date(ms); return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() }
export function etiquetaFecha(ms: number, ahora = Date.now()): string {
  const dias = Math.round((dia(ahora) - dia(ms)) / 864e5)
  if (dias === 0) return 'Hoy'
  if (dias === 1) return 'Ayer'
  const d = new Date(ms), base = `${d.getDate()} ${MESES[d.getMonth()]}`
  return d.getFullYear() === new Date(ahora).getFullYear() ? base : `${base} ${d.getFullYear()}`
}
