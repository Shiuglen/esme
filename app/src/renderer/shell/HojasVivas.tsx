// Las hojas vivas de la casa: cuando una tarea llega a su fin, la hoja nace donde estés — no solo en el Taller.
// La interfaz generativa de la era agentiva, hecha tinta: nace al terminar, se adapta con su frase y muere al cerrar.
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ChevronsRight, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { TareaTaller } from '../lib/bridge'
import { Bicho } from '../marca/SerVista'
import { encargoDe, fraseServicio, nacidos, type Hoja } from '../taller/hoja'
import { explicarError } from '../taller/vista'
import { useMuelle } from '../tinta/movimiento'

type Vivo = Hoja & { tarea: TareaTaller }

export function HojasVivas({ tareas, onVer }: { tareas: TareaTaller[]; onVer: (id: string) => void }) {
  const muelle = useMuelle({ stiffness: 380, damping: 24 })
  const [vivas, setVivas] = useState<Vivo[]>([])
  const prev = useRef<Record<string, string> | null>(null)
  const quieto = useReducedMotion()
  useEffect(() => {
    if (prev.current === null) {
      prev.current = Object.fromEntries(tareas.map((t) => [t.id, t.estado]))   // censo inicial: no celebrar lo viejo
      return
    }
    const { ids, mapa } = nacidos(prev.current, tareas)
    prev.current = mapa
    const nacieron = ids.map((id) => ({ id, tarea: tareas.find((t) => t.id === id) }))
    if (nacieron.length) setVivas((v) => [...nacieron.flatMap((n) => n.tarea ? [{ id: n.id, ts: Date.now(), motivo: n.tarea?.estado === 'error' ? 'error' : 'lista' as Hoja['motivo'], tarea: n.tarea! }] : []), ...v].slice(0, 3))
  }, [tareas])
  const quita = (id: string) => setVivas((v) => v.filter((h) => h.id !== id))
  return (
    <div className="pointer-events-none fixed right-5 bottom-5 z-40 flex w-[340px] flex-col gap-2" aria-live="polite">
      <AnimatePresence initial={false}>
        {vivas.map((h) => {
          const err = h.motivo === 'error' ? explicarError(h.tarea.error ?? '', h.tarea.motorNombre, h.tarea.motor) : null
          return (
            <motion.div key={h.id} initial={quieto ? { opacity: 0 } : { opacity: 0, y: 26, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={quieto ? { duration: 0.15 } : muelle}
              className="pointer-events-auto rounded-3 border border-linea bg-hoja/90 p-3 vidrio-fino shadow-flotante">
              <div className="flex items-start gap-2.5">
                <span className={h.motivo === 'error' ? 'text-peligro' : 'text-esmeralda'}>
                  <Bicho de={h.tarea.motor} tamaño={22} vivo={h.motivo === 'lista'} className="shrink-0" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="m-0 text-[13px] leading-[17px] font-medium text-texto">
                    {h.motivo === 'error' ? 'Se cayó el motor' : 'La tarea está lista'}
                  </p>
                  <p className="m-0 truncate text-[12px] text-texto-3">{encargoDe(h.tarea)}</p>
                </div>
                <button type="button" aria-label="Cerrar la hoja" onClick={() => quita(h.id)}
                  className="rounded-full p-1 text-texto-3 transition-colors hover:text-texto"><X className="size-3.5" /></button>
              </div>
              <p className="m-0 mt-2 text-[12px] leading-[18px] text-texto-2">{err ? `${err.titulo}. ${err.consejo}` : fraseServicio(h.tarea, h.ts)}</p>
              {h.tarea.cambios && h.tarea.cambios.ficheros > 0 && (
                <button type="button" onClick={() => { onVer(h.id); quita(h.id) }}
                  className="mt-2.5 inline-flex items-center gap-1 text-[12px] font-medium text-esmeralda transition-opacity hover:opacity-80">
                  Ver los cambios <ChevronsRight className="size-3.5" />
                </button>
              )}
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
