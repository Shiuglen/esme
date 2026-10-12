// «Señal», el símbolo de Esme: líneas apiladas en un plano isométrico; cada una es una neurona cuyo potencial de
// acción (subida brusca, pico, caída bajo la base, vuelta) dispara un poco después que la de atrás. Geometría pura.

/** Potencial de acción en u ∈ [0,1] con el disparo en c. */
export function pulso(u: number, c: number): number {
  const w = u < c ? 0.045 : 0.085                                         // sube rápido, baja más lento
  const pico = Math.exp(-(((u - c) / w) ** 2))
  const pre = 0.32 * Math.exp(-(((u - (c - 0.16)) / 0.05) ** 2))          // el titubeo antes de disparar
  const bajo = -0.2 * Math.exp(-(((u - (c + 0.15)) / 0.055) ** 2))        // la hiperpolarización
  return pico + pre + bajo
}

export type LineaSenal = { d: string; grosor: number; f: number; x0: number; x1: number; base: number; cresta: [number, number] }
export type OpcionesSenal = { lineas?: number; t?: number; alto?: number; ancho?: [number, number]; muestras?: number }

const crestaDe = (f: number, k: number, t: number) => 0.42 + 0.14 * f + 0.025 * Math.sin(t + k * 0.6)
const geo = (f: number) => ({ persp: 0.42 + 0.58 * f, x0: 8 + 18 * (1 - f), base: 30 + 50 * f })

/** Las líneas del fondo (f=0) al frente (f=1), en un lienzo de 100×100. */
export function lineasSenal({ lineas = 5, t = 0, alto = 30, ancho = [1, 2.8], muestras = 96 }: OpcionesSenal = {}): LineaSenal[] {
  const out: LineaSenal[] = []
  for (let k = 0; k < lineas; k++) {
    const f = lineas === 1 ? 1 : k / (lineas - 1)
    const { persp, x0, base } = geo(f), x1 = x0 + 66, c = crestaDe(f, k, t)
    let d = '', cresta: [number, number] = [x0, base]
    for (let i = 0; i <= muestras; i++) {
      const u = i / muestras, x = x0 + (x1 - x0) * u, y = base - alto * persp * pulso(u, c)
      d += `${i ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)}`
      if (y < cresta[1]) cresta = [x, y]
    }
    out.push({ d, grosor: ancho[0] + (ancho[1] - ancho[0]) * f, f, x0, x1, base, cresta })
  }
  return out
}

/** El impulso que recorre la línea más cercana: progreso p ∈ [0,1] (fuera de rango, apagado). */
export function impulso(p: number, t = 0, alto = 30, lineas = 5): { x: number; y: number; luz: number } {
  const f = 1, { persp, x0, base } = geo(f), x1 = x0 + 66, c = crestaDe(f, lineas - 1, t)
  const u = Math.min(Math.max(p, 0), 0.995)
  const luz = p <= 0 || p >= 0.9 ? 0 : Math.sin(Math.PI * (p / 0.9))
  return { x: x0 + (x1 - x0) * u, y: base - alto * persp * pulso(u, c), luz }
}
