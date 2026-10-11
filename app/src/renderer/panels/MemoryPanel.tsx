// Memoria: buscar, ver el DNI de cada recuerdo, olvidar con certificado y absorber fuentes nuevas.
import { useEffect, useState } from 'react'
import type { BrainClient, Certificate, Memory } from '../lib/brain'

export function MemoryPanel(props: { brain: BrainClient | null; focusId: string | null; onFocus(id: string): void; onChanged(): void }) {
  const [q, setQ] = useState('')
  const [hits, setHits] = useState<Memory[]>([])
  const [sel, setSel] = useState<Memory | null>(null)
  const [cert, setCert] = useState<Certificate | null>(null)
  const [path, setPath] = useState('')
  const [msg, setMsg] = useState('')

  useEffect(() => { if (props.focusId && props.brain) void props.brain.memory(props.focusId).then(setSel).catch(() => {}) }, [props.focusId, props.brain])
  useEffect(() => {
    if (!props.brain || !q.trim()) { setHits([]); return }
    const t = setTimeout(() => void props.brain!.search(q, 25).then(setHits).catch(() => setHits([])), 220)
    return () => clearTimeout(t)
  }, [q, props.brain])

  async function forget(m: Memory) {
    if (!props.brain || !confirm('¿Olvidar este recuerdo y todo lo derivado de él? No se puede deshacer.')) return
    setCert(await props.brain.forget(m.id)); setSel(null); setHits((h) => h.filter((x) => x.id !== m.id)); props.onChanged()
  }
  async function ingest() {
    if (!props.brain || !path.trim()) return
    setMsg('absorbiendo…')
    try { const r = await props.brain.ingest([path.trim()]); setMsg(`${r.added} recuerdos nuevos · ${r.memories} en total`); props.onChanged() }
    catch (e) { setMsg(String((e as Error).message)) }
  }

  return (
    <>
      <div style={{ padding: 10, borderBottom: '1px solid var(--edge)' }}>
        <input className="field" value={q} placeholder="Buscar en tu memoria por significado…" onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="scroll" style={{ flex: 1 }}>
        {sel && (
          <div style={{ borderBottom: '1px solid var(--edge)' }}>
            <dl className="dni">
              <dt>id</dt><dd>{sel.id}</dd><dt>tipo</dt><dd>{sel.kind}</dd><dt>fecha</dt><dd>{sel.ts.slice(0, 19).replace('T', ' ')}</dd>
              <dt>origen</dt><dd>{sel.source}</dd><dt>confianza</dt><dd>{Math.round(sel.trust * 100)} %</dd>
            </dl>
            <p style={{ margin: '0 14px 12px', whiteSpace: 'pre-wrap', color: 'var(--ink-2)', fontSize: 12.5 }}>{sel.text}</p>
            <div className="row" style={{ padding: '0 14px 12px' }}>
              <button className="btn ghost" onClick={() => props.onFocus(sel.id)}>ver en el mapa</button>
              <button className="btn danger" onClick={() => forget(sel)}>olvidar</button>
            </div>
          </div>
        )}
        {cert && <div className="cert">certificado de olvido · {cert.forgotten.length} recuerdo(s) · sha256 {cert.sha256.slice(0, 16)}… · {cert.ts.slice(0, 19)}</div>}
        {hits.map((m) => (
          <div key={m.id} className="mem-item" onClick={() => { setSel(m); props.onFocus(m.id) }}>
            <span className="muted">{m.kind} · {m.ts.slice(0, 10)} · {m.source.split('/').pop()}</span>
            <p>{m.text}</p>
          </div>
        ))}
      </div>
      <div style={{ padding: 10, borderTop: '1px solid var(--edge)' }} className="row">
        <input className="field" value={path} placeholder="Absorber carpeta o fichero (p. ej. ~/Documentos/Obsidian)" onChange={(e) => setPath(e.target.value)} />
        <button className="btn" onClick={ingest}>absorber</button>
      </div>
      {msg && <p className="muted" style={{ margin: '0 12px 10px' }}>{msg}</p>}
    </>
  )
}
