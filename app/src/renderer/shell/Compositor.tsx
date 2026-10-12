// Compositor: donde le hablas a Esme. Enter envía, Mayús+Enter salta de línea; crece con el texto.
import { ArrowUp, Waypoints } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { cn } from '../lib/cn'

export function Compositor({ onEnviar, memoria, onMemoria, contexto, autoFocus }: {
  onEnviar(texto: string): void; memoria: boolean; onMemoria(v: boolean): void; contexto?: string[]; autoFocus?: boolean
}) {
  const [texto, setTexto] = useState('')
  const area = useRef<HTMLTextAreaElement>(null)
  useEffect(() => { const a = area.current; if (!a) return; a.style.height = '0px'; a.style.height = `${Math.min(160, a.scrollHeight)}px` }, [texto])
  const enviar = () => { const q = texto.trim(); if (!q) return; onEnviar(q); setTexto('') }
  return (
    <form onSubmit={(e) => { e.preventDefault(); enviar() }}
      className="aurora-foco flex items-end gap-2.5 rounded-4 border border-linea bg-s1 py-2.5 pr-2.5 pl-4 transition-colors focus-within:border-transparent">
      <div className="grid min-w-0 flex-1 gap-2">
        <textarea ref={area} rows={1} value={texto} autoFocus={autoFocus} onChange={(e) => setTexto(e.target.value)} aria-label="Mensaje para Esme"
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar() } }}
          placeholder="Pregúntale a Esme o pídele que construya algo…"
          className="min-h-6 w-full resize-none bg-transparent pt-1 text-[15px] leading-6 text-texto outline-none placeholder:text-texto-3" />
        <div className="flex flex-wrap items-center gap-1.5">
          <button type="button" onClick={() => onMemoria(!memoria)} aria-pressed={memoria}
            className={cn('inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium transition-colors',
              memoria ? 'bg-memoria-velo text-memoria' : 'border border-linea bg-s2 text-texto-3')}>
            <Waypoints className="size-3.5" strokeWidth={1.5} />{memoria ? 'con memoria' : 'sin memoria'}
          </button>
          {contexto?.map((c) => <span key={c} className="inline-flex h-6 items-center rounded-full border border-linea bg-s2 px-2.5 text-xs font-medium text-texto-2">{c}</span>)}
        </div>
      </div>
      <button type="submit" aria-label="Enviar" disabled={!texto.trim()}
        className="grid size-[34px] shrink-0 place-items-center rounded-full bg-acento text-sobre-acento transition-[transform,opacity] duration-150 active:scale-95 disabled:opacity-40">
        <ArrowUp className="size-4" strokeWidth={2} />
      </button>
    </form>
  )
}
