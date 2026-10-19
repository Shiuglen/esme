// Qué puede hacer Esme sin preguntar (docs/superpowers/specs/2026-10-18-manos.md): mirar es libre; actuar pregunta hasta
// que digas «siempre». Leer una web solo es libre si la dirección vino de ti o de una búsqueda: así una página con
// instrucciones escondidas no puede hacer que Esme mande tus datos a otra dirección.
export type Politica = 'siempre' | 'preguntar' | 'nunca'
export type Decision = 'permitir' | 'preguntar' | 'negar'

const LIBRES = new Set(['buscar_en_internet', 'buscar_en_memoria', 'ver_equipo', 'leer_web', 'usar_skill'])
const MAX_CONSULTA = 80
// sitios de solo consulta donde nadie puede recibir tus datos: se leen sin preguntar
const SEGUROS = /^([a-z-]+\.)?(m\.)?wikipedia\.org$/

/** Los sitios que tú nombraste o que salieron en una búsqueda durante esta conversación. */
export class Conocidas {
  private hosts = new Set<string>()
  anotarUrl(u: string) { try { this.hosts.add(new URL(u).hostname.replace(/^www\./, '')) } catch { /* no es una URL */ } }
  anotarTexto(t: string) { for (const m of t.matchAll(/https?:\/\/[^\s<>"')\]]+/g)) this.anotarUrl(m[0]) }
  conoce(u: string): boolean {
    try {
      const x = new URL(u), host = x.hostname.replace(/^www\./, '')
      return (this.hosts.has(host) || SEGUROS.test(host)) && x.search.length <= MAX_CONSULTA
    } catch { return false }
  }
}

export function decidir(nombre: string, politicas: Record<string, Politica>, args?: unknown, conocidas?: Conocidas): Decision {
  const p = politicas[nombre]
  if (p === 'nunca') return 'negar'
  if (p === 'siempre') return 'permitir'
  if (nombre === 'leer_web') {
    const url = (args as { url?: unknown } | undefined)?.url
    return typeof url === 'string' && conocidas?.conoce(url) ? 'permitir' : 'preguntar'
  }
  return LIBRES.has(nombre) ? 'permitir' : 'preguntar'
}
