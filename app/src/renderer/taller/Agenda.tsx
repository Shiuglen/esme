// La agenda en la fila de producción: lo que tu equipo hará solo y cuándo. Cada encargo se pausa, se reanuda o se quita.
import { CalendarClock, Pause, Play, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { bridge, type ProgramadoVisto } from '../lib/bridge'
import { cn } from '../lib/cn'
import { recorta } from '../paginas/diario'
import { Bicho } from '../marca/Ser'
import { fraseCuando } from './cuando'

export function useAgenda() {
  const [lista, setLista] = useState<ProgramadoVisto[]>([])
  useEffect(() => { void bridge.taller.agenda().then(setLista); return bridge.taller.onAgenda(setLista) }, [])
  return lista
}

export function Agenda({ lista, nombreDe }: { lista: ProgramadoVisto[]; nombreDe(motor: string): string }) {
  const visibles = lista.filter((p) => p.activo || p.cuando.tipo === 'diaria')
  if (!visibles.length) return null
  const fallo = (r: { ok: boolean; error?: string }) => { if (!r.ok) toast.error(r.error ?? 'No se pudo.') }
  return (
    <section aria-label="Programado" className="mb-4">
      <div className="sticky top-0 z-10 flex h-9 items-center gap-2.5 bg-[color-mix(in_oklab,var(--hoja)_85%,transparent)] pl-1 pr-1 backdrop-blur-md">
        <CalendarClock className="size-3 shrink-0 text-acento" strokeWidth={2} aria-hidden />
        <h3 className="text-[10.5px] font-medium uppercase tracking-[0.1em] text-texto-3">Programado</h3>
        <span aria-hidden className="min-w-0 flex-1 self-center border-t border-dashed border-linea/70" />
        <span className="inline-flex h-[19px] min-w-[19px] shrink-0 items-center justify-center rounded-full bg-s2 px-1.5 text-[11px] font-medium tabular-nums text-texto-2">{visibles.length}</span>
      </div>
      <ul className="space-y-1.5 pt-1">
        <AnimatePresence initial={false}>
          {visibles.map((p) => (
            <motion.li key={p.id} layout initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }}
              className={cn('group flex items-center gap-3 rounded-3 border border-linea bg-s1/60 px-3 py-2', !p.activo && 'opacity-55')}>
              <Bicho de={p.motor} tamaño={18} vivo={p.activo} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] text-texto" title={p.texto}>{recorta(p.texto, 70)}</p>
                <p className="text-[11.5px] text-texto-3">{nombreDe(p.motor)} · {p.activo ? fraseCuando(p.cuando) : 'En pausa'}
                  {p.activo && p.proxima && p.cuando.tipo === 'diaria' && <> · próxima: {fraseCuando({ tipo: 'una', ms: p.proxima }).toLowerCase()}</>}</p>
              </div>
              <button type="button" onClick={() => void bridge.taller.pausarProgramado(p.id, !p.activo).then(fallo)} aria-label={p.activo ? 'Pausar' : 'Reanudar'}
                className="grid size-7 place-items-center rounded-full text-texto-3 hover:bg-s2 hover:text-texto">
                {p.activo ? <Pause className="size-3.5" strokeWidth={1.75} /> : <Play className="size-3.5" strokeWidth={1.75} />}
              </button>
              <button type="button" onClick={() => void bridge.taller.quitarProgramado(p.id).then(fallo)} aria-label="Quitar de la agenda"
                className="grid size-7 place-items-center rounded-full text-texto-3 hover:bg-s2 hover:text-peligro"><X className="size-3.5" /></button>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </section>
  )
}
