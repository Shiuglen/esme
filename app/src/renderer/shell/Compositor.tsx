// Compositor: donde le hablas a Esme. Enter envía, Mayús+Enter salta de línea; crece con el texto.
import { ArrowUp, Waypoints } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { cn } from '../lib/cn'
import { BordeTrabajo } from '../tinta/PiezasVivas'
import { usePiezas } from '../tinta/movimiento'
import { Vidrio } from './Vidrio'

// Va en vidrio líquido (shell/Vidrio.tsx) y, mientras Esme trabaja, un borde eléctrico lo recorre (React Bits).
export function Compositor({ onEnviar, memoria, onMemoria, contexto, autoFocus, trabajando = false }: {
  onEnviar(texto: string): void; memoria: boolean; onMemoria(v: boolean): void; contexto?: string[]; autoFocus?: boolean; trabajando?: boolean
}) {
  const { piezas } = usePiezas()
  const [texto, setTexto] = useState('')
  const area = useRef<HTMLTextAreaElement>(null)
  useEffect(() => { const a = area.current; if (!a) return; a.style.height = '0px'; a.style.height = `${Math.min(160, a.scrollHeight)}px` }, [texto])
  const enviar = () => { const q = texto.trim(); if (!q) return; onEnviar(q); setTexto('') }
  const caja = (
    <form onSubmit={(e) => { e.preventDefault(); enviar() }}
      className="aurora-foco flex items-end gap-3 rounded-[24px] border border-[color-mix(in_oklab,var(--texto)_12%,transparent)] bg-[color-mix(in_oklab,var(--superficie-1)_45%,transparent)] px-5 py-3.5 shadow-[inset_0_1px_0_rgb(255_255_255/0.08),0_24px_60px_-24px_rgb(0_0_0/0.7)] transition-colors focus-within:border-transparent">
      <div className="grid min-w-0 flex-1 gap-2">
        <textarea ref={area} rows={1} value={texto} autoFocus={autoFocus} onChange={(e) => setTexto(e.target.value)} aria-label="Mensaje para Esme"
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar() } }}
          placeholder="¿Qué hacemos ahora? Pregunta, pide o construye…"
          className="min-h-7 w-full resize-none bg-transparent pt-0.5 text-[16px] leading-7 text-texto outline-none placeholder:text-texto-3" />
        <div className="flex flex-wrap items-center gap-1.5">
          <button type="button" onClick={() => onMemoria(!memoria)} aria-pressed={memoria}
            className={cn('inline-flex h-6.5 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium transition-colors',
              memoria ? 'bg-memoria-velo text-memoria' : 'border border-linea bg-s2 text-texto-3')}>
            <Waypoints className="size-3.5" strokeWidth={1.5} />{memoria ? 'con memoria' : 'sin memoria'}
          </button>
          {contexto?.map((c) => <span key={c} className="inline-flex h-6 items-center rounded-full border border-linea bg-s2 px-2.5 text-xs font-medium text-texto-2">{c}</span>)}
        </div>
      </div>
      <button type="submit" aria-label="Enviar" disabled={!texto.trim()}
        className="grid size-10 shrink-0 place-items-center rounded-full bg-acento text-sobre-acento transition-[transform,opacity] duration-150 active:scale-95 disabled:opacity-40">
        <ArrowUp className="size-4.5" strokeWidth={2} />
      </button>
    </form>
  )
  const vidrio = <Vidrio radio={24}>{caja}</Vidrio>
  return <BordeTrabajo pieza={piezas.trabajo} activo={trabajando} radio={24}>{vidrio}</BordeTrabajo>
}
