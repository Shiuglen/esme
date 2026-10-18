// Cuándo hace el equipo un encargo: ahora, esta noche, mañana o cada día. Convierte lo que eliges en la regla de la
// agenda (main/taller/agenda.ts) y la regla en una frase que se lee como la dirías tú.
import type { Cuando } from '../../main/taller/agenda'

export type OpcionCuando = { modo: 'ahora' } | { modo: 'noche' } | { modo: 'manana' } | { modo: 'diaria'; hora: string; laborables?: boolean }

const a = (ahora: number, diasMas: number, h: number, m = 0) => { const d = new Date(ahora); return new Date(d.getFullYear(), d.getMonth(), d.getDate() + diasMas, h, m).getTime() }

export function cuandoDe(o: OpcionCuando, ahora: number): Cuando | null {
  if (o.modo === 'ahora') return null
  if (o.modo === 'noche') { const hoy = a(ahora, 0, 3); return { tipo: 'una', ms: hoy > ahora ? hoy : a(ahora, 1, 3) } }
  if (o.modo === 'manana') return { tipo: 'una', ms: a(ahora, 1, 9) }
  const m = /^(\d{1,2}):(\d{2})$/.exec(o.hora)
  if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) return null
  return { tipo: 'diaria', hora: Number(m[1]), minuto: Number(m[2]), ...(o.laborables ? { dias: [1, 2, 3, 4, 5] } : {}) }
}

const reloj = (h: number, m: number) => `${h}:${String(m).padStart(2, '0')}`
const DIAS = ['domingos', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábados']

export function fraseCuando(c: Cuando, ahora = Date.now()): string {
  if (c.tipo === 'una') {
    const d = new Date(c.ms), hora = reloj(d.getHours(), d.getMinutes())
    if (c.ms >= a(ahora, 0, 0) && c.ms < a(ahora, 1, 0)) return `Hoy a las ${hora}`
    if (c.ms >= a(ahora, 1, 0) && c.ms < a(ahora, 2, 0)) return `Mañana a las ${hora}`
    return `El ${d.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })} a las ${hora}`
  }
  const hora = reloj(c.hora, c.minuto), d = c.dias ?? []
  if (!d.length || d.length === 7) return `Cada día a las ${hora}`
  if (d.join() === '1,2,3,4,5') return `De lunes a viernes a las ${hora}`
  const nombres = d.map((x) => DIAS[x]).sort((x, y) => (x === 'domingos' ? 1 : 0) - (y === 'domingos' ? 1 : 0))
  const lista = nombres.length === 1 ? nombres[0] : `${nombres.slice(0, -1).join(', ')} y ${nombres.at(-1)}`
  return `${lista[0].toUpperCase()}${lista.slice(1)} a las ${hora}`
}
