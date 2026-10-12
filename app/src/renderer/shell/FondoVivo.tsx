// El fondo vivo: una malla de gradiente con grano que respira despacio detrás de todo el cristal.
// Casi negro (o papel) con velos de aurora; se acelera cuando Esme piensa o recuerda. Se para sin foco o si pides menos movimiento.
import { MeshGradient } from '@paper-design/shaders-react'
import { useEffect, useState } from 'react'
import type { EstadoSenal } from '../marca/Senal'

const PALETA = {
  noche: ['#06070a', '#0b0e16', '#191338', '#0a2630', '#2a0f2c', '#07080b'],
  dia: ['#f6f6f4', '#edf0f7', '#ebe4f8', '#e1f3f2', '#f7e6ef', '#f6f6f4'],
}
const VELOCIDAD: Record<EstadoSenal, number> = { reposo: 0.08, pensando: 0.32, recordando: 0.6 }

export function FondoVivo({ tema, estado }: { tema: 'noche' | 'dia'; estado: EstadoSenal }) {
  const [activo, setActivo] = useState(() => (typeof document === 'undefined' ? true : document.hasFocus() && !document.hidden))
  const [quieto] = useState(() => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    const ver = () => setActivo(document.hasFocus() && !document.hidden)
    addEventListener('focus', ver); addEventListener('blur', ver); document.addEventListener('visibilitychange', ver)
    return () => { removeEventListener('focus', ver); removeEventListener('blur', ver); document.removeEventListener('visibilitychange', ver) }
  }, [])
  const velocidad = quieto || !activo ? 0 : VELOCIDAD[estado]
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 transition-opacity duration-1000"
      style={{ opacity: tema === 'noche' ? (estado === 'reposo' ? 0.9 : 1) : estado === 'reposo' ? 0.75 : 0.95 }}>
      <MeshGradient className="size-full" colors={PALETA[tema]} distortion={0.85} swirl={0.18} grainMixer={0.02} grainOverlay={tema === 'noche' ? 0.07 : 0.05}
        speed={velocidad} maxPixelCount={1_100_000} minPixelRatio={1} />
    </div>
  )
}

/** Un solo oyente para todos los halos: escribe la posición del cursor en la tarjeta de cristal que tiene debajo. */
export function useHalos() {
  useEffect(() => {
    const mover = (e: PointerEvent) => {
      const el = (e.target as Element | null)?.closest?.('.halo') as HTMLElement | null
      if (!el) return
      const r = el.getBoundingClientRect()
      el.style.setProperty('--mx', `${e.clientX - r.left}px`); el.style.setProperty('--my', `${e.clientY - r.top}px`)
    }
    addEventListener('pointermove', mover, { passive: true })
    return () => removeEventListener('pointermove', mover)
  }, [])
}
