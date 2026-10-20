// La paleta de cada referencia: lo que una web usa de verdad, guardado para no volver a pedirselo cada vez.
//
// Es una cache con su regla: se guarda lo que se ha visto (con su fecha), y se vuelve a mirar lo que es viejo. Nadie
// gana con descargar la misma web mil veces; y una web tampoco es un servidor al que abusar.
export type Entrada = { url: string; colores: string[]; titulo: string; vista: number }

export type Cache = { version: 1; entradas: Record<string, Entrada> }

export const VERSION = 1
export const DIAS = 14          // lo que se ha visto hace más de esto se vuelve a mirar
export const MAX = 200          // un fichero de esta lista no crece sin fin

export function parseaCache(texto: string): Cache {
  let crudo: unknown
  try { crudo = JSON.parse(texto) } catch { return { version: VERSION, entradas: {} } }
  const e = (crudo as { entradas?: unknown })?.entradas
  if (!e || typeof e !== 'object' || Array.isArray(e)) return { version: VERSION, entradas: {} }
  const sanas: Record<string, Entrada> = {}
  for (const [k, v] of Object.entries(e as Record<string, unknown>)) {
    if (!v || typeof v !== 'object') continue
    const x = v as Partial<Entrada>
    if (typeof x.url !== 'string' || !Array.isArray(x.colores) || typeof x.vista !== 'number') continue
    if (!x.colores.every((c) => typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c))) continue
    sanas[k] = { url: x.url, colores: x.colores, titulo: typeof x.titulo === 'string' ? x.titulo.slice(0, 80) : '', vista: x.vista }
  }
  return { version: VERSION, entradas: sanas }
}

export function serializaCache(c: Cache): string {
  const entradas = Object.fromEntries(Object.entries(c.entradas).slice(-MAX))
  return `${JSON.stringify({ version: VERSION, entradas }, null, 1)}\n`
}

/** Una entrada sirve si es reciente; si es vieja, se vuelve a mirar (el diseño de una web cambia). */
export function vigente(e: Entrada | undefined, ahora: number, dias = DIAS): boolean {
  return !!e && ahora - e.vista < dias * 86_400_000
}

/** Las direcciones que aún no hemos visto (o que están viejas): se piden poco a poco. */
export function pendientes(c: Cache, urls: string[], ahora: number, max = 6): string[] {
  return [...new Set(urls)].filter((u) => !vigente(c.entradas[u], ahora)).slice(0, max)
}
