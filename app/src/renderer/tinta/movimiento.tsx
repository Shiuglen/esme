// El carácter del movimiento llega a cada componente: cada uno pide su muelle de siempre con useMuelle y recibe el de la
// piel puesta (tinta/caracter.ts). Así una piel «pesada» o «elástica» se siente igual en toda la app.
import { createContext, useContext, useMemo } from 'react'
import { muelleCon } from './caracter'
import type { Caracter, Movimiento } from './piel'
import { PIEZAS_BASE, type Piezas } from './piezas'

const Ctx = createContext<{ caracter: Caracter; movimiento: Movimiento; piezas: Piezas }>({ caracter: 'preciso', movimiento: 'sutil', piezas: PIEZAS_BASE })
export const MovimientoPiel = Ctx.Provider

/** El muelle de este componente con el carácter de la piel (con el movimiento en «nada», sin animación). */
export function useMuelle(base: { stiffness: number; damping: number; mass?: number }) {
  const { caracter, movimiento } = useContext(Ctx)
  const { stiffness, damping, mass = 1 } = base
  return useMemo(() => muelleCon(caracter, movimiento, { type: 'spring', stiffness, damping, mass }), [caracter, movimiento, stiffness, damping, mass])
}

/** Las piezas elegidas en la piel (tinta/piezas.ts). */
export const usePiezas = () => ({ piezas: useContext(Ctx).piezas })
