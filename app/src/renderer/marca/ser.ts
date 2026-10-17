// El nacimiento de los bichitos: cada motor toma un trozo distinto de la constelación de TU mente como cuerpo.
// La silueta circunvala los temas reales de tu atlas (ordenados por ángulo y lisados con Catmull-Rom) y la trama
// de puntos interiores son esos mismos temas. Nada de azar vivo: un solo río determinista por semilla — el
// bichito no cambia de forma entre arranques, pero crece cuando tu mente crece.
import { type Firma } from './sello'

export type Forma = {
  cuerpo: string            // d de la silueta cerrada, en 0–100
  asientos: Array<[number, number, number]>   // los temas dentro del cuerpo: [x, y, radio]
  patas: string[]           // d de cada pata
  ojos: Array<[number, number]>
  giro: number              // grados
  pulso: number             // segundos del ciclo de respiración
}

const sujeta = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x))

/** fnv-1a — la misma casa firma con hash estable. */
export const huella = (texto: string): number => {
  let h = 0x811c9dc5
  for (let i = 0; i < texto.length; i++) { h ^= texto.charCodeAt(i); h = Math.imul(h, 0x01000193) }
  return h >>> 0
}

/** mulberry32 — el río determinista. */
export const rio = (semilla: number): (() => number) => {
  let a = semilla >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Catmull-Rom cerrado → Bézier: la silueta fluye como criatura, no como polígono nervioso. */
const lisar = (pts: Array<[number, number]>): string => {
  const n = pts.length
  if (n < 3) return ''
  let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n]
    const c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6
    const c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`
  }
  return `${d} Z`
}

/** El cuerpo: un trozo de TU mente, girado desde su centro, sentado en el cuadro 0–100. */
export function nacer(firma: Firma, semilla: string): Forma {
  const h = rio(huella(`${semilla}·nace`))
  // La forma de casa: sin mente conectada, el bichito es un panal sencillo y digno.
  if (!firma.length) {
    const anillos: Array<[number, number]> = []
    const partida = h() * Math.PI * 2
    for (let i = 0; i < 7; i++) {
      const a = partida + (i / 7) * Math.PI * 2, r = 30 * (0.82 + 0.36 * ((i % 3) / 2.4))
      anillos.push([50 + Math.cos(a) * r, 52 + Math.sin(a) * r * 0.86])
    }
    return { cuerpo: lisar(anillos), asientos: [], patas: ['M 40 76 q -4 9 4 12', 'M 60 76 q 4 9 -4 12'],
      ojos: [[44, 46], [56, 46]], giro: 0, pulso: 3.2 }
  }
  // normaliza la constelación a su caja propia (puede venir en cualquier escala)
  const xs = firma.map(f => f.x), ys = firma.map(f => f.y)
  const mx = Math.min(...xs), Mx = Math.max(...xs), my = Math.min(...ys), My = Math.max(...ys)
  const ancho = Math.max(Mx - mx, 1e-9), alto = Math.max(My - my, 1e-9)
  const mondita = firma.map(f => [((f.x - mx) / ancho - 0.5) * 72, ((f.y - my) / alto - 0.5) * 62, sujeta(Math.sqrt(f.size ?? 1) * 1.9, 0.9, 3.4)] as [number, number, number])
  // circunvala el recuerdo: centroide + ángulo, con un empujoncito de semilla
  const cx = mondita.reduce((s, p) => s + p[0], 0) / mondita.length
  const cy = mondita.reduce((s, p) => s + p[1], 0) / mondita.length
  const conAngulo = mondita
    .map(p => ({ p, a: Math.atan2(p[1] - cy, p[0] - cx) + (h() - 0.5) * 0.9 }))
    .sort((u, v) => u.a - v.a).map(u => u.p)
  const todo = conAngulo.length
  // el trozo del cuerpo del motor: un arco continuo de TU mente (con envoltura); su largo respira con la red
  const quiero = sujeta(Math.round(7 + (h() * 4)), 7, 11)
  const largo = sujeta(Math.round(todo * 0.3), quiero, 16)
  const desde = Math.floor(h() * todo)
  const trozo: Array<[number, number, number]> = []
  for (let i = 0; i < largo; i++) trozo.push(conAngulo[(desde + i) % todo])
  const sentado = trozo.map(([x, y]) => [50 + x, 52 + y] as [number, number])
  const asientos = trozo.filter((_, i) => i % 2 === 0).map(p => [50 + p[0], 52 + p[1], p[2]] as [number, number, number])
  const ojos = sujeta(1 + (firma.length > 6 ? 1 : 0) + (mondita.some(p => p[2] > 2.6) ? 1 : 0), 1, 3)
  const sitios: Array<[number, number]> = ojos === 1 ? [[50, 44]] : ojos === 2 ? [[43, 46], [57, 46]] : [[41, 47], [50, 41], [59, 47]]
  const cuantasPatas = sujeta(Math.min(firma.length, h() < 0.5 ? 3 : 4), 2, 4)
  const hebras: string[] = []
  for (let i = 0; i < cuantasPatas; i++) {
    const lado = i % 2 === 0 ? -1 : 1
    const px = 50 + lado * (14 + h() * 18), py = 40 + (i / cuantasPatas) * 42
    hebras.push(`M ${px.toFixed(1)} ${py.toFixed(1)} q ${(lado * 7).toFixed(1)} ${(6 + h() * 6).toFixed(1)} ${(lado * (10 + h() * 10)).toFixed(1)} ${(10 + h() * 14).toFixed(1)}`)
  }
  return { cuerpo: lisar(sentado), asientos, patas: hebras, ojos: sitios, giro: (h() - 0.5) * 10, pulso: 2.4 + h() * 2 }
}
