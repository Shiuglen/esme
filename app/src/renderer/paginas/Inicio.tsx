// Inicio: lo que Esme sabe y hace ahora mismo, y el compositor para hablarle. Solo datos reales; lo que aún no hay se dice.
import NumberFlow from '@number-flow/react'
import { ArrowRight, Eraser, FilePlus2, SquareTerminal, Waypoints } from 'lucide-react'
import { motion } from 'motion/react'
import { bridge, type AgentView } from '../lib/bridge'
import { Compositor } from '../shell/Compositor'

export type EventoMente = { id: number; ts: number; tipo: 'recall' | 'remember' | 'forget' | 'ingest'; texto: string; detalle?: string }

const saludo = (h = new Date().getHours()) => (h < 6 ? 'Buenas noches' : h < 13 ? 'Buenos días' : h < 20 ? 'Buenas tardes' : 'Buenas noches')
const hace = (ts: number) => {
  const s = Math.round((Date.now() - ts) / 1000), rtf = new Intl.RelativeTimeFormat('es', { numeric: 'auto' })
  return s < 60 ? 'ahora' : s < 3600 ? rtf.format(-Math.round(s / 60), 'minute') : rtf.format(-Math.round(s / 3600), 'hour')
}
const ICONO = { recall: Waypoints, remember: FilePlus2, forget: Eraser, ingest: FilePlus2 }

function Tarjeta({ titulo, accion, children }: { titulo: string; accion?: { texto: string; onClick(): void }; children: React.ReactNode }) {
  return (
    <section className="flex min-w-0 flex-col gap-3 rounded-3 border border-linea bg-s1 p-4">
      <div className="flex items-center justify-between">
        <h2 className="m-0 text-[15px] leading-[22px] font-semibold">{titulo}</h2>
        {accion && <button type="button" onClick={accion.onClick} className="inline-flex h-7 items-center gap-1.5 rounded-2 px-2.5 text-xs font-medium text-texto-2 transition-colors hover:bg-s2 hover:text-texto">{accion.texto}<ArrowRight className="size-3.5" strokeWidth={1.5} /></button>}
      </div>
      {children}
    </section>
  )
}

export function Inicio({ conectado, recuerdos, eventos, agentes, ahorrados, preguntas, memoria, onMemoria, onPreguntar, onIr }: {
  conectado: boolean; recuerdos: number | null; eventos: EventoMente[]; agentes: AgentView[]; ahorrados: number; preguntas: number
  memoria: boolean; onMemoria(v: boolean): void; onPreguntar(q: string): void; onIr(id: 'taller' | 'memoria' | 'conversacion'): void
}) {
  const linea = !conectado ? 'No encuentro tu cerebro. Arráncalo y vuelvo a conectar sola.'
    : recuerdos ? `Tu memoria tiene ${recuerdos.toLocaleString('es-ES')} recuerdos. ¿Qué hacemos hoy?` : 'Tu memoria está vacía. Empieza absorbiendo tus notas desde Memoria.'
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto grid max-w-[1080px] gap-7 px-10 pt-12 pb-10">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }} className="grid gap-2">
          <h1 className="m-0 font-display text-[40px] leading-[1.08] font-semibold tracking-[-0.035em] text-balance">{saludo()}.</h1>
          <p className="m-0 text-[15px] text-texto-2">{linea}</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.06, ease: [0.16, 1, 0.3, 1] }}>
          <Compositor onEnviar={onPreguntar} memoria={memoria} onMemoria={onMemoria} contexto={conectado ? [] : ['el cerebro está apagado']} autoFocus />
        </motion.div>
        <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,0.9fr)] gap-4 max-[980px]:grid-cols-1">
          <Tarjeta titulo="Lo último en tu mente" accion={{ texto: 'Ver memoria', onClick: () => onIr('memoria') }}>
            {eventos.length === 0 ? (
              <p className="m-0 text-texto-3">Aún no ha pasado nada en esta sesión. Pregúntale algo a Esme y aquí verás qué recuerdos usó.</p>
            ) : (
              <ul className="m-0 grid list-none gap-1 p-0">
                {eventos.slice(0, 6).map((ev) => { const I = ICONO[ev.tipo]; return (
                  <li key={ev.id} className="flex min-w-0 items-center gap-2.5 rounded-2 px-1.5 py-1.5">
                    <I className={ev.tipo === 'recall' ? 'size-4 shrink-0 text-memoria' : 'size-4 shrink-0 text-texto-3'} strokeWidth={1.5} />
                    <span className="min-w-0 truncate">{ev.texto}{ev.detalle && <span className="text-texto-3"> · {ev.detalle}</span>}</span>
                    <span className="ml-auto shrink-0 text-xs text-texto-3">{hace(ev.ts)}</span>
                  </li>) })}
              </ul>
            )}
          </Tarjeta>
          <Tarjeta titulo="Tus agentes" accion={{ texto: 'Abrir Taller', onClick: () => onIr('taller') }}>
            {agentes.length === 0 ? <p className="m-0 text-texto-3">{bridge.mode() === 'web' ? 'En el navegador no puedo ver tus agentes. Ábrelos desde la app de escritorio.' : 'No encontré agentes instalados. Instálalos desde la Tienda.'}</p> : (
              <ul className="m-0 grid list-none gap-1.5 p-0">
                {agentes.map((a) => (
                  <li key={a.id} className="flex items-center gap-2.5">
                    <SquareTerminal className="size-4 shrink-0 text-texto-3" strokeWidth={1.5} />
                    <span className="truncate">{a.label}</span>
                    <span className={a.installed ? 'ml-auto inline-flex h-6 items-center rounded-full bg-acento-velo px-2.5 text-xs font-medium text-acento' : 'ml-auto inline-flex h-6 items-center rounded-full border border-linea px-2.5 text-xs font-medium text-texto-3'}>
                      {a.installed ? 'listo' : 'sin instalar'}</span>
                  </li>))}
              </ul>
            )}
          </Tarjeta>
          <Tarjeta titulo="Esta sesión">
            <div className="grid gap-1">
              <span className="text-xs text-texto-3">Tokens ahorrados con la memoria</span>
              <NumberFlow value={ahorrados} locales="es-ES" className="font-sans text-[32px] leading-9 font-semibold tracking-[-0.02em] tabular-nums" />
            </div>
            <div className="grid gap-1">
              <span className="text-xs text-texto-3">Preguntas</span>
              <NumberFlow value={preguntas} locales="es-ES" className="font-sans text-[22px] leading-7 font-semibold tabular-nums" />
            </div>
          </Tarjeta>
        </div>
      </div>
    </div>
  )
}
