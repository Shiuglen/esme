// Los puntos de una tarea: el commit que dejó cada turno. La regla de qué es un turno vive aquí:
// lo dice el mensaje del commit, y el número sale de ahí — no de contar commits. Un commit que no
// es un punto (el de guardar en la rama, por ejemplo) no es un turno y no se cuenta como tal.

/** El mensaje del commit que deja el punto de un turno. */
export const mensajeTurno = (n: number) => `Esme: turno ${n}`

/** El número de turno de un punto: «Esme: turno 3» → 3. Lo que no lo dice, no es un turno. */
export function numeroTurno(mensaje: string): number | null {
  const m = /^\s*Esme:\s*turno\s+(\d+)\s*$/i.exec(mensaje)
  return m ? Number(m[1]) : null
}

/** Los puntos que son turnos, del primero al último. */
export function turnosDe(puntos: { sha: string; turno: number | null }[]): { n: number; sha: string }[] {
  return puntos.filter((p) => p.turno !== null).map((p) => ({ n: p.turno as number, sha: p.sha }))
}
