// Micrográfica: la actividad de un motor en los últimos 60 s, suavizada. En marcha se pinta en aurora; parada, en gris.
import { useId } from 'react'

/** Catmull-Rom a Bézier: una curva que pasa por todos los puntos sin picos falsos. */
function curva(p: [number, number][]): string {
  if (p.length < 2) return ''
  let d = `M${p[0][0]} ${p[0][1]}`
  for (let i = 0; i < p.length - 1; i++) {
    const a = p[i - 1] ?? p[i], b = p[i], c = p[i + 1], e = p[i + 2] ?? c
    const c1 = [b[0] + (c[0] - a[0]) / 6, b[1] + (c[1] - a[1]) / 6], c2 = [c[0] - (e[0] - b[0]) / 6, c[1] - (e[1] - b[1]) / 6]
    d += `C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${c[0].toFixed(1)} ${c[1].toFixed(1)}`
  }
  return d
}

export function Micrografica({ valores, viva, ancho = 132, alto = 30 }: { valores: number[]; viva: boolean; ancho?: number; alto?: number }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '')
  const tope = Math.max(4, ...valores)
  const pts = valores.map((v, i): [number, number] => [(i / (valores.length - 1)) * ancho, alto - 2 - (v / tope) * (alto - 5)])
  const linea = curva(pts)
  return (
    <svg width={ancho} height={alto} viewBox={`0 0 ${ancho} ${alto}`} aria-hidden className="shrink-0 overflow-visible">
      <defs>
        <linearGradient id={`${id}t`} x1="0" x2="1">
          {viva ? ['#ff7ac6', '#8b6cff', '#45d9ff', '#8dffb0'].map((c, i) => <stop key={c} offset={i / 3} stopColor={c} />)
            : <><stop offset="0" style={{ stopColor: 'var(--texto-3)' }} /><stop offset="1" style={{ stopColor: 'var(--texto-3)' }} /></>}
        </linearGradient>
        <linearGradient id={`${id}a`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={viva ? '#8b6cff' : 'currentColor'} stopOpacity={viva ? 0.28 : 0.1} />
          <stop offset="1" stopColor={viva ? '#45d9ff' : 'currentColor'} stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${id}f`} x1="0" x2="1"><stop offset="0" stopColor="#fff" stopOpacity="0" /><stop offset=".18" stopColor="#fff" /></linearGradient>
        <mask id={`${id}m`}><rect width={ancho} height={alto} fill={`url(#${id}f)`} /></mask>
      </defs>
      <g mask={`url(#${id}m)`} className="text-texto-3">
        <path d={`${linea}L${ancho} ${alto}L0 ${alto}Z`} fill={`url(#${id}a)`} />
        <path d={linea} fill="none" stroke={`url(#${id}t)`} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      </g>
      {viva && <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r={2.2} fill="#8dffb0" className="animate-[respirar_1.6s_ease-in-out_infinite]" />}
    </svg>
  )
}
