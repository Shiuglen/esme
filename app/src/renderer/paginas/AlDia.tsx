// «Al día»: lo que pasó en las últimas 24 horas, en frases (paginas/diario.ts). Cada frase lleva a su sitio; si quieres más
// que eso, al pie puedes pedírselo a Esme (eso sí usa la IA).
import { motion } from 'motion/react'
import { X } from 'lucide-react'
import { cn } from '../lib/cn'
import { ROTULO } from '../memoria/pintar'
import { useMuelle } from '../tinta/movimiento'
import type { Entrada } from './diario'

const PUNTO = { atencion: 'bg-atencion', peligro: 'bg-peligro', vida: 'bg-luz' } as const

export function AlDia({ entradas, onIr, onPreguntar, onCerrar }: {
  entradas: Entrada[]; onIr(ir: NonNullable<Entrada['ir']>): void; onPreguntar(): void; onCerrar(): void
}) {
  const muelle = useMuelle({ stiffness: 380, damping: 32 })
  return (
    <motion.section aria-label="Al día" initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.98 }}
      transition={muelle} className="hoja mb-3 grid gap-1 rounded-4 border border-linea p-4 shadow-[var(--sombra-2,0_10px_30px_rgba(0,0,0,.25))]">
      <header className="mb-1 flex items-baseline justify-between gap-3">
        <h2 className="m-0 text-[19px] italic font-medium text-texto" style={{ fontFamily: ROTULO }}>Al día</h2>
        <span className="text-xs text-texto-3">últimas 24 horas</span>
        <button type="button" onClick={onCerrar} aria-label="Cerrar «Al día»" className="ml-auto rounded-2 p-1 text-texto-3 hover:bg-s2 hover:text-texto"><X className="size-4" /></button>
      </header>
      {entradas.length === 0 ? (
        <p className="m-0 py-2 text-[14px] text-texto-2">No te perdiste nada: ni tareas nuevas ni recuerdos en las últimas 24 horas.</p>
      ) : (
        <ol className="m-0 grid max-h-[40vh] list-none gap-0.5 overflow-auto p-0">
          {entradas.map((e, i) => (
            <li key={i}>
              <button type="button" disabled={!e.ir} onClick={() => e.ir && onIr(e.ir)}
                className={cn('grid w-full grid-cols-[10px_minmax(0,1fr)_auto] items-baseline gap-x-2.5 rounded-2 px-2 py-1.5 text-left text-[14px] leading-snug', e.ir && 'hover:bg-s2/70')}>
                <span aria-hidden className={cn('size-1.5 translate-y-[-2px] rounded-full', e.tono ? PUNTO[e.tono] : 'bg-texto-3')} />
                <span className={cn('text-pretty', e.tono === 'peligro' ? 'text-peligro' : e.tono === 'atencion' ? 'text-atencion' : 'text-texto')}>{e.frase}</span>
                <span className="text-xs tabular-nums text-texto-3">{e.cuando}</span>
              </button>
            </li>
          ))}
        </ol>
      )}
      <button type="button" onClick={onPreguntar} className="mt-1 justify-self-start rounded-2 px-2 py-1 text-[13px] text-texto-2 underline decoration-linea-fuerte underline-offset-4 hover:text-texto">
        Pídele a Esme un resumen con tu memoria
      </button>
    </motion.section>
  )
}
