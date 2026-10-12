// Manchas de tinta: un punto o una aguada nunca es un círculo perfecto. El borde tiembla, siempre igual para el mismo
// recuerdo (la forma sale de su id), así que la mente se dibuja a mano pero no cambia cada vez que la miras.
const hash = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) } return h >>> 0 }
function azar(semilla: number) {
  let a = semilla
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}

const formas = new Map<string, number[]>()
/** Los radios relativos del borde (entre `min` y `max`) para `lados` puntos alrededor. */
export function forma(clave: string, lados: number, min: number, max: number): number[] {
  const k = `${clave}|${lados}|${min}|${max}`
  let f = formas.get(k)
  if (!f) { const r = azar(hash(clave)); f = Array.from({ length: lados }, () => min + (max - min) * r()); formas.set(k, f) }
  return f
}

/** Añade al trazado (sin pintar) una mancha cerrada y suave que pasa entre los puntos del borde. Sirve para un contexto o un Path2D. */
export function trazarMancha(ctx: CanvasPath, x: number, y: number, radio: number, f: number[]) {
  const n = f.length
  const px = (i: number) => x + Math.cos((i / n) * Math.PI * 2) * radio * f[i % n]
  const py = (i: number) => y + Math.sin((i / n) * Math.PI * 2) * radio * f[i % n]
  ctx.moveTo((px(0) + px(1)) / 2, (py(0) + py(1)) / 2)
  for (let i = 1; i <= n; i++) ctx.quadraticCurveTo(px(i), py(i), (px(i) + px(i + 1)) / 2, (py(i) + py(i + 1)) / 2)
  ctx.closePath()
}
