// «El Mando vivo»: la portada siempre cuenta algo verdadero. A la izquierda, el saludo y el estado real de tu mundo (lo
// urgente primero) con la pregunta debajo. A la derecha, como imagen principal, TU MENTE: la constelación de tus recuerdos
// reales, con Esme en su centro (tócala para hablar, manos libres). Abajo, «Ahora»: tu equipo, lo próximo de la agenda,
// tus herramientas y lo último que pasó. La luz solo está en lo vivo.
// Componentes: Kokonut UI (MIT) y React Bits, revisados y copiados en src/renderer/ui.
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import type { TareaTaller } from '../lib/bridge'
import type { Atlas } from '../lib/brain'
import { cn } from '../lib/cn'
import { Compositor } from '../shell/Compositor'
import { useMuelle } from '../tinta/movimiento'
import AILoadingState from '../ui/ai-loading'
import AI_Voice from '../ui/ai-voice'
import { Presencia } from '../shell/Presencia'
import { estadoDeEsme } from '../tinta/estado'
import type { Presencia as TipoPresencia } from '../tinta/piel'
import { sonar } from '../tinta/sonido'
import { StatusIsland } from '../ui/status-island'
import { AlDia } from './AlDia'
import { diarioDe, type Entrada } from './diario'
import { islaDe, pasosDe } from './mando'
import { archivable } from '../taller/vista'
import { fechaLarga } from './portada'
import { useEscucha, useNivelVoz } from '../lib/voz'
import { Saludo } from '../tinta/PiezasVivas'
import { TintaVista, tintaDeTarea } from '../marca/PuntoVista'
import { useAgenda } from '../taller/Agenda'
import { bridge } from '../lib/bridge'
import { Constelacion } from './Constelacion'
import type { SeccionId } from '../shell/secciones'
import { estadoDelDia } from './mando-vivo'
import { CalendarClock, Hammer, Plug } from 'lucide-react'
import { usePiezas } from '../tinta/movimiento'

const saludo = (h = new Date().getHours()) => (h < 6 ? 'Buenas noches' : h < 13 ? 'Buenos días' : h < 20 ? 'Buenas tardes' : 'Buenas noches')
const acento = () => getComputedStyle(document.documentElement).getPropertyValue('--acento').trim() || '#5fffd0'

export function Mando({ onSeccion, presencia = 'orbe', sitio = { izquierda: 240, abajo: 24, cabecera: 28 }, visible, conectado, recuerdos, atlas, tareas, memoria, onMemoria, onPreguntar, onOir, onIr, vivo = null, turnoVoz = 0, onCerrarVivo, onConversacion }: {
  presencia?: TipoPresencia; sitio?: { izquierda: number; abajo: number; cabecera: number }
  visible: boolean; conectado: boolean; recuerdos: number | null; atlas: Atlas | null; tareas: TareaTaller[]
  memoria: boolean; onMemoria(v: boolean): void; onPreguntar(q: string, voz?: boolean): void; onOir?(pcm: Float32Array): void
  vivo?: { pregunta: string; texto: string; fin: boolean; sinPermiso?: { motor: string; id: string } } | null; turnoVoz?: number; onCerrarVivo?(): void; onConversacion?(): void; onIr(ir: NonNullable<Entrada['ir']>): void; onSeccion?(s: SeccionId): void
}) {
  // manos libres: hablas, y al callarte un momento Esme te oye y responde (lib/voz.ts)
  const { escuchando, nivel, empezar, parar } = useEscucha((pcm) => onOir?.(pcm))
  const nivelVoz = useNivelVoz()
  const { piezas } = usePiezas()
  // conversación continua: cuando Esme termina de hablar, vuelve a escucharte (tócala para salir)
  const [continua, setContinua] = useState(() => { try { return localStorage.getItem('esme:voz-continua') !== 'no' } catch { return true } })
  useEffect(() => { try { localStorage.setItem('esme:voz-continua', continua ? 'si' : 'no') } catch { /* sin almacenamiento */ } }, [continua])
  const enConversacion = useRef(false)
  useEffect(() => { if (turnoVoz && continua && visible && enConversacion.current) empezar().catch(() => {}) }, [turnoVoz])  // eslint-disable-line react-hooks/exhaustive-deps
  const pensandoVoz = !!vivo && !vivo.fin
  const setEscuchando = (v: boolean | ((x: boolean) => boolean)) => { const quiere = typeof v === 'function' ? v(escuchando) : v; if (quiere) { void sonar('escuchar'); empezar().catch(() => toast.error('No puedo usar el micrófono: revisa que esté conectado y permitido.')) } else { void sonar('callar'); parar(false) } }
  const [alDia, setAlDia] = useState(false)
  const [color, setColor] = useState(acento)
  useEffect(() => { const o = new MutationObserver(() => setColor(acento())); o.observe(document.documentElement, { attributes: true, attributeFilter: ['style', 'data-estilo'] }); return () => o.disconnect() }, [])
  const [ahora, setAhora] = useState(Date.now())
  useEffect(() => { const i = setInterval(() => setAhora(Date.now()), 5000); return () => clearInterval(i) }, [])

  const isla = useMemo(() => islaDe(tareas, ahora), [tareas, ahora])
  const activos = useMemo(() => tareas.filter((t) => t.estado === 'trabajando' || t.estado === 'preparando').slice(0, 2), [tareas])
  const esperan = useMemo(() => tareas.filter((t) => t.estado === 'esperando'), [tareas])
  const estado = estadoDeEsme({ escuchando, hablando: nivelVoz > 0, pensando: pensandoVoz, trabajando: activos.length, esperando: esperan.length })
  const listas = tareas.filter((t) => t.estado === 'lista' && !t.aplicada && !archivable(t, ahora)).length   // las mismas que enseña el Taller
  const diarioHoy = useMemo(() => diarioDe({ tareas, atlas, desde: ahora - 864e5, ahora }), [tareas, atlas, Math.floor(ahora / 60_000)])  // eslint-disable-line react-hooks/exhaustive-deps
  const diario = alDia ? diarioHoy : []
  const agenda = useAgenda()
  const [manos, setManos] = useState<{ conectadas: number; forjadas: number }>({ conectadas: 0, forjadas: 0 })
  useEffect(() => { if (visible) void bridge.herramientas.conectadas().then((l) => setManos({ conectadas: l.filter((c) => c.activa).length, forjadas: l.filter((c) => c.ficha.conexion.tipo === 'forjada').length })) }, [visible])
  // tu equipo: cada agente con lo último que hizo
  const equipo = useMemo(() => {
    const m = new Map<string, TareaTaller>()   // uno por agente (por su nombre: dos motores pueden ser el mismo agente)
    for (const t of [...tareas].sort((a, b) => a.inicio - b.inicio)) m.set(t.motorNombre, t)
    return [...m.values()].sort((a, b) => Number(b.estado === 'trabajando') - Number(a.estado === 'trabajando') || b.inicio - a.inicio).slice(0, 5)
  }, [tareas])
  const muelle = useMuelle({ stiffness: 300, damping: 30 })
  const temas = atlas?.clusters.length ?? 0
  const frases = estadoDelDia({ listas, trabajando: activos.length, esperan: esperan.length, programados: agenda.filter((p) => p.activo).map((p) => ({ texto: p.texto, proxima: p.proxima })), temas, recuerdos: recuerdos ?? 0, ahora })
  const pausado = useRef(false); pausado.current = !visible

  const hablar = () => { if (escuchando) { parar(false); enConversacion.current = false } else if (nivelVoz > 0 || vivo) { onCerrarVivo?.(); enConversacion.current = false } else { enConversacion.current = true; setEscuchando(true) } }

  return (
    <div aria-hidden={!visible} inert={!visible} className={cn('absolute inset-0 z-10 transition-opacity duration-700', visible ? 'opacity-100' : 'pointer-events-none opacity-0')}>
      <div className="absolute top-4 left-1/2 z-20 -translate-x-1/2">{isla.length > 0 && <StatusIsland tasks={isla} />}</div>

      {/* tu mente: la imagen principal, con Esme en su centro */}
      <div className="absolute top-0 right-0 bottom-[120px] w-[54%] text-texto-2">
        {/* la máscara funde la mente con lo que haya detrás (antes una viñeta pintada del color de fondo dejaba una costura) */}
        <div className="absolute inset-0 [mask-image:radial-gradient(closest-side,black_62%,transparent)]">
          <Constelacion atlas={atlas} color={color} activa={visible} className="absolute inset-0 size-full" />
        </div>
        <button type="button" onClick={() => onIr({ lugar: 'memoria' })} className="absolute right-8 bottom-2 text-[12.5px] text-texto-3 hover:text-texto">
          {(recuerdos ?? 0).toLocaleString('es-ES', { useGrouping: 'always' } as Intl.NumberFormatOptions)} recuerdos · {temas} temas · abrir tu mente
        </button>
      </div>

      {/* el saludo, el estado de tu mundo y la pregunta */}
      <div className="absolute top-[11%] grid w-[min(600px,44%)] content-start gap-5" style={{ left: Math.max(sitio.izquierda, 96) + 24 }}>
        <div className="grid gap-3">
          <p className="m-0 text-[13px] tracking-[0.02em] text-texto-3">{fechaLarga(new Date())}</p>
          <h1 className="m-0 flex flex-wrap items-baseline font-display text-[clamp(52px,5.6vw,88px)] leading-[0.95] font-normal tracking-[-0.025em] text-texto italic">
            <Saludo texto={saludo()} pieza={piezas.saludo} />
            {presencia === 'ninguna' ? '.' : (
              <button type="button" onClick={hablar} aria-pressed={escuchando} aria-label={escuchando ? 'Dejar de escuchar' : 'Hablar con Esme (manos libres)'}
                className="ml-[0.05em] rounded-full not-italic outline-none focus-visible:ring-2 focus-visible:ring-acento">
                {visible && <Presencia tipo={presencia} estado={estado} nivelTu={nivel} nivelElla={nivelVoz} px={30} tam="0.34em" className="punto-final text-acento" />}
              </button>
            )}
          </h1>
          {!vivo && !escuchando && (
            <div className="mt-2 grid gap-1.5" aria-live="polite">
              {frases.map((f, i) => (
                <p key={f} className={cn('m-0 leading-snug', i === 0 ? 'text-[19px] text-texto' : 'text-[15.5px] text-texto-2')}>{f}</p>
              ))}
            </div>
          )}
        </div>

        <AnimatePresence>
          {vivo && !escuchando && (
            <motion.div key="vivo" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} transition={muelle} className="grid gap-2" aria-live="polite">
              <p className="m-0 text-[13px] text-texto-3">Tú: <span className="text-texto-2">{vivo.pregunta}</span></p>
              <p className="m-0 max-h-[26vh] overflow-hidden text-[19px] leading-[1.55] text-texto [mask-image:linear-gradient(to_top,black_70%,transparent)]">
                {vivo.texto ? vivo.texto.slice(-420) : 'Pensando con tu memoria…'}{!vivo.fin && <span className="ml-0.5 inline-block h-[1em] w-[2px] translate-y-[3px] animate-pulse bg-acento" />}
              </p>
              {vivo.fin && vivo.sinPermiso && (
                <p className="m-0 flex flex-wrap items-center gap-x-2 text-[13px] text-atencion">
                  Respondí sin tu memoria: {vivo.sinPermiso.motor} puede retener datos.
                  <button type="button" className="underline underline-offset-4 hover:text-texto"
                    onClick={() => { try { localStorage.setItem(`esme:memoria-a:${vivo.sinPermiso!.id}`, 'si') } catch { /* sin almacenamiento */ } toast(`Listo: ${vivo.sinPermiso!.motor} recibirá tu memoria cuando preguntes.`); onPreguntar(vivo.pregunta, true) }}>
                    Usar mi memoria con {vivo.sinPermiso.motor} y repetir
                  </button>
                </p>
              )}
              <div className="flex flex-wrap items-center gap-3 text-[13px]">
                <button type="button" onClick={onConversacion} className="text-texto-2 underline decoration-linea-fuerte underline-offset-4 hover:text-texto">Ver en la conversación</button>
                <button type="button" onClick={() => setContinua((c) => !c)} aria-pressed={continua} className="text-texto-3 hover:text-texto">Conversación continua: {continua ? 'sí' : 'no'}</button>
                <button type="button" onClick={() => { enConversacion.current = false; onCerrarVivo?.() }} className="ml-auto text-texto-3 hover:text-texto">Terminar</button>
              </div>
            </motion.div>
          )}
          {escuchando && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} transition={muelle}>
              <AI_Voice level={nivel} onSend={() => parar(true)} onDiscard={() => parar(false)} />
              <p className="m-0 mt-2 text-xs text-texto-3">Cuando te calles un momento, te respondo. Todo se queda en tu equipo.</p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="relative">
          <AnimatePresence>
            {alDia && <AlDia key="al-dia" entradas={diario} onCerrar={() => setAlDia(false)} onIr={(ir) => { setAlDia(false); onIr(ir) }}
              onPreguntar={() => { setAlDia(false); onPreguntar('¿Qué me perdí hoy?') }} />}
          </AnimatePresence>
          <Compositor onEnviar={onPreguntar} memoria={memoria} onMemoria={onMemoria} contexto={conectado ? [] : ['el cerebro está apagado']} autoFocus />
          <div className="mt-2.5 flex flex-wrap gap-x-2 gap-y-1">
            {[
              { t: '¿Qué me perdí hoy?', f: () => setAlDia((v) => !v) },
              { t: 'Continúa la última tarea', f: () => onPreguntar('Continúa la última tarea del taller') },
              { t: 'Habla conmigo', f: () => setEscuchando(true) },
            ].map(({ t, f }) => (
              <button key={t} type="button" onClick={f} className="rounded-full border border-linea/70 px-3 py-1 text-[13px] text-texto-2 transition-colors hover:border-linea-fuerte hover:text-texto">{t}</button>
            ))}
          </div>
        </div>
      </div>

      {/* «Ahora»: tu equipo, lo próximo, tus manos y lo último que pasó */}
      <section aria-label="Ahora" className="absolute right-8 grid grid-cols-[1.4fr_1fr_0.8fr_1.4fr] gap-x-8 border-t border-linea/70 pt-4" style={{ left: Math.max(sitio.izquierda, 96) + 24, bottom: Math.max(24, sitio.abajo) }}>
        <div className="grid min-w-0 content-start gap-2">
          <p className="m-0 text-[12px] text-texto-3">Tu equipo</p>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {equipo.length === 0 && <span className="text-[13px] text-texto-3">Aún nadie ha trabajado: pide algo al Taller.</span>}
            {equipo.map((t) => (
              <button key={t.motor} type="button" onClick={() => onIr({ lugar: 'taller', id: t.id })} title={t.titulo} className="flex items-center gap-2 text-left">
                <TintaVista motor={t.motor} px={30} estado={tintaDeTarea(t.estado)} />
                <span className="grid leading-tight"><span className="text-[13px] text-texto">{t.motorNombre}</span>
                  <span className={cn('text-[11.5px]', t.estado === 'trabajando' ? 'text-acento' : t.estado === 'esperando' ? 'text-atencion' : 'text-texto-3')}>
                    {t.estado === 'trabajando' || t.estado === 'preparando' ? 'trabajando' : t.estado === 'esperando' ? 'te espera' : t.estado === 'error' ? 'no pudo' : t.estado === 'lista' ? 'terminó' : 'parado'}</span></span>
              </button>
            ))}
          </div>
        </div>
        <button type="button" onClick={() => onSeccion?.('taller')} className="grid min-w-0 content-start gap-2 text-left">
          <p className="m-0 flex items-center gap-1.5 text-[12px] text-texto-3"><CalendarClock className="size-3.5" strokeWidth={1.75} />Lo próximo</p>
          <p className="m-0 truncate text-[13px] text-texto-2">{(() => { const p = agenda.filter((x) => x.activo && x.proxima).sort((a, b) => a.proxima! - b.proxima!)[0]; return p ? `«${p.texto}»` : 'Nada programado. Pide «esta noche, revisa…»' })()}</p>
        </button>
        <button type="button" onClick={() => onSeccion?.('tienda')} className="grid min-w-0 content-start gap-2 text-left">
          <p className="m-0 flex items-center gap-1.5 text-[12px] text-texto-3"><Plug className="size-3.5" strokeWidth={1.75} />Tus manos</p>
          <p className="m-0 text-[13px] text-texto-2">{manos.conectadas ? `${manos.conectadas} herramientas` : 'Buscar, leer, encargar'}{manos.forjadas ? <span className="ml-1 inline-flex items-center gap-1 text-acento"><Hammer className="size-3" />{manos.forjadas} forjadas</span> : null}</p>
        </button>
        <div className="grid min-w-0 content-start gap-2">
          <p className="m-0 text-[12px] text-texto-3">Lo último</p>
          {diarioHoy.slice(0, 2).map((e) => (
            <button key={e.frase} type="button" onClick={() => e.ir && onIr(e.ir)} className="truncate text-left text-[13px] text-texto-2 hover:text-texto" title={e.frase}>
              <span className="text-texto-3">{e.cuando} · </span>{e.frase}
            </button>
          ))}
          {!diarioHoy.length && <span className="text-[13px] text-texto-3">Tranquilo: nada nuevo en 24 h.</span>}
        </div>
      </section>
    </div>
  )
}
