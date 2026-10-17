// El Ser de la casa y los bichitos de cada motor: criaturas nacidas de la constelación de tu mente.
// Tinta de línea, trama de luz, ojos que respiran. De la era agentiva: viven sin pedir nada.
import { motion, useReducedMotion } from 'motion/react'
import { useContext, useMemo } from 'react'
import { FirmaMente } from './Sello'
import { nacer } from './ser'

export function Ser({ de, tamaño = 18, vivo = false, className }: { de: string; tamaño?: number; vivo?: boolean; className?: string }) {
  const firma = useContext(FirmaMente)
  const forma = useMemo(() => nacer(firma, de), [firma, de])
  const quieto = useReducedMotion()
  const respirar = vivo && !quieto
    ? { scale: [1, 1.07, 1], rotate: [0, forma.giro * 0.25, 0], transition: { duration: forma.pulso, repeat: Infinity, ease: 'easeInOut' as const } }
    : undefined
  return (
    <svg viewBox="0 0 100 100" width={tamaño} height={tamaño} className={className} aria-hidden style={{ overflow: 'visible' }}>
      <motion.g animate={respirar} style={{ transformOrigin: '50px 52px' }}>
        <path d={forma.cuerpo} fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinejoin="round" opacity={0.92} />
        {forma.patas.map((d, i) => <path key={i} d={d} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" opacity={0.75} />)}
        {forma.asientos.map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r} fill="var(--luz)" opacity={0.85} />)}
        {forma.ojos.map(([x, y], i) => (
          <g key={i}>
            <circle cx={x} cy={y} r={2.6} fill="var(--papel)" stroke="currentColor" strokeWidth={0.7} />
            <motion.circle cx={x} cy={y} r={vivo ? 1.25 : 1.05} fill="currentColor"
              animate={quieto ? undefined : { ry: [1.05, 1.05, 0.14, 1.05] }}
              transition={{ duration: 0.9, repeat: Infinity, repeatDelay: forma.pulso * 2 + i * 0.6, delay: i * 0.35 }} />
          </g>
        ))}
      </motion.g>
    </svg>
  )
}

/** El bichito de un motor (la colmena le da a cada motor, determinista por su id, su parte de la mente). */
export function Bicho({ de, tamaño, vivo, className }: { de: string; tamaño?: number; vivo?: boolean; className?: string }) {
  return <Ser de={`motor:${de}`} tamaño={tamaño} vivo={vivo} className={className} />
}

/** La casa misma: el ser grande que ve el Taller, despierto cuando algo trabaja. */
export function SerCasa({ vivo, tamaño = 30, className }: { vivo?: boolean; tamaño?: number; className?: string }) {
  return <Ser de="la-casa" tamaño={tamaño} vivo={vivo} className={className} />
}
