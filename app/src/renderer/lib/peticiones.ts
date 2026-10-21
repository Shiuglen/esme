// Las peticiones que hace una pantalla a otra: la Tienda pide un agente, el Taller lo recibe.
//
// Antes esto se resolvía con props cruzadas (el App pasando estados a dos páginas), que enreda la App y obliga a
// que cada página nueva se propague por toda la cadena. Aquí hay un bus: quien pide, publica; quien puede
// servirlo, se suscribe. La Tienda no sabe que existe un Taller, y el Taller no sabe que existe una Tienda.
//
// Es un bus de UNA sola pasada: cada petición la sirve UNO. Si nadie la sirve, se queda esperando (nadie la
//Silencia) — que es lo que tiene que pasar: pedir algo que no existe no rompe nada.

type Escucha<T> = (peticion: T) => void

const escuchas = new Map<string, Set<Escucha<never>>>()

/** Se ofrece al que pueda servirlo. Devuelve el unsubscribe. */
export function ofrece<T>(tipo: string, escucha: Escucha<T>): () => void {
  const set = (escuchas.get(tipo) ?? new Set()) as Set<Escucha<T>>
  set.add(escucha)
  escuchas.set(tipo, set)
  return () => { set.delete(escucha) }
}

/** Se pide. Lo sirve el primero que esté escuchando (y se quita de en medio: una petición, un sirve). */
export function pide<T>(tipo: string, peticion: T): boolean {
  const set = escuchas.get(tipo) as Set<Escucha<T>> | undefined
  if (!set || !set.size) return false
  for (const e of [...set]) {
    e(peticion)
    return true
  }
  return false
}

/** ¿Hay alguien que pueda servir esto ahora mismo? (para saber si la acción tiene sentido) */
export function hayQuienAtiende(tipo: string): boolean {
  const set = escuchas.get(tipo)
  return !!set && set.size > 0
}

// —— las peticiones concretas ——

/** La Tienda pide un agente para el Taller: el motor que se elige y qué se le pide. */
export type PeticionDeAgente = { motor: string; nombre: string; que: string }

/** El Taller acepta la petición: abre la pantalla de encargar con ese motor ya elegido. */
export const TIPO_AGENTE = 'taller:agente'
