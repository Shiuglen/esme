// Modos de acceso por tarea (idea tomada de MonoCode, MIT, https://github.com/hardbeat920/monocode; reescrita para Esme):
// cuánto puede hacer un agente sin preguntarte. Como Esme trabaja en una copia aislada de tu proyecto, «ediciones» es seguro
// por defecto: aprueba leer, editar, buscar y mover ficheros dentro de la copia, y pregunta lo que ejecuta órdenes o sale a la
// red (eso sí puede salir de la copia). Así una tarea de la agenda a las 3:00 no se queda parada esperándote.
export type Acceso = 'preguntar' | 'ediciones' | 'todo'

const EDICIONES = new Set(['read', 'edit', 'delete', 'move', 'search', 'think', 'switch_mode'])

export const accesoValido = (x: unknown): x is Acceso => x === 'preguntar' || x === 'ediciones' || x === 'todo'

/** La opción con que Esme responde sola, o null si hay que preguntarte. Aprueba una sola vez: nunca «siempre» por su cuenta. */
export function autoRespuesta(acceso: Acceso, clase: string | undefined, opciones: { id: string; tipo: string }[]): string | null {
  if (acceso === 'preguntar') return null
  if (acceso === 'ediciones' && !(clase && EDICIONES.has(clase))) return null
  return opciones.find((o) => o.tipo === 'allow_once')?.id ?? opciones.find((o) => o.tipo === 'allow_always')?.id ?? null
}
