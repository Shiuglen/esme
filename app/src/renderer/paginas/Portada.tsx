// La portada (La Ventana): no es una página, es lo que se lee sobre tu mente cuando no hay ninguna hoja abierta.
// Arriba a la izquierda, el cartucho del mapa: la fecha, el saludo en la cursiva de los rótulos, tu mente contada en
// frases y lo último que pasó. Abajo, en el centro, la pregunta. El resto de la pantalla es tu mente.
import { motion } from 'motion/react'
import { useMemo } from 'react'
import type { Atlas } from '../lib/brain'
import { cn } from '../lib/cn'
import { ROTULO } from '../memoria/pintar'
import { Compositor } from '../shell/Compositor'
import { esGrafito } from '../tinta/trazo'
import { fechaLarga, hace, historiaMente } from './portada'

export type EventoMente = { id: number; ts: number; tipo: 'recall' | 'remember' | 'forget' | 'ingest' | 'taller-lista' | 'taller-permiso' | 'taller-error'; texto: string; detalle?: string; onVer?: () => void }

const saludo = (h = new Date().getHours()) => (h < 6 ? 'Buenas noches' : h < 13 ? 'Buenos días' : h < 20 ? 'Buenas tardes' : 'Buenas noches')
const entrada = (i: number) => ({ initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.7, delay: 0.1 * i, ease: [0.16, 1, 0.3, 1] as const } })
// el texto se lee sobre la tinta del mapa gracias a un halo del color del papel, como los rótulos de un atlas
const HALO = '[text-shadow:0_0_2px_var(--papel),0_0_10px_var(--papel),0_0_22px_var(--papel)]'

export function Portada({ visible, conectado, recuerdos, atlas, eventos, memoria, onMemoria, onPreguntar }: {
  visible: boolean; conectado: boolean; recuerdos: number | null; atlas: Atlas | null; eventos: EventoMente[]
  memoria: boolean; onMemoria(v: boolean): void; onPreguntar(q: string): void
}) {
  const contados = useMemo(() => {
    const pts = atlas?.points ?? []
    return { temas: atlas?.clusters.length ?? 0, grafito: pts.filter((p) => esGrafito(p.trust)).length, pts: pts.length }
  }, [atlas])
  const historia = useMemo(() => {
    if (!conectado) return 'No encuentro tu cerebro. Arráncalo y vuelvo a conectar sola.'
    const pts = atlas?.points ?? []
    const ultimo = pts.reduce((m, p) => Math.max(m, p.ts ? Date.parse(p.ts) || 0 : 0), 0) || undefined
    return historiaMente({ recuerdos: recuerdos ?? pts.length, temas: atlas?.clusters.length ?? 0, ultimo, grafito: pts.filter((p) => esGrafito(p.trust)).length }, Date.now())
  }, [conectado, atlas, recuerdos])
  // cuentavitas: cada vitral es una puerta que le pregunta directamente a tu mente
  const vitrales: Array<{ texto: string; pregunta: string | null }> = conectado ? [
    { texto: `${contados.temas} temas vivos`, pregunta: 'Muéstrame los temas de mi mente con sus recuerdos principales' },
    { texto: `${contados.grafito} en grafito`, pregunta: contados.grafito > 0 ? 'Muéstrame los recuerdos en grafito que aún no confirmo, de los más recientes primero' : null },
    { texto: `${(recuerdos ?? contados.pts).toLocaleString('es')} recuerdos`, pregunta: '¿Qué sabe mi mente de lo más reciente?' },
  ] : []
  const rituales = ['¿Qué me perdí hoy?', '¿Qué es lo más importante en mi mente ahora?', 'Continúa la última tarea del taller']

  return (
    <div aria-hidden={!visible} inert={!visible}
      className={cn('pointer-events-none absolute inset-0 z-10 transition-opacity duration-500', visible ? 'opacity-100' : 'opacity-0')}>
      <header className={cn('pointer-events-auto absolute top-6 left-7 grid max-w-[540px] gap-3', HALO)}>
        <motion.p {...entrada(0)} className="m-0 text-[13px] text-texto-2">{fechaLarga(new Date())}</motion.p>
        <motion.h1 {...entrada(1)} className="m-0 text-[clamp(46px,5.6vw,76px)] leading-[0.95] font-medium italic tracking-[-0.01em] text-texto" style={{ fontFamily: ROTULO }}>
          {saludo()}.
        </motion.h1>
        <motion.p {...entrada(2)} className="m-0 max-w-[46ch] text-[16px] leading-[1.6] text-texto-2 text-pretty">{historia}</motion.p>
        {vitrales.length > 0 && (
          <motion.div {...entrada(3)} className="flex flex-wrap gap-2">
            {vitrales.map((v) => (
              <button key={v.texto} type="button" disabled={!v.pregunta} onClick={() => v.pregunta && onPreguntar(v.pregunta)}
                className={cn('rounded-full border px-3 py-1 text-[12.5px] tabular-nums transition-colors',
                  v.pregunta ? 'border-linea-fuerte/70 bg-papel/70 text-texto-2 hover:border-texto-3 hover:bg-papel hover:text-texto' : 'cursor-default border-linea bg-papel/50 text-texto-3')}>
                {v.texto}
              </button>
            ))}
          </motion.div>
        )}
        <motion.ol {...entrada(5)} className="m-0 mt-1 grid list-none gap-1.5 p-0 text-[13.5px]">
          {eventos.slice(0, 4).map((ev) => (
            <li key={ev.id} className="flex min-w-0 items-center gap-2.5">
              <span className={cn('size-1.5 shrink-0 rounded-full', ev.tipo === 'taller-error' ? 'bg-peligro' : ev.tipo === 'taller-permiso' ? 'bg-atencion' : ev.tipo === 'remember' ? 'bg-memoria' : 'bg-texto-3')} />
              <span className="shrink-0 tabular-nums text-texto-3">{hace(Date.now() - ev.ts)}</span>
              <span className={cn('min-w-0 truncate', ev.tipo === 'taller-error' ? 'text-peligro' : ev.tipo === 'taller-permiso' ? 'text-atencion' : 'text-texto-2')}>{ev.texto}</span>
              {ev.onVer && <button type="button" onClick={ev.onVer} className="shrink-0 text-texto underline decoration-linea-fuerte underline-offset-2 hover:decoration-2">ver</button>}
            </li>))}
        </motion.ol>
      </header>
      <motion.div {...entrada(4)} className="pointer-events-auto absolute right-8 bottom-6 left-[240px] mx-auto max-w-[880px]">
        <Compositor onEnviar={onPreguntar} memoria={memoria} onMemoria={onMemoria} contexto={conectado ? [] : ['el cerebro está apagado']} autoFocus />
        <motion.div {...entrada(5)} className="mt-2.5 flex flex-wrap justify-center gap-x-5 gap-y-1">
          {rituales.map((r) => (
            <button key={r} type="button" onClick={() => onPreguntar(r)} style={{ fontFamily: ROTULO }}
              className="rounded-3 px-2 py-0.5 text-[14px] italic text-texto-2 underline decoration-transparent decoration-1 underline-offset-4 transition-colors hover:text-texto hover:decoration-linea-fuerte">
              {r}
            </button>
          ))}
        </motion.div>
      </motion.div>
    </div>
  )
}
