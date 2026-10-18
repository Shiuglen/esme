// La lógica de «El Mando vivo»: la frase con el estado real de tu mundo (lo urgente primero), los temas que se rotulan en
// la constelación de tu mente (con su nombre más significativo) y el brillo de lo reciente.
import type { AtlasCluster } from '../lib/brain'
import { fraseCuando } from '../taller/cuando'

const num = (n: number) => n.toLocaleString('es-ES', { useGrouping: 'always' } as Intl.NumberFormatOptions)
const plural = (n: number, uno: string, varios: string) => (n === 1 ? uno : varios).replace('#', num(n))
const corto = (t: string, n = 48) => { const s = t.replace(/\s+/g, ' ').trim(); return s.length > n ? `${s.slice(0, n)}…` : s }

export function estadoDelDia(o: { listas: number; trabajando: number; esperan: number; programados: { texto: string; proxima: number | null }[]; temas: number; recuerdos: number; ahora: number }): string[] {
  const f: string[] = []
  if (o.esperan) f.push(plural(o.esperan, '# agente te espera.', '# agentes te esperan.'))
  if (o.trabajando) f.push(plural(o.trabajando, '# agente trabaja para ti ahora mismo.', '# agentes trabajan para ti ahora mismo.'))
  if (o.listas) f.push(plural(o.listas, '# tarea está lista para que la revises.', '# tareas están listas para que las revises.'))
  const proximo = o.programados.filter((p) => p.proxima !== null).sort((a, b) => a.proxima! - b.proxima!)[0]
  if (proximo) f.push(`${fraseCuando({ tipo: 'una', ms: proximo.proxima! }, o.ahora)} tu equipo hará «${corto(proximo.texto)}» solo.`)
  if (!f.length) f.push(`Tu mente guarda ${plural(o.recuerdos, '# recuerdo', '# recuerdos')} en ${plural(o.temas, '# tema', '# temas')}.`)
  return f.slice(0, 3)
}

// formas verbales que salen de las conversaciones y no nombran nada
const DEBILES = /^(quier[aeo]s?|quieras|necesit\w+|puedes?|podemos|hacer|hago|haz|dime|mira|compruebo|vamos|tienes?|creo|sigue|dale)$/i
const capital = (t: string) => t[0].toUpperCase() + t.slice(1)
export function nombreDeTema(c: Pick<AtlasCluster, 'terms' | 'label'>): string {
  const t = (c.terms ?? []).filter(Boolean)
  if (!t.length) return ''
  const propio = t.find((x) => /^[A-ZÁÉÍÓÚÑ]/.test(x))
  return capital(propio ?? t.find((x) => !DEBILES.test(x)) ?? t.at(-1)!)
}

export const temasVisibles = (clusters: AtlasCluster[], n: number) =>
  [...clusters].sort((a, b) => b.size - a.size).slice(0, n).map((c) => ({ ...c, nombre: nombreDeTema(c) })).filter((c) => c.nombre)

/** 1 si es de hoy, se apaga en unas dos semanas; 0 sin fecha. */
export function brilloDe(ts: string | undefined, ahora: number): number {
  if (!ts) return 0
  const dias = (ahora - Date.parse(ts)) / 864e5
  return Number.isFinite(dias) ? Math.max(0, Math.min(1, Math.exp(-Math.max(0, dias) / 8))) : 0
}
