// Las escenas: fondos vivos (WebGL) que son una capa más de la piel. Vienen de React Bits (revisados y copiados en
// ui/fondos); aquí cada una tiene su nombre, cómo se carga (solo cuando se elige: no pesan si no se usan) y cómo se tiñe
// con los colores de la piel, para que cualquier escena combine con cualquier piel.
import type { ComponentType } from 'react'

export type PaletaEscena = { acento: string; texto: string; fondo: string; superficie: string }
type Escena = { nombre: string; cargar: () => Promise<{ default: ComponentType<Record<string, unknown>> }>; props: (p: PaletaEscena) => Record<string, unknown> }

// mezcla dos colores hex (t=0 → a, t=1 → b): para sacar tonos vecinos del acento sin inventar colores ajenos a la piel
export function mezcla(a: string, b: string, t: number): string {
  const n = (h: string) => { const x = h.replace('#', ''); const f = x.length === 3 ? x.split('').map((c) => c + c).join('') : x; return [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16)) }
  const [p, q] = [n(a), n(b)]
  return `#${p.map((v, i) => Math.round(v + (q[i] - v) * t).toString(16).padStart(2, '0')).join('')}`
}

const c = (m: () => Promise<Record<string, unknown>>) => () => m().then((x) => ({ default: (x.default ?? Object.values(x)[0]) as ComponentType<Record<string, unknown>> }))

export const ESCENAS = {
  velo: { nombre: 'Velo', cargar: c(() => import('../ui/fondos/DarkVeil')), props: (p) => ({ color: p.acento, speed: 0.35, brightness: 0.9, glow: 0.6, grain: 0.05 }) },
  eter: { nombre: 'Éter líquido', cargar: c(() => import('../ui/fondos/LiquidEther')), props: (p) => ({ colors: [p.acento, mezcla(p.acento, '#ffffff', 0.4), mezcla(p.acento, p.fondo, 0.5)], autoDemo: true }) },
  'aurora-suave': { nombre: 'Aurora suave', cargar: c(() => import('../ui/fondos/SoftAurora')), props: (p) => ({ color1: p.acento, color2: mezcla(p.acento, '#ffffff', 0.5) }) },
  aurora: { nombre: 'Aurora', cargar: c(() => import('../ui/fondos/Aurora')), props: (p) => ({ colorStops: [p.acento, mezcla(p.acento, '#ffffff', 0.45), mezcla(p.acento, p.fondo, 0.4)], amplitude: 1, blend: 0.5 }) },
  seda: { nombre: 'Seda', cargar: c(() => import('../ui/fondos/Silk')), props: (p) => ({ color: mezcla(p.acento, p.fondo, 0.55), sheenColor: p.acento, speed: 4, scale: 1 }) },
  iridiscencia: { nombre: 'Iridiscencia', cargar: c(() => import('../ui/fondos/Iridescence')), props: (p) => ({ color: p.acento, speed: 0.6, amplitude: 0.1 }) },
  galaxia: { nombre: 'Galaxia', cargar: c(() => import('../ui/fondos/Galaxy')), props: (p) => ({ starColors: [p.acento, '#ffffff', mezcla(p.acento, '#ffffff', 0.5)], backgroundColor: p.fondo, density: 1, glowIntensity: 0.35 }) },
  prisma: { nombre: 'Prisma', cargar: c(() => import('../ui/fondos/Prism')), props: (p) => ({ colors: [p.acento, mezcla(p.acento, '#ffffff', 0.5)], animationType: 'rotate', glow: 1 }) },
  plasma: { nombre: 'Plasma', cargar: c(() => import('../ui/fondos/Plasma')), props: (p) => ({ color: p.acento, speed: 0.5, opacity: 0.85 }) },
  hilos: { nombre: 'Hilos', cargar: c(() => import('../ui/fondos/Threads')), props: (p) => ({ color: p.acento, accentColor: mezcla(p.acento, '#ffffff', 0.5), amplitude: 1 }) },
  rayos: { nombre: 'Rayos de luz', cargar: c(() => import('../ui/fondos/LightRays')), props: (p) => ({ raysColor: p.acento, raysOrigin: 'top-center', followMouse: true }) },
  haces: { nombre: 'Haces', cargar: c(() => import('../ui/fondos/Beams')), props: (p) => ({ color: p.acento, backgroundColor: p.fondo }) },
  particulas: { nombre: 'Partículas', cargar: c(() => import('../ui/fondos/Particles')), props: (p) => ({ particleColors: [p.acento, p.texto], particleCount: 220, moveParticlesOnHover: true }) },
  olas: { nombre: 'Olas', cargar: c(() => import('../ui/fondos/Waves')), props: (p) => ({ lineColor: mezcla(p.acento, p.fondo, 0.4), accentColor: p.acento, backgroundColor: 'transparent' }) },
  cromo: { nombre: 'Cromo líquido', cargar: c(() => import('../ui/fondos/LiquidChrome')), props: (p) => ({ color: mezcla(p.acento, p.fondo, 0.6), accentColor: p.acento, speed: 0.25 }) },
  tormenta: { nombre: 'Tormenta', cargar: c(() => import('../ui/fondos/Lightning')), props: (p) => ({ color: p.acento, speed: 0.6, intensity: 0.8 }) },
  persianas: { nombre: 'Persianas', cargar: c(() => import('../ui/fondos/GradientBlinds')), props: (p) => ({ gradientColors: [p.acento, mezcla(p.acento, p.fondo, 0.7)], lightColor: p.texto }) },
  estallido: { nombre: 'Estallido', cargar: c(() => import('../ui/fondos/PrismaticBurst')), props: (p) => ({ colors: [p.acento, mezcla(p.acento, '#ffffff', 0.5), p.fondo] }) },
  pilar: { nombre: 'Pilar de luz', cargar: c(() => import('../ui/fondos/LightPillar')), props: (p) => ({ topColor: p.acento, bottomColor: mezcla(p.acento, '#ffffff', 0.5) }) },
  lineas: { nombre: 'Líneas flotantes', cargar: c(() => import('../ui/fondos/FloatingLines')), props: (p) => ({ linesGradient: [p.acento, mezcla(p.acento, '#ffffff', 0.5)], backgroundColor: 'transparent' }) },
  curvas: { nombre: 'Curvas de color', cargar: c(() => import('../ui/fondos/ColorBends')), props: (p) => ({ colors: [p.acento, mezcla(p.acento, '#ffffff', 0.4), mezcla(p.acento, p.fondo, 0.5)] }) },
  grano: { nombre: 'Degradado con grano', cargar: c(() => import('../ui/fondos/Grainient')), props: (p) => ({ colors: [p.acento, mezcla(p.acento, p.fondo, 0.6), p.fondo] }) },
  hiperespacio: { nombre: 'Hiperespacio', cargar: c(() => import('../ui/fondos/Hyperspeed')), props: (p) => ({ effectOptions: { colors: { roadColor: 0x080808, islandColor: 0x0a0a0a, background: 0x000000, shoulderLines: 0x131318, brokenLines: 0x131318, leftCars: [p.acento], rightCars: [mezcla(p.acento, '#ffffff', 0.5)], sticks: p.acento } } }) },
} satisfies Record<string, Escena>

export type EscenaId = keyof typeof ESCENAS
export const ESCENA_IDS = Object.keys(ESCENAS) as EscenaId[]
export const propsDeEscena = (id: EscenaId, p: PaletaEscena) => ESCENAS[id].props(p)
