// Memoria: buscar por significado, ver el DNI de cada recuerdo, olvidar con certificado y absorber fuentes nuevas. Sin
// búsqueda, lo último que aprendió tu mente (nunca una caja vacía). Olvidar se confirma en la propia ficha, en dos pasos,
// sin ventanas del sistema que congelen la app.
import { Brain, Check, Eye, Search, Trash2, Upload } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { BrainClient, Certificate, Memory } from '../lib/brain'
import { cn } from '../lib/cn'
import { haceCuanto } from '../paginas/diario'
import { sinMarkdown } from '../lib/texto-plano'
import { Pared } from '../components/Pared'
import { explicarFallo } from './motor'

const origen = (s: string) => s.split('/').pop() || s

export function MemoryPanel(props: { brain: BrainClient | null; focusId: string | null; onFocus(id: string): void; onChanged(): void }) {
  const [q, setQ] = useState('')
  const [hits, setHits] = useState<Memory[]>([])
  const [sel, setSel] = useState<Memory | null>(null)
  const [cert, setCert] = useState<Certificate | null>(null)
  const [seguro, setSeguro] = useState(false)
  const [path, setPath] = useState('')
  const [msg, setMsg] = useState('')
  const buscando = !!q.trim()

  useEffect(() => { if (props.focusId && props.brain) void props.brain.memory(props.focusId).then((m) => { setSel(m); setSeguro(false) }).catch(() => {}) }, [props.focusId, props.brain])
  useEffect(() => {
    if (!props.brain) { setHits([]); return }
    // sin texto, el cerebro devuelve lo más reciente
    const t = setTimeout(() => void props.brain!.search(q.trim(), buscando ? 25 : 30).then(setHits).catch(() => setHits([])), buscando ? 220 : 0)
    return () => clearTimeout(t)
  }, [q, props.brain])  // eslint-disable-line react-hooks/exhaustive-deps

  async function olvidar(m: Memory) {
    if (!props.brain) return
    if (!seguro) { setSeguro(true); return }
    setCert(await props.brain.forget(m.id)); setSel(null); setSeguro(false); setHits((h) => h.filter((x) => x.id !== m.id)); props.onChanged()
  }
  async function absorber() {
    if (!props.brain || !path.trim()) return
    setMsg('Absorbiendo…')
    try { const r = await props.brain.ingest([path.trim()]); setMsg(`${r.added} recuerdos nuevos · ${r.memories.toLocaleString('es-ES')} en total`); setPath(''); props.onChanged() }
    catch (e) { setMsg(explicarFallo(String((e as Error)?.message ?? e), 'tu mente')) }
  }
  const ahora = Date.now()

  return (
    <div className="flex h-full min-h-0 flex-col">
      {!props.brain && (
        <Pared titulo="Tu mente está apagada" texto="No encuentro el motor en Python que guarda tus recuerdos. Enciéndelo y todo lo que tienes volverá a estar aquí."
          icono={<Brain className="size-4" />} className="m-3" />
      )}
      <label className="m-3 flex h-10 items-center gap-2 rounded-full border border-linea bg-s1/60 px-3.5 focus-within:border-foco">
        <Search className="size-4 shrink-0 text-texto-3" strokeWidth={1.75} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Busca por significado: «lo que decidí del Taller»…" aria-label="Buscar en tu memoria"
          className="min-w-0 flex-1 bg-transparent text-[13.5px] text-texto outline-none placeholder:text-texto-3" />
      </label>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
        {sel && (
          <article aria-label="El DNI de este recuerdo" className="mb-3 grid gap-2.5 rounded-3 border border-acento/30 bg-[color-mix(in_oklab,var(--acento)_6%,transparent)] p-3.5">
            <p className="m-0 max-h-48 overflow-y-auto font-display text-[16px] leading-[1.45] whitespace-pre-wrap text-texto italic">{sel.text}</p>
            <p className="m-0 text-[11.5px] text-texto-3">{origen(sel.source)} · {haceCuanto(Date.parse(sel.ts), ahora)} · {sel.kind} · confianza {Math.round(sel.trust * 100)} %</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => props.onFocus(sel.id)} className="inline-flex h-7 items-center gap-1.5 rounded-full border border-linea px-3 text-[12px] text-texto-2 hover:text-texto"><Eye className="size-3.5" strokeWidth={1.75} />Verlo en el mapa</button>
              <button type="button" onClick={() => void olvidar(sel)} onBlur={() => setSeguro(false)}
                className={cn('inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-[12px]', seguro ? 'bg-peligro text-white' : 'text-texto-3 hover:text-peligro')}>
                <Trash2 className="size-3.5" strokeWidth={1.75} />{seguro ? 'Olvidar para siempre' : 'Olvidar'}
              </button>
            </div>
          </article>
        )}
        {cert && <p className="m-0 mb-3 flex items-center gap-1.5 rounded-2 bg-s2/60 px-3 py-2 text-[11.5px] text-texto-2"><Check className="size-3.5 text-exito" />Olvidado, con certificado · sha256 {cert.sha256.slice(0, 16)}…</p>}

        <p className="m-0 mt-1 mb-2 px-1 text-[12px] text-texto-3">{buscando ? `${hits.length} ${hits.length === 1 ? 'recuerdo' : 'recuerdos'} con ese significado` : 'Lo último que aprendió tu mente'}</p>
        <ol className="m-0 grid list-none gap-0 p-0">
          {hits.map((m) => (
            <li key={m.id}>
              <button type="button" onClick={() => { setSel(m); setSeguro(false); props.onFocus(m.id) }}
                className={cn('grid w-full gap-1 border-b border-dashed border-linea/70 px-1 py-2.5 text-left transition-colors hover:bg-s1/50', sel?.id === m.id && 'bg-s1/60')}>
                <span className="text-[11.5px] text-texto-3">{haceCuanto(Date.parse(m.ts), ahora)} · {origen(m.source)}</span>
                <span className="line-clamp-3 text-[13px] leading-5 text-texto-2">{sinMarkdown(m.text)}</span>
              </button>
            </li>
          ))}
          {!hits.length && <li className="px-1 py-6 text-[13px] text-texto-3">{buscando ? 'Nada con ese significado. Prueba con otras palabras.' : props.brain ? 'Tu mente aún no guarda nada: absorbe una carpeta abajo.' : 'Tu mente está despertando…'}</li>}
        </ol>
      </div>

      <div className="grid gap-1.5 border-t border-linea p-3">
        <div className="flex gap-2">
          <input value={path} onChange={(e) => setPath(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void absorber() }} placeholder="Absorbe una carpeta: ~/Documentos/Obsidian"
            aria-label="Carpeta o fichero que absorber" className="h-9 min-w-0 flex-1 rounded-full border border-linea bg-s1/60 px-3.5 text-[13px] text-texto outline-none placeholder:text-texto-3 focus:border-foco" />
          <button type="button" onClick={() => void absorber()} disabled={!path.trim()} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-acento px-3.5 text-[12.5px] font-medium text-sobre-acento disabled:opacity-40"><Upload className="size-3.5" />Absorber</button>
        </div>
        {msg && <p className="m-0 px-1 text-[12px] text-texto-3">{msg}</p>}
      </div>
    </div>
  )
}
