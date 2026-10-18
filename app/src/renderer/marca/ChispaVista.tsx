// La chispa esmeralda: Esme viva y, a la vez, tu mente (marca/chispa.ts). Cada esquirla es uno de tus temas; el núcleo es Esme.
// En reposo está quieta (no gasta nada). Pensando, las esquirlas giran despacio (solo CSS). Recordando, se encienden las
// esquirlas de los temas que está usando. Cada esquirla se puede señalar y pulsar: es la puerta a ese tema.
import { useContext, useId, useMemo } from 'react'
import { cn } from '../lib/cn'
import { chispaDe, type P } from './chispa'
import { FirmaMente } from './SelloVista'

export type EstadoChispa = 'reposo' | 'pensando' | 'recordando'
const d = (pts: P[]) => `M${pts.map((p) => `${p[0]} ${p[1]}`).join('L')}Z`

export function Chispa({ tam = 280, estado = 'reposo', encendidas, onTema, titulo = 'Esme', className }: {
  tam?: number; estado?: EstadoChispa; encendidas?: ReadonlySet<number>; onTema?(id: number): void; titulo?: string; className?: string
}) {
  const firma = useContext(FirmaMente)
  const id = useId().replace(/[^a-zA-Z0-9]/g, '')
  const { esquirlas, astillas, nucleo } = useMemo(() => chispaDe(firma.map((t, i) => ({ id: t.id ?? i, x: t.x, y: t.y, size: t.size }))), [firma])
  const mini = tam < 40
  const viva = estado !== 'reposo'
  return (
    <svg viewBox="-1.12 -1.12 2.24 2.24" width={tam} height={tam} role="img" aria-label={titulo} className={cn('chispa shrink-0 overflow-visible', className)} data-estado={estado}>
      <defs>
        <radialGradient id={`${id}n`}>
          <stop offset="0" stopColor="#fff" /><stop offset="0.38" style={{ stopColor: 'var(--esmeralda-1)' }} />
          <stop offset="0.75" style={{ stopColor: 'var(--esmeralda)' }} stopOpacity="0.55" /><stop offset="1" style={{ stopColor: 'var(--esmeralda)' }} stopOpacity="0" />
        </radialGradient>
        <filter id={`${id}g`} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="0.035" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        <radialGradient id={`${id}h`}>
          <stop offset="0" style={{ stopColor: 'var(--esmeralda)' }} stopOpacity="0.28" /><stop offset="0.55" style={{ stopColor: 'var(--esmeralda)' }} stopOpacity="0.08" />
          <stop offset="1" style={{ stopColor: 'var(--esmeralda)' }} stopOpacity="0" />
        </radialGradient>
      </defs>
      {!mini && <circle r={1.08} fill={`url(#${id}h)`} className="chispa-halo" />}
      <g className="chispa-esquirlas">
        {esquirlas.map((e, i) => {
          const encendida = e.tema !== null && !!encendidas?.has(e.tema)
          const nombre = e.tema !== null ? firma.find((t) => t.id === e.tema)?.label : undefined
          const accion = onTema && e.tema !== null ? { role: 'button', tabIndex: 0, 'aria-label': nombre ? `Tema: ${nombre}` : 'Tema', onClick: () => onTema(e.tema!), onKeyDown: (k: React.KeyboardEvent) => { if (k.key === 'Enter' || k.key === ' ') { k.preventDefault(); onTema(e.tema!) } } } : {}
          return (
            <g key={e.tema ?? i} className="chispa-esquirla" data-encendida={encendida} filter={encendida ? `url(#${id}g)` : undefined} {...accion}>
              {nombre && <title>{nombre}</title>}
              <path d={d(e.clara)} className="chispa-clara" />
              <path d={d(e.oscura)} className="chispa-oscura" />
              {!mini && <path d={d([e.base, ...e.clara.slice(1), ...e.oscura.slice(2)])} className="chispa-filo" />}
            </g>
          )
        })}
        {!mini && astillas.map((a, i) => <path key={i} d={d(a)} className="chispa-astilla" />)}
      </g>
      <circle r={nucleo * 1.55} fill={`url(#${id}n)`} className={cn('chispa-nucleo', viva && 'chispa-late')} />
      <circle r={nucleo * 0.42} fill="#fff" opacity={0.95} />
    </svg>
  )
}
