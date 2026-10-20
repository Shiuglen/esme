// El papel de Esme («Tinta y Luz», ver docs/superpowers/specs/2026-10-12-tinta-y-luz.md).
// De día: papel de algodón con fibras y relieve, iluminado con el ángulo del sol de tu hora local.
// De noche: papel de tinta; mientras la mente piensa o recuerda, se enciende una luz bioluminiscente, como plancton.
// Sin foco, sin pestaña visible o con «menos movimiento», todo queda quieto (y la GPU descansa).
import { NeuroNoise, PaperTexture } from '@paper-design/shaders-react'
import { useEffect, useState } from 'react'
import type { EstadoSenal } from '../marca/SenalVista'
import { anguloSol } from '../tinta/sol'

const LUZ: Record<EstadoSenal, { brillo: number; velocidad: number; opacidad: number }> = {
  reposo: { brillo: 0, velocidad: 0, opacidad: 0 },
  pensando: { brillo: 0.035, velocidad: 0.22, opacidad: 0.9 },
  recordando: { brillo: 0.07, velocidad: 0.45, opacidad: 1 },
}

/** El fondo obedece a la piel: «liso» no pinta nada (el color de fondo y cero GPU), «aurora» es un resplandor quieto de CSS
 *  y «papel» es el papel con fibras y tu sol, ahora en los colores de la piel. De noche, al pensar, se enciende la luz. */
export function FondoVivo({ tema, estado, fondo = 'aurora', clave = '' }: { tema: 'noche' | 'dia'; estado: EstadoSenal; fondo?: 'liso' | 'aurora' | 'papel'; clave?: string }) {
  const [activo, setActivo] = useState(() => (typeof document === 'undefined' ? true : document.hasFocus() && !document.hidden))
  const [quieto] = useState(() => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [sol, setSol] = useState(() => anguloSol(new Date()))
  // los colores reales de la piel (se leen un fotograma después de vestirla)
  // los colores reales de la piel, leídos de una vez: antes se inventaban y el fondo parpadeaba con el color equivocado
  const leer = () => { const css = getComputedStyle(document.documentElement), v = (k: string) => css.getPropertyValue(k).trim(); return { fondo: v('--fondo'), hoja: v('--superficie-1'), sombra: v('--linea'), luz: v('--luz') } }
  const [c, setC] = useState(leer)
  useEffect(() => {
    const id = requestAnimationFrame(() => setC(leer()))
    return () => cancelAnimationFrame(id)
  }, [tema, clave])
  useEffect(() => {
    const ver = () => setActivo(document.hasFocus() && !document.hidden)
    addEventListener('focus', ver); addEventListener('blur', ver); document.addEventListener('visibilitychange', ver)
    const k = setInterval(() => setSol(anguloSol(new Date())), 5 * 60_000)
    return () => { removeEventListener('focus', ver); removeEventListener('blur', ver); document.removeEventListener('visibilitychange', ver); clearInterval(k) }
  }, [])
  const luz = LUZ[estado]
  const mueve = !quieto && activo

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0" style={{ background: 'var(--fondo)' }}>
      {fondo === 'aurora' && <div className="fondo-aurora absolute inset-0" />}
      {fondo === 'papel' && (
        <PaperTexture className="absolute inset-0 size-full" fit="cover" scale={1} speed={0} angle={sol} seed={7}
          colorBack={c.fondo} colorPaper={c.hoja} colorShadow={c.sombra} blending={1} distortion={tema === 'dia' ? 0.15 : 0.1}
          roughness={tema === 'dia' ? 0.32 : 0.28} roughnessSize={0.45} fiber={tema === 'dia' ? 0.55 : 0.45} fiberSize={0.45} folds={0.08} foldSizeX={1} foldSizeY={1}
          wrinkles={0.14} wrinkleSize={0.7} crumples={0} crumpleCount={6} drops={0} />
      )}
      {tema === 'noche' && fondo !== 'liso' && (
        <div className="absolute inset-0 mix-blend-screen transition-opacity duration-[1600ms]" style={{ opacity: luz.opacidad }}>
          {luz.opacidad > 0 && (
            <NeuroNoise className="size-full" scale={0.75} speed={mueve ? luz.velocidad : 0}
              colorBack="#000000" colorMid={c.hoja} colorFront={c.luz} brightness={luz.brillo} contrast={0.32} />
          )}
        </div>
      )}
    </div>
  )
}

/** Un solo oyente para todos los halos: escribe la posición del cursor en la hoja que tiene debajo. */
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
