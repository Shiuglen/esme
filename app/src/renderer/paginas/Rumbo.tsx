// Tu rumbo: para qué trabaja Esme. Vive en la mente (no en la app), así que viaja con ella y la app no puede
// perderlo. El Mando lo enseña —porque una mente sin rumbo es ruido— y aquí se cambia.
//
// Un rumbo son dos cosas: los pilares (las estrellas fijas, hasta siete) y los objetivos (lo que va cambiando, cada uno
// con su estado). Nada de esto es texto libre: tiene forma, se valida y vive en el sitio que le toca.
import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Check, Pause, Pencil, Plus, Target, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { bridge, type Objetivo, type Pilar, type Rumbo } from '../lib/bridge'
import { cn } from '../lib/cn'

const VACIO: Rumbo = { version: 1, pilares: [], objetivos: [] }

/** El rumbo de la mente, con su forma de moverse. */
export function useRumbo() {
  const [rumbo, setRumbo] = useState<Rumbo>(VACIO)
  const [listo, setListo] = useState(false)
  useEffect(() => {
    void bridge.mente.rumbo().then((r) => { setRumbo(r); setListo(true) }).catch(() => setListo(true))
  }, [])
  const mover = useCallback(async (accion: string, datos: Record<string, unknown> = {}) => {
    try {
      setRumbo(await bridge.mente.rumboMover(accion, datos))
      return true
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'no pude mover el rumbo')
      return false
    }
  }, [])
  return { rumbo, listo, mover }
}

const activos = (o: Objetivo[]) => o.filter((x) => x.estado === 'activo')
const textoDePilar = (o: Objetivo, pilares: Pilar[]) => {
  if (!o.pilar) return ''
  return pilares.find((p) => p.id === o.pilar)?.texto ?? ''
}

/** Lo que ves en el Mando: hacia dónde vas, y lo que está en marcha. */
export function RumboResumen({ onEditar }: { onEditar?(): void }) {
  const { rumbo, listo } = useRumbo()
  if (!listo) return null
  const enMarcha = activos(rumbo.objetivos)
  if (!rumbo.pilares.length && !enMarcha.length) {
    return (
      <div className="grid gap-1.5">
        <p className="m-0 text-[13px] text-texto-3">Esme no sabe todavía para qué trabaja.</p>
        {onEditar && (
          <button type="button" onClick={onEditar}
            className="w-fit text-[13px] text-texto-2 underline decoration-linea-fuerte underline-offset-4 transition-colors hover:text-texto">
            Dile su rumbo
          </button>
        )}
      </div>
    )
  }
  return (
    <div className="grid gap-2">
      {rumbo.pilares.length > 0 && (
        <p className="m-0 text-[13px] text-texto-3">
          Hacia <span className="text-texto-2">{rumbo.pilares.map((p) => p.texto).join(' · ')}</span>
        </p>
      )}
      {enMarcha.length > 0 && (
        <ul className="m-0 grid list-none gap-1 p-0">
          {enMarcha.slice(0, 3).map((o) => (
            <li key={o.id} className="flex items-baseline gap-2 text-[14px] text-texto-2">
              <Target className="size-3.5 shrink-0 translate-y-0.5 text-acento" strokeWidth={1.75} />
              <span className="truncate">{o.texto}</span>
              {textoDePilar(o, rumbo.pilares) && <span className="shrink-0 text-[12px] text-texto-3">· {textoDePilar(o, rumbo.pilares)}</span>}
            </li>
          ))}
        </ul>
      )}
      {onEditar && (
        <button type="button" onClick={onEditar}
          className="w-fit text-[12.5px] text-texto-3 underline decoration-linea underline-offset-4 transition-colors hover:text-texto">
          Cambiar el rumbo
        </button>
      )}
    </div>
  )
}

/** El editor: los pilares y los objetivos, y lo que hacen con ellos. */
export function RumboEditor({ onCerrar }: { onCerrar(): void }) {
  const { rumbo, mover } = useRumbo()
  const [pilar, setPilar] = useState('')
  const [objetivo, setObjetivo] = useState('')
  const [bajo, setBajo] = useState<string>('')

  const anadirPilar = async () => {
    const t = pilar.trim()
    if (!t) return
    setPilar('')
    await mover('anadir_pilar', { texto: t })
  }
  const anadirObjetivo = async () => {
    const t = objetivo.trim()
    if (!t) return
    setObjetivo('')
    await mover('anadir_objetivo', { texto: t, pilar: bajo || null })
  }

  return (
    <motion.div className="fixed inset-0 z-50 grid place-items-center bg-velo p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.section role="dialog" aria-label="Tu rumbo" initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8 }}
        className="vidrio grid max-h-[85vh] w-full max-w-[620px] gap-5 overflow-y-auto rounded-4 border p-6">
        <header className="flex items-start gap-3">
          <div className="grid gap-1">
            <h2 className="m-0 font-display text-[24px] leading-none text-texto">Tu rumbo</h2>
            <p className="m-0 max-w-[52ch] text-[13px] leading-5 text-texto-2">
              Para qué trabaja Esme. Los pilares son las estrellas fijas; los objetivos, lo que va cambiando. Esto vive en
              tu mente: si la llevas a otro equipo, viaja con ella.
            </p>
          </div>
          <button type="button" onClick={onCerrar} aria-label="Cerrar" className="ml-auto grid size-8 place-items-center rounded-full text-texto-3 transition-colors hover:bg-s2 hover:text-texto">
            <X className="size-4" strokeWidth={1.75} />
          </button>
        </header>

        <section className="grid gap-2.5">
          <h3 className="m-0 text-[13px] font-medium text-texto-2">Pilares</h3>
          {rumbo.pilares.length === 0 && <p className="m-0 text-[13px] text-texto-3">Todavía no tienes ninguno. ¿Hacia qué quieres que vaya?</p>}
          <ul className="m-0 grid list-none gap-1.5 p-0">
            {rumbo.pilares.map((p) => (
              <li key={p.id} className="flex items-center gap-2">
                <span className="size-2 shrink-0 rounded-full bg-acento" aria-hidden />
                <span className="min-w-0 flex-1 truncate text-[14px] text-texto">{p.texto}</span>
                <button type="button" onClick={() => void mover('quitar_pilar', { id: p.id })} aria-label={`Quitar ${p.texto}`}
                  className="grid size-7 place-items-center rounded-full text-texto-3 transition-colors hover:bg-s2 hover:text-peligro">
                  <Trash2 className="size-3.5" strokeWidth={1.75} />
                </button>
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <input value={pilar} onChange={(e) => setPilar(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void anadirPilar() }}
              placeholder="Un pilar: «hacer Esme de otro mundo»" aria-label="Nuevo pilar"
              className="h-9 min-w-0 flex-1 rounded-full border border-linea bg-s1/50 px-3.5 text-[13px] text-texto outline-none placeholder:text-texto-3 focus:border-foco" />
            <button type="button" onClick={() => void anadirPilar()} disabled={!pilar.trim()}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-linea px-3.5 text-[13px] text-texto-2 transition-colors hover:border-linea-fuerte hover:text-texto disabled:opacity-40">
              <Plus className="size-3.5" strokeWidth={1.75} />Añadir
            </button>
          </div>
        </section>

        <section className="grid gap-2.5">
          <h3 className="m-0 text-[13px] font-medium text-texto-2">Objetivos</h3>
          {rumbo.objetivos.length === 0 && <p className="m-0 text-[13px] text-texto-3">Sin objetivos. Uno pequeño y que se pueda cumplir es mejor que diez grandes.</p>}
          <ul className="m-0 grid list-none gap-1.5 p-0">
            {rumbo.objetivos.map((o) => (
              <li key={o.id} className="flex items-center gap-2">
                <button type="button" onClick={() => void mover('cambiar_objetivo', { id: o.id, estado: o.estado === 'hecho' ? 'activo' : 'hecho' })}
                  aria-label={o.estado === 'hecho' ? 'Reabrir' : 'Cumplido'} title={o.estado === 'hecho' ? 'Reabrir' : 'Cumplido'}
                  className={cn('grid size-6 shrink-0 place-items-center rounded-full border transition-colors', o.estado === 'hecho' ? 'border-acento bg-acento text-sobre-acento' : 'border-linea text-transparent hover:border-linea-fuerte')}>
                  <Check className="size-3.5" strokeWidth={2.5} />
                </button>
                <span className={cn('min-w-0 flex-1 truncate text-[14px]', o.estado === 'hecho' ? 'text-texto-3 line-through' : 'text-texto')}>{o.texto}</span>
                {textoDePilar(o, rumbo.pilares) && <span className="shrink-0 text-[12px] text-texto-3">· {textoDePilar(o, rumbo.pilares)}</span>}
                <button type="button" onClick={() => void mover('cambiar_objetivo', { id: o.id, estado: o.estado === 'pausado' ? 'activo' : 'pausado' })}
                  aria-label={o.estado === 'pausado' ? 'Reanudar' : 'Pausar'} title={o.estado === 'pausado' ? 'Reanudar' : 'Pausar'}
                  className={cn('grid size-7 place-items-center rounded-full transition-colors hover:bg-s2', o.estado === 'pausado' ? 'text-atencion' : 'text-texto-3')}>
                  <Pause className="size-3.5" strokeWidth={1.75} />
                </button>
                <button type="button" onClick={() => void mover('quitar_objetivo', { id: o.id })} aria-label={`Quitar ${o.texto}`}
                  className="grid size-7 place-items-center rounded-full text-texto-3 transition-colors hover:bg-s2 hover:text-peligro">
                  <Trash2 className="size-3.5" strokeWidth={1.75} />
                </button>
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <input value={objetivo} onChange={(e) => setObjetivo(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void anadirObjetivo() }}
              placeholder="Un objetivo: «publicar la tienda firmada»" aria-label="Nuevo objetivo"
              className="h-9 min-w-0 flex-1 rounded-full border border-linea bg-s1/50 px-3.5 text-[13px] text-texto outline-none placeholder:text-texto-3 focus:border-foco" />
            {rumbo.pilares.length > 0 && (
              <select value={bajo} onChange={(e) => setBajo(e.target.value)} aria-label="Bajo qué pilar"
                className="h-9 rounded-full border border-linea bg-s1/50 px-3 text-[13px] text-texto-2 outline-none focus:border-foco">
                <option value="">Sin pilar</option>
                {rumbo.pilares.map((p) => <option key={p.id} value={p.id}>{p.texto}</option>)}
              </select>
            )}
            <button type="button" onClick={() => void anadirObjetivo()} disabled={!objetivo.trim()}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-linea px-3.5 text-[13px] text-texto-2 transition-colors hover:border-linea-fuerte hover:text-texto disabled:opacity-40">
              <Plus className="size-3.5" strokeWidth={1.75} />Añadir
            </button>
          </div>
        </section>

        <footer className="flex items-center gap-2">
          <button type="button" onClick={onCerrar}
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-acento px-4 text-[13px] font-medium text-sobre-acento">
            <Pencil className="size-3.5" strokeWidth={1.75} />Listo
          </button>
          <p className="m-0 text-[12px] text-texto-3">Esme lo recordará: está en tu mente.</p>
        </footer>
      </motion.section>
    </motion.div>
  )
}

/** El editor y su resumen, con el overlay que se abre y se cierra. */
export function Rumbo({ className }: { className?: string }) {
  const [editando, setEditando] = useState(false)
  return (
    <>
      <RumboResumen onEditar={() => setEditando(true)} />
      <AnimatePresence>
        {editando && <RumboEditor onCerrar={() => setEditando(false)} />}
      </AnimatePresence>
    </>
  )
}
