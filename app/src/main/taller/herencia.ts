// La herencia: cuando arranca una tarea, el motor no empieza de cero.
//
// Es el problema que MemGPT, Mem0, Hindsight y Letta señalan igual: cada sesión nueva
// arranca en blanco, y el usuario tiene que pegar el contexto a mano. Esme ya tiene la memoria; lo
// que faltaba era dársela sin que nadie la pidiera. Antes de la primera pregunta de una tarea, Esme
// pregunta a la mente qué sabe del encargo y se lo pasa al motor, así un Claude Code, un Codex o un
// Cline abren los ojos con lo que tú ya sabías.
//
// Si la mente no está (la app se está empezando, el servidor cayó), la tarea arranca igual: la
// herencia es una mejora, nunca una condición.
import { ClienteCerebro } from '../mente/cliente'

export type Mente = { url: string; token: string }
export type Recuerdo = { texto: string; tokens: number; ids: string[] }

/** Lo que la mente sabe del encargo. `null` si no hay nada que heredar. */
export async function heredar(mente: Mente | null, consulta: string, o: { presupuesto?: number; fetch?: typeof fetch } = {}): Promise<Recuerdo | null> {
  if (!mente || !consulta.trim()) return null
  try {
    // por la puerta, como todo lo demás: el token y el reloj son de la puerta
    const j = await new ClienteCerebro(mente, o.fetch).recordar(consulta, { budget: o.presupuesto ?? 0, who: 'taller' })
    const texto = (j.context ?? '').trim()
    if (!texto) return null
    return { texto, tokens: j.tokens ?? 0, ids: j.ids ?? [] }
  } catch {
    return null   // sin mente no hay herencia, pero la tarea sigue
  }
}

/** El texto que se le pasa al motor: lo que sabe la mente, dicho para que lo use y no lo repita. */
export function bloqueHerencia(r: Recuerdo | null): string {
  if (!r) return ''
  const cuantos = r.ids.length
  return `Contexto heredado de la memoria de Esme (${cuantos} ${cuantos === 1 ? 'recuerdo' : 'recuerdos'}, ${r.tokens} tokens). `
    + `Úsalo si encaja con la tarea; no lo repitas ni lo menciones:\n\n${r.texto}\n\n---\n\n`
}

/** Lo que la mente sabe del equipo: qué motor acierta contigo y qué se rompe siempre. */
export async function heredarEquipo(mente: Mente | null, o: { presupuesto?: number; fetch?: typeof fetch } = {}): Promise<Recuerdo | null> {
  if (!mente) return null
  try {
    const j = await new ClienteCerebro(mente, o.fetch).recordar('del equipo: qué motor y qué modelo aciertan, y qué se rompe siempre', { budget: o.presupuesto ?? 300, who: 'taller' })
    const texto = (j.context ?? '').trim()
    if (!texto) return null
    return { texto, tokens: j.tokens ?? 0, ids: j.ids ?? [] }
  } catch {
    return null   // sin mente no hay herencia, pero la tarea sigue
  }
}

/** El bloque del equipo, para que el motor sepa con quién trabaja y con qué no fiarse. */
export function bloqueEquipo(r: Recuerdo | null): string {
  if (!r) return ''
  return `Lo que la mente aprendió de tu equipo (${r.ids.length} ${r.ids.length === 1 ? 'lección' : 'lecciones'}):\n${r.texto}\n\n---\n\n`
}
