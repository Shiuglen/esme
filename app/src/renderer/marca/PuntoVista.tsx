// El Punto dibujado: Esme en trama de imprenta (marca/punto.ts). Un solo trazado SVG con la tinta en `currentColor`, así
// la piel decide el color y nunca la forma. Sus estados (tinta/estado.ts) se mueven con CSS de transform/opacidad, sin
// recalcular la página: respira en reposo, la tinta se revuelve al pensar (un muaré), late con la voz, se parte en «…»
// cuando el equipo trabaja (punto y seguido) y suelta una gota cuando te necesita.
import { memo, useMemo } from 'react'
import { cn } from '../lib/cn'
import type { EstadoEsme } from '../tinta/estado'
import { puntosDe, tramaPara, trazoDe } from './punto'
import { tintaDe } from './tintas'

export const PuntoVista = memo(function PuntoVista({ px, tam, estado = 'reposo', angulo = 45, nivel = 0, titulo, className }: {
  /** tamaño en píxeles con que se verá (decide la trama: sólido, gruesa o fina) */
  px: number
  /** tamaño CSS si no es px (p. ej. '0.34em' para ir dentro de un titular) */
  tam?: string
  estado?: EstadoEsme
  /** ángulo de la trama: el de Esme es 45°; cada agente del equipo tiene el suyo */
  angulo?: number
  /** 0–1: lo fuerte que suena la voz (escuchando o hablando) */
  nivel?: number
  titulo?: string
  className?: string
}) {
  const n = tramaPara(px)
  const d = useMemo(() => (n ? trazoDe(puntosDe({ n, angulo }).puntos) : ''), [n, angulo])
  const voz = estado === 'escuchando' || estado === 'hablando'
  const lado = tam ?? `${px}px`
  return (
    <svg viewBox="-1.3 -1.3 2.6 2.6" width={lado} height={lado} className={cn('punto', className)} data-estado={estado}
      role={titulo ? 'img' : undefined} aria-label={titulo} aria-hidden={titulo ? undefined : true} overflow="visible">
      <g className="punto-cuerpo" style={voz ? { transform: `scale(${1 + Math.min(1, nivel) * 0.18})` } : undefined}>
        {d ? <path d={d} fill="currentColor" /> : <circle r="1" fill="currentColor" />}
        {estado === 'pensando' && d && <path className="punto-muare" d={d} fill="currentColor" />}
      </g>
      {estado === 'trabajando' && (
        <g className="punto-seguido" fill="currentColor">
          <circle cx="1.75" cy="0.72" r="0.28" /><circle cx="2.55" cy="0.72" r="0.28" />
        </g>
      )}
      {estado === 'te-necesita' && <circle className="punto-gota" cx="1.02" cy="-1.02" r="0.2" fill="currentColor" />}
    </svg>
  )
})

/** La firma: «Esme.» en su letra fija (no cambia con la piel); el punto es ella, en el color de acento. */
export function Firma({ px = 18, estado, className }: { px?: number; estado?: EstadoEsme; className?: string }) {
  return (
    <span className={cn('firma inline-flex items-baseline text-texto', className)} style={{ fontSize: px }} aria-label="Esme">
      <span aria-hidden>Esme</span>
      <PuntoVista px={Math.round(px * 0.34)} tam="0.34em" estado={estado} className="ml-[0.06em] translate-y-[0.02em] self-baseline text-acento" />
    </span>
  )
}

/** Un agente del equipo: su tinta (su ángulo de trama). Trabajando, la tinta se revuelve; si te espera, suelta la gota; si
 *  falló, se desregistra (una copia corrida en el color de peligro), como un mal registro de imprenta. */
export function TintaVista({ motor, px = 30, estado, className }: { motor: string; px?: number; estado: EstadoTinta; className?: string }) {
  const { angulo } = tintaDe(motor)
  const e: EstadoEsme = estado === 'trabajando' ? 'pensando' : estado === 'esperando' ? 'te-necesita' : 'reposo'
  return (
    <span className={cn('relative inline-grid shrink-0 place-items-center', className)} style={{ width: px, height: px }}>
      {estado === 'fallo' && <PuntoVista px={px} angulo={angulo} estado="reposo" className="absolute translate-x-[2px] -translate-y-[1.5px] text-peligro opacity-70" />}
      <PuntoVista px={px} angulo={angulo} estado={e} className={cn('relative', estado === 'quieto' ? 'text-texto-3' : estado === 'trabajando' ? 'text-acento' : 'text-texto-2')} />
    </span>
  )
}

export type EstadoTinta = 'trabajando' | 'esperando' | 'fallo' | 'quieto' | 'lista'
/** El estado de una tarea del Taller visto como tinta. */
export const tintaDeTarea = (e: string): EstadoTinta =>
  e === 'trabajando' || e === 'preparando' ? 'trabajando' : e === 'esperando' ? 'esperando' : e === 'error' ? 'fallo' : e === 'lista' ? 'lista' : 'quieto'
