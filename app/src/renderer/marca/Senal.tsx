// Esme viva: el símbolo «Señal». En reposo está quieto; al pensar, un impulso de luz recorre la línea más cercana;
// al recordar, la cresta se eleva. Las líneas son blanco y negro (--senal-fondo, --senal-frente); el impulso es aurora.
import { luzViva } from '../tinta/luz'
import { useEffect, useId, useState } from 'react'
import { impulso, lineasSenal } from './senal'

export type EstadoSenal = 'reposo' | 'pensando' | 'recordando'

const reducido = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

export function Senal({ tam = 24, estado = 'reposo', titulo = 'Esme', className }: {
  tam?: number; estado?: EstadoSenal; /** @deprecated ya no hace falta: la oclusión es por máscara */ tapa?: string; titulo?: string; className?: string
}) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '')
  const [t, setT] = useState(0)
  useEffect(() => {
    if (estado === 'reposo' || reducido()) { setT(0); return }
    let raf = 0; const t0 = performance.now()
    const paso = (ms: number) => { setT((ms - t0) / 1000); raf = requestAnimationFrame(paso) }
    raf = requestAnimationFrame(paso)
    return () => cancelAnimationFrame(raf)
  }, [estado])

  const mini = tam < 28
  const lineas = mini ? 3 : 5
  const alto = estado === 'recordando' ? 33 + 3 * Math.sin(t * 4) : 30
  const ls = lineasSenal({ lineas, t: estado === 'reposo' ? 0 : t * 1.1, alto, ancho: mini ? [4.2, 6.4] : [1, 2.8], muestras: mini ? 48 : 96 })
  const imp = estado === 'pensando' ? impulso((((t / 1.5) % 1.3) / 1.3) * 1.15 - 0.05, t * 1.1, alto, lineas) : null
  const aurora = luzViva(t)

  return (
    <svg viewBox="6 8 88 86" width={tam} height={tam} role="img" aria-label={titulo} className={className}>
      <defs>
        {ls.map((l, k) => (
          <linearGradient key={k} id={`${id}l${k}`} gradientUnits="userSpaceOnUse" x1={l.x0} x2={l.x1} y1={0} y2={0}>
            {[0, 0.18, 0.82, 1].map((o) => (
              <stop key={o} offset={o} style={{ stopColor: `color-mix(in oklab, var(--senal-frente) ${Math.round(l.f * 100)}%, var(--senal-fondo))`, stopOpacity: !mini && (o === 0 || o === 1) ? 0 : 1 }} />
            ))}
          </linearGradient>
        ))}
        <filter id={`${id}b`} x="-200%" y="-200%" width="500%" height="500%"><feGaussianBlur stdDeviation="2.2" /></filter>
        {/* oclusión sin pintar: cada línea queda tapada por la zona bajo las líneas de delante (fondo transparente, vale sobre cristal o shader) */}
        {ls.map((_, k) => (
          <mask key={k} id={`${id}m${k}`} maskUnits="userSpaceOnUse" x={-20} y={-20} width={140} height={140}>
            <rect x={-20} y={-20} width={140} height={140} fill="#fff" />
            {ls.slice(k + 1).map((d, j) => <path key={j} d={`${d.d} L${d.x1} ${d.base + 8} L${d.x0} ${d.base + 8} Z`} fill="#000" stroke="#000" strokeWidth={d.grosor * 0.6} strokeLinejoin="round" />)}
          </mask>
        ))}
      </defs>
      {ls.map((l, k) => (
        <path key={k} d={l.d} fill="none" stroke={`url(#${id}l${k})`} strokeWidth={l.grosor} strokeLinecap="round" strokeLinejoin="round" mask={k < ls.length - 1 ? `url(#${id}m${k})` : undefined} />
      ))}
      {imp && imp.luz > 0 && (
        <>
          <circle cx={imp.x} cy={imp.y} r={mini ? 7 : 3.4} style={{ fill: aurora }} filter={`url(#${id}b)`} opacity={0.95 * imp.luz} />
          <circle cx={imp.x} cy={imp.y} r={mini ? 3.2 : 1.5} fill="#fff" opacity={imp.luz} />
        </>
      )}
    </svg>
  )
}
