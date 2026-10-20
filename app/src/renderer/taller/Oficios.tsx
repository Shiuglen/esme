// Los oficios del equipo: qué papel juega cada motor en la arena. Se eligen con un clic.
import { cn } from '../lib/cn'
import type { Rol } from '../../main/taller/roles'

export function Oficios({ roles, elegidos, onCambiar }: {
  roles: Rol[]
  elegidos: string[]
  onCambiar(elegidos: string[]): void
}) {
  if (!roles.length) return null
  return (
    <span className="inline-flex h-8 items-center gap-1 overflow-x-auto rounded-2 border border-linea bg-s1/70 px-1.5 [scrollbar-width:none]">
      {roles.map((r) => {
        const on = elegidos.includes(r.id)
        return (
          <button key={r.id} type="button" role="checkbox" aria-checked={on} title={r.instruccion}
            onClick={() => onCambiar(on ? elegidos.filter((x) => x !== r.id) : [...elegidos, r.id])}
            className={cn('h-6 shrink-0 whitespace-nowrap rounded-full px-2 text-[12px] transition-colors',
              on ? 'bg-acento text-sobre-acento' : 'text-texto-2 hover:text-texto')}>
            {r.nombre}
          </button>
        )
      })}
    </span>
  )
}
