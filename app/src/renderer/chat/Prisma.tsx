// El Prisma que el motor puede pedir: un bloque ```prisma``` con su spec y la casa lo dibuja — línea con área,
// barras o fichas. Los datos que el agente trae, pintados con la tinta de Esme. La interfaz generativa de verdad.
import { ChevronDown, ChevronUp, Sigma, Waypoints } from 'lucide-react'
import { caminoLinea, type SpecBarras, type SpecLinea, type SpecPrisma } from './prisma'

const fmt = (n: number) => new Intl.NumberFormat('es-ES', { notation: Math.abs(n) > 999999 ? 'compact' : 'standard', maximumFractionDigits: 2 }).format(n)

const Ficha = ({ icono: Icono, texto }: { icono: typeof Sigma; texto: string }) => (
  <span className="inline-flex items-center gap-1 rounded-full bg-s2 px-2 py-0.5 text-[11px] tabular-nums text-texto-2" title={texto}><Icono className="size-3" strokeWidth={1.5} />{texto}</span>
)

function SerieLinea({ s }: { s: SpecLinea }) {
  const ancho = 260, alto = 86, pad = 8
  const { linea, area, puntos, yCero } = caminoLinea(s.valores, ancho, alto, pad)
  const n = s.valores.length
  const cada = Math.ceil(n / 6)   // como mucho 6 etiquetas, sparciadas
  return (
    <svg width="100%" height={alto} viewBox={`0 0 ${ancho} ${alto}`} aria-label={s.titulo ?? 'La línea del motor'} className="overflow-visible">
      <defs>
        <linearGradient id="prisma-area" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" style={{ stopColor: 'var(--luz)' }} stopOpacity="0.3" />
          <stop offset="1" style={{ stopColor: 'var(--luz)' }} stopOpacity="0.03" />
        </linearGradient>
      </defs>
      {yCero !== undefined && <line x1={pad} x2={ancho - pad} y1={yCero} y2={yCero} stroke="var(--linea)" strokeDasharray="3 3" strokeWidth={0.8} />}
      <path d={area} fill="url(#prisma-area)" />
      <path d={linea} fill="none" stroke="var(--luz)" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      {puntos.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={i === puntos.length - 1 ? 2.6 : 2} style={{ fill: 'var(--luz)' }} opacity={i === puntos.length - 1 ? 1 : 0.75} />)}
      {s.etiquetas?.map((e, i) => (i % cada === 0 || i === n - 1) && (
        <text key={i} x={puntos[i][0]} y={alto - 1} fontSize="8.5" textAnchor="middle" style={{ fill: 'var(--texto-3)' }}>{e.length > 9 ? `${e.slice(0, 8)}…` : e}</text>
      ))}
    </svg>
  )
}

function SerieBarras({ s }: { s: SpecBarras }) {
  const ancho = 260, alto = 86, pad = 8
  const todos = s.series.flatMap((x) => x.valores)
  const tope = Math.max(...todos.map(Math.abs), 1e-9)
  const pos = Math.max(...todos), neg = Math.min(...todos)
  const cruza = neg < 0 && pos > 0
  const rango = cruza ? pos - neg : 1
  const arribaH = cruza ? (alto - 2 * pad) * (pos / rango) : alto - 2 * pad
  const base = cruza ? pad + arribaH : alto - pad
  const grupos = Math.max(...s.series.map((x) => x.valores.length))
  const paso = (ancho - 2 * pad) / grupos
  const wTotal = Math.min(18, paso * 0.7), w = wTotal / s.series.length
  const yDe = (v: number) => (v >= 0 ? base - (v / tope) * arribaH : base + (Math.abs(v) / tope) * (alto - pad - base))
  return (
    <svg width="100%" height={alto} viewBox={`0 0 ${ancho} ${alto}`} aria-label={s.titulo ?? 'Las barras del motor'} className="overflow-visible">
      {s.series.map((x, si) => x.valores.map((v, gi) => {
        const h = Math.max(2.5, Math.abs(v) / tope * (v >= 0 ? arribaH : alto - pad - base))
        const x0 = pad + gi * paso + (paso - wTotal) / 2 + si * w
        return <rect key={`${si}:${gi}`} x={x0} y={v >= 0 ? base - h : base} width={w} height={h} rx={1.8} style={{ fill: si === 0 ? 'var(--luz)' : 'var(--texto-3)' }} opacity={si === 0 ? 0.88 : 0.6} />
      }))}
      {/* las orillas de los grupos: a lo sumo 6, mono, chiquitas */}
      {s.etiquetas?.slice(0, grupos).map((e, gi) => (gi % Math.ceil(grupos / 6) === 0 || gi === grupos - 1) && (
        <text key={gi} x={pad + gi * paso + paso / 2} y={alto - 1} fontSize="8.5" textAnchor="middle" style={{ fill: 'var(--texto-3)' }}>{e.length > 9 ? `${e.slice(0, 8)}…` : e}</text>
      ))}
    </svg>
  )
}

export function PrismaPanel({ spec }: { spec: SpecPrisma }) {
  const fichas: Array<[string, number]> = spec.tipo === 'fichas' ? Object.entries(spec.fichas) : []
  const aMenu = Math.max(...fichas.map(([, v]) => Math.abs(v)), 1e-9)
  return (
    <div className="my-3 rounded-3 border border-linea bg-s1/70 p-3.5 prisma">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <p className="m-0 text-[12.5px] font-medium text-texto">{spec.titulo}</p>
          {spec.unidades && <p className="m-0 text-[11px] text-texto-3">{spec.unidades}</p>}
        </div>
        <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.08em] text-texto-3" title="Lo dibujó el motor con un bloque «prisma»"><Waypoints className="size-3" strokeWidth={1.5} />prisma</span>
      </div>
      {spec.tipo === 'linea' && (
        <>
          <div className="mt-2"><SerieLinea s={spec} /></div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1">
            <Ficha icono={Sigma} texto={`${fmt(spec.valores.reduce((a, b) => a + b, 0))} en total`} />
            <Ficha icono={ChevronUp} texto={fmt(Math.max(...spec.valores))} />
            <Ficha icono={ChevronDown} texto={fmt(Math.min(...spec.valores))} />
          </div>
        </>
      )}
      {spec.tipo === 'barras' && (
        <>
          <div className="mt-2"><SerieBarras s={spec} /></div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1">
            {spec.series.map((x) => <Ficha key={x.nombre} icono={Sigma} texto={`${x.nombre}: ${fmt(x.valores.reduce((a, b) => a + b, 0))}`} />)}
          </div>
        </>
      )}
      {spec.tipo === 'fichas' && (
        <div className="mt-2.5 grid grid-cols-2 gap-x-5 gap-y-2 sm:grid-cols-3">
          {fichas.slice(0, 9).map(([k, v]) => (
            <div key={k} className="min-w-0">
              <p className="m-0 truncate font-mono text-[11px] text-texto-3">{k}</p>
              <p className="m-0 text-[13px] tabular-nums text-texto">{fmt(v)}</p>
              <div className="mt-1 h-[3px] rounded-1 bg-s2"><div className="h-full rounded-1" style={{ width: `${Math.max(4, (Math.abs(v) / aMenu) * 100)}%`, background: 'var(--luz)', opacity: 0.85 }} /></div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
