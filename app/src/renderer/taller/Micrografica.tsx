// Micrográfica: la actividad de un motor en los últimos 60 s, suavizada. En marcha se pinta en aurora; parada, en gris.
import { useId } from 'react'
import { cn } from '../lib/cn'

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
          {viva ? ['var(--luz)', 'var(--luz-2)', 'var(--luz-3)'].map((c, i) => <stop key={c} offset={i / 2} style={{ stopColor: c }} />)
            : <><stop offset="0" style={{ stopColor: 'var(--texto-3)' }} /><stop offset="1" style={{ stopColor: 'var(--texto-3)' }} /></>}
        </linearGradient>
        <linearGradient id={`${id}a`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" style={{ stopColor: viva ? 'var(--luz)' : 'currentColor' }} stopOpacity={viva ? 0.26 : 0.1} />
          <stop offset="1" style={{ stopColor: viva ? 'var(--luz-2)' : 'currentColor' }} stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${id}f`} x1="0" x2="1"><stop offset="0" stopColor="#fff" stopOpacity="0" /><stop offset=".18" stopColor="#fff" /></linearGradient>
        <mask id={`${id}m`}><rect width={ancho} height={alto} fill={`url(#${id}f)`} /></mask>
      </defs>
      <g mask={`url(#${id}m)`} className="text-texto-3">
        <path d={`${linea}L${ancho} ${alto}L0 ${alto}Z`} fill={`url(#${id}a)`} />
        <path d={linea} fill="none" stroke={`url(#${id}t)`} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      </g>
      {viva && <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r={2.2} style={{ fill: 'var(--luz)' }} className="animate-[respirar_1.6s_ease-in-out_infinite]" />}
    </svg>
  )
}

/** El código de barras del turno: la actividad como píldoras verticales de altura real — viva respira, la actual brilla. */
export function BarrasActividad({ valores, viva, ancho = 132, alto = 30, completo, className }: { valores: number[]; viva: boolean; ancho?: number; alto?: number; completo?: boolean; className?: string }) {
  const barras = valores
  const tope = Math.max(4, ...barras)
  const n = barras.length
  const paso = ancho / n, w = Math.min(6, paso * 0.62)
  const vivaIdx = barras.findLastIndex((v) => v > 0)
  return (
    <svg width={completo ? undefined : ancho} height={alto} viewBox={`0 0 ${ancho} ${alto}`} aria-hidden
      className={cn('shrink-0 overflow-visible', className)} style={completo ? ({ width: '100%', height: alto }) : undefined}
      preserveAspectRatio={completo ? 'none' : undefined}>
      {barras.map((v, i) => {
        const h = v > 0 ? 5 + (v / tope) * (alto - 9) : 4
        const x = i * paso + (paso - w) / 2
        const y = alto - h
        const esViva = viva && i === vivaIdx
        return (
          <rect key={i} x={x} y={y} width={w} height={h} rx={2.4}
            style={{ fill: esViva ? 'var(--luz)' : v > 0 ? 'var(--texto-2)' : 'var(--texto-3)', opacity: v > 0 ? (esViva ? 1 : 0.82) : 0.35 }}
            className={esViva ? 'animate-[respirar_1.6s_ease-in-out_infinite]' : undefined} />
        )
      })}
    </svg>
  )
}
