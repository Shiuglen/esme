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
  const historia = useMemo(() => {
    if (!conectado) return 'No encuentro tu cerebro. Arráncalo y vuelvo a conectar sola.'
    const pts = atlas?.points ?? []
    const ultimo = pts.reduce((m, p) => Math.max(m, p.ts ? Date.parse(p.ts) || 0 : 0), 0) || undefined
    return historiaMente({ recuerdos: recuerdos ?? pts.length, temas: atlas?.clusters.length ?? 0, ultimo, grafito: pts.filter((p) => esGrafito(p.trust)).length }, Date.now())
  }, [conectado, atlas, recuerdos])

  return (
    <div aria-hidden={!visible} inert={!visible}
      className={cn('pointer-events-none absolute inset-0 z-10 transition-opacity duration-500', visible ? 'opacity-100' : 'opacity-0')}>
      <header className={cn('pointer-events-auto absolute top-6 left-7 grid max-w-[540px] gap-3', HALO)}>
        <motion.p {...entrada(0)} className="m-0 text-[13px] text-texto-2">{fechaLarga(new Date())}</motion.p>
        <motion.h1 {...entrada(1)} className="m-0 text-[clamp(46px,5.6vw,76px)] leading-[0.95] font-medium italic tracking-[-0.01em] text-texto" style={{ fontFamily: ROTULO }}>
          {saludo()}.
        </motion.h1>
        <motion.p {...entrada(2)} className="m-0 max-w-[46ch] text-[16px] leading-[1.6] text-texto-2 text-pretty">{historia}</motion.p>
        {eventos.length > 0 && (
          <motion.ol {...entrada(3)} className="m-0 grid list-none gap-1 p-0 text-[13px]">
            {eventos.slice(0, 3).map((ev) => (
              <li key={ev.id} className="flex min-w-0 gap-2">
                <span className="shrink-0 text-texto-3">{hace(Date.now() - ev.ts)}</span>
                <span className={cn('truncate', ev.tipo === 'taller-error' ? 'text-peligro' : ev.tipo === 'taller-permiso' ? 'text-atencion' : 'text-texto-2')}>{ev.texto}</span>
                {ev.onVer && <button type="button" onClick={ev.onVer} className="shrink-0 text-texto underline decoration-linea-fuerte underline-offset-2">Ver</button>}
              </li>))}
          </motion.ol>
        )}
      </header>
      <motion.div {...entrada(3)} className="pointer-events-auto absolute right-6 bottom-5 left-[268px] mx-auto max-w-[720px]">
        <Compositor onEnviar={onPreguntar} memoria={memoria} onMemoria={onMemoria} contexto={conectado ? [] : ['el cerebro está apagado']} autoFocus />
      </motion.div>
    </div>
  )
}
