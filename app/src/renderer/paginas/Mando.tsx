// «Mando»: la portada como centro de mando de TODO Esme (no solo de la memoria). En el centro, la presencia de Esme —una
// esfera de luz viva (Orb, de React Bits)— que al tocarla te escucha (manos libres, con el nivel real de tu micrófono).
// Arriba, la isla de estado con lo que hacen tus agentes; a los lados, los agentes trabajando paso a paso y lo que te
// espera; abajo, la pregunta. Detrás, un velo de luz (DarkVeil) teñido con el acento de tu piel.
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
import Orb from '../ui/Orb'
import { StatusIsland } from '../ui/status-island'
import { AlDia } from './AlDia'
import { diarioDe, type Entrada } from './diario'
import { islaDe, pasosDe } from './mando'
import { fechaLarga } from './portada'
import { useEscucha, useNivelVoz } from '../lib/voz'

const saludo = (h = new Date().getHours()) => (h < 6 ? 'Buenas noches' : h < 13 ? 'Buenos días' : h < 20 ? 'Buenas tardes' : 'Buenas noches')
const acento = () => getComputedStyle(document.documentElement).getPropertyValue('--acento').trim() || '#5fffd0'

export function Mando({ presencia = 'orbe', sitio = { izquierda: 240, abajo: 24, cabecera: 28 }, visible, conectado, recuerdos, atlas, tareas, memoria, onMemoria, onPreguntar, onOir, onIr, vivo = null, turnoVoz = 0, onCerrarVivo, onConversacion }: {
  presencia?: 'orbe' | 'ninguna'; sitio?: { izquierda: number; abajo: number; cabecera: number }
  visible: boolean; conectado: boolean; recuerdos: number | null; atlas: Atlas | null; tareas: TareaTaller[]
  memoria: boolean; onMemoria(v: boolean): void; onPreguntar(q: string, voz?: boolean): void; onOir?(pcm: Float32Array): void
  vivo?: { pregunta: string; texto: string; fin: boolean; sinPermiso?: { motor: string; id: string } } | null; turnoVoz?: number; onCerrarVivo?(): void; onConversacion?(): void; onIr(ir: NonNullable<Entrada['ir']>): void
}) {
  // manos libres: hablas, y al callarte un momento Esme te oye y responde (lib/voz.ts)
  const { escuchando, nivel, empezar, parar } = useEscucha((pcm) => onOir?.(pcm))
  const nivelVoz = useNivelVoz()
  // conversación continua: cuando Esme termina de hablar, vuelve a escucharte (tócala para salir)
  const [continua, setContinua] = useState(() => { try { return localStorage.getItem('esme:voz-continua') !== 'no' } catch { return true } })
  useEffect(() => { try { localStorage.setItem('esme:voz-continua', continua ? 'si' : 'no') } catch { /* sin almacenamiento */ } }, [continua])
  const enConversacion = useRef(false)
  useEffect(() => { if (turnoVoz && continua && visible && enConversacion.current) empezar().catch(() => {}) }, [turnoVoz])  // eslint-disable-line react-hooks/exhaustive-deps
  const pensandoVoz = !!vivo && !vivo.fin
  const setEscuchando = (v: boolean | ((x: boolean) => boolean)) => { const quiere = typeof v === 'function' ? v(escuchando) : v; if (quiere) empezar().catch(() => toast.error('No puedo usar el micrófono: revisa que esté conectado y permitido.')); else parar(false) }
  const [alDia, setAlDia] = useState(false)
  const [color, setColor] = useState(acento)
  useEffect(() => { const o = new MutationObserver(() => setColor(acento())); o.observe(document.documentElement, { attributes: true, attributeFilter: ['style', 'data-estilo'] }); return () => o.disconnect() }, [])
  const [ahora, setAhora] = useState(Date.now())
  useEffect(() => { const i = setInterval(() => setAhora(Date.now()), 5000); return () => clearInterval(i) }, [])

  const isla = useMemo(() => islaDe(tareas, ahora), [tareas, ahora])
  const activos = useMemo(() => tareas.filter((t) => t.estado === 'trabajando' || t.estado === 'preparando').slice(0, 2), [tareas])
  const esperan = useMemo(() => tareas.filter((t) => t.estado === 'esperando'), [tareas])
  const listas = tareas.filter((t) => t.estado === 'lista' && !t.aplicada).length
  const diario = useMemo(() => (alDia ? diarioDe({ tareas, atlas, desde: ahora - 864e5, ahora }) : []), [alDia, tareas, atlas, ahora])
  const muelle = useMuelle({ stiffness: 300, damping: 30 })
  const temas = atlas?.clusters.length ?? 0
  const pausado = useRef(false); pausado.current = !visible

  return (
    <div aria-hidden={!visible} inert={!visible} className={cn('absolute inset-0 z-10 transition-opacity duration-700', visible ? 'opacity-100' : 'pointer-events-none opacity-0')}>

      <div className="absolute top-4 left-1/2 z-20 -translate-x-1/2">
        {isla.length > 0 && <StatusIsland tasks={isla} />}
      </div>

      {/* la presencia de Esme */}
      <div className="absolute top-[7%] left-1/2 grid w-[min(560px,80%)] -translate-x-1/2 justify-items-center text-center">
        <button type="button" onClick={() => { if (escuchando) { parar(false); enConversacion.current = false } else if (nivelVoz > 0 || vivo) { onCerrarVivo?.(); enConversacion.current = false } else { enConversacion.current = true; setEscuchando(true) } }} aria-pressed={escuchando} aria-label={escuchando ? 'Dejar de escuchar' : 'Hablar con Esme (manos libres)'}
          className="relative size-[300px] rounded-full outline-none focus-visible:ring-2 focus-visible:ring-acento">
          {visible && presencia === 'orbe' && <Orb colors={[color, '#ffffff', color]} size={1} glow={escuchando ? 1.6 + nivel * 2 : nivelVoz > 0 ? 1.5 + nivelVoz * 2.5 : pensandoVoz ? 1.4 : 1} wobble={escuchando ? 0.4 + nivel : nivelVoz > 0 ? 0.35 + nivelVoz * 1.2 : 0.25}
            speed={escuchando || nivelVoz > 0 ? 1.4 : pensandoVoz ? 2.2 : 0.6} hoverIntensity={0.35} rotateOnHover forceHoverState={escuchando || nivelVoz > 0 || pensandoVoz} backgroundColor="transparent" />}
        </button>
        <p className="m-0 mt-1 text-[13px] tracking-wide text-texto-3">{fechaLarga(new Date())}</p>
        <h1 className="m-0 mt-1 text-[clamp(40px,4.6vw,60px)] leading-none font-light tracking-[-0.04em] text-texto">{saludo()}.</h1>
        <p className="m-0 mt-3 text-[15px] text-texto-2">
          {escuchando ? 'Te escucho. Habla con naturalidad.' : conectado
            ? <>Tu mente guarda <b className="font-medium text-texto">{(recuerdos ?? 0).toLocaleString('es-ES')} recuerdos</b> en {temas} temas{listas ? <> · <b className="font-medium text-texto">{listas}</b> tareas listas para revisar</> : null}.</>
            : 'Toca la esfera para hablar, o escribe abajo.'}
        </p>
        <AnimatePresence>
          {vivo && !escuchando && (
            <motion.div key="vivo" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} transition={muelle}
              className="mt-4 grid w-[min(640px,90vw)] gap-2 text-left" aria-live="polite">
              <p className="m-0 text-[13px] text-texto-3">Tú: <span className="text-texto-2">{vivo.pregunta}</span></p>
              <p className="m-0 max-h-[22vh] overflow-hidden text-[19px] leading-[1.5] font-light text-texto [mask-image:linear-gradient(to_top,black_70%,transparent)]">
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
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} transition={muelle} className="mt-4">
              <AI_Voice level={nivel} onSend={() => parar(true)} onDiscard={() => parar(false)} />
              <p className="m-0 mt-2 text-xs text-texto-3">Cuando te calles un momento, te respondo. Todo se queda en tu equipo.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* agentes trabajando */}
      {activos.length > 0 && (
        <aside aria-label="Agentes trabajando" className="absolute top-[30%] left-[max(88px,4vw)] grid w-[300px] gap-3">
          {activos.map((t) => (
            <button key={t.id} type="button" onClick={() => onIr({ lugar: 'taller', id: t.id })} className="hoja rounded-4 border border-linea p-3 text-left backdrop-blur-xl transition-transform hover:-translate-y-0.5">
              <p className="m-0 mb-1 text-xs text-texto-3">{t.motorNombre}{t.modelo ? ` · ${t.modelo}` : ''}</p>
              <AILoadingState steps={pasosDe(t)} collapseWhenDone={false} />
            </button>
          ))}
        </aside>
      )}

      {/* lo que te espera */}
      {esperan.length > 0 && (
        <aside aria-label="Te espera" className="absolute top-[30%] right-[4vw] grid w-[290px] gap-2">
          {esperan.slice(0, 3).map((t) => (
            <button key={t.id} type="button" onClick={() => onIr({ lugar: 'taller', id: t.id })}
              className="hoja grid gap-1 rounded-4 border border-atencion/40 p-4 text-left backdrop-blur-xl transition-transform hover:-translate-y-0.5">
              <span className="flex items-center gap-2 text-[13px] font-medium text-texto"><i className="size-1.5 rounded-full bg-atencion shadow-[0_0_10px_var(--atencion)]" />{t.motorNombre} te espera</span>
              <span className="text-[13px] leading-snug text-texto-2">{t.permiso ? `Pide permiso para «${t.permiso.titulo}».` : 'Necesita tu respuesta para seguir.'}</span>
            </button>
          ))}
        </aside>
      )}

      {/* la pregunta */}
      <div className="absolute right-8 left-8 mx-auto max-w-[820px]" style={{ bottom: Math.max(24, sitio.abajo) }}>
        <AnimatePresence>
          {alDia && <AlDia key="al-dia" entradas={diario} onCerrar={() => setAlDia(false)} onIr={(ir) => { setAlDia(false); onIr(ir) }}
            onPreguntar={() => { setAlDia(false); onPreguntar('¿Qué me perdí hoy?') }} />}
        </AnimatePresence>
        <Compositor onEnviar={onPreguntar} memoria={memoria} onMemoria={onMemoria} contexto={conectado ? [] : ['el cerebro está apagado']} autoFocus />
        <div className="mt-2.5 flex flex-wrap justify-center gap-x-2 gap-y-1">
          {[
            { t: '¿Qué me perdí hoy?', f: () => setAlDia((v) => !v) },
            { t: 'Tu mente', f: () => onIr({ lugar: 'memoria' }) },
            { t: 'Continúa la última tarea', f: () => onPreguntar('Continúa la última tarea del taller') },
            { t: 'Habla conmigo', f: () => setEscuchando(true) },
          ].map(({ t, f }) => (
            <button key={t} type="button" onClick={f} className="rounded-full border border-linea/70 bg-s1/40 px-3 py-1 text-[13px] text-texto-2 backdrop-blur-md transition-colors hover:border-linea-fuerte hover:text-texto">{t}</button>
          ))}
        </div>
      </div>
    </div>
  )
}
