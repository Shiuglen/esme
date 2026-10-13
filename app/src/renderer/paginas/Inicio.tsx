// Inicio: la portada de tu mente («la mente despierta», Tinta y Luz 4d). Como la portada de un atlas grabado: la fecha,
// un saludo en la letra de los rótulos, lo que pasa contado en frases, y la lámina de tu mente real, que la primera vez
// en cada sesión se dibuja sola. Debajo, en columnas de texto (no cajas iguales): el diario de hoy, el Taller y tus motores.
// Solo datos reales; lo que aún no hay se dice tal cual. En reposo no gasta nada: no hay bucles ni animaciones vivas.
import { ArrowRight } from 'lucide-react'
import { motion } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'
import { fmtTokens, fmtUSD } from '../chat/formatos'
import type { Atlas } from '../lib/brain'
import { bridge, type EstadoUso, type MotorDetectado, type ProviderView } from '../lib/bridge'
import { cn } from '../lib/cn'
import { Senal, type EstadoSenal } from '../marca/Senal'
import { Grabado } from '../memoria/Grabado'
import { ROTULO } from '../memoria/pintar'
import { Compositor } from '../shell/Compositor'
import { esGrafito } from '../tinta/trazo'
import { fechaLarga, frasesTaller, hace, historiaMente, type FraseTaller } from './portada'

export type EventoMente = { id: number; ts: number; tipo: 'recall' | 'remember' | 'forget' | 'ingest' | 'taller-lista' | 'taller-permiso' | 'taller-error'; texto: string; detalle?: string; onVer?: () => void }
export type ResumenTaller = { trabajando: number; esperando: number; listas: number; errores: number }

const saludo = (h = new Date().getHours()) => (h < 6 ? 'Buenas noches' : h < 13 ? 'Buenos días' : h < 20 ? 'Buenas tardes' : 'Buenas noches')
const FRASE: Record<EstadoSenal, string> = { reposo: 'En calma, atenta a lo que necesites.', pensando: 'Pensando contigo…', recordando: 'Recordando: tu memoria se está encendiendo.' }
const TONO: Record<FraseTaller['tono'], string> = { atencion: 'text-atencion', vida: 'text-texto', listo: 'text-texto', peligro: 'text-peligro', calma: 'text-texto-3' }
const entrada = (i: number) => ({ initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.6, delay: 0.08 * i, ease: [0.16, 1, 0.3, 1] as const } })

function Columna({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="grid min-w-0 content-start gap-3">
      <h2 className="m-0 border-b border-linea pb-2 text-[13px] font-medium text-texto-2">{titulo}</h2>
      {children}
    </section>
  )
}

export function Inicio({ conectado, recuerdos, atlas, tema, taller, eventos, estadoEsme, memoriaUsada, preguntas, memoria, onMemoria, onPreguntar, onIr }: {
  conectado: boolean; recuerdos: number | null; atlas: Atlas | null; tema: string; taller: ResumenTaller; eventos: EventoMente[]; estadoEsme: EstadoSenal
  memoriaUsada: number; preguntas: number; memoria: boolean; onMemoria(v: boolean): void; onPreguntar(q: string): void
  onIr(id: 'taller' | 'memoria' | 'conversacion' | 'uso' | 'ajustes' | 'tienda'): void
}) {
  const [uso, setUso] = useState<EstadoUso | null>(null)
  const [proveedores, setProveedores] = useState<ProviderView[]>([])
  const [motores, setMotores] = useState<MotorDetectado[]>([])
  const [mudos, setMudos] = useState<Set<string>>(new Set()) // motores locales que no responden: no se presentan como listos
  useEffect(() => {
    const leer = () => void bridge.uso.estado().then(setUso).catch(() => {})
    leer(); void bridge.motores.detectar().then(setMotores).catch(() => {})
    void bridge.providers().then((ps) => {
      setProveedores(ps)
      for (const p of ps.filter((x) => x.local))
        void bridge.models(p.id).then((m) => { if (!m.length) setMudos((s) => new Set(s).add(p.id)) }).catch(() => setMudos((s) => new Set(s).add(p.id)))
    }).catch(() => {})
    return bridge.uso.onConsumo(leer)
  }, [])

  const ahora = Date.now()
  const historia = useMemo(() => {
    if (!conectado) return 'No encuentro tu cerebro. Arráncalo y vuelvo a conectar sola.'
    const pts = atlas?.points ?? []
    const ultimo = pts.reduce((m, p) => Math.max(m, p.ts ? Date.parse(p.ts) || 0 : 0), 0) || undefined
    return historiaMente({ recuerdos: recuerdos ?? pts.length, temas: atlas?.clusters.length ?? 0, ultimo, grafito: pts.filter((p) => esGrafito(p.trust)).length }, ahora)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conectado, atlas, recuerdos])
  const listos = [...proveedores.filter((p) => (p.local && !mudos.has(p.id)) || (p.hasKey && !p.local)).map((p) => ({ id: p.id, nombre: p.label, como: p.local ? 'en tu ordenador' : 'por API' })),
    ...motores.filter((m) => m.instalado).map((m) => ({ id: m.id, nombre: m.nombre, como: 'tu suscripción' }))]
  const callados = proveedores.filter((p) => p.local && mudos.has(p.id))
  const tope = uso?.presupuesto.diarioUSD

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto grid max-w-[1220px] gap-10 px-10 pt-9 pb-14">
        <div className="grid grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] items-stretch gap-10 max-[1060px]:grid-cols-1">
          <div className="flex min-w-0 flex-col justify-center gap-6 py-4">
            <motion.p {...entrada(0)} className="m-0 text-[13px] text-texto-3">{fechaLarga(new Date())}</motion.p>
            <motion.h1 {...entrada(1)} className="m-0 text-[clamp(44px,5.4vw,70px)] leading-[0.95] font-medium italic tracking-[-0.01em] text-texto" style={{ fontFamily: ROTULO }}>
              {saludo()}.
            </motion.h1>
            <motion.p {...entrada(2)} className="m-0 max-w-[52ch] text-[16px] leading-[1.6] text-texto-2 text-pretty">{historia}</motion.p>
            <motion.div {...entrada(3)}>
              <Compositor onEnviar={onPreguntar} memoria={memoria} onMemoria={onMemoria} contexto={conectado ? [] : ['el cerebro está apagado']} autoFocus />
            </motion.div>
            <motion.div {...entrada(4)} className="flex items-center gap-3 text-sm text-texto-2" aria-live="polite">
              <Senal tam={34} estado={estadoEsme} titulo={`Esme: ${FRASE[estadoEsme]}`} />
              <span>{FRASE[estadoEsme]}</span>
            </motion.div>
          </div>

          <motion.figure {...entrada(2)} className="m-0 grid min-h-[440px] grid-rows-[minmax(0,1fr)_auto] gap-3 max-[1060px]:min-h-[380px]">
            <div className="relative min-h-0 rounded-4 border border-linea bg-hoja/50">
              <Grabado atlas={atlas} tema={tema} onAbrir={() => onIr('memoria')} />
            </div>
            <figcaption className="text-[13px] leading-5 text-texto-3" style={{ fontFamily: ROTULO }}>
              <span className="italic">Lámina de tu mente</span>, {fechaLarga(new Date()).toLowerCase()}. Cada punto es un recuerdo: la tinta envejece con los días y el grafito espera tu confirmación.
            </figcaption>
          </motion.figure>
        </div>

        <motion.div {...entrada(5)} className="grid grid-cols-3 gap-10 max-[1000px]:grid-cols-1">
          <Columna titulo="Hoy en tu mente">
            {eventos.length === 0 ? (
              <p className="m-0 text-sm leading-6 text-texto-3">Aún no ha pasado nada en esta sesión. Cuando Esme use, guarde u olvide un recuerdo, lo verás aquí.</p>
            ) : (
              <ol className="m-0 grid list-none gap-2.5 p-0">
                {eventos.slice(0, 6).map((ev) => (
                  <li key={ev.id} className="grid min-w-0 grid-cols-[54px_minmax(0,1fr)] gap-2 text-sm">
                    <span className="pt-px text-xs text-texto-3 tabular-nums">{hace(ahora - ev.ts).replace('hace ', '')}</span>
                    <span className="min-w-0">
                      <span className={cn('block truncate', ev.tipo === 'taller-error' ? 'text-peligro' : ev.tipo === 'taller-permiso' ? 'text-atencion' : 'text-texto')}>{ev.texto}</span>
                      {ev.detalle && <span className="block truncate text-xs text-texto-3">{ev.detalle}</span>}
                      {ev.onVer && <button type="button" onClick={ev.onVer} className="text-xs text-texto-2 underline decoration-linea-fuerte underline-offset-2 hover:text-texto">Ver</button>}
                    </span>
                  </li>))}
              </ol>
            )}
            {preguntas > 0 && <p className="m-0 text-xs text-texto-3">Esme ha usado tu memoria en {preguntas} {preguntas === 1 ? 'pregunta' : 'preguntas'} ({fmtTokens(memoriaUsada)} tokens).</p>}
          </Columna>

          <Columna titulo="En el Taller">
            <ul className="m-0 grid list-none gap-2 p-0">
              {frasesTaller(taller).map((f) => (
                <li key={f.texto}>
                  {f.tono === 'calma' ? <p className="m-0 text-sm leading-6 text-texto-3">{f.texto}</p> : (
                    <button type="button" onClick={() => onIr('taller')} className={cn('group inline-flex items-center gap-1.5 text-left text-[15px] transition-colors hover:text-texto', TONO[f.tono])}>
                      {f.tono === 'vida' && <span aria-hidden className="size-1.5 rounded-full bg-luz animate-[respirar_2.4s_ease-in-out_infinite]" />}
                      {f.texto}<ArrowRight className="size-3.5 opacity-0 transition-opacity group-hover:opacity-100" strokeWidth={1.5} />
                    </button>)}
                </li>))}
            </ul>
          </Columna>

          <Columna titulo="Tus motores">
            {listos.length === 0 ? (
              <p className="m-0 text-sm leading-6 text-texto-3">{bridge.mode() === 'web' ? 'En el navegador solo veo los motores locales.' : 'Aún no hay ninguno listo. Conecta uno: hay opciones gratis.'}</p>
            ) : (
              <ul className="m-0 grid list-none gap-1.5 p-0">
                {listos.slice(0, 6).map((m) => (
                  <li key={m.id} className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="truncate text-texto">{m.nombre}</span><span className="shrink-0 text-xs text-texto-3">{m.como}</span>
                  </li>))}
              </ul>
            )}
            {callados.length > 0 && <p className="m-0 text-xs leading-5 text-texto-3">No responde{callados.length > 1 ? 'n' : ''}: {callados.map((p) => p.label).join(', ')}.</p>}
            <p className="m-0 text-xs leading-5 text-texto-3">
              {uso ? (uso.hoyUSD > 0 ? `Hoy llevas ${fmtUSD(uso.hoyUSD)} en IAs de pago${tope ? ` de ${fmtUSD(tope)}` : ''}.` : 'Hoy no has gastado nada en IAs de pago.') : ''}
              {' '}<button type="button" onClick={() => onIr('ajustes')} className="text-texto-2 underline decoration-linea-fuerte underline-offset-2 hover:text-texto">Gestionar</button>
            </p>
          </Columna>
        </motion.div>
      </div>
    </div>
  )
}
