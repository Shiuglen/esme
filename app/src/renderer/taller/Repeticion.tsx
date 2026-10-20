// Lo que el creador repite: la tarjeta que lo propone.
//
// Esto NO crea nada por su cuenta. Muestra la tarea que se repite, cuántas veces y el
// encargo de ejemplo, y un botón que deja ese encargo en la caja para lanzarlo como
// cualquier otra receta. Si nadie lo acepta, no pasa nada: la propuesta es sólo una
// pista, y la decisión es del creador.
import { useEffect, useState } from 'react'
import { Repeat } from 'lucide-react'
import { bridge, type Repeticion } from '../lib/bridge'
import { cn } from '../lib/cn'

/** Lo que dice la tarjeta de una tarea repetida, en palabras. */
export function fraseRepeticion(r: Repeticion): string {
  return `Lo has encargado ${r.veces} ${r.veces === 1 ? 'vez' : 'veces'}, del ${r.desde} al ${r.hasta}.`
}

/** ¿Se puede ofrecer el encargo? Sin ejemplo no hay nada que lanzar. */
export function sePuedeUsar(r: Repeticion): boolean {
  return r.ejemplo.trim().length > 0
}

/** Las tareas repetidas que la mente ve ahora mismo. */
export function useRepeticiones(): Repeticion[] {
  const [lista, setLista] = useState<Repeticion[]>([])
  useEffect(() => {
    let vivo = true
    void bridge.mente.repeticiones()
      .then((r) => { if (vivo) setLista(r.repeticiones ?? []) })
      .catch(() => { if (vivo) setLista([]) })
    return () => { vivo = false }
  }, [])
  return lista
}

/** La tarjeta de una tarea repetida: el ejemplo y un botón para usarla. */
export function TarjetaRepeticion({ r, onElegir }: { r: Repeticion; onElegir(texto: string): void }) {
  return (
    <div className="group grid content-start gap-1.5 rounded-3 border border-acento/30 bg-acento-velo/50 p-3.5 text-left">
      <span className="flex items-center gap-2">
        <span className="grid size-7 place-items-center rounded-2 bg-acento-velo text-acento">
          <Repeat className="size-4" strokeWidth={1.75} />
        </span>
        <span className="text-[13.5px] font-medium text-texto">{r.titulo}</span>
      </span>
      <span className="text-[12.5px] leading-snug text-texto-2">{fraseRepeticion(r)}</span>
      <span className="text-[11px] leading-snug text-texto-3">«{r.ejemplo}»</span>
      {sePuedeUsar(r) && (
        <button type="button" onClick={() => onElegir(r.ejemplo)}
          className={cn('mt-1 w-fit rounded-full border border-linea px-2.5 py-1 text-[11.5px] transition-colors',
            'text-texto-2 hover:border-linea-fuerte hover:text-texto')}>
          Usar este encargo
        </button>
      )}
    </div>
  )
}
