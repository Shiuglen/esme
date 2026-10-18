// El carácter del movimiento (capa de la piel): cómo se siente lo que se mueve. «preciso» es el de siempre; «pesado» tarda
// y nunca rebota, como algo que pesa; «magnético» acude antes y se asienta con un pellizco; «elástico» rebota; «lanzado»
// sale con inercia y se pasa un poco. Cada componente conserva su muelle propio y el carácter lo transforma con física:
// cambia lo rápido que responde (ω = √(k/m)) y cuánto rebota (ζ = c / 2√(km)), así todo el conjunto se siente igual.
import type { Caracter, Movimiento } from './piel'

export type Muelle = { type: 'spring'; stiffness: number; damping: number; mass: number }
type Fisica = { rapidez: number; rebote: (zeta: number) => number; masa: number }

const FISICA: Record<Exclude<Caracter, 'preciso'>, Fisica> = {
  pesado: { rapidez: 0.55, rebote: (z) => Math.max(z, 1.05), masa: 2 },
  magnetico: { rapidez: 1.35, rebote: () => 0.72, masa: 0.8 },
  elastico: { rapidez: 1, rebote: () => 0.32, masa: 1 },
  lanzado: { rapidez: 1.2, rebote: () => 0.5, masa: 0.7 },
}

/** El muelle de un componente vestido con el carácter de la piel. Con el movimiento en «nada», ni JavaScript anima. */
export function muelleCon(caracter: Caracter, movimiento: Movimiento, base: Muelle): Muelle | { duration: 0 } {
  if (movimiento === 'nada') return { duration: 0 }
  const vivo = movimiento === 'vivo' ? 1.15 : 1
  if (caracter === 'preciso' && vivo === 1) return base
  const f: Fisica = caracter === 'preciso' ? { rapidez: 1, rebote: (z) => z, masa: 1 } : FISICA[caracter]
  const w0 = Math.sqrt(base.stiffness / base.mass), z0 = base.damping / (2 * Math.sqrt(base.stiffness * base.mass))
  const mass = base.mass * f.masa, w = w0 * f.rapidez * vivo, stiffness = w * w * mass
  return { type: 'spring', stiffness: Math.round(stiffness), damping: Math.round(2 * f.rebote(z0) * Math.sqrt(stiffness * mass) * 10) / 10, mass }
}

/** Para las transiciones de CSS: la curva y cuánto se alargan respecto a las de siempre. */
export function curvaDe(caracter: Caracter): { curva: string; factor: number } {
  switch (caracter) {
    case 'pesado': return { curva: 'cubic-bezier(.65,0,.25,1)', factor: 1.6 }
    case 'magnetico': return { curva: 'cubic-bezier(.2,.9,.1,1)', factor: 0.8 }
    case 'elastico': return { curva: 'cubic-bezier(.34,1.56,.64,1)', factor: 1.1 }
    case 'lanzado': return { curva: 'cubic-bezier(.2,1.25,.35,1)', factor: 0.85 }
    default: return { curva: 'cubic-bezier(.16,1,.3,1)', factor: 1 }
  }
}
