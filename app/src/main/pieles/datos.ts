// Tu colección de pieles: el documento. Sin electron, sin disco: solo el formato, para que se pueda comprobar.
//
// Una piel propia es un dato, como las de casa: { id, nombre, creada, origen, piel }. El origen dice de dónde salió
// (una referencia que guardaste, o de tu mano). La lista vive en un fichero en tu carpeta de datos.
export type OrigenPiel = { tipo: 'referencia'; url: string; dominio: string } | { tipo: 'propia' } | null

export type PielPropia = {
  id: string
  nombre: string
  creada: number
  origen: OrigenPiel
  piel: Record<string, unknown>
}

export type Coleccion = { version: 1; pieles: PielPropia[] }

export const VERSION = 1
export const MAX_PIELES = 60

const esTexto = (x: unknown): x is string => typeof x === 'string' && x.trim().length > 0

/** Una piel guardada: tiene que tener lo mínimo para ser una piel (lo demás lo comprueba validarPiel en la ventana). */
export function esPielPropia(x: unknown): x is PielPropia {
  if (!x || typeof x !== 'object') return false
  const p = x as Partial<PielPropia>
  if (!esTexto(p.id) || !esTexto(p.nombre)) return false
  if (typeof p.creada !== 'number' || !Number.isFinite(p.creada)) return false
  if (!p.piel || typeof p.piel !== 'object' || Array.isArray(p.piel)) return false
  if (p.origen != null) {
    const o = p.origen as Partial<{ tipo: string; url: string; dominio: string }>
    if (o.tipo !== 'referencia' && o.tipo !== 'propia') return false
    if (o.tipo === 'referencia' && (!esTexto(o.url) || !esTexto(o.dominio))) return false
  }
  return true
}

/** Lee la colección de un texto. Lo que no sirve se descarta (unapiel dañada no tira el resto). */
export function parseaColeccion(texto: string): PielPropia[] {
  let crudo: unknown
  try { crudo = JSON.parse(texto) } catch { return [] }
  const lista = Array.isArray(crudo) ? crudo : (crudo as { pieles?: unknown })?.pieles
  if (!Array.isArray(lista)) return []
  const sanas = lista.filter(esPielPropia)
  // sin ids repetidos: la primera gana (el id es la identidad de la piel)
  const vistos = new Set<string>()
  return sanas.filter((p) => (vistos.has(p.id) ? false : (vistos.add(p.id), true))).slice(0, MAX_PIELES)
}

export function serializaColeccion(pieles: PielPropia[]): string {
  const c: Coleccion = { version: VERSION, pieles: pieles.slice(0, MAX_PIELES) }
  return `${JSON.stringify(c, null, 1)}\n`
}

/** Un id estable y corto: el nombre de la piel, con su fecha (nada de números aleatorios que nadie recuerda). */
export function idDe(nombre: string, creada: number): string {
  const base = nombre.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 24) || 'piel'
  return `${base}-${creada.toString(36).slice(-4)}`
}
