// El Taller como grabado: las caras de las máquinas no se pintan, se rayan. Cuántas rayas lleva cada cara lo decide la
// luz de tu sol (tinta/sol.ts): por la mañana entra por la izquierda y por la tarde por la derecha.
// De día es grabado (las rayas son sombra); de noche, esgrafiado: se raya la luz sobre el negro.

export type Nivel = 0 | 1 | 2 | 3 // sin rayas, sueltas, medias, cruzadas
export type Sombras = { arriba: Nivel; izquierda: Nivel; derecha: Nivel }

const nivel = (v: number) => Math.min(3, Math.max(0, Math.round(v))) as Nivel

export function sombras(anguloSol: number, noche: boolean): Sombras {
  const a = anguloSol > 180 ? anguloSol - 360 : anguloSol, t = Math.min(1, Math.max(-1, a / 60))
  const dia = { arriba: Math.abs(t) > 0.66 ? 1 : 0, izquierda: 2 + t, derecha: 2 - t } // sol bajo: arriba roza y se apaga un poco
  if (!noche) return { arriba: nivel(dia.arriba), izquierda: nivel(dia.izquierda), derecha: nivel(dia.derecha) }
  return { arriba: nivel(2 - dia.arriba), izquierda: nivel(2 - nivel(dia.izquierda)), derecha: nivel(2 - nivel(dia.derecha)) }
}

/** Ángulo de las rayas de cada cara (siguen sus aristas isométricas) y el de las rayas que las cruzan en el nivel 3. */
export const RAYAS = { arriba: 26.57, izquierda: 90, derecha: -26.57 } as const
export const CRUCES = { arriba: -26.57, izquierda: 26.57, derecha: 90 } as const
/** Separación de las rayas por nivel, en unidades de la planta. */
export const SEPARACION: Record<Exclude<Nivel, 0>, number> = { 1: 5.4, 2: 3.4, 3: 3.4 }
