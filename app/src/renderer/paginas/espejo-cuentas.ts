// La lógica del espejo, sin React: lo que se puede comprobar sin ventana.

/** Lo que devuelve el espejo: el informe (el texto) y sus cuentas. */
export type Cuentas = {
  clase?: string
  canales?: number
  funciones?: number
  desconocidos?: number
  segmentos?: number
  procedimientos?: number
  cadenas?: number
  added?: number
  memories?: number
}

/** Un número como lo escribe una persona: 20.175, no 20175. */
export function n(x: number): string {
  const s = Math.trunc(x).toString()
  return s.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

/** Las cuentas del informe, en una línea: lo que se ve y lo que no. */
export function cuentasDe(r: Cuentas): string[] {
  const out: string[] = []
  if (r.clase === 'nativo') {
    // Un binario no tiene canales ni ventanas: se cuenta con sus propias cuentas.
    if (r.segmentos !== undefined) out.push(`${n(r.segmentos)} segmentos`)
    if (r.procedimientos !== undefined) out.push(`${n(r.procedimientos)} procedimientos`)
    if (r.cadenas !== undefined) out.push(`${n(r.cadenas)} cadenas`)
  } else {
    if (r.canales !== undefined) out.push(`${n(r.canales)} canales IPC`)
    if (r.funciones !== undefined) out.push(`${n(r.funciones)} funciones`)
    if (r.desconocidos !== undefined) out.push(`${n(r.desconocidos)} cosas que no se pudo ver`)
  }
  if (r.added !== undefined) out.push(`${n(r.added)} recuerdos en la mente`)
  return out
}

/** Lo que hay que escribir en la caja del programa: nada de espacios de más. */
export function rutaLimpia(ruta: string): string {
  return ruta.trim()
}

/** ¿Se puede pedir el espejo? Sin programa, no. */
export function puedeMirar(ruta: string, trabajando: boolean): boolean {
  return rutaLimpia(ruta).length > 0 && !trabajando
}
