// Lo que Esme hace dentro de una respuesta: una línea por paso (buscar, leer, encargar…) y, cuando algo actúa, la tarjeta
// para dar permiso. Nada pasa a escondidas: cada acción se ve y se puede negar.
import { AlertCircle, Check, Hand, Loader2 } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import type { PermisoPedido } from '../lib/bridge'
import { cn } from '../lib/cn'
import { fraseDePaso, type PasoVisto } from './pasos'

export function Pasos({ pasos }: { pasos: PasoVisto[] }) {
  if (!pasos.length) return null
  return (
    <ol aria-label="Lo que hizo Esme" className="m-0 grid list-none gap-1 p-0">
      <AnimatePresence initial={false}>
        {pasos.map((p) => (
          <motion.li key={p.id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} className="flex min-w-0 items-center gap-2 text-[13px] leading-5">
            <span aria-hidden className={cn('grid size-4 shrink-0 place-items-center', p.estado === 'error' ? 'text-peligro' : p.estado === 'hecho' ? 'text-exito' : p.estado === 'pide' ? 'text-atencion' : 'text-acento')}>
              {p.estado === 'hecho' ? <Check className="size-3.5" strokeWidth={2.25} /> : p.estado === 'error' ? <AlertCircle className="size-3.5" strokeWidth={2} />
                : p.estado === 'pide' ? <Hand className="size-3.5" strokeWidth={2} /> : <Loader2 className="size-3.5 animate-spin" strokeWidth={2} />}
            </span>
            <span className={cn('truncate', p.estado === 'haciendo' ? 'text-texto-2' : 'text-texto-3')} title={p.error ?? p.resumen}>
              {fraseDePaso(p)}{p.estado === 'error' && p.error ? ` · ${p.error}` : ''}
            </span>
          </motion.li>
        ))}
      </AnimatePresence>
    </ol>
  )
}

// lo que se va a hacer, en claro: el encargo o la dirección, nunca un JSON crudo si se puede evitar
const detalle = (args: unknown) => {
  const a = (args && typeof args === 'object' ? args : {}) as Record<string, unknown>
  const t = a.encargo ?? a.necesidad ?? a.url ?? a.consulta
  return typeof t === 'string' ? t : Object.keys(a).length ? JSON.stringify(a, null, 1) : ''
}

export function PidePermiso({ pedido, onResponder }: { pedido: PermisoPedido; onResponder(r: 'una' | 'siempre' | 'no'): void }) {
  const d = detalle(pedido.args)
  return (
    <motion.div role="alertdialog" aria-label="Esme pide permiso" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="grid gap-2.5 rounded-3 border border-atencion/40 bg-[color-mix(in_oklab,var(--atencion)_8%,transparent)] p-3.5">
      <p className="m-0 text-[13.5px] font-medium text-texto">{fraseDePaso({ id: pedido.id, nombre: pedido.nombre, estado: 'pide', args: pedido.args })}</p>
      {d && <p className="m-0 max-h-32 overflow-auto whitespace-pre-wrap rounded-2 bg-s1/70 px-2.5 py-2 text-[12.5px] leading-5 text-texto-2">{d}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="button" autoFocus onClick={() => onResponder('una')} className="h-8 rounded-full bg-acento px-3.5 text-[12.5px] font-medium text-sobre-acento">Permitir</button>
        <button type="button" onClick={() => onResponder('siempre')} className="h-8 rounded-full border border-linea px-3.5 text-[12.5px] text-texto-2 hover:text-texto">Permitir siempre</button>
        <button type="button" onClick={() => onResponder('no')} className="h-8 rounded-full px-3.5 text-[12.5px] text-texto-3 hover:text-peligro">No</button>
      </div>
    </motion.div>
  )
}
