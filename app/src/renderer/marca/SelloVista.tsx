// Tu sello estampado («Tinta y Luz»: el sello solo aparece en lo que aprobaste tú). Es un sello de tinta roja al modo
// baiwen: un cuadrado bermellón con la constelación de tu mente (marca/sello.ts) recortada en blanco papel. Al aprobar se
// estampa —de 1,15 a 1 con un leve rebote— y deja la marca, un poco torcida como cualquier sello hecho a mano.
import { motion } from 'motion/react'
import { createContext, useContext, useId, useMemo } from 'react'
import { type Firma, trazosSello } from './sello'
import { useMuelle } from '../tinta/movimiento'

/** La firma de tu mente (los temas del atlas). La pone App; cualquier sello la lee sin pasarla de mano en mano. */
export const FirmaMente = createContext<Firma>([])

const quieto = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

/** El sello en coordenadas 0–100, para meterlo en cualquier SVG (también tumbado en la planta isométrica). */
export function SelloTrazo({ textura = false }: { textura?: boolean }) {
  const firma = useContext(FirmaMente)
  const { puntos, lineas } = useMemo(() => trazosSello(firma), [firma])
  const id = useId().replace(/[^a-zA-Z0-9]/g, '')
  return (
    <g>
      <defs>
        <mask id={`${id}m`} maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100">
          <rect width="100" height="100" fill="#fff" />
          <rect x="13" y="13" width="74" height="74" rx="5" fill="none" stroke="#000" strokeWidth={1.8} />
          {lineas.map(([x1, y1, x2, y2], i) => <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#000" strokeWidth={2.2} strokeLinecap="round" />)}
          {puntos.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={p.r} fill="#000" />)}
        </mask>
        {textura && (
          // la tinta de un sello nunca carga entera: bordes mordidos y alguna mota sin color
          <filter id={`${id}t`} x="-8%" y="-8%" width="116%" height="116%">
            <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="7" result="ruido" />
            <feDisplacementMap in="SourceGraphic" in2="ruido" scale="3" xChannelSelector="R" yChannelSelector="G" result="borde" />
            <feColorMatrix in="ruido" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 10 -3.1" result="motas" />
            <feComposite in="borde" in2="motas" operator="in" />
          </filter>
        )}
      </defs>
      <g filter={textura ? `url(#${id}t)` : undefined}>
        <rect x="7" y="7" width="86" height="86" rx="9" mask={`url(#${id}m)`} style={{ fill: 'var(--sello)' }} />
      </g>
    </g>
  )
}

export function Sello({ lado = 28, giro = 0, estampar = false, titulo = 'Tu sello: lo aprobaste tú' }: {
  lado?: number; giro?: number; estampar?: boolean; titulo?: string
}) {
  const muelle = useMuelle({ stiffness: 520, damping: 15, mass: 0.7 })
  const golpe = estampar && !quieto()
  return (
    <motion.svg width={lado} height={lado} viewBox="0 0 100 100" role="img" aria-label={titulo} className="shrink-0 overflow-visible"
      initial={golpe ? { scale: 1.15, opacity: 0, rotate: giro - 3 } : false} animate={{ scale: 1, opacity: 1, rotate: giro }}
      transition={muelle}>
      <title>{titulo}</title>
      <SelloTrazo textura={lado >= 22} />
    </motion.svg>
  )
}
