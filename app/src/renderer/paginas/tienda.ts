// Descubrir en la Tienda (docs/superpowers/specs/2026-10-18-la-tienda.md): buscar por palabras y por familia de color,
// y «Sorpréndeme». Lógica pura; la página solo la enseña.
import type { Piel } from '../tinta/piel'

export type ItemTienda = { id: string; tipo: 'piel'; piel: Piel; descripcion: string; etiquetas: string[]; autor: string; origen: 'casa' | 'tienda' }
export type Familia = 'rojo' | 'naranja' | 'amarillo' | 'verde' | 'cian' | 'azul' | 'violeta' | 'rosa' | 'gris'
export const FAMILIAS: Familia[] = ['rojo', 'naranja', 'amarillo', 'verde', 'cian', 'azul', 'violeta', 'rosa', 'gris']

const norm = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()

/** La familia de un color por su tono (y gris si casi no tiene color). */
export function familiaDe(hex: string): Familia {
  const h = hex.replace('#', ''), [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min
  if (d < 0.12) return 'gris'
  let t = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  t = (t * 60 + 360) % 360
  if (t < 15 || t >= 345) return 'rojo'
  if (t < 40) return 'naranja'
  if (t < 65) return 'amarillo'
  if (t < 160) return 'verde'
  if (t < 200) return 'cian'
  if (t < 240) return 'azul'
  if (t < 285) return 'violeta'
  return 'rosa'
}

const acentoDe = (p: Piel) => (p.color.tipo === 'libre' ? p.color.noche.acento : null)

export function buscarEnTienda(items: ItemTienda[], f: { texto?: string; color?: Familia | null }): ItemTienda[] {
  const q = norm(f.texto?.trim() ?? '')
  return items.filter((i) => {
    if (q && !norm([i.piel.nombre, i.descripcion, ...i.etiquetas].join(' ')).includes(q)) return false
    if (f.color) { const a = acentoDe(i.piel); if (!a || familiaDe(a) !== f.color) return false }
    return true
  })
}

/** Una al azar que no sea la que llevas puesta. */
export function sorprendeme(items: ItemTienda[], puesta: string | null, azar = Math.random): ItemTienda | null {
  const otras = items.filter((i) => i.id !== puesta)
  return otras.length ? otras[Math.floor(azar() * otras.length)] : null
}
