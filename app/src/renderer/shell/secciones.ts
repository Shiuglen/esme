// Las secciones de esme: el riel, la paleta y los atajos salen de aquí.
import { ChartColumn, House, MessageSquare, SlidersHorizontal, SquareTerminal, Store, Waypoints, type LucideIcon } from 'lucide-react'

export type SeccionId = 'inicio' | 'conversacion' | 'taller' | 'memoria' | 'uso' | 'tienda' | 'ajustes'
export type Seccion = { id: SeccionId; nombre: string; Icono: LucideIcon; atajo: string }

export const SECCIONES: Seccion[] = [
  { id: 'inicio', nombre: 'Inicio', Icono: House, atajo: 'Ctrl 1' },
  { id: 'conversacion', nombre: 'Conversación', Icono: MessageSquare, atajo: 'Ctrl 2' },
  { id: 'taller', nombre: 'Taller', Icono: SquareTerminal, atajo: 'Ctrl 3' },
  { id: 'memoria', nombre: 'Memoria', Icono: Waypoints, atajo: 'Ctrl 4' },
  { id: 'uso', nombre: 'Uso', Icono: ChartColumn, atajo: 'Ctrl 5' },
  { id: 'tienda', nombre: 'Tienda', Icono: Store, atajo: 'Ctrl 6' },
]
export const AJUSTES: Seccion = { id: 'ajustes', nombre: 'Ajustes', Icono: SlidersHorizontal, atajo: 'Ctrl ,' }
export const nombreDe = (id: SeccionId) => (id === 'ajustes' ? AJUSTES : SECCIONES.find((s) => s.id === id)!).nombre
