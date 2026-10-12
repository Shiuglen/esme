// Chat con cualquier IA y con tu memoria. Ves qué recuerdos usó y le enseñas si sirvieron.
import { useEffect, useRef, useState } from 'react'
import type { BrainClient } from '../lib/brain'
import { bridge, type ChatMsg, type ProviderView } from '../lib/bridge'

type Turn = { role: 'user' | 'assistant'; content: string; query?: string; ids?: string[]; abstained?: boolean; tokens?: number; error?: boolean; judged?: boolean; who?: string }

export function ChatPanel(props: { brain: BrainClient | null; onCite(id: string): void; onRecalled(tokens: number): void; seed?: { q: string; n: number }; onBusy?(b: boolean): void }) {
  const [providers, setProviders] = useState<ProviderView[]>([])
  const [provider, setProvider] = useState('ollama')
  const [models, setModels] = useState<string[]>([])
  const [model, setModel] = useState('')
  const [memoryOn, setMemoryOn] = useState(true)
  const [turns, setTurns] = useState<Turn[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const log = useRef<HTMLDivElement>(null)

  useEffect(() => { void bridge.providers().then(setProviders) }, [])
  useEffect(() => {
    setModels([]); setModel('')
    bridge.models(provider).then((m) => {
      setModels(m)
      const def = providers.find((p) => p.id === provider)?.defaultModel
      setModel(m.includes(def ?? '') ? def! : m.find((x) => !/embed/i.test(x)) ?? m[0] ?? '')
    }).catch((e) => setTurns((t) => [...t, { role: 'assistant', content: String(e.message ?? e), error: true }]))
  }, [provider, providers])
  useEffect(() => { props.onBusy?.(busy) }, [busy])
  useEffect(() => { log.current?.scrollTo({ top: log.current.scrollHeight, behavior: 'smooth' }) }, [turns])
  const handledSeed = useRef(0)
  useEffect(() => {   // preguntas desde el dock o Cmd+K: esperan a que haya modelo, nunca se pierden
    if (props.seed?.q && props.seed.n !== handledSeed.current && model && !busy) { handledSeed.current = props.seed.n; void send(props.seed.q) }
  }, [props.seed?.n, model, busy])

  const current = providers.find((p) => p.id === provider)

  async function send(text: string) {
    const q = text.trim()
    if (!q || busy || !model) return
    setInput(''); setBusy(true)
    let memory: { context: string; ids: string[] } | null = null
    let meta: Partial<Turn> = {}
    if (memoryOn && props.brain) {
      if (current?.retainsData && !confirm(`${current.label} puede retener datos. ¿Enviarle tu memoria para esta pregunta?`)) memory = null
      else {
        try {
          const r = await props.brain.recall(q, 1500, 'chat')
          memory = r.abstained ? null : { context: r.context, ids: r.ids }
          meta = { query: q, ids: r.ids, abstained: r.abstained, tokens: r.tokens }
          props.onRecalled(r.tokens)
        } catch (e) { meta = { abstained: true }; console.warn(e) }
      }
    }
    const history: ChatMsg[] = [...turns.filter((t) => !t.error).map((t) => ({ role: t.role, content: t.content })), { role: 'user', content: q }]
    setTurns((t) => [...t, { role: 'user', content: q }, { role: 'assistant', content: '', who: `${current?.label ?? provider} · ${model}`, ...meta }])
    const s = bridge.chat(provider, model, history, memory)
    s.onChunk((d) => setTurns((t) => { const c = [...t]; c[c.length - 1] = { ...c[c.length - 1], content: c[c.length - 1].content + d }; return c }))
    s.onDone(() => setBusy(false))
    s.onError((m) => { setBusy(false); setTurns((t) => { const c = [...t]; c[c.length - 1] = { ...c[c.length - 1], content: m, error: true }; return c }) })
  }

  async function judge(i: number, useful: boolean) {
    const t = turns[i]
    if (!props.brain || !t.ids?.length || !t.query) return
    await props.brain.feedback(t.ids, useful, t.query).catch(() => {})
    setTurns((all) => all.map((x, k) => (k === i ? { ...x, judged: true } : x)))
  }

  return (
    <>
      <div className="row" style={{ padding: '8px 10px', borderBottom: '1px solid var(--edge)' }}>
        <select className="field" value={provider} onChange={(e) => setProvider(e.target.value)} aria-label="IA">
          {providers.map((p) => <option key={p.id} value={p.id} disabled={!p.hasKey}>{p.label}{p.hasKey ? '' : ' (sin clave)'}</option>)}
        </select>
        <select className="field" value={model} onChange={(e) => setModel(e.target.value)} aria-label="Modelo">
          {models.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <button className={`chip${memoryOn ? ' on' : ''}`} onClick={() => setMemoryOn((v) => !v)} title="Usar la memoria de Esme">
          <span className={`dot${memoryOn ? '' : ' off'}`} /> memoria
        </button>
      </div>
      <div ref={log} className="chat-log scroll" aria-live="polite">
        {!turns.length && <p className="muted" style={{ margin: 'auto', textAlign: 'center', maxWidth: 300 }}>
          Pregunta lo que quieras. Esme le da a la IA solo lo que necesita de tu memoria, y verás en el mapa qué recordó.</p>}
        {turns.map((t, i) => (
          <div key={i} className={`msg ${t.role}${t.error ? ' error' : ''}`}>
            {t.role === 'assistant' && <div className="who">{t.who}</div>}
            {t.content || (busy && i === turns.length - 1 ? '…' : '')}
            {t.role === 'assistant' && t.abstained && <div className="muted" style={{ marginTop: 6 }}>sin memoria relevante · respondió solo con lo que sabe</div>}
            {t.role === 'assistant' && !!t.ids?.length && (
              <>
                <div className="cites">{t.ids.map((id, k) => <button key={id} className="cite" onClick={() => props.onCite(id)}>recuerdo {k + 1}</button>)}
                  <span className="muted">{t.tokens} tokens de memoria</span></div>
                {!t.judged && !(busy && i === turns.length - 1) && (
                  <div className="verdict">
                    <button className="btn ghost" onClick={() => judge(i, true)}>sirvió</button>
                    <button className="btn ghost" onClick={() => judge(i, false)}>no sirvió</button>
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>
      <form className="chat-input" onSubmit={(e) => { e.preventDefault(); void send(input) }}>
        <textarea className="field" value={input} rows={2} placeholder="Escribe… (Enter envía, Shift+Enter salto)" onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(input) } }} />
      </form>
    </>
  )
}
