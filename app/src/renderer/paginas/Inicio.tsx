// Inicio, el centro de mando: Esme viva, lo que sabe y lo que ha hecho, cuánto llevas gastado y qué motores tienes listos.
// Solo datos reales; lo que aún no hay se dice tal cual.
import NumberFlow from '@number-flow/react'
import { ArrowRight, BrainCircuit, Eraser, FilePlus2, KeyRound, Plug, Waypoints } from 'lucide-react'
import { motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { fmtTokens, fmtUSD } from '../chat/formatos'
import { bridge, type EstadoUso, type MotorDetectado, type ProviderView } from '../lib/bridge'
import { cn } from '../lib/cn'
import { Senal, type EstadoSenal } from '../marca/Senal'
import { Compositor } from '../shell/Compositor'

export type EventoMente = { id: number; ts: number; tipo: 'recall' | 'remember' | 'forget' | 'ingest'; texto: string; detalle?: string }

const saludo = (h = new Date().getHours()) => (h < 6 ? 'Buenas noches' : h < 13 ? 'Buenos días' : h < 20 ? 'Buenas tardes' : 'Buenas noches')
const hace = (ts: number) => {
  const s = Math.round((Date.now() - ts) / 1000), rtf = new Intl.RelativeTimeFormat('es', { numeric: 'auto' })
  return s < 60 ? 'ahora' : s < 3600 ? rtf.format(-Math.round(s / 60), 'minute') : rtf.format(-Math.round(s / 3600), 'hour')
}
const ICONO = { recall: Waypoints, remember: FilePlus2, forget: Eraser, ingest: FilePlus2 }
const FRASE: Record<EstadoSenal, string> = { reposo: 'En calma, atenta a lo que necesites.', pensando: 'Pensando contigo…', recordando: 'Recordando: tu memoria se está encendiendo.' }
const entrada = (i: number) => ({ initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5, delay: 0.05 * i, ease: [0.16, 1, 0.3, 1] as const } })

function Tarjeta({ titulo, accion, children, className }: { titulo: string; accion?: { texto: string; onClick(): void }; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn('flex min-w-0 flex-col gap-3 rounded-3 vidrio halo border p-4', className)}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="m-0 text-[15px] leading-[22px] font-semibold">{titulo}</h2>
        {accion && <button type="button" onClick={accion.onClick} className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-2 px-2.5 text-xs font-medium text-texto-2 transition-colors hover:bg-s2 hover:text-texto">{accion.texto}<ArrowRight className="size-3.5" strokeWidth={1.5} /></button>}
      </div>
      {children}
    </section>
  )
}

function Cifra({ etiqueta, children, pie }: { etiqueta: string; children: React.ReactNode; pie?: React.ReactNode }) {
  return (
    <div className="grid min-w-0 content-start gap-1.5 rounded-3 vidrio halo border px-4 py-3.5">
      <span className="text-xs text-texto-3">{etiqueta}</span>
      <div className="font-sans text-[28px] leading-8 font-semibold tracking-[-0.02em] tabular-nums">{children}</div>
      {pie && <div className="text-xs text-texto-3">{pie}</div>}
    </div>
  )
}

export function Inicio({ conectado, recuerdos, eventos, estadoEsme, memoriaUsada, preguntas, memoria, onMemoria, onPreguntar, onIr }: {
  conectado: boolean; recuerdos: number | null; eventos: EventoMente[]; estadoEsme: EstadoSenal; memoriaUsada: number; preguntas: number
  memoria: boolean; onMemoria(v: boolean): void; onPreguntar(q: string): void; onIr(id: 'taller' | 'memoria' | 'conversacion' | 'uso' | 'ajustes' | 'tienda'): void
}) {
  const [uso, setUso] = useState<EstadoUso | null>(null)
  const [proveedores, setProveedores] = useState<ProviderView[]>([])
  const [motores, setMotores] = useState<MotorDetectado[]>([])
  useEffect(() => {
    const leer = () => void bridge.uso.estado().then(setUso).catch(() => {})
    leer(); void bridge.providers().then(setProveedores).catch(() => {}); void bridge.motores.detectar().then(setMotores).catch(() => {})
    return bridge.uso.onConsumo(leer)
  }, [])

  const linea = !conectado ? 'No encuentro tu cerebro. Arráncalo y vuelvo a conectar sola.'
    : recuerdos ? `Tu memoria tiene ${recuerdos.toLocaleString('es-ES')} recuerdos. ¿Qué hacemos hoy?` : 'Tu memoria está vacía. Empieza absorbiendo tus notas desde Memoria.'
  const conClave = proveedores.filter((p) => p.hasKey && !p.local), locales = proveedores.filter((p) => p.local)
  const instalados = motores.filter((m) => m.instalado)
  const tope = uso?.presupuesto.diarioUSD, pct = tope ? Math.min(100, (uso!.hoyUSD / tope) * 100) : null

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto grid max-w-[1160px] gap-6 px-10 pt-10 pb-12">
        <div className="grid grid-cols-[minmax(0,1fr)_300px] items-center gap-8 max-[1000px]:grid-cols-1">
          <motion.div {...entrada(0)} className="grid gap-5">
            <div className="grid gap-2">
              <h1 className="m-0 font-display text-[44px] leading-[1.05] font-semibold tracking-[-0.04em] text-balance">{saludo()}.</h1>
              <p className="m-0 text-[15px] text-texto-2">{linea}</p>
            </div>
            <Compositor onEnviar={onPreguntar} memoria={memoria} onMemoria={onMemoria} contexto={conectado ? [] : ['el cerebro está apagado']} autoFocus />
          </motion.div>
          <motion.div {...entrada(1)} className="relative grid place-items-center gap-3 py-2 max-[1000px]:hidden" aria-live="polite">
            <div aria-hidden className="pointer-events-none absolute inset-6 rounded-full opacity-[0.16] blur-3xl transition-opacity duration-700" style={{ background: 'var(--aurora)', opacity: estadoEsme === 'reposo' ? 0.12 : 0.3 }} />
            <Senal tam={190} estado={estadoEsme} titulo={`Esme: ${FRASE[estadoEsme]}`} />
            <span className="relative text-center text-sm text-texto-2">{FRASE[estadoEsme]}</span>
          </motion.div>
        </div>

        <motion.div {...entrada(2)} className="grid grid-cols-4 gap-3 max-[900px]:grid-cols-2">
          <Cifra etiqueta="Recuerdos" pie={conectado ? 'en tu mente local' : 'cerebro apagado'}><NumberFlow value={recuerdos ?? 0} locales="es-ES" /></Cifra>
          <Cifra etiqueta="Gasto de hoy" pie={uso ? (tope ? <span className="flex items-center gap-2"><span className="h-1 flex-1 overflow-hidden rounded-full bg-s3"><span className={cn('block h-full rounded-full', uso.evaluacion.estado === 'limite' ? 'bg-peligro' : uso.evaluacion.estado === 'aviso' ? 'bg-atencion' : 'bg-acento')} style={{ width: `${pct}%` }} /></span>de {fmtUSD(tope)}</span> : 'sin tope diario') : 'solo en la app de escritorio'}>
            {fmtUSD(uso?.hoyUSD ?? 0)}
          </Cifra>
          <Cifra etiqueta="Motores listos" pie={`${locales.length} en tu ordenador · ${conClave.length} por API · ${instalados.length} por suscripción`}><NumberFlow value={locales.length + conClave.length + instalados.length} /></Cifra>
          <Cifra etiqueta="Memoria usada hoy" pie={`${preguntas} ${preguntas === 1 ? 'pregunta' : 'preguntas'} en esta sesión`}>{fmtTokens(memoriaUsada)}<span className="ml-1 text-sm font-medium text-texto-3">tokens</span></Cifra>
        </motion.div>

        <motion.div {...entrada(3)} className="grid grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] gap-4 max-[1000px]:grid-cols-1">
          <Tarjeta titulo="Lo que ha hecho tu mente" accion={{ texto: 'Ver memoria', onClick: () => onIr('memoria') }}>
            {eventos.length === 0 ? (
              <div className="grid place-items-start gap-2 rounded-2 border border-dashed border-linea p-4">
                <BrainCircuit className="size-5 text-texto-3" strokeWidth={1.5} />
                <p className="m-0 text-sm text-texto-2">Aún no ha pasado nada en esta sesión. Pregúntale algo a Esme: aquí verás cada recuerdo que use, guarde u olvide.</p>
              </div>
            ) : (
              <ul className="m-0 grid list-none gap-2 p-0">
                {eventos.slice(0, 6).map((ev) => { const I = ICONO[ev.tipo]; return (
                  <li key={ev.id} className="flex min-w-0 items-start gap-3 rounded-2 border border-linea bg-fondo/40 px-3 py-2.5">
                    <span className={cn('grid size-7 shrink-0 place-items-center rounded-2', ev.tipo === 'recall' ? 'bg-memoria-velo text-memoria' : 'bg-acento-velo text-acento')}><I className="size-4" strokeWidth={1.5} /></span>
                    <span className="grid min-w-0 gap-0.5">
                      <span className="truncate text-sm text-texto">{ev.texto}</span>
                      {ev.detalle && <span className="truncate text-xs text-texto-3">{ev.detalle}</span>}
                    </span>
                    <span className="ml-auto shrink-0 pt-0.5 text-xs text-texto-3">{hace(ev.ts)}</span>
                  </li>) })}
              </ul>
            )}
          </Tarjeta>
          <Tarjeta titulo="Tus motores" accion={{ texto: 'Gestionar', onClick: () => onIr('ajustes') }}>
            {locales.length + conClave.length + instalados.length === 0 ? (
              <p className="m-0 text-sm text-texto-3">{bridge.mode() === 'web' ? 'En el navegador solo veo los motores locales. Abre la app de escritorio para ver todos.' : 'Conecta tu primer motor: hay opciones gratis.'}</p>
            ) : (
              <ul className="m-0 grid list-none gap-1 p-0">
                {[...locales, ...conClave].map((p) => (
                  <li key={p.id} className="flex items-center gap-2.5 py-1">
                    <KeyRound className="size-4 shrink-0 text-texto-3" strokeWidth={1.5} />
                    <span className="truncate text-sm">{p.label}</span>
                    <span className="ml-auto inline-flex h-6 items-center rounded-full bg-acento-velo px-2.5 text-xs font-medium text-acento">{p.local ? 'local' : 'API'}</span>
                  </li>))}
                {instalados.map((m) => (
                  <li key={m.id} className="flex items-center gap-2.5 py-1">
                    <Plug className="size-4 shrink-0 text-texto-3" strokeWidth={1.5} />
                    <span className="truncate text-sm">{m.nombre}</span>
                    <span className={cn('ml-auto inline-flex h-6 items-center rounded-full px-2.5 text-xs font-medium', m.instalado ? 'bg-acento-velo text-acento' : 'border border-linea text-texto-3')}>
                      {m.instalado ? 'tu suscripción' : 'sin instalar'}</span>
                  </li>))}
                {motores.length > instalados.length && (
                  <li><button type="button" onClick={() => onIr('ajustes')} className="mt-1 inline-flex items-center gap-1.5 text-xs text-texto-3 transition-colors hover:text-texto">
                    {motores.length - instalados.length} motores más disponibles con tu suscripción<ArrowRight className="size-3" strokeWidth={1.5} /></button></li>)}
              </ul>
            )}
          </Tarjeta>
        </motion.div>
      </div>
    </div>
  )
}
