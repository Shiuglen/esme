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
import DarkVeil from '../ui/DarkVeil'
import Orb from '../ui/Orb'
import { StatusIsland } from '../ui/status-island'
import { AlDia } from './AlDia'
import { diarioDe, type Entrada } from './diario'
import { islaDe, pasosDe } from './mando'
import { fechaLarga } from './portada'

const saludo = (h = new Date().getHours()) => (h < 6 ? 'Buenas noches' : h < 13 ? 'Buenos días' : h < 20 ? 'Buenas tardes' : 'Buenas noches')
const acento = () => getComputedStyle(document.documentElement).getPropertyValue('--acento').trim() || '#5fffd0'

// El nivel real del micrófono (0–1) mientras Esme te escucha; nada se graba ni sale de tu ordenador.
function useNivelMicro(activo: boolean) {
  const [nivel, setNivel] = useState(0)
  useEffect(() => {
    if (!activo) { setNivel(0); return }
    let vivo = true, raf = 0, stream: MediaStream | null = null, ctx: AudioContext | null = null
    navigator.mediaDevices.getUserMedia({ audio: true }).then((s) => {
      if (!vivo) { s.getTracks().forEach((t) => t.stop()); return }
      stream = s; ctx = new AudioContext()
      const an = ctx.createAnalyser(); an.fftSize = 512; ctx.createMediaStreamSource(s).connect(an)
      const buf = new Uint8Array(an.fftSize)
      const paso = () => { an.getByteTimeDomainData(buf); let m = 0; for (const v of buf) m = Math.max(m, Math.abs(v - 128)); setNivel(Math.min(1, (m / 128) * 2.2)); raf = requestAnimationFrame(paso) }
      paso()
    }).catch(() => toast.error('No puedo usar el micrófono: revisa que esté conectado y permitido.'))
    return () => { vivo = false; cancelAnimationFrame(raf); stream?.getTracks().forEach((t) => t.stop()); void ctx?.close() }
  }, [activo])
  return nivel
}

export function Mando({ sitio = { izquierda: 240, abajo: 24, cabecera: 28 }, visible, conectado, recuerdos, atlas, tareas, memoria, onMemoria, onPreguntar, onIr }: {
  sitio?: { izquierda: number; abajo: number; cabecera: number }
  visible: boolean; conectado: boolean; recuerdos: number | null; atlas: Atlas | null; tareas: TareaTaller[]
  memoria: boolean; onMemoria(v: boolean): void; onPreguntar(q: string): void; onIr(ir: NonNullable<Entrada['ir']>): void
}) {
  const [escuchando, setEscuchando] = useState(false)
  const [alDia, setAlDia] = useState(false)
  const nivel = useNivelMicro(escuchando)
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
      {/* el velo de luz: solo se pinta mientras la portada está a la vista */}
      {visible && <div className="absolute inset-0 opacity-70"><DarkVeil color={color} speed={0.35} brightness={0.9} glow={0.6} grain={0.05} /></div>}
      <div className="absolute inset-0 bg-[radial-gradient(70%_60%_at_50%_42%,transparent,var(--fondo)_95%)]" />

      <div className="absolute top-4 left-1/2 z-20 -translate-x-1/2">
        {isla.length > 0 && <StatusIsland tasks={isla} />}
      </div>

      {/* la presencia de Esme */}
      <div className="absolute top-[7%] left-1/2 grid w-[min(560px,80%)] -translate-x-1/2 justify-items-center text-center">
        <button type="button" onClick={() => setEscuchando((v) => !v)} aria-pressed={escuchando} aria-label={escuchando ? 'Dejar de escuchar' : 'Hablar con Esme (manos libres)'}
          className="relative size-[300px] rounded-full outline-none focus-visible:ring-2 focus-visible:ring-acento">
          {visible && <Orb colors={[color, '#ffffff', color]} size={1} glow={escuchando ? 1.6 + nivel * 2 : 1} wobble={escuchando ? 0.4 + nivel : 0.25}
            speed={escuchando ? 1.4 : 0.6} hoverIntensity={0.35} rotateOnHover forceHoverState={escuchando} backgroundColor="transparent" />}
        </button>
        <p className="m-0 mt-1 text-[13px] tracking-wide text-texto-3">{fechaLarga(new Date())}</p>
        <h1 className="m-0 mt-1 text-[clamp(40px,4.6vw,60px)] leading-none font-light tracking-[-0.04em] text-texto">{saludo()}.</h1>
        <p className="m-0 mt-3 text-[15px] text-texto-2">
          {escuchando ? 'Te escucho. Habla con naturalidad.' : conectado
            ? <>Tu mente guarda <b className="font-medium text-texto">{(recuerdos ?? 0).toLocaleString('es-ES')} recuerdos</b> en {temas} temas{listas ? <> · <b className="font-medium text-texto">{listas}</b> tareas listas para revisar</> : null}.</>
            : 'Toca la esfera para hablar, o escribe abajo.'}
        </p>
        <AnimatePresence>
          {escuchando && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} transition={muelle} className="mt-4">
              <AI_Voice level={nivel} onSend={() => { setEscuchando(false); toast('La transcripción local llega en el siguiente paso: por ahora, escríbemelo abajo.') }}
                onDiscard={() => setEscuchando(false)} />
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
