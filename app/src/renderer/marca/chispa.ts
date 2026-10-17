// La chispa esmeralda (Esme v3): esquirlas de cristal facetado alrededor de un núcleo de luz. No es un logo dibujado: nace de
// tu mente. Cada esquirla es uno de tus temas: apunta hacia donde está en tu mapa y es tan larga como lo que sabes de él.
// Cada una son dos facetas planas (luz y sombra: el cristal en dos tonos, sin realismo) con una asimetría de taller.
// Una mente sin temas tiene una chispa base. Coordenadas en un círculo de radio 1 (y = abajo, como en SVG).
const TAU = Math.PI * 2, NUCLEO = 0.17
const LUZ: P = [-0.6, -0.8] // la luz llega de arriba a la izquierda
export type P = [number, number]
export type Esquirla = { tema: number | null; angulo: number; largo: number; base: P; punta: P; clara: P[]; oscura: P[] }
export type Chispa = { esquirlas: Esquirla[]; astillas: P[][]; nucleo: number }

function azar(semilla: string) {
  let h = 2166136261
  for (let i = 0; i < semilla.length; i++) { h ^= semilla.charCodeAt(i); h = Math.imul(h, 16777619) }
  let a = h >>> 0
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}
const redondo = (p: P): P => [Math.round(p[0] * 1e4) / 1e4, Math.round(p[1] * 1e4) / 1e4]

/** Aparta los ángulos hasta que ninguna pareja vecina quede a menos de `sep` (en círculo). */
function separar(d: { angulo: number }[], sep: number) {
  for (let vuelta = 0; vuelta < 400; vuelta++) {
    d.sort((a, b) => a.angulo - b.angulo)
    let movido = false
    for (let i = 0; i < d.length; i++) {
      const a = d[i], b = d[(i + 1) % d.length]
      const hueco = ((b.angulo - a.angulo) % TAU + TAU) % TAU || (d.length > 1 ? 0 : TAU)
      if (hueco < sep) { const m = (sep - hueco) / 2 + 1e-4; a.angulo -= m; b.angulo += m; movido = true }
    }
    for (const x of d) x.angulo = ((x.angulo + Math.PI) % TAU + TAU) % TAU - Math.PI
    if (!movido) break
  }
}

function tallar(d: { tema: number | null; angulo: number; largo: number }, r: () => number): Esquirla {
  const u: P = [Math.cos(d.angulo), Math.sin(d.angulo)], v: P = [-u[1], u[0]]
  const r0 = NUCLEO * 0.8, R = NUCLEO + d.largo * (0.98 - NUCLEO)
  const w = 0.04 + 0.05 * d.largo, asim = (r() - 0.5) * 0.5, t = 0.28 + r() * 0.12, desvio = (r() - 0.5) * w * 0.5
  const m = r0 + t * (R - r0)
  const base = redondo([u[0] * r0, u[1] * r0])
  const punta = redondo([u[0] * R + v[0] * desvio, u[1] * R + v[1] * desvio])
  const izq = redondo([u[0] * m + v[0] * w * (1 + asim), u[1] * m + v[1] * w * (1 + asim)])
  const der = redondo([u[0] * m - v[0] * w * (1 - asim), u[1] * m - v[1] * w * (1 - asim)])
  const caraIzq: P[] = [base, izq, punta], caraDer: P[] = [base, punta, der]
  const luzIzq = v[0] * LUZ[0] + v[1] * LUZ[1] > 0
  return { tema: d.tema, angulo: d.angulo, largo: d.largo, base, punta, clara: luzIzq ? caraIzq : caraDer, oscura: luzIzq ? caraDer : caraIzq }
}

export function chispaDe(temas: { id: number; x: number; y: number; size: number }[], semilla = 'esme'): Chispa {
  const r = azar(semilla)
  let datos: { tema: number | null; angulo: number; largo: number }[]
  if (temas.length < 3) {
    datos = Array.from({ length: 8 }, (_, i) => ({ tema: null, angulo: (i / 8) * TAU - Math.PI + (r() - 0.5) * 0.35, largo: 0.55 + r() * 0.3 }))
  } else {
    const top = [...temas].sort((a, b) => b.size - a.size).slice(0, 12)
    const total = top.reduce((s, t) => s + t.size, 0) || 1, mayor = top[0].size || 1
    const cx = top.reduce((s, t) => s + t.x * t.size, 0) / total, cy = top.reduce((s, t) => s + t.y * t.size, 0) / total
    datos = top.map((t) => ({ tema: t.id, angulo: Math.atan2(t.y - cy, t.x - cx), largo: 0.42 + 0.58 * Math.sqrt(t.size / mayor) }))
  }
  separar(datos, Math.min((TAU / datos.length) * 0.7, 0.5))
  const esquirlas = datos.map((d) => tallar(d, azar(`${semilla}:${d.tema ?? d.angulo.toFixed(3)}`)))
  const astillas: P[][] = Array.from({ length: 5 }, () => {
    const a = r() * TAU, rad = 0.78 + r() * 0.2, s = 0.025 + r() * 0.025, g = r() * TAU
    const c: P = [Math.cos(a) * rad, Math.sin(a) * rad]
    return [0, 1, 2].map((k) => redondo([c[0] + Math.cos(g + (k * TAU) / 3) * s, c[1] + Math.sin(g + (k * TAU) / 3) * s * (k === 0 ? 1.6 : 1)]))
  })
  return { esquirlas, astillas, nucleo: NUCLEO }
}
