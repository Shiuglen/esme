// Pieles (docs/superpowers/specs/2026-10-17-pieles.md): Esme no tiene un diseño, tiene pieles. Una piel es un documento de
// datos —nunca código— que decide todo lo que se ve: color, letra, forma, densidad, movimiento y fondo. Aquí se valida (una
// piel que trae algo que no es un color o una opción conocida se rechaza), se completa con la base (una IA puede mandar solo
// una parte), se deriva la paleta entera desde cuatro colores y se comprueba que todo se lea (contraste WCAG AA).
import { ESTILOS, paletaPropia, type EstiloId, type Gustos } from './estilo-propio'
import { aRgb } from './luz'

export const LETRAS = {
  funnel: { nombre: 'Funnel', titulos: '"Funnel Display Variable"', texto: '"Funnel Sans Variable"', tipo: 'sans' },
  inter: { nombre: 'Inter', titulos: '"Inter Variable"', texto: '"Inter Variable"', tipo: 'sans' },
  geist: { nombre: 'Geist', titulos: '"Geist Variable"', texto: '"Geist Variable"', tipo: 'sans' },
  instrument: { nombre: 'Instrument Sans', titulos: '"Instrument Sans Variable"', texto: '"Instrument Sans Variable"', tipo: 'sans' },
  dmsans: { nombre: 'DM Sans', titulos: '"DM Sans Variable"', texto: '"DM Sans Variable"', tipo: 'sans' },
  manrope: { nombre: 'Manrope', titulos: '"Manrope Variable"', texto: '"Manrope Variable"', tipo: 'sans' },
  sora: { nombre: 'Sora', titulos: '"Sora Variable"', texto: '"Sora Variable"', tipo: 'sans' },
  grotesk: { nombre: 'Space Grotesk', titulos: '"Space Grotesk Variable"', texto: '"Space Grotesk Variable"', tipo: 'sans' },
  fraunces: { nombre: 'Fraunces', titulos: '"Fraunces Variable"', texto: '"Fraunces Variable"', tipo: 'serif' },
  newsreader: { nombre: 'Newsreader', titulos: '"Newsreader Variable"', texto: '"Newsreader Variable"', tipo: 'serif' },
  bodoni: { nombre: 'Bodoni Moda', titulos: '"Bodoni Moda Variable"', texto: '"Bodoni Moda Variable"', tipo: 'serif' },
  mono: { nombre: 'JetBrains Mono', titulos: '"JetBrains Mono Variable"', texto: '"JetBrains Mono Variable"', tipo: 'sans' },
} as const
export type LetraId = keyof typeof LETRAS
const RESPALDO = { sans: '"Helvetica Neue", Arial, sans-serif', serif: 'Georgia, "Times New Roman", serif' }

export type Base = { fondo: string; superficie: string; texto: string; acento: string; atencion?: string; peligro?: string; exito?: string }
export type ColorPiel = { tipo: 'estilo'; estilo: Exclude<EstiloId, 'propio'> } | { tipo: 'gustos'; gustos: Gustos } | { tipo: 'libre'; noche: Base; dia: Base }
export type Sombra = 'plana' | 'suave' | 'honda'
export type Densidad = 'compacta' | 'comoda' | 'amplia'
export type Movimiento = 'nada' | 'sutil' | 'vivo'
export type FondoPiel = 'liso' | 'aurora' | 'papel'
export type Navegacion = 'leyenda' | 'riel' | 'muelle'
export type Piel = {
  version: 1; nombre: string; color: ColorPiel
  letra: { titulos: LetraId; texto: LetraId; escala: number }
  forma: { radio: number; sombra: Sombra }
  densidad: Densidad; movimiento: Movimiento; fondo: FondoPiel; navegacion: Navegacion
}

export const PIEL_BASE: Piel = {
  version: 1, nombre: 'Esmeralda', color: { tipo: 'estilo', estilo: 'esmeralda' },
  letra: { titulos: 'funnel', texto: 'funnel', escala: 1 }, forma: { radio: 1, sombra: 'suave' },
  densidad: 'comoda', movimiento: 'sutil', fondo: 'aurora', navegacion: 'leyenda',
}

const SOMBRAS: Sombra[] = ['plana', 'suave', 'honda'], DENSIDADES: Densidad[] = ['compacta', 'comoda', 'amplia']
const MOVIMIENTOS: Movimiento[] = ['nada', 'sutil', 'vivo'], FONDOS: FondoPiel[] = ['liso', 'aurora', 'papel'], NAVEGACIONES: Navegacion[] = ['leyenda', 'riel', 'muelle']
// Solo colores de verdad: hex, rgb() o hsl() con números. Nada de url(), var(), expresiones ni texto suelto.
const COLOR = /^(#[0-9a-f]{3}|#[0-9a-f]{6}|(?:rgb|hsl)a?\(\s*[-\d.%\s,/]+\))$/i
const limita = (v: unknown, a: number, b: number, d: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(b, Math.max(a, v)) : d)
const objeto = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

function base(v: unknown, donde: string, errores: string[]): Base | null {
  if (!objeto(v)) { errores.push(`${donde}: faltan los colores`); return null }
  const b: Record<string, string> = {}
  for (const k of ['fondo', 'superficie', 'texto', 'acento', 'atencion', 'peligro', 'exito']) {
    const x = v[k]
    if (x === undefined && !['fondo', 'superficie', 'texto', 'acento'].includes(k)) continue
    if (typeof x !== 'string' || !COLOR.test(x.trim())) { errores.push(`${donde}.${k}: «${String(x).slice(0, 40)}» no es un color`); continue }
    b[k] = x.trim()
  }
  return b as Base
}

/** Valida una piel (o un trozo de piel) y la completa con la base. Una piel solo puede traer datos conocidos. */
export function validarPiel(x: unknown): { ok: true; piel: Piel } | { ok: false; errores: string[] } {
  if (!objeto(x)) return { ok: false, errores: ['una piel es un objeto'] }
  const e: string[] = [], p: Piel = structuredClone(PIEL_BASE)
  if (x.nombre !== undefined) p.nombre = String(x.nombre).slice(0, 60) || PIEL_BASE.nombre
  if (x.color !== undefined) {
    const c = x.color
    if (!objeto(c)) e.push('color: no es un objeto')
    else if (c.tipo === 'estilo' && ESTILOS.includes(c.estilo as EstiloId) && c.estilo !== 'propio') p.color = { tipo: 'estilo', estilo: c.estilo as Exclude<EstiloId, 'propio'> }
    else if (c.tipo === 'gustos' && objeto(c.gustos)) p.color = { tipo: 'gustos', gustos: { tono: limita(c.gustos.tono, 0, 360, 165), papel: limita(c.gustos.papel, 0, 100, 30), fuerza: limita(c.gustos.fuerza, 0, 100, 70) } }
    else if (c.tipo === 'libre') { const n = base(c.noche, 'noche', e), d = base(c.dia, 'día', e); if (n && d) p.color = { tipo: 'libre', noche: n, dia: d } }
    else e.push('color: tipo desconocido')
  }
  if (x.letra !== undefined) {
    const l = objeto(x.letra) ? x.letra : {}
    for (const k of ['titulos', 'texto'] as const) {
      if (l[k] === undefined) continue
      if (typeof l[k] === 'string' && l[k] in LETRAS) p.letra[k] = l[k] as LetraId
      else e.push(`letra.${k}: «${String(l[k])}» no es una letra de Esme`)
    }
    p.letra.escala = limita(l.escala, 0.85, 1.2, PIEL_BASE.letra.escala)
  }
  if (x.forma !== undefined) {
    const f = objeto(x.forma) ? x.forma : {}
    p.forma.radio = limita(f.radio, 0, 2.5, PIEL_BASE.forma.radio)
    if (f.sombra !== undefined) { if (SOMBRAS.includes(f.sombra as Sombra)) p.forma.sombra = f.sombra as Sombra; else e.push('forma.sombra: desconocida') }
  }
  const enumera = <T extends string>(k: 'densidad' | 'movimiento' | 'fondo' | 'navegacion', lista: T[]) => {
    if (x[k] === undefined) return
    if (lista.includes(x[k] as T)) (p as Record<string, unknown>)[k] = x[k]
    else e.push(`${k}: «${String(x[k])}» no es una opción`)
  }
  enumera('densidad', DENSIDADES); enumera('movimiento', MOVIMIENTOS); enumera('fondo', FONDOS); enumera('navegacion', NAVEGACIONES)
  return e.length ? { ok: false, errores: e } : { ok: true, piel: p }
}

// —— color ——
const lum = (c: string) => {
  const [r, g, b] = aRgb(c).map((v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4 })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
/** Contraste WCAG entre dos colores (1 a 21). */
export function contraste(a: string, b: string): number {
  const x = lum(a), y = lum(b)
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}
const hex = (c: number[]) => `#${c.map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('')}`
const mezcla = (a: string, b: string, t: number) => { const x = aRgb(a), y = aRgb(b); return hex(x.map((v, i) => v + (y[i] - v) * t)) }
const velo = (c: string, a: number) => { const [r, g, b] = aRgb(c); return `rgb(${r} ${g} ${b} / ${a})` }
/** Acerca un texto a su color pleno hasta que se lea sobre `sobre` (contraste ≥ minimo). */
function legible(texto: string, fondo: string, sobre: string[], t: number, minimo = 4.6) {
  for (let k = t; k >= 0; k -= 0.03) { const c = mezcla(texto, fondo, k); if (sobre.every((s) => contraste(c, s) >= minimo)) return c }
  return texto
}

/** De cuatro colores (fondo, superficie, texto y acento) nace la paleta entera de Esme, legible. */
export function derivarPaleta(b: Base, tema: 'noche' | 'dia'): Record<string, string> {
  const noche = tema === 'noche', { fondo, superficie: s1, texto, acento } = b
  const s2 = mezcla(s1, texto, noche ? 0.05 : 0.03), s3 = mezcla(s1, texto, noche ? 0.1 : 0.07)
  const info = noche ? '#7db4ff' : '#2f5fb3'
  const atencion = b.atencion ?? (noche ? '#f5b556' : '#9a5b00'), peligro = b.peligro ?? (noche ? '#f2687e' : '#c02648'), exito = b.exito ?? (noche ? '#2fd39a' : '#0b8a5c')
  const sobre = contraste(acento, fondo) >= contraste(acento, texto) ? fondo : texto
  return {
    '--fondo': fondo, '--superficie-1': s1, '--superficie-2': s2, '--superficie-3': s3,
    '--linea': mezcla(fondo, texto, 0.1), '--linea-fuerte': mezcla(fondo, texto, 0.24),
    '--texto': texto, '--texto-2': legible(texto, fondo, [s1, s2, fondo], 0.28), '--texto-3': legible(texto, fondo, [s1, s2, fondo], 0.42),
    '--acento': acento, '--sobre-acento': sobre, '--acento-velo': mezcla(fondo, acento, noche ? 0.16 : 0.12), '--foco': acento,
    '--memoria': acento, '--memoria-velo': mezcla(fondo, acento, noche ? 0.14 : 0.1),
    '--atencion': atencion, '--atencion-velo': mezcla(fondo, atencion, 0.14), '--peligro': peligro, '--peligro-velo': mezcla(fondo, peligro, 0.14),
    '--info': info, '--exito': exito, '--exito-velo': mezcla(fondo, exito, 0.14),
    '--luz': acento, '--luz-2': mezcla(acento, info, 0.5), '--luz-3': mezcla(acento, noche ? '#b39dff' : '#6c4fd6', 0.5),
    '--esmeralda': acento, '--esmeralda-1': mezcla(acento, noche ? '#ffffff' : fondo, 0.42), '--esmeralda-3': mezcla(acento, noche ? fondo : '#000000', 0.35),
    '--esmeralda-4': mezcla(acento, fondo, 0.6), '--hielo': info, '--brillo': velo(acento, noche ? 0.35 : 0.22),
    '--papel': fondo, '--hoja': s1, '--tinta': texto, '--tinta-fresca': mezcla(acento, texto, 0.3), '--tinta-vieja': mezcla(texto, fondo, 0.5),
    '--grafito': mezcla(texto, fondo, 0.55), '--sello': noche ? '#ff6b57' : '#d9452f',
    '--actividad-0': mezcla(fondo, acento, 0.06), '--actividad-1': mezcla(fondo, acento, 0.25), '--actividad-2': mezcla(fondo, acento, 0.45),
    '--actividad-3': mezcla(fondo, acento, 0.7), '--actividad-4': acento, '--cristal': velo(s1, 0.75),
  }
}

const PARES: [string, string, string, number][] = [
  ['texto sobre fondo', '--texto', '--fondo', 4.5], ['texto sobre superficie', '--texto', '--superficie-1', 4.5],
  ['texto secundario', '--texto-2', '--superficie-1', 4.5], ['texto terciario', '--texto-3', '--superficie-1', 4.5],
  ['texto de los botones', '--sobre-acento', '--acento', 4.5], ['acento sobre fondo', '--acento', '--fondo', 3],
  ['avisos de peligro', '--peligro', '--superficie-1', 4.5], ['avisos de atención', '--atencion', '--superficie-1', 4.5],
]
/** Los pares que no se leen (vacío: todo se lee). */
export function revisarContraste(p: Record<string, string>): string[] {
  return PARES.flatMap(([nombre, a, b, min]) => {
    if (!p[a] || !p[b]) return [`${nombre}: falta un color`]
    const c = contraste(p[a], p[b])
    return c + 1e-9 >= min ? [] : [`${nombre}: ${c.toFixed(2)} (mínimo ${min})`]
  })
}

// —— variables ——
const RADIOS = [6, 10, 14, 22]
const SOMBRA: Record<Sombra, [string, string] | null> = {
  plana: ['none', 'none'],
  suave: null, // la del tema
  honda: ['0 32px 80px rgba(0, 0, 0, 0.62), 0 6px 18px rgba(0, 0, 0, 0.45)', '0 32px 80px rgba(15, 25, 45, 0.2), 0 6px 16px rgba(15, 25, 45, 0.1)'],
}
/** Todo lo que la piel decide, como variables CSS para el tema dado (los estilos de casa dejan su color al CSS). */
export function variablesDePiel(p: Piel, tema: 'noche' | 'dia'): Record<string, string> {
  const v: Record<string, string> = {}
  RADIOS.forEach((r, i) => { v[`--forma-r${i + 1}`] = `${Math.round(r * p.forma.radio)}px` })
  v['--spacing'] = { compacta: '0.22rem', comoda: '0.25rem', amplia: '0.28rem' }[p.densidad]
  const letra = (id: LetraId, rol: 'titulos' | 'texto') => `${LETRAS[id][rol]}, ${RESPALDO[LETRAS[id].tipo]}`
  v['--letra-titulos'] = letra(p.letra.titulos, 'titulos'); v['--letra-texto'] = letra(p.letra.texto, 'texto')
  const s = SOMBRA[p.forma.sombra]; if (s) v['--sombra-flotante'] = tema === 'noche' ? s[0] : s[1]
  if (p.color.tipo === 'gustos') Object.assign(v, paletaPropia(p.color.gustos, tema))
  if (p.color.tipo === 'libre') Object.assign(v, derivarPaleta(p.color[tema], tema))
  return v
}
