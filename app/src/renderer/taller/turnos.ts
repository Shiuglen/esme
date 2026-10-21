// Los turnos de una tarea en la vista: qué puntos dejó cada turno y qué pasa al volver a uno.
// La regla de qué es un turno la tiene el proceso principal (el mensaje del commit la dice); aquí
// sólo se cuenta y se explica, con palabras que no prometen más de lo que pasa.

export type Punto = { sha: string; mensaje: string; turno: number | null }
export type Turno = { n: number; sha: string; mensaje: string }

/** Los puntos que son turnos, del primero al último. */
export function turnos(puntos: Punto[]): Turno[] {
  return puntos.filter((p) => p.turno !== null).map((p) => ({ n: p.turno as number, sha: p.sha, mensaje: p.mensaje }))
}

/** A qué turnos se puede volver: todos menos el último (volver al último no deshace nada). */
export function aDondeVolver(turnos: Turno[]): Turno[] {
  return turnos.slice(0, -1)
}

/** Se puede deshacer el último turno cuando hay dos turnos o más: hace falta un punto anterior. */
export function sePuedeDeshacer(turnos: Turno[]): boolean {
  return turnos.length >= 2
}

/** Lo que va a pasar, dicho en claro: qué vuelve y qué se queda fuera. */
export function fraseVuelta(turno: Turno, total: number): string {
  const despues = total - turno.n
  const siguientes = despues === 1 ? 'el turno siguiente ya no está en ella' : `los ${despues} turnos siguientes ya no están en ella`
  return `La copia vuelve a como estaba al terminar el turno ${turno.n}: ${siguientes}. Tu carpeta no se toca.`
}
