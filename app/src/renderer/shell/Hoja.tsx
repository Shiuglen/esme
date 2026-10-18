// Una hoja de papel que nace del sitio desde el que la pides (su lugar en la leyenda) y se pliega al cerrarla
// (La Ventana: «la interfaz nace y desaparece»). Es un recorte circular que crece desde ese punto; cerrada queda inerte
// e invisible, pero montada: la conversación y las terminales siguen vivas mientras no la miras.
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { cn } from '../lib/cn'

export type Origen = { x: number; y: number }
type Estado = 'cerrada' | 'abriendo' | 'abierta' | 'cerrando'
const quieto = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

export function Hoja({ abierta, origen, etiqueta, className, sitio, children }: { abierta: boolean; origen: Origen; etiqueta: string; className?: string; sitio?: React.CSSProperties; children: React.ReactNode }) {
  const ref = useRef<HTMLElement>(null)
  const [estado, setEstado] = useState<Estado>('cerrada')
  const [o, setO] = useState({ x: 0, y: 0 })
  // el centro del despliegue, en coordenadas de la hoja
  useLayoutEffect(() => { const r = ref.current?.getBoundingClientRect(); if (r) setO({ x: origen.x - r.left, y: origen.y - r.top }) }, [origen.x, origen.y, abierta])
  useEffect(() => {
    if (!abierta) { setEstado((e) => (e === 'cerrada' ? e : quieto() ? 'cerrada' : 'cerrando')); return }
    if (quieto()) { setEstado('abierta'); return }
    setEstado('abriendo') // se pinta plegada un fotograma y luego se despliega: así la transición tiene desde dónde partir
    let b = 0
    const a = requestAnimationFrame(() => { b = requestAnimationFrame(() => setEstado('abierta')) })
    // con la ventana en segundo plano Chromium congela los fotogramas: el temporizador abre la hoja igualmente
    const plan = setTimeout(() => setEstado('abierta'), 90)
    return () => { cancelAnimationFrame(a); cancelAnimationFrame(b); clearTimeout(plan) }
  }, [abierta])
  const desplegada = estado === 'abierta'
  return (
    <section ref={ref} aria-label={etiqueta} inert={!abierta}
      onTransitionEnd={(e) => { if (e.target === e.currentTarget && e.propertyName === 'clip-path' && estado === 'cerrando') setEstado('cerrada') }}
      className={cn('hoja absolute z-20 overflow-hidden', className, estado === 'cerrada' && 'invisible')}
      style={{ ...sitio, clipPath: `circle(${desplegada ? 150 : 0}% at ${o.x}px ${o.y}px)`, transition: `clip-path calc(${desplegada ? 620 : 380}ms * var(--lento, 1)) var(--curva, cubic-bezier(.16,1,.3,1))` }}>
      {children}
    </section>
  )
}
