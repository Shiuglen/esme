// Geometría de la planta del Taller: el mismo plano isométrico de la Señal, ahora con máquinas.
// Celdas de 1×1 en un suelo de 9×9; el núcleo (la mente) ocupa la celda (4,4) y las tareas, un anillo a su alrededor.
import { pulso } from '../marca/senal'

export type Punto = { x: number; y: number }

const ANCHO = 100, ALTO = 50, Z = 50                         // losa 2:1; una unidad de altura = 50 px
const NUCLEO: Punto = { x: 4.5, y: 4.5 }
const n2 = (v: number) => String(Math.round(v * 100) / 100 + 0)   // + 0 convierte −0 en 0

/** Del plano (x, y, altura z) a la pantalla. */
export const iso = (x: number, y: number, z = 0): [number, number] => [(x - y) * (ANCHO / 2) + 0, (x + y) * (ALTO / 2) - z * Z + 0]

const poligono = (pts: [number, number, number][]) => `M${pts.map(([x, y, z]) => iso(x, y, z).map(n2).join(' ')).join('L')}Z`

/** Una caja apoyada en z0: la cara de arriba y las dos que mira quien observa (+x a la derecha, +y a la izquierda). */
export function caja(x: number, y: number, w: number, d: number, h: number, z0 = 0) {
  const t = z0 + h
  return {
    arriba: poligono([[x, y, t], [x + w, y, t], [x + w, y + d, t], [x, y + d, t]]),
    derecha: poligono([[x + w, y, z0], [x + w, y + d, z0], [x + w, y + d, t], [x + w, y, t]]),
    izquierda: poligono([[x, y + d, z0], [x + w, y + d, z0], [x + w, y + d, t], [x, y + d, t]]),
  }
}

/** Las ocho celdas de las máquinas: primero los ejes (conducto recto), luego las diagonales. */
export const lugares = (): Punto[] => [
  { x: 6, y: 4 }, { x: 4, y: 6 }, { x: 2, y: 4 }, { x: 4, y: 2 },
  { x: 6, y: 6 }, { x: 2, y: 6 }, { x: 2, y: 2 }, { x: 6, y: 2 },
]

/** Del centro del núcleo al centro de la máquina; en diagonal va por la calle libre entre celdas, como una pista de circuito. */
export function ruta(m: Punto): Punto[] {
  const fin = { x: m.x + 0.5, y: m.y + 0.5 }
  if (m.x === 4 || m.y === 4) return [NUCLEO, fin]
  const calle = NUCLEO.x + Math.sign(m.x - 4)
  return [NUCLEO, { x: calle, y: NUCLEO.y }, { x: calle, y: fin.y }, fin]
}

export const longitud = (l: Punto[]) => l.slice(1).reduce((s, p, i) => s + Math.hypot(p.x - l[i].x, p.y - l[i].y), 0)

/** n + 1 puntos a la misma distancia sobre la polilínea, con su progreso u ∈ [0, 1]. */
export function muestrear(l: Punto[], n: number): (Punto & { u: number })[] {
  const total = longitud(l), out: (Punto & { u: number })[] = []
  let tramo = 0, recorrido = 0
  for (let k = 0; k <= n; k++) {
    const meta = (total * k) / n
    while (tramo < l.length - 2 && recorrido + Math.hypot(l[tramo + 1].x - l[tramo].x, l[tramo + 1].y - l[tramo].y) < meta) {
      recorrido += Math.hypot(l[tramo + 1].x - l[tramo].x, l[tramo + 1].y - l[tramo].y); tramo++
    }
    const a = l[tramo], b = l[tramo + 1], largo = Math.hypot(b.x - a.x, b.y - a.y) || 1
    const f = Math.min(1, Math.max(0, (meta - recorrido) / largo))
    out.push({ x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, u: k / n })
  }
  return out
}

/** El conducto como una neurona: un potencial de acción en c (0 a 1) levanta la línea del suelo; la cresta se pinta en aurora. */
export function conducto(l: Punto[], { c, alto, n = 48 }: { c: number; alto: number; n?: number }): { d: string; cresta: string | null } {
  const pts = muestrear(l, n).map((p) => ({ ...p, v: pulso(p.u, c) }))
  const xy = (p: (typeof pts)[number]) => iso(p.x, p.y, alto * p.v).map(n2).join(' ')
  const d = `M${pts.map(xy).join('L')}`
  const vivos = pts.flatMap((p, i) => (p.v > 0.12 ? [i] : []))
  if (!vivos.length) return { d, cresta: null }
  const desde = Math.max(0, vivos[0] - 1), hasta = Math.min(pts.length - 1, vivos[vivos.length - 1] + 1)
  return { d, cresta: `M${pts.slice(desde, hasta + 1).map(xy).join('L')}` }
}

/** Sitio estable en la planta: cada tarea conserva su celda y las nuevas toman el primer hueco libre. Máximo ocho. */
export function asignarLugares(previo: Map<string, number>, visibles: string[]): Map<string, number> {
  const ids = visibles.slice(0, 8), out = new Map<string, number>()
  for (const id of ids) if (previo.has(id)) out.set(id, previo.get(id)!)
  const ocupados = new Set(out.values())
  for (const id of ids) {
    if (out.has(id)) continue
    let k = 0; while (ocupados.has(k)) k++
    out.set(id, k); ocupados.add(k)
  }
  return out
}
