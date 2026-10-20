// Una pared CON salida. Cuando algo aún no está —un motor, una mente, un recuerdo— no vale con un texto: hace falta
// decir qué es y ofrecer el camino. Un estado sin camino es un callejón sin salida, y Esme no los tiene.
// Es el mismo lenguaje que la Tienda: vidrio, una acción principal y el texto en la voz de la app.
import type { ReactNode } from 'react'
import { cn } from '../lib/cn'

export function Pared({ titulo, texto, accion, onAccion, icono, tono = 'calma', className }: {
  titulo: string
  texto?: ReactNode
  accion?: string
  onAccion?: () => void
  icono?: ReactNode
  tono?: 'calma' | 'aviso'
  className?: string
}) {
  return (
    <div className={cn('vidrio grid justify-items-start gap-2.5 rounded-4 border p-5', className)}>
      {icono && (
        <span className={cn('grid size-9 place-items-center rounded-3', tono === 'aviso' ? 'bg-atencion/15 text-atencion' : 'bg-acento/15 text-acento')}>
          {icono}
        </span>
      )}
      <p className="m-0 text-[15px] font-medium text-texto">{titulo}</p>
      {texto && <p className="m-0 max-w-[54ch] text-[13.5px] leading-5 text-texto-2">{texto}</p>}
      {accion && onAccion && (
        <button type="button" onClick={onAccion}
          className="mt-1 inline-flex h-9 items-center gap-2 rounded-full bg-acento px-4 text-[13px] font-medium text-sobre-acento transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foco">
          {accion}
        </button>
      )}
    </div>
  )
}
