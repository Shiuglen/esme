// Tu sello: dice «esto lo aprobaste tú». No es un logo: es la constelación de tu propia mente (los temas de tu atlas como
// puntos, cada uno unido a su vecino más cercano), estampada en bermellón. Crece y cambia cuando tu mente crece.
import type { Atlas } from '../lib/brain'

export type Firma = { id?: number; label?: string; x: number; y: number; size: number }[]
export type Trazos = { puntos: { x: number; y: number; r: number }[]; lineas: [number, number, number, number][] }

/** Los temas más grandes de tu mente, doce como mucho: más ya no se leen en un sello. */
export const firmaDe = (atlas: Pick<Atlas, 'points' | 'clusters'> | null): Firma =>
  (atlas?.clusters ?? []).slice().sort((a, b) => b.size - a.size).slice(0, 12).map(({ id, label, x, y, size }) => ({ id, label, x, y, size }))

/** La constelación dentro de una caja de 100 × 100, con 20 de margen y sin deformar las distancias. */
export function trazosSello(firma: Firma): Trazos {
  if (!firma.length) return { puntos: [{ x: 50, y: 50, r: 9 }], lineas: [] }
  const xs = firma.map((p) => p.x), ys = firma.map((p) => p.y)
  const x0 = Math.min(...xs), y0 = Math.min(...ys), lado = Math.max(Math.max(...xs) - x0, Math.max(...ys) - y0) || 1
  const cx = (Math.max(...xs) + x0) / 2, cy = (Math.max(...ys) + y0) / 2, tope = Math.max(...firma.map((p) => p.size)) || 1
  const puntos = firma.map((p) => ({ x: 50 + ((p.x - cx) / lado) * 60, y: 50 + ((p.y - cy) / lado) * 60, r: 2.2 + 3.4 * Math.sqrt(p.size / tope) }))   // puntos finos: que se lea la red, no un racimo
  const lineas: Trazos['lineas'] = [], hechas = new Set<string>()
  puntos.forEach((p, i) => {
    let j = -1, d = Infinity
    puntos.forEach((q, k) => { const e = Math.hypot(p.x - q.x, p.y - q.y); if (k !== i && e < d) { d = e; j = k } })
    const clave = i < j ? `${i}-${j}` : `${j}-${i}`
    if (j >= 0 && !hechas.has(clave)) { hechas.add(clave); lineas.push([p.x, p.y, puntos[j].x, puntos[j].y]) }
  })
  return { puntos, lineas }
}

/** Nadie estampa un sello recto: cada aprobación queda un poco torcida, siempre igual para la misma tarea (±4°). */
export function giroSello(id: string): number {
  let h = 2166136261
  for (let i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 16777619) }
  return (((h >>> 0) % 801) / 100) - 4
}
