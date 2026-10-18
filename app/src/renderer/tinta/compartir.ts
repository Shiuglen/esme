// Compartir pieles: tu diseño entero (colores, letra, forma, movimiento, escena, piezas…) en un código «ESME-PIEL-…» que
// otra persona pega en su Esme. Una piel es solo datos: el código ajeno pasa por validarPiel como cualquier piel y nunca
// trae código. Es el primer paso de la galería donde la gente descubre y lanza sus diseños.
import { validarPiel, type Piel } from './piel'

const PREFIJO = 'ESME-PIEL-'
const MAX = 60_000   // una piel cabe de sobra; un código enorme no es una piel

const aBase64url = (s: string) => btoa(String.fromCharCode(...new TextEncoder().encode(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const deBase64url = (s: string) => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0)))

export const pielACodigo = (p: Piel) => PREFIJO + aBase64url(JSON.stringify(p))

export function codigoAPiel(texto: string): { ok: true; piel: Piel } | { ok: false; motivo: string } {
  const c = texto.replace(/\s+/g, '')
  if (!c.startsWith(PREFIJO)) return { ok: false, motivo: 'Eso no es un código de piel: empieza por «ESME-PIEL-».' }
  if (c.length > MAX) return { ok: false, motivo: 'Ese código es demasiado grande para ser una piel.' }
  let crudo: unknown
  try { crudo = JSON.parse(deBase64url(c.slice(PREFIJO.length))) } catch { return { ok: false, motivo: 'El código está incompleto o dañado: cópialo entero.' } }
  const r = validarPiel(crudo)
  return r.ok ? { ok: true, piel: r.piel } : { ok: false, motivo: `Esa piel trae cosas que Esme no admite: ${r.errores.join('; ')}.` }
}
