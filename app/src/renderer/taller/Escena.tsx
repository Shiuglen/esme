// La planta del Taller: el plano isométrico de la Señal hecho suelo. En el centro, la mente (la Señal viva sobre su peana);
// alrededor, una máquina por tarea unida al núcleo por un conducto. Cuando un motor trabaja, un potencial de acción recorre
// su conducto —la línea del suelo se levanta como una neurona que dispara— y su luz aurora se derrama en el suelo.
// Si te necesita, se enciende una baliza. El suelo se pierde en los bordes: solo importa lo que pasa cerca de la mente.
// Es un grabado: las caras no se pintan, se rayan según la luz de tu sol (taller/grabado.ts); de noche, esgrafiado.
// Lo que aprobaste lleva tu sello en la tapa.
import { luzViva } from '../tinta/luz'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { TareaTaller } from '../lib/bridge'
import { cn } from '../lib/cn'
import { Senal } from '../marca/Senal'
import { SelloTrazo } from '../marca/Sello'
import { giroSello } from '../marca/sello'
import { anguloSol } from '../tinta/sol'
import { CRUCES, RAYAS, SEPARACION, sombras, type Sombras } from './grabado'
import { asignarLugares, caja, conducto, iso, lugares, ruta, type Punto } from './iso'
import { duracion, ordenPlanta, textoCambios } from './vista'
import { useMuelle } from '../tinta/movimiento'

const LUGARES = lugares()
const ALTO_PULSO = 0.42
const reducido = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
const semilla = (id: string) => [...id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) / 4294967295
const aurora = (s: number, fase: number) => luzViva(s, fase)   // luz bioluminiscente del tema (tinta/luz.ts)
const xy = (p: [number, number]) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`

const ALTURA: Record<TareaTaller['estado'], number> = { preparando: 0.34, trabajando: 0.62, esperando: 0.62, lista: 0.48, parada: 0.48, error: 0.48 }
const COLOR: Partial<Record<TareaTaller['estado'], string>> = { esperando: 'var(--atencion)', error: 'var(--peligro)', lista: 'var(--texto-3)', parada: 'var(--linea-fuerte)' }

// La rejilla del suelo, de −6 a 15 en los dos ejes; la máscara la funde con el fondo.
const SUELO = Array.from({ length: 22 }, (_, i) => i - 6)
  .map((k) => `M${xy(iso(k, -6))}L${xy(iso(k, 15))}M${xy(iso(-6, k))}L${xy(iso(15, k))}`).join('')

type Maquina = { t: TareaTaller; lugar: Punto; ruta: Punto[]; fase: number }
type Vivos = { linea: SVGPathElement | null; cresta: SVGPathElement | null; brillo: SVGPathElement | null; ranura: SVGPathElement | null; luz: SVGRadialGradientElement | null }

const CARAS = ['izquierda', 'derecha', 'arriba'] as const

export function Escena({ tema = 'noche', tareas, seleccion, resaltada, ahora, compacta = false, onElegir, onResaltar, onNueva }: {
  tema?: string; tareas: TareaTaller[]; seleccion: string | null; resaltada: string | null; ahora: number; compacta?: boolean
  onElegir(id: string): void; onResaltar(id: string | null): void; onNueva(): void
}) {
  const marco = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(true)
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting))
    io.observe(marco.current!); return () => io.disconnect()
  }, [])

  // Cada tarea conserva su celda mientras esté en la planta; las nuevas toman el primer hueco libre.
  const sitios = useRef(new Map<string, number>())
  const maquinas: Maquina[] = useMemo(() => {
    const ids = ordenPlanta(tareas)
    sitios.current = asignarLugares(sitios.current, ids)
    return ids.map((id) => {
      const lugar = LUGARES[sitios.current.get(id)!]
      const t = tareas.find((x) => x.id === id)!
      return { t, lugar, ruta: ruta(lugar), fase: semilla(t.arena ?? id) }   // las de una arena laten a la vez: es una carrera
    })
  }, [tareas])
  const libres = compacta ? [] : LUGARES.filter((_, k) => ![...sitios.current.values()].includes(k)).slice(0, maquinas.length ? 1 : 4)

  // El pulso: un solo bucle para todas las máquinas que trabajan, escribiendo directamente en el SVG (sin re-render).
  const vivos = useRef(new Map<string, Vivos>())
  const trabajando = maquinas.filter((m) => m.t.estado === 'trabajando')
  const claveVivas = trabajando.map((m) => m.t.id).join()
  useEffect(() => {
    if (!visible || !trabajando.length) return
    const quieto = reducido()
    let raf = 0
    const t0 = performance.now()
    const pintar = (ms: number) => {
      const s = (ms - t0) / 1000
      for (const m of trabajando) {
        const el = vivos.current.get(m.t.id)
        if (!el) continue
        const c = quieto ? 0.55 : ((s / 1.9 + m.fase) % 1) * 1.5 - 0.25
        const { d, cresta } = conducto(m.ruta, { c, alto: ALTO_PULSO })
        el.linea?.setAttribute('d', d)
        el.cresta?.setAttribute('d', cresta ?? 'M0 0'); el.brillo?.setAttribute('d', cresta ?? 'M0 0')
        const color = aurora(quieto ? 0 : s, m.fase)
        el.cresta?.style.setProperty('stroke', color); el.brillo?.style.setProperty('stroke', color)
        el.ranura?.style.setProperty('fill', color)
        el.luz?.querySelectorAll('stop').forEach((st) => st.style.setProperty('stop-color', color))
      }
      if (!quieto) raf = requestAnimationFrame(pintar)
    }
    raf = requestAnimationFrame(pintar)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claveVivas, visible])
  const vivo = (id: string) => { if (!vivos.current.has(id)) vivos.current.set(id, { linea: null, cresta: null, brillo: null, ranura: null, luz: null }); return vivos.current.get(id)! }

  const ocupada = maquinas.some((m) => m.t.estado === 'trabajando' || m.t.estado === 'preparando')
  const luz = sombras(anguloSol(new Date(ahora)), tema === 'noche')
  const peana = caja(4.12, 4.12, 0.76, 0.76, 0.2)
  const [nx, ny] = iso(4.5, 4.5, 0.2)
  const objetos = [...maquinas.map((m) => ({ tipo: 'maquina' as const, m, fondo: m.lugar.x + m.lugar.y })), { tipo: 'nucleo' as const, fondo: 8 }]
    .sort((a, b) => a.fondo - b.fondo)

  return (
    <div ref={marco} className="relative size-full select-none">
      <svg className="absolute inset-0 size-full" viewBox="-290 46 580 312" preserveAspectRatio="xMidYMid meet" aria-hidden>
        <defs>
          <radialGradient id="planta-fundido" gradientUnits="userSpaceOnUse" cx="0" cy="225" r="600" gradientTransform="translate(0 225) scale(1 .5) translate(0 -225)">
            <stop offset="0" stopColor="#fff" /><stop offset=".5" stopColor="#fff" stopOpacity=".5" /><stop offset="1" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
          <mask id="planta-mascara" maskUnits="userSpaceOnUse" x="-1400" y="-500" width="2800" height="1500">
            <rect x="-1400" y="-500" width="2800" height="1500" fill="url(#planta-fundido)" />
          </mask>
          {CARAS.flatMap((cara) => ([1, 2, 3] as const).map((n) => <Rayado key={`${cara}${n}`} id={`rayado-${cara}-${n}`} angulo={RAYAS[cara]} sep={SEPARACION[n]} />))}
          {CARAS.map((cara) => <Rayado key={`x${cara}`} id={`cruce-${cara}`} angulo={CRUCES[cara]} sep={SEPARACION[3]} />)}
          <filter id="planta-brillo" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="3.4" /></filter>
          {maquinas.map((m) => m.t.estado === 'trabajando' ? (
            <radialGradient key={`v${m.t.id}`} id={`planta-luz-viva-${m.t.id}`} ref={(el) => { vivo(m.t.id).luz = el }}>
              <stop offset="0" style={{ stopColor: 'var(--luz)' }} stopOpacity={0.55} /><stop offset="1" style={{ stopColor: 'var(--luz)' }} stopOpacity={0} />
            </radialGradient>
          ) : (
            <radialGradient key={m.t.id} id={`planta-luz-${m.t.id}`}>
              <stop offset="0" style={{ stopColor: m.t.estado === 'lista' ? 'var(--luz)' : COLOR[m.t.estado] ?? 'var(--texto-3)', stopOpacity: 0.55 }} />
              <stop offset="1" style={{ stopColor: m.t.estado === 'lista' ? 'var(--luz)' : COLOR[m.t.estado] ?? 'var(--texto-3)', stopOpacity: 0 }} />
            </radialGradient>
          ))}
        </defs>

        <path d={SUELO} fill="none" mask="url(#planta-mascara)" style={{ stroke: 'var(--linea)' }} strokeWidth={1} vectorEffect="non-scaling-stroke" />

        {/* huecos libres: la siguiente tarea montará aquí su máquina */}
        {libres.map((l, k) => {
          const [cx, cy] = [l.x + 0.5, l.y + 0.5]
          return (
            <g key={`${l.x},${l.y}`} className="cursor-pointer opacity-70 transition-opacity hover:opacity-100" onClick={onNueva} style={{ pointerEvents: 'all' }}>
              <path d={caja(l.x + 0.12, l.y + 0.12, 0.76, 0.76, 0).arriba} fill="transparent" style={{ stroke: 'var(--linea-fuerte)' }} strokeOpacity={0.55} strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />
              {k === 0 && (() => { const [px, py] = iso(cx, cy); return <path d={`M${px - 6} ${py}L${px + 6} ${py}M${px} ${py - 6}L${px} ${py + 6}`} style={{ stroke: 'var(--texto-2)' }} strokeWidth={1.5} strokeLinecap="round" vectorEffect="non-scaling-stroke" /> })()}
            </g>
          )
        })}

        {/* la luz de cada motor derramada en el suelo */}
        {maquinas.filter((m) => m.t.estado !== 'parada' && m.t.estado !== 'preparando').map((m) => {
          const [cx, cy] = iso(m.lugar.x + 0.5, m.lugar.y + 0.5)
          return <ellipse key={m.t.id} cx={cx} cy={cy} rx={84} ry={42} fill={`url(#planta-luz-${m.t.estado === 'trabajando' ? 'viva-' : ''}${m.t.id})`} className="planta-luz" opacity={m.t.estado === 'error' ? 0.45 : m.t.estado === 'lista' ? 0.4 : 0.85} />
        })}

        {/* conductos: del núcleo a cada máquina, como pistas de un circuito */}
        {maquinas.map((m) => {
          const plano = conducto(m.ruta, { c: -1, alto: 0 }).d
          const t = m.t.estado
          const tono = t === 'esperando' ? 'var(--atencion)' : t === 'error' ? 'var(--peligro)' : m.t.id === seleccion ? 'var(--luz)' : 'var(--linea-fuerte)'
          return (
            <g key={m.t.id}>
              <motion.path d={plano} fill="none" style={{ stroke: tono }} strokeWidth={1.25}
                strokeOpacity={m.t.id === seleccion ? 0.95 : t === 'trabajando' ? 0.25 : 0.6}
                strokeDasharray={t === 'esperando' ? '2 4' : undefined} vectorEffect="non-scaling-stroke"
                initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }} />
              {t === 'trabajando' && (
                <>
                  <path ref={(el) => { vivo(m.t.id).linea = el }} d={plano} fill="none" style={{ stroke: 'var(--texto-3)' }} strokeOpacity={0.7} strokeWidth={1.25} vectorEffect="non-scaling-stroke" />
                  <path ref={(el) => { vivo(m.t.id).brillo = el }} d="M0 0" fill="none" strokeWidth={7} strokeLinecap="round" opacity={0.75} filter="url(#planta-brillo)" />
                  <path ref={(el) => { vivo(m.t.id).cresta = el }} d="M0 0" fill="none" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
                </>
              )}
            </g>
          )
        })}

        {/* núcleo y máquinas, de atrás adelante */}
        <AnimatePresence>
          {objetos.map((o) => o.tipo === 'nucleo' ? (
            <g key="nucleo">
              <Caras c={peana} luz={luz} />
              <g transform={`translate(${nx - 46} ${ny - 78})`}><Senal tam={92} estado={ocupada ? 'pensando' : 'reposo'} titulo="Esme" /></g>
            </g>
          ) : (
            <Pieza key={o.m.t.id} m={o.m} luz={luz} elegida={o.m.t.id === seleccion} resaltada={o.m.t.id === resaltada} ahora={ahora}
              vivo={vivo(o.m.t.id)} onElegir={onElegir} onResaltar={onResaltar} etiqueta={!compacta} />
          ))}
        </AnimatePresence>
      </svg>
    </div>
  )
}

/** Una familia de rayas paralelas: el buril del grabado. Va en el espacio de la planta, así que las rayas siguen de cara en cara. */
function Rayado({ id, angulo, sep }: { id: string; angulo: number; sep: number }) {
  return (
    <pattern id={id} patternUnits="userSpaceOnUse" width={sep} height={sep} patternTransform={`rotate(${angulo - 90})`}>
      <path d={`M${sep / 2} 0V${sep}`} style={{ stroke: 'var(--tinta)' }} strokeOpacity={0.55} strokeWidth={0.6} />
    </pattern>
  )
}

/** Las tres caras de una caja, grabadas: papel, rayas según la luz de cada cara (cruzadas en la sombra honda) y contorno a tinta.
 *  Lo que aún se está montando no lleva rayas: es un boceto a grafito, con el contorno discontinuo. */
function Caras({ c, luz, punteada }: { c: ReturnType<typeof caja>; luz: Sombras; punteada?: boolean }) {
  return (
    <>
      {CARAS.map((cara) => {
        const n = punteada ? 0 : luz[cara]
        return (
          <g key={cara}>
            <path d={c[cara]} style={{ fill: 'var(--hoja)' }} />
            {n > 0 && <path d={c[cara]} fill={`url(#rayado-${cara}-${n})`} />}
            {n === 3 && <path d={c[cara]} fill={`url(#cruce-${cara})`} />}
            <path d={c[cara]} fill="none" style={{ stroke: punteada ? 'var(--grafito)' : 'var(--tinta)' }} strokeOpacity={punteada ? 0.9 : 0.72}
              strokeWidth={1} strokeLinejoin="round" vectorEffect="non-scaling-stroke" strokeDasharray={punteada ? '3 3' : undefined} />
          </g>
        )
      })}
    </>
  )
}

function Pieza({ m, luz, elegida, resaltada, ahora, vivo, etiqueta, onElegir, onResaltar }: {
  m: Maquina; luz: Sombras; elegida: boolean; resaltada: boolean; ahora: number; vivo: Vivos; etiqueta: boolean; onElegir(id: string): void; onResaltar(id: string | null): void
}) {
  const muelleEntrada = useMuelle({ stiffness: 260, damping: 24 })
  const muelleAlzar = useMuelle({ stiffness: 320, damping: 26 })
  const t = m.t, h = ALTURA[t.estado]
  const x0 = m.lugar.x + 0.16, y0 = m.lugar.y + 0.16, w = 0.68
  const c = caja(x0, y0, w, w, h)
  const ranura = caja(x0 + 0.19, y0 + 0.19, w - 0.38, w - 0.38, 0, h).arriba
  const filo = `M${xy(iso(x0, y0 + w, h))}L${xy(iso(x0 + w, y0 + w, h))}L${xy(iso(x0 + w, y0, h))}`
  const [tx, ty] = iso(m.lugar.x + 0.5, m.lugar.y + 0.5, h)
  const metrica = t.estado === 'trabajando' ? duracion(ahora - t.inicio) : t.estado === 'esperando' ? 'te necesita'
    : t.estado === 'lista' ? textoCambios(t.cambios) ?? '' : t.estado === 'error' ? 'error' : t.estado === 'parada' ? '' : 'montando…'
  const baliza = t.estado === 'esperando'
  // Solo hablan las máquinas con algo que decir, o cuando te fijas en ellas; el reposo calla.
  const habla = elegida || resaltada || t.estado !== 'parada'
  return (
    <motion.g initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 14 }} transition={muelleEntrada}>
      <g className="planta-maquina cursor-pointer" data-resaltada={resaltada || elegida} style={{ pointerEvents: 'all' }}
        onClick={() => onElegir(t.id)} onPointerEnter={() => onResaltar(t.id)} onPointerLeave={() => onResaltar(null)}>
        {/* la pieza elegida se levanta del suelo: el foco la front stepping hacia ti (muelle, amortiguado) */}
        <motion.g animate={{ y: elegida || resaltada ? -5 : 0 }} transition={muelleAlzar}>
        {(elegida || resaltada) && (
          <path d={caja(m.lugar.x + 0.04, m.lugar.y + 0.04, 0.92, 0.92, 0).arriba} fill="none" style={{ stroke: elegida ? 'var(--texto)' : 'var(--texto-3)' }}
            strokeOpacity={elegida ? 0.9 : 0.6} strokeWidth={1.25} vectorEffect="non-scaling-stroke" />
        )}
        <Caras c={c} luz={luz} punteada={t.estado === 'preparando'} />
        <path d={filo} fill="none" style={{ stroke: 'var(--texto)' }} strokeOpacity={0.22} strokeWidth={1} vectorEffect="non-scaling-stroke" />
        {t.aplicada ? <SelloEnTapa x={x0 + w / 2} y={y0 + w / 2} h={h} giro={giroSello(t.id)} recien={ahora - t.aplicada.cuando < 5000} />
          : t.estado !== 'preparando' && t.estado !== 'trabajando' && (
          <path d={ranura} style={{ fill: t.estado === 'lista' ? 'var(--luz)' : COLOR[t.estado] ?? 'var(--texto-3)' }} opacity={t.estado === 'lista' ? 0.55 : 0.95} />
        )}
        {t.estado === 'trabajando' && (
          <path key="viva" ref={(el) => { vivo.ranura = el }} d={ranura} style={{ fill: 'var(--luz)' }} className="animate-[respirar_2.4s_ease-in-out_infinite]" />
        )}
        {baliza && (
          <g className="animate-[baliza_1.3s_ease-in-out_infinite]">
            <path d={`M${tx} ${ty - 4}L${tx} ${ty - 30}`} style={{ stroke: 'var(--atencion)' }} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
            <path d={`M${tx} ${ty - 40}L${tx + 5} ${ty - 34}L${tx} ${ty - 28}L${tx - 5} ${ty - 34}Z`} style={{ fill: 'var(--atencion)' }} />
          </g>
        )}
        <g transform={`translate(${tx} ${ty - (baliza ? 50 : 14)})`} className={cn('pointer-events-none transition-opacity duration-300', (!etiqueta || !habla) && 'opacity-0')}>
          <text textAnchor="middle" y={-13} className="fill-texto-3 font-mono" fontSize={9.5} style={{ paintOrder: 'stroke', stroke: 'var(--fondo)', strokeWidth: 3, strokeLinejoin: 'round' }}>
            {t.motorNombre.toLowerCase()}
          </text>
          <text textAnchor="middle" y={1} className={t.estado === 'error' ? 'fill-peligro' : t.estado === 'esperando' ? 'fill-atencion' : 'fill-texto'} fontSize={11.5}
            style={{ fontVariantNumeric: 'tabular-nums', paintOrder: 'stroke', stroke: 'var(--fondo)', strokeWidth: 3.5, strokeLinejoin: 'round' }}>
            {metrica}
          </text>
        </g>
        </motion.g>
      </g>
    </motion.g>
  )
}

/** Tu sello tumbado en la tapa de la máquina: el dibujo 0–100 del sello proyectado al plano isométrico (lado 0,34 celdas). */
function SelloEnTapa({ x, y, h, giro, recien }: { x: number; y: number; h: number; giro: number; recien: boolean }) {
  const s = 0.34, [X, Y] = iso(x - s / 2, y - s / 2, h)
  return (
    <g transform={`matrix(${0.5 * s} ${0.25 * s} ${-0.5 * s} ${0.25 * s} ${X} ${Y})`} className="pointer-events-none">
      <g transform={`rotate(${giro} 50 50)`}>
        <g className={recien ? 'animate-[estampar_.55s_cubic-bezier(.34,1.56,.64,1)_both] [transform-box:fill-box] [transform-origin:center]' : undefined}>
          <SelloTrazo />
        </g>
      </g>
    </g>
  )
}
