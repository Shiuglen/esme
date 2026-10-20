// La Tienda, paso 2 (docs/superpowers/specs/2026-10-18-manos.md): herramientas MCP del registro oficial. Buscas,
// conectas (tus claves van al llavero), Esme la prueba de verdad y desde ese momento la usan la conversación y el
// Taller, siempre con permiso. Arriba, lo que ya tienes conectado; abajo, cómo busca Esme en internet.
import { Cloud, Globe, Hammer, Laptop, Palette, Plug, Search, Trash2 } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { bridge, type ConectadaVista, type Deseo, type Ficha } from '../lib/bridge'
import { pielDeColores } from '../tinta/deriva'
import type { Piel } from '../tinta/piel'
import type { Pieles } from './Apariencia'
import { cn } from '../lib/cn'

export function TiendaHerramientas({ pieles }: { pieles?: Pieles } = {}) {
  const [q, setQ] = useState('')
  const [fichas, setFichas] = useState<Ficha[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [conectadas, setConectadas] = useState<ConectadaVista[]>([])
  const [deseos, setDeseos] = useState<Deseo[]>([])
  const [notaDeseos, setNotaDeseos] = useState<string | null>(null)
  // la piel hecha con una referencia: se prueba en vivo y, si te gusta, te la quedas
  const [vestida, setVestida] = useState<{ deseo: Deseo; piel: Piel; acento: string; fondo: string } | null>(null)
  const [derivando, setDerivando] = useState<string | null>(null)

  /** De una web guardada, una piel: se leen sus colores y se hacen los de Esme. */
  const vestirReferencia = async (d: Deseo) => {
    setDerivando(d.destino)
    const r = await bridge.tienda.colores(d.destino)
    if (!r.ok) { setNotaDeseos(r.error); setDerivando(null); return }
    const p = pielDeColores(r.colores, { nombre: `Veste ${d.dominio}` })
    if (!p.ok) { setNotaDeseos(p.errores[0] ?? 'con esos colores no hay una piel'); setDerivando(null); return }
    setVestida({ deseo: d, piel: p.piel, acento: p.acento, fondo: p.fondo })
    setDerivando(null)
  }
  const [abierta, setAbierta] = useState<string | null>(null)
  const recargar = () => void bridge.herramientas.conectadas().then(setConectadas)
  useEffect(recargar, [])
  // lo que guardaste es tu lista de deseos: cada deseo se busca en el registro y se puede conectar
  useEffect(() => { void bridge.tienda.deseos().then((r) => { if (r.ok) setDeseos(r.deseos); else setNotaDeseos(r.error) }).catch(() => setNotaDeseos('No pude leer lo que guardaste.')) }, [])
  // se busca al dejar de teclear; sin texto, las destacadas (las oficiales de empresas conocidas)
  useEffect(() => {
    let vivo = true
    setFichas(null); setError(null)
    const t = setTimeout(() => void bridge.herramientas.buscar(q).then((r) => { if (!vivo) return; if (r.ok) setFichas(r.fichas); else { setError(r.error); setFichas([]) } }), q ? 450 : 0)
    return () => { vivo = false; clearTimeout(t) }
  }, [q])
  const tengo = new Set(conectadas.map((c) => c.ficha.id))

  return (
    <div className="grid gap-8">
      {(deseos.length > 0 || notaDeseos) && (
        <section className="grid gap-3">
          <h2 className="m-0 text-[15px] font-medium text-texto">Lo que guardaste · tu lista de deseos</h2>
          <p className="m-0 max-w-[70ch] text-[13px] leading-5 text-texto-2">
            Guardaste esto en X: son cosas que querías. Búscalas en el registro y conéctalas cuando quieras.
          </p>
          {notaDeseos && <p className="m-0 text-[13px] text-texto-3">{notaDeseos}</p>}
          <ul className="m-0 grid list-none gap-2 p-0">
            {deseos.map((d) => (
              <li key={d.destino} className="vidrio flex flex-wrap items-center gap-3 rounded-3 border px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="m-0 truncate text-[14px] text-texto">{d.herramienta ? d.herramienta : d.dominio}</p>
                  <p className="m-0 line-clamp-1 text-[12px] text-texto-3">
                    {d.autor ? `${d.autor} · ` : ''}{d.texto}
                  </p>
                </div>
                {d.herramienta && (
                  <button type="button" onClick={() => setQ(d.herramienta)}
                    className="inline-flex h-8 items-center gap-1.5 rounded-full border border-linea px-3 text-[12.5px] text-texto-2 transition-colors hover:border-linea-fuerte hover:text-texto">
                    <Search className="size-3.5" strokeWidth={1.75} />Buscar en el registro
                  </button>
                )}
                {d.destino.startsWith('http') && (
                  <button type="button" onClick={() => void vestirReferencia(d)} disabled={derivando === d.destino}
                    className="inline-flex h-8 items-center gap-1.5 rounded-full border border-linea px-3 text-[12.5px] text-texto-2 transition-colors hover:border-linea-fuerte hover:text-texto disabled:opacity-50">
                    <Palette className="size-3.5" strokeWidth={1.75} />{derivando === d.destino ? 'Mirando sus colores…' : 'Veste esto'}
                  </button>
                )}
                {d.post && (
                  <a href={d.post} target="_blank" rel="noreferrer" className="text-[12.5px] text-texto-3 underline decoration-linea underline-offset-2 hover:text-texto">El post</a>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
      {vestida && (() => {
        const c = vestida.piel.color
        const tinte = c.tipo === 'libre'
          ? { fondo: c.noche.fondo, superficie: c.noche.superficie, texto: c.noche.texto, acento: c.noche.acento }
          : { fondo: vestida.fondo, superficie: vestida.fondo, texto: vestida.fondo, acento: vestida.acento }
        return (
        <section className="vidrio grid gap-3 rounded-4 border p-5">
          <h3 className="m-0 text-[15px] font-medium text-texto">La piel de {vestida.deseo.dominio}</h3>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex overflow-hidden rounded-3 border border-linea">
              <span className="size-12" style={{ background: tinte.fondo }} title="fondo de noche" />
              <span className="size-12" style={{ background: tinte.superficie }} title="superficie" />
              <span className="size-12" style={{ background: tinte.acento }} title="acento" />
              <span className="size-12" style={{ background: tinte.texto }} title="texto" />
            </div>
            <p className="m-0 max-w-[46ch] text-[13px] leading-5 text-texto-2">
              Esos son los colores que usa <span className="text-texto">{vestida.deseo.dominio}</span>. Con ellos te he hecho una piel: pruébala puesta y, si te gusta, quédatela.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {pieles && (
              <>
                <button type="button" onClick={() => pieles.ensayar(vestida.piel)}
                  className="inline-flex h-9 items-center rounded-full border border-linea px-4 text-[13px] text-texto-2 transition-colors hover:border-linea-fuerte hover:text-texto">Probar en vivo</button>
                <button type="button" onClick={() => { pieles.vestir(vestida.piel); toast.success(`Ahora vestes «${vestida.piel.nombre}»`) }}
                  className="inline-flex h-9 items-center rounded-full bg-acento px-4 text-[13px] font-medium text-sobre-acento">Quedármela</button>
              </>
            )}
            <button type="button" onClick={() => setVestida(null)}
              className="inline-flex h-9 items-center rounded-full px-3 text-[13px] text-texto-3 transition-colors hover:text-texto">Cerrar</button>
          </div>
        </section>
        )
      })()}
      {conectadas.length > 0 && (
        <section className="grid gap-3">
          <h2 className="m-0 text-[15px] font-medium text-texto">Conectadas · Esme y tu equipo ya las usan</h2>
          <ul className="m-0 grid list-none gap-2 p-0">
            {conectadas.map((c) => (
              <li key={c.ficha.slug} className="vidrio flex items-center gap-3 rounded-3 border px-4 py-3">
                <Tipo f={c.ficha} />
                <div className="min-w-0 flex-1">
                  <p className="m-0 truncate text-[14px] text-texto">{c.ficha.titulo}</p>
                  <p className="m-0 truncate text-[12px] text-texto-3">{c.ficha.conexion.tipo === 'forjada' && c.activa ? `Forjada por Esme · ${c.ficha.descripcion}` : c.faltan.length ? `Falta: ${c.faltan.join(', ')}` : c.activa ? `Activa · sus acciones se llaman ${c.ficha.slug}__…` : 'En pausa'}</p>
                </div>
                <button type="button" role="switch" aria-checked={c.activa} aria-label={c.activa ? 'Pausar' : 'Activar'}
                  onClick={() => void bridge.herramientas.alternar(c.ficha.slug, !c.activa).then(recargar)}
                  className={cn('relative h-6 w-10 rounded-full transition-colors', c.activa ? 'bg-acento' : 'bg-s3')}>
                  <span className={cn('absolute top-1 size-4 rounded-full bg-white transition-all', c.activa ? 'left-5' : 'left-1')} />
                </button>
                <button type="button" aria-label={`Quitar ${c.ficha.titulo}`} onClick={() => void bridge.herramientas.quitar(c.ficha.slug).then(() => { toast(`Quitaste ${c.ficha.titulo}`); recargar() })}
                  className="grid size-8 place-items-center rounded-full text-texto-3 hover:bg-s2 hover:text-peligro"><Trash2 className="size-4" strokeWidth={1.75} /></button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Forjar />

      <section className="grid gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex h-10 w-[380px] max-w-full items-center gap-2 rounded-full border border-linea px-3.5 focus-within:border-foco">
            <Search className="size-4 shrink-0 text-texto-3" strokeWidth={1.75} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Busca entre ~10.000: github, blender, figma, postgres…" aria-label="Buscar herramientas"
              className="min-w-0 flex-1 bg-transparent text-[14px] text-texto outline-none placeholder:text-texto-3" />
          </label>
          <p className="m-0 text-xs text-texto-3">{q ? 'Del registro oficial de MCP' : 'Destacadas: las oficiales de cada empresa'}</p>
        </div>
        {error && <p className="m-0 text-[13px] text-peligro">El registro no responde ahora ({error}). Vuelve a intentarlo en un momento.</p>}
        <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">
          {fichas === null
            ? Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="vidrio grid content-start gap-3 rounded-4 border p-4" aria-hidden>
                <div className="flex items-start gap-3">
                  <span className="size-9 shrink-0 animate-pulse rounded-3 bg-s2/60" />
                  <span className="flex-1"><span className="block h-4 w-2/3 animate-pulse rounded bg-s2/60" /><span className="mt-2 block h-3 w-1/3 animate-pulse rounded bg-s2/60" /></span>
                </div>
                <span className="block h-3 w-full animate-pulse rounded bg-s2/60" />
                <span className="block h-3 w-2/3 animate-pulse rounded bg-s2/60" />
              </div>
            ))
            : fichas.map((f) => <Tarjeta key={f.id} f={f} conectada={tengo.has(f.id)} abierta={abierta === f.id} onAbrir={() => setAbierta((a) => (a === f.id ? null : f.id))} onConectada={() => { setAbierta(null); recargar() }} />)}
          {fichas?.length === 0 && !error && (
            <div className="col-span-full grid justify-items-center gap-3 py-12 text-center">
              <p className="m-0 max-w-[40ch] text-[13.5px] leading-6 text-texto-2">Nada con «{q}» en el registro. Prueba otra palabra, o descríbelo y te la forjamos.</p>
              <button type="button" onClick={() => setQ('')}
                className="inline-flex h-9 items-center rounded-full border border-linea px-4 text-[13px] text-texto-2 transition-colors hover:border-linea-fuerte hover:text-texto">Quitar la búsqueda</button>
            </div>
          )}
        </div>
      </section>

      <Busqueda />
    </div>
  )
}

// La Forja: si ninguna herramienta hace lo que necesitas, tu equipo te la fabrica. La revisas en el Taller y la instalas.
function Forjar() {
  const [necesidad, setNecesidad] = useState('')
  const [enviando, setEnviando] = useState(false)
  const forjar = async () => {
    setEnviando(true)
    const r = await bridge.forja.encargar(necesidad)
    setEnviando(false)
    if (!r.ok) { toast.error(r.error); return }
    toast.success(`${r.agente} está forjando «${r.herramienta}»`, { description: 'Cuando termine, revísala en el Taller y pulsa «Instalar como herramienta».' })
    setNecesidad('')
  }
  return (
    <section className="grid gap-3 rounded-4 border border-acento/35 bg-[color-mix(in_oklab,var(--acento)_6%,transparent)] p-5">
      <h2 className="m-0 flex items-center gap-2 text-[15px] font-medium text-texto"><Hammer className="size-4 text-acento" strokeWidth={1.75} />¿No existe? Fórjala</h2>
      <p className="m-0 max-w-[70ch] text-[13px] leading-5 text-texto-2">Describe qué necesitas: qué le das, qué te devuelve y de dónde salen los datos. Un agente de tu equipo la fabrica en una copia aislada; tú ves qué hace y decides si se instala.</p>
      <textarea value={necesidad} onChange={(e) => setNecesidad(e.target.value)} rows={3} placeholder="Por ejemplo: dada una fecha AAAA-MM-DD, dime cuántos días faltan desde hoy y qué día de la semana cae."
        className="resize-none rounded-3 border border-linea bg-s1/70 px-3.5 py-2.5 text-[13.5px] leading-5 text-texto outline-none placeholder:text-texto-3 focus:border-foco" />
      <button type="button" disabled={necesidad.trim().length < 15 || enviando} onClick={() => void forjar()}
        className="inline-flex h-9 w-fit items-center gap-2 rounded-full bg-acento px-4 text-[13px] font-medium text-sobre-acento disabled:opacity-40"><Hammer className="size-4" />{enviando ? 'Encargando…' : 'Forjar'}</button>
    </section>
  )
}

function Tipo({ f }: { f: Ficha }) {
  const remota = f.conexion.tipo === 'remoto', forjada = f.conexion.tipo === 'forjada'
  if (forjada) return <span title="Forjada por Esme: la fabricó tu equipo y la aprobaste tú" className="grid size-9 shrink-0 place-items-center rounded-3 bg-acento/15 text-acento"><Hammer className="size-4" strokeWidth={1.75} /></span>
  return (
    <span title={remota ? 'Remota: se usa por internet, no ejecuta nada en tu equipo' : `Local: se ejecuta en tu equipo (${f.conexion.tipo === 'npm' ? 'npx' : 'uvx'})`}
      className="grid size-9 shrink-0 place-items-center rounded-3 bg-s2 text-texto-2">{remota ? <Cloud className="size-4" strokeWidth={1.75} /> : <Laptop className="size-4" strokeWidth={1.75} />}</span>
  )
}

function Tarjeta({ f, conectada, abierta, onAbrir, onConectada }: { f: Ficha; conectada: boolean; abierta: boolean; onAbrir(): void; onConectada(): void }) {
  const [valores, setValores] = useState<Record<string, string>>({})
  const [probando, setProbando] = useState(false)
  const conectar = async () => {
    setProbando(true)
    const r = await bridge.herramientas.conectar(f, valores)
    setProbando(false)
    if (!r.ok) { toast.error(r.error); return }
    if (r.aviso) toast.warning(`${f.titulo} quedó guardada`, { description: r.aviso })
    else toast.success(`${f.titulo} conectada${r.sesion ? ' con tu cuenta' : ''}`, { description: `${r.acciones} ${r.acciones === 1 ? 'acción' : 'acciones'} para Esme y tu equipo.` })
    onConectada()
  }
  return (
    <article className="vidrio grid content-start gap-3 rounded-4 border p-4">
      <div className="flex items-start gap-3">
        <Tipo f={f} />
        <div className="min-w-0 flex-1">
          <h3 className="m-0 truncate text-[15px] font-medium text-texto" title={f.id}>{f.titulo}</h3>
          <p className="m-0 truncate text-[11.5px] text-texto-3">{f.id}{f.version ? ` · v${f.version}` : ''}</p>
        </div>
      </div>
      <p className="m-0 line-clamp-3 text-[13px] leading-5 text-texto-2">{f.descripcion || 'Sin descripción.'}</p>
      <div className="flex items-center gap-2">
        {conectada ? <span className="text-[12.5px] text-exito">Conectada</span> : (
          <button type="button" onClick={onAbrir} aria-expanded={abierta} className="inline-flex h-8 items-center gap-1.5 rounded-full bg-acento px-3.5 text-[12.5px] font-medium text-sobre-acento"><Plug className="size-3.5" />Conectar</button>
        )}
        {f.web && <a href={f.web} target="_blank" rel="noreferrer" className="text-[12.5px] text-texto-3 underline decoration-linea underline-offset-2 hover:text-texto">Su web</a>}
      </div>
      <AnimatePresence initial={false}>
        {abierta && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="grid gap-2.5 overflow-hidden">
            <p className="m-0 rounded-2 bg-[color-mix(in_oklab,var(--atencion)_10%,transparent)] px-3 py-2 text-[12px] leading-5 text-texto-2">
              {f.conexion.tipo === 'remoto' ? 'Remota: lo que Esme le pida viaja a su servidor.' : 'Local: se descarga y se ejecuta en tu equipo.'} Esme no la ha revisado: conéctala si confías en quien la publica. Cada acción te pedirá permiso.
            </p>
            {f.variables.map((v) => (
              <label key={v.nombre} className="grid gap-1 text-[12px] text-texto-2">
                <span>{v.nombre}{v.requerida ? ' *' : ''}{v.descripcion ? ` · ${v.descripcion}` : ''}</span>
                <input type={v.secreta ? 'password' : 'text'} autoComplete="off" value={valores[v.nombre] ?? ''} onChange={(e) => setValores((x) => ({ ...x, [v.nombre]: e.target.value }))}
                  className="h-9 rounded-2 border border-linea bg-s1/70 px-3 text-[13px] text-texto outline-none focus:border-foco" />
              </label>
            ))}
            <button type="button" disabled={probando} onClick={() => void conectar()} className="h-9 rounded-full bg-acento text-[13px] font-medium text-sobre-acento disabled:opacity-50">
              {probando ? (f.conexion.tipo === 'remoto' ? 'Conectando… si pide tu cuenta, se abre tu navegador' : 'Descargando y probando…') : 'Conectar y probar'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </article>
  )
}

// cómo busca Esme en internet: Wikipedia siempre; mejor con tu clave gratuita de Brave o con tu propio SearXNG
function Busqueda() {
  const [estado, setEstado] = useState<{ brave: boolean; searxng: string } | null>(null)
  const [brave, setBrave] = useState('')
  const [searxng, setSearxng] = useState('')
  useEffect(() => { void bridge.herramientas.busqueda().then((e) => { setEstado(e); setSearxng(e.searxng) }) }, [])
  const guardar = async () => {
    const r = await bridge.herramientas.ponerBusqueda({ ...(brave ? { brave } : {}), searxng })
    if (!r.ok) { toast.error(r.error); return }
    toast.success('Búsqueda guardada'); setBrave(''); setEstado(await bridge.herramientas.busqueda())
  }
  return (
    <section className="vidrio grid gap-3 rounded-4 border p-5">
      <h2 className="m-0 flex items-center gap-2 text-[15px] font-medium text-texto"><Globe className="size-4" strokeWidth={1.75} />Cómo busca Esme en internet</h2>
      <p className="m-0 max-w-[70ch] text-[13px] leading-5 text-texto-2">
        Ahora: {estado?.brave ? 'Brave Search' : estado?.searxng ? 'tu SearXNG' : 'Wikipedia (siempre funciona, sin claves)'}. Para buscar en toda la web, pon una clave gratuita de Brave Search (2.000 búsquedas al mes) o la dirección de tu propio SearXNG.
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <label className="grid gap-1 text-[12px] text-texto-2">Clave de Brave Search{estado?.brave ? ' (guardada; escribe otra para cambiarla)' : ''}
          <input type="password" autoComplete="off" value={brave} onChange={(e) => setBrave(e.target.value)} className="h-9 w-[260px] rounded-2 border border-linea bg-s1/70 px-3 text-[13px] text-texto outline-none focus:border-foco" />
        </label>
        <label className="grid gap-1 text-[12px] text-texto-2">Tu SearXNG
          <input value={searxng} onChange={(e) => setSearxng(e.target.value)} placeholder="http://…" className="h-9 w-[260px] rounded-2 border border-linea bg-s1/70 px-3 text-[13px] text-texto outline-none focus:border-foco" />
        </label>
        <button type="button" onClick={() => void guardar()} className="h-9 rounded-full border border-linea px-4 text-[13px] text-texto-2 hover:text-texto">Guardar</button>
      </div>
    </section>
  )
}
