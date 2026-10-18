// Vidrio líquido para lo que flota encima (la capa de navegación: barra, compositor, navegación), nunca para el contenido
// que se lee. Refracta lo que tiene detrás (GlassSurface de React Bits: mapa de desplazamiento con aberración cromática en
// el borde) y deja el contenido encima, nítido. Con «reducir transparencia» (sistema o piel) no se dibuja: queda el fondo
// de siempre. Como mucho dos capas de vidrio: nunca vidrio dentro de vidrio dentro de vidrio.
import { useEffect, useState, type ReactNode } from 'react'
import { cn } from '../lib/cn'
import GlassSurface from '../ui/efectos/GlassSurface'

const reducida = () => (typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-transparency: reduce)').matches) || document.documentElement.dataset.transparencia === 'reducida'

export function Vidrio({ children, className, radio = 24, fuerza = 1 }: { children: ReactNode; className?: string; radio?: number; fuerza?: number }) {
  const [sin, setSin] = useState(reducida)
  useEffect(() => { const o = new MutationObserver(() => setSin(reducida())); o.observe(document.documentElement, { attributes: true, attributeFilter: ['data-transparencia'] }); return () => o.disconnect() }, [])
  return (
    <div className={cn('relative isolate', className)} style={{ borderRadius: radio }}>
      {!sin && (
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" style={{ borderRadius: radio }}>
          <GlassSurface width="100%" height="100%" borderRadius={radio} brightness={52} opacity={0.9} blur={10} displace={0.6 * fuerza}
            backgroundOpacity={0.14} saturation={1.7} distortionScale={-170 * fuerza} redOffset={0} greenOffset={8 * fuerza} blueOffset={16 * fuerza} />
        </div>
      )}
      {children}
    </div>
  )
}
