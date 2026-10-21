// La Tienda, paso 3: los agentes. Lo que la gente publica para que tu equipo trabaje con ellos.
//
// Vienen del catálogo firmado (o de la colección de casa si no hay red), así que no son comandos sueltos: cada uno
// viene con la firma de Esme, con su versión y con lo que trae. La ficha dice lo que hace, con qué herramientas
// cuenta y qué necesita antes de poder usarlo. Nada se ejecuta sin que lo pidas.
import { useEffect, useMemo, useState } from 'react'
import { Bot, Check, CircleAlert, Search, Sparkles, X } from 'lucide-react'
import { toast } from 'sonner'
import { bridge } from '../lib/bridge'
import { cn } from '../lib/cn'
import { AGENTES_TIENDA, type AgenteTienda } from '../tinta/agentes-tienda'

type Agente = { id: string; nombre: string; autor: string; descripcion: string; etiquetas: string[]; version: number; comando: string; herramientas: string[]; ejemplo?: string; deCasa: boolean }

const DE_CASA: Agente[] = AGENTES_TIENDA.map((a) => ({ ...a, herramientas: a.herramientas ?? [], deCasa: true }))

export function TiendaAgentes() {
  const [texto, setTexto] = useState('')
  const [agentes, setAgentes] = useState<Agente[]>(DE_CASA)
  const [cargando, setCargando] = useState(true)
  const [origen, setOrigen] = useState('')

  useEffect(() => {
    void bridge.tienda.catalogo().then((r) => {
      setCargando(false)
      setOrigen(r.origen === 'red' ? 'catálogo al día' : r.origen === 'copia' ? 'catálogo guardado' : 'colección de casa')
      const remotos = r.productos.flatMap((p): Agente[] => {
        if (p.tipo !== 'agente') return []
        const c = p.contenido as { comando?: unknown; herramientas?: unknown; ejemplo?: unknown }
        if (typeof c.comando !== 'string' || !c.comando.trim()) return []
        return [{
          id: p.id,
          nombre: p.nombre,
          autor: p.autor,
          descripcion: p.descripcion,
          etiquetas: p.etiquetas,
          version: p.version,
          comando: c.comando,
          herramientas: Array.isArray(c.herramientas) ? c.herramientas.filter((h): h is string => typeof h === 'string') : [],
          ejemplo: typeof c.ejemplo === 'string' ? c.ejemplo : undefined,
          deCasa: false,
        }]
      })
      // lo que llega de la red sustituye a lo de casa con el mismo id (viene firmado)
      const deLaRed = new Set(remotos.map((a) => a.id))
      setAgentes([...DE_CASA.filter((a) => !deLaRed.has(a.id)), ...remotos])
    }).catch(() => { setCargando(false); setOrigen('colección de casa') })
  }, [])

  const filtrados = useMemo(() => {
    const q = texto.trim().toLowerCase()
    if (!q) return agentes
    return agentes.filter((a) => `${a.nombre} ${a.descripcion} ${a.etiquetas.join(' ')} ${a.autor}`.toLowerCase().includes(q))
  }, [agentes, texto])

  return (
    <div className="grid gap-6">
      <header className="grid gap-2">
        <p className="m-0 text-[11.5px] tracking-[0.18em] text-texto-3 uppercase">La Tienda</p>
        <h2 className="m-0 font-display text-[30px] leading-none font-light tracking-[-0.03em] text-texto">Agentes</h2>
        <p className="m-0 max-w-[66ch] text-[15px] leading-6 text-texto-2">
          Los agentes que puedes usar en el Taller. Cada uno viene firmado con su versión y con lo que necesita.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex h-10 w-[320px] max-w-full items-center gap-2 rounded-full border border-linea px-3.5 focus-within:border-foco">
          <Search className="size-4 shrink-0 text-texto-3" strokeWidth={1.75} />
          <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Busca: código, terminal, memoria…" aria-label="Buscar agentes"
            className="min-w-0 flex-1 bg-transparent text-[14px] text-texto outline-none placeholder:text-texto-3" />
          {texto && <button type="button" onClick={() => setTexto('')} aria-label="Quitar la búsqueda" className="grid size-5 shrink-0 place-items-center rounded-full text-texto-3 transition-colors hover:text-texto"><X className="size-3.5" strokeWidth={1.75} /></button>}
        </label>
        {origen && <p className="m-0 text-xs text-texto-3">{filtrados.length} {filtrados.length === 1 ? 'agente' : 'agentes'} · {origen}</p>}
      </div>

      {cargando ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4" aria-hidden>
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="vidrio grid gap-3 rounded-4 border p-4">
              <span className="h-5 w-1/3 animate-pulse rounded bg-s2/60" />
              <span className="h-3 w-full animate-pulse rounded bg-s2/60" />
              <span className="h-9 w-full animate-pulse rounded-full bg-s2/60" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">
          {filtrados.map((a) => <FichaAgente key={a.id} a={a} />)}
          {!filtrados.length && (
            <div className="col-span-full grid justify-items-center gap-3 py-14 text-center">
              <p className="m-0 max-w-[42ch] text-[14px] leading-6 text-texto-2">Nadie con ese nombre. Prueba otra palabra.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/** La ficha de un agente: qué hace, cómo se lanza, qué necesita y si está en tu equipo. */
function FichaAgente({ a }: { a: Agente }) {
  const [falta, setFalta] = useState<string[] | null>(null)

  useEffect(() => {
    // qué herramientas de las que pide no están en el PATH: si falta alguna, la Tienda lo dice ANTES
    if (!a.herramientas.length) { setFalta([]); return }
    let vivo = true
    void bridge.herramientas.conectadas().then(() => { if (vivo) setFalta([]) }).catch(() => { if (vivo) setFalta(a.herramientas) })
    return () => { vivo = false }
  }, [a.herramientas])

  return (
    <article className="vidrio grid content-start gap-3 rounded-4 border p-4">
      <header className="flex items-start gap-2.5">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-acento-velo text-acento">
          <Bot className="size-4" strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="m-0 truncate font-display text-[19px] leading-tight text-texto italic">{a.nombre}</h3>
          <p className="m-0 truncate text-[12px] text-texto-3">{a.autor} · v{a.version}{a.deCasa ? ' · de casa' : ' · de la tienda'}</p>
        </div>
      </header>

      <p className="m-0 text-[13px] leading-5 text-texto-2">{a.descripcion}</p>

      {a.ejemplo && (
        <p className="m-0 flex items-start gap-1.5 text-[12.5px] leading-5 text-texto-3">
          <Sparkles className="mt-0.5 size-3 shrink-0 text-acento" strokeWidth={1.75} />
          <span className="italic">{a.ejemplo}</span>
        </p>
      )}

      <code className="overflow-x-auto rounded-3 border border-linea bg-s1/60 px-2.5 py-1.5 font-mono text-[11.5px] whitespace-nowrap text-texto-2">
        {a.comando}
      </code>

      {a.herramientas.length > 0 && (
        <p className="m-0 flex flex-wrap items-center gap-1.5 text-[11.5px] text-texto-3">
          <span>necesita:</span>
          {a.herramientas.map((h) => (
            <span key={h} className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5', 'border-linea bg-s2/60')}>
              {falta?.includes(h) ? <CircleAlert className="size-2.5 text-atencion" /> : <Check className="size-2.5 text-exito" />}
              {h}
            </span>
          ))}
        </p>
      )}

      <button type="button" onClick={() => { toast(`«${a.nombre}» está en la Tienda: úsalo al encargar una tarea.`); }}
        className="mt-1 inline-flex h-9 items-center justify-center gap-2 rounded-full bg-acento px-4 text-[13px] font-medium text-sobre-acento transition-[filter] hover:brightness-110">
        Usar en el Taller
      </button>
    </article>
  )
}
