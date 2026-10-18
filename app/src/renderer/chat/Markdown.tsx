// Markdown de las respuestas con el estilo de Esme. Sin HTML crudo: lo que diga la IA nunca inyecta marcado.
// Y con el Prisma adentro: si la respuesta trae una tabla con números, la tabla pinta su gráfica; si trae un
// bloque json, se vuelve panel con fichas. La interfaz generativa del chat: los datos que piden ser vistos.
import { Copy, Check } from 'lucide-react'
import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useMemo, useState } from 'react'
import { datosVivos, fichasDe, leerPrisma, tablasVivas, type TablaViva } from './prisma'
import { PrismaPanel } from './PrismaVista'

const fmt = (n: number) => new Intl.NumberFormat('es-ES', { notation: Math.abs(n) > 999999 ? 'compact' : 'standard', maximumFractionDigits: 2 }).format(n)

/** Las gráficas del Prisma: una deriva de píldoras por cada serie numérica de la tabla. */
function Grafito({ serie, col, suma }: { serie: number[]; col: string; suma: number }) {
  const tope = Math.max(...serie.map(Math.abs), 1e-9)
  const n = serie.length, ancho = 108, alto = 26
  const paso = ancho / n, w = Math.min(6, paso * 0.6)
  return (
    <div className="flex items-center gap-2.5">
      <svg width={ancho} height={alto} viewBox={`0 0 ${ancho} ${alto}`} aria-hidden className="shrink-0">
        {serie.map((v, i) => {
          const h = Math.max(3, (Math.abs(v) / tope) * (alto - 5))
          return <rect key={i} x={i * paso + (paso - w) / 2} y={alto - h} width={w} height={h} rx={2} style={{ fill: v < 0 ? 'var(--peligro, #e5484d)' : 'var(--luz)' }} opacity={0.85} />
        })}
      </svg>
      <div className="min-w-0 leading-tight">
        <p className="m-0 text-[11px] text-texto-3">{col}</p>
        <p className="m-0 text-[12px] text-texto">{fmt(suma)} {serie.some((v) => v < 0) && <span className="text-texto-3">(incluye negativos)</span>}</p>
      </div>
    </div>
  )
}

function PrismaTabla({ viva, ...p }: { viva?: TablaViva } & Record<string, unknown>) {
  return (
    <div className="my-3">
      <div className="overflow-x-auto"><table className="w-full border-collapse text-sm" {...p} /></div>
      {viva && viva.series.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-3 border border-linea bg-s1/70 px-3.5 py-2.5" aria-label={`La tabla pintada: ${viva.series.map((s) => s.col).join(', ')}`}>
          {viva.series.slice(0, 4).map((s) => <Grafito key={s.col} serie={s.serie} col={s.col} suma={s.suma} />)}
        </div>
      )}
    </div>
  )
}

/** El panel del json: fichas de números con sus píldoras, y la fuente doblada debajo. Nada de proxy crudo. */
function PrismaDatos({ contenido }: { contenido: string }) {
  const vivo = datosVivos(contenido)
  const [copiado, setCopiado] = useState(false)
  if (!vivo) return null
  const fichas = fichasDe(vivo.datos)
  const aMenu = Math.max(...fichas.map(([, v]) => Math.abs(v)), 1e-9)
  const copia = () => { void navigator.clipboard?.writeText(JSON.stringify(vivo.datos, null, 2)).then(() => { setCopiado(true); setTimeout(() => setCopiado(false), 1600) }) }
  return (
    <div className="my-3 rounded-3 border border-linea bg-s1/70 p-3.5">
      <div className="flex items-center justify-between gap-2">
        <p className="m-0 text-[11px] font-medium uppercase tracking-[0.08em] text-texto-3">Datos</p>
        <button type="button" onClick={copia} aria-label="Copiar los datos" className="text-texto-3 transition-colors hover:text-texto">
          {copiado ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        </button>
      </div>
      {fichas.length > 0 && (
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
      <details className="mt-2">
        <summary className="cursor-pointer text-[11px] text-texto-3 hover:text-texto-2">Ver el json crudo</summary>
        <pre className="mt-1 overflow-x-auto rounded-2 border border-linea bg-s1 p-2.5 text-[12px] leading-5">{JSON.stringify(vivo.datos, null, 2)}</pre>
      </details>
    </div>
  )
}

/** Los componentes con el contexto del texto: la tabla se casa con SU serie por línea de nacimiento. */
const componentes = (texto: string): Components => {
  const vivas = new Map(tablasVivas(texto).map((t) => [t.line, t]))
  const c: Components = {
    p: (p) => <p className="my-2 first:mt-0 last:mb-0" {...p} />,
    strong: (p) => <strong className="font-semibold text-texto" {...p} />,
    em: (p) => <em className="italic" {...p} />,
    a: ({ href, ...p }) => <a href={href} target="_blank" rel="noreferrer" className="text-acento underline decoration-acento/40 underline-offset-2 hover:decoration-acento" {...p} />,
    ul: (p) => <ul className="my-2 list-disc space-y-1 pl-5 marker:text-texto-3" {...p} />,
    ol: (p) => <ol className="my-2 list-decimal space-y-1 pl-5 marker:text-texto-3" {...p} />,
    h1: (p) => <h3 className="mt-4 mb-2 font-display text-lg font-semibold tracking-[-0.01em]" {...p} />,
    h2: (p) => <h3 className="mt-4 mb-2 font-display text-base font-semibold" {...p} />,
    h3: (p) => <h4 className="mt-3 mb-1.5 text-[15px] font-semibold" {...p} />,
    blockquote: (p) => <blockquote className="my-2 border-l-2 border-linea-fuerte pl-3 text-texto-2" {...p} />,
    code: ({ className, children, ...p }) => /language-/.test(className ?? '')
      ? <code className={`${className} font-mono text-[13px]`} {...p}>{children}</code>
      : <code className="rounded-1 bg-s2 px-1.5 py-0.5 font-mono text-[13px] text-texto" {...p}>{children}</code>,
    pre: ({ children, ...p }) => {
      // El spec manda, no la etiqueta: ```prisma``` o json cercado con forma de prisma → panel.
      // Un fence prisma podrido queda crudo (el motor dijo prisma, se le enseña el código); un json vivo sin spec → tarjeta de datos.
      const codigo = String((children as { props?: { children?: unknown } })?.props?.children ?? '')
      const lenguaje = (children as { props?: { className?: string } })?.props?.className ?? ''
      const esPrisma = /language-prisma/.test(lenguaje)
      const spec = leerPrisma(codigo)
      if (spec) return <PrismaPanel spec={spec} />
      if (esPrisma) return <pre className="my-3 overflow-x-auto rounded-3 border border-linea bg-s1 p-3.5 leading-6" {...p}>{children}</pre>
      if (datosVivos(codigo)) return <PrismaDatos contenido={codigo} />
      return <pre className="my-3 overflow-x-auto rounded-3 border border-linea bg-s1 p-3.5 leading-6" {...p}>{children}</pre>
    },
    table: ({ node, ...p }) => <PrismaTabla viva={vivas.get(node?.position?.start?.line ?? -1)} {...p} />,
    th: (p) => <th className="border-b border-linea-fuerte px-2 py-1.5 text-left font-semibold" {...p} />,
    td: (p) => <td className="border-b border-linea px-2 py-1.5" {...p} />,
    hr: () => <hr className="my-4 border-linea" />,
  }
  return c
}

export function Markdown({ texto }: { texto: string }) {
  const c = useMemo(() => componentes(texto), [texto])
  return <ReactMarkdown remarkPlugins={[remarkGfm]} components={c} skipHtml>{texto}</ReactMarkdown>
}
