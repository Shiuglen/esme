// Viste la app con una piel (tinta/piel.ts): pone sus variables en vivo, su estilo, su movimiento y su fondo, carga su letra
// solo cuando se elige (no las doce de golpe: la memoria es sagrada) y ajusta el tamaño con el zoom real de la ventana.
import { curvaDe } from './caracter'
import { bridge } from '../lib/bridge'
import { quitarPropio } from './estilo-propio'
import { variablesDePiel, type LetraId, type Piel } from './piel'

const CARGAS: Record<LetraId, () => Promise<unknown>> = {
  funnel: () => Promise.all([import('@fontsource-variable/funnel-display'), import('@fontsource-variable/funnel-sans')]),
  inter: () => import('@fontsource-variable/inter'),
  geist: () => import('@fontsource-variable/geist'),
  instrument: () => import('@fontsource-variable/instrument-sans'),
  dmsans: () => import('@fontsource-variable/dm-sans'),
  manrope: () => import('@fontsource-variable/manrope'),
  sora: () => import('@fontsource-variable/sora'),
  grotesk: () => import('@fontsource-variable/space-grotesk'),
  fraunces: () => import('@fontsource-variable/fraunces'),
  newsreader: () => import('@fontsource-variable/newsreader'),
  bodoni: () => import('@fontsource-variable/bodoni-moda'),
  mono: () => import('@fontsource-variable/jetbrains-mono'),
}
export const cargarLetra = (id: LetraId) => CARGAS[id]().catch(() => {})

let puestas: string[] = []
export function vestirApp(p: Piel, tema: 'noche' | 'dia') {
  const raiz = document.documentElement
  for (const k of puestas) raiz.style.removeProperty(k)
  quitarPropio()
  const v = variablesDePiel(p, tema)
  for (const [k, x] of Object.entries(v)) raiz.style.setProperty(k, x)
  puestas = Object.keys(v)
  if (p.color.tipo === 'estilo' && p.color.estilo !== 'esmeralda') raiz.dataset.estilo = p.color.estilo
  else delete raiz.dataset.estilo
  raiz.dataset.movimiento = p.movimiento
  raiz.dataset.superficie = p.piezas.superficie   // la superficie de hojas y de lo que flota (esme.css)
  const c = curvaDe(p.caracter)   // las transiciones de CSS también tienen el carácter de la piel
  raiz.style.setProperty('--curva', c.curva); raiz.style.setProperty('--lento', String(c.factor))
  raiz.dataset.fondo = p.fondo
  void cargarLetra(p.letra.titulos); void cargarLetra(p.letra.texto)
  bridge.ventana()?.zoom?.(p.letra.escala)
}
