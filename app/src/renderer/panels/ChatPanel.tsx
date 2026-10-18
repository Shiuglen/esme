// Chat con cualquier IA y con tu memoria. Ves qué recuerdos usó y le enseñas si sirvieron.
import { useEffect, useRef, useState } from 'react'
import type { BrainClient } from '../lib/brain'
import { Brain, ChevronDown } from 'lucide-react'
import { Markdown } from '../chat/Markdown'
import { TiraUso, type UsoSesion } from '../chat/TiraUso'
import { cn } from '../lib/cn'
import { Compositor } from '../shell/Compositor'
import { bridge, type ChatMsg, type ProviderView } from '../lib/bridge'
import { explicarFallo, modeloInicial, ordenMotores } from './motor'

type Turn = { role: 'user' | 'assistant'; content: string; query?: string; ids?: string[]; abstained?: boolean; tokens?: number; error?: boolean; judged?: boolean; who?: string; pensamiento?: string }

export function ChatPanel(props: { brain: BrainClient | null; onCite(id: string): void; onRecalled(tokens: number): void; seed?: { q: string; n: number; voz?: boolean }; onBusy?(b: boolean): void; onHablar?(texto: string): void; onVivo?(texto: string, fin: boolean, sinPermiso?: { motor: string; id: string }): void; panorama?: string }) {
  const [providers, setProviders] = useState<ProviderView[]>([])
  const [provider, setProvider] = useState('')   // se elige el primero que responde (panels/motor.ts)
  const [aviso, setAviso] = useState<string | null>(null)
  const [models, setModels] = useState<string[]>([])
  const [model, setModel] = useState('')
  const [memoryOn, setMemoryOn] = useState(true)
  const [turns, setTurns] = useState<Turn[]>([])
  const [busy, setBusy] = useState(false)
  const [sesion, setSesion] = useState<UsoSesion>({ costeUSD: 0, ultimaEntrada: 0, memoria: 0 })
  const log = useRef<HTMLDivElement>(null)

  // El motor: el último que usaste si responde; si no, el primero que responda (locales antes que API). Nunca uno caído.
  useEffect(() => {
    void bridge.providers().then(async (ps) => {
      setProviders(ps)
      let ultimo: string | null = null
      try { ultimo = localStorage.getItem('esme:proveedor') } catch { /* sin almacenamiento */ }
      for (const p of ordenMotores(ps, ultimo)) {
        try { if ((await bridge.models(p.id)).length) { setProvider(p.id); return } } catch { /* no responde: el siguiente */ }
      }
      setProvider(ps[0]?.id ?? ''); setAviso('Ningún motor responde ahora. Conecta uno en Ajustes.')
    })
  }, [])
  useEffect(() => {
    if (!provider) return
    setModels([]); setModel(''); setAviso(null)
    const nombre = providers.find((p) => p.id === provider)?.label ?? provider
    bridge.models(provider).then((m) => {
      setModels(m)
      if (!m.length) { setAviso(`${nombre} no tiene modelos disponibles. Elige otro motor arriba.`); return }
      const def = providers.find((p) => p.id === provider)?.defaultModel
      let recordado: string | null = null
      try { recordado = localStorage.getItem(`esme:modelo:${provider}`) } catch { /* sin almacenamiento */ }
      setModel(modeloInicial(m, def, recordado))
    }).catch((e) => setAviso(explicarFallo(String(e?.message ?? e), nombre)))
  }, [provider, providers])
  const elegirMotor = (id: string) => { setProvider(id); try { localStorage.setItem('esme:proveedor', id) } catch { /* sin almacenamiento */ } }
  useEffect(() => { props.onBusy?.(busy) }, [busy])
  useEffect(() => { log.current?.scrollTo({ top: log.current.scrollHeight, behavior: 'smooth' }) }, [turns])
  const handledSeed = useRef(0)
  useEffect(() => {   // preguntas desde el dock o Cmd+K: esperan a que haya modelo, nunca se pierden
    // espera a que el motor y su modelo por defecto estén resueltos: si no, saldría con el primero de la lista
    if (props.seed?.q && props.seed.n !== handledSeed.current && providers.length && model && models.includes(model) && !busy) { handledSeed.current = props.seed.n; vozRef.current = !!props.seed.voz; void send(props.seed.q) }
  }, [props.seed?.n, model, models, providers, busy])

  const current = providers.find((p) => p.id === provider)

  // si la pregunta llegó por voz, la respuesta se dice en voz alta al terminar
  const vozRef = useRef(false)
  async function send(text: string) {
    const q = text.trim()
    if (!q || busy || !model) return
    setBusy(true)
    let memory: { context: string; ids: string[] } | null = null
    let meta: Partial<Turn> = {}
    let memTokens = 0
    const porVoz = vozRef.current; vozRef.current = false
    // Un motor que puede retener datos: se pregunta UNA vez y se recuerda (por motor). Por voz nunca se bloquea la
    // ventana con un aviso: sin tu permiso guardado, responde sin enviar tu memoria.
    let permiso = !current?.retainsData
    if (!permiso) {
      let guardado: string | null = null
      try { guardado = localStorage.getItem(`esme:memoria-a:${provider}`) } catch { /* sin almacenamiento */ }
      if (guardado) permiso = guardado === 'si'
      else if (!porVoz) {
        permiso = confirm(`${current?.label ?? provider} puede retener datos. ¿Le envías tu memoria cuando preguntes? (Se recuerda para este motor; lo cambias en la conversación.)`)
        try { localStorage.setItem(`esme:memoria-a:${provider}`, permiso ? 'si' : 'no') } catch { /* sin almacenamiento */ }
      }
    }
    const conMemoria = memoryOn && !!props.brain && permiso
    if (memoryOn && props.brain) {
      if (!permiso) memory = null
      else {
        try {
          const r = await props.brain.recall(q, 1500, 'chat')
          memory = r.abstained ? null : { context: r.context, ids: r.ids }
          meta = { query: q, ids: r.ids, abstained: r.abstained, tokens: r.tokens }
          props.onRecalled(r.tokens)
          memTokens = r.abstained ? 0 : r.tokens
        } catch (e) { meta = { abstained: true }; console.warn(e) }
      }
    }
    const history: ChatMsg[] = [...turns.filter((t) => !t.error).map((t) => ({ role: t.role, content: t.content })), { role: 'user', content: q }]
    setTurns((t) => [...t, { role: 'user', content: q }, { role: 'assistant', content: '', who: `${current?.label ?? provider} · ${model}`, ...meta }])
    let dicho = ''
    // el panorama de tu mente viaja solo con la memoria activada (son datos tuyos, como la memoria)
    const s = bridge.chat(provider, model, history, memory, undefined, { panorama: conMemoria ? props.panorama : undefined, voz: porVoz })
    s.onUsage((u) => setSesion((v) => ({ costeUSD: v.costeUSD + u.costeUSD, ultimaEntrada: u.entrada, memoria: memTokens })))
    s.onChunk((d) => { dicho += d; if (porVoz) props.onVivo?.(dicho, false); return setTurns((t) => { const c = [...t]; c[c.length - 1] = { ...c[c.length - 1], content: c[c.length - 1].content + d }; return c }) })
    // El pensado viaja en su hilo: los que piensan antes de hablar no dejan el chat mudo.
    s.onPensamiento((d) => setTurns((t) => { const c = [...t]; const u = c[c.length - 1]; c[c.length - 1] = { ...u, pensamiento: (u.pensamiento ?? '') + d }; return c }))
    s.onDone(() => {
      setBusy(false)
      if (porVoz) props.onVivo?.(dicho.trim() || 'El modelo respondió vacío. Prueba con otro modelo.', true, memoryOn && props.brain && !permiso ? { motor: current?.label ?? provider, id: provider } : undefined)
      if (porVoz && dicho.trim()) props.onHablar?.(dicho)
      // Honestidad ante modelos que responden vacío:sin texto ni pensado, la burbuja no es una pregunta es un agujero.
      setTurns((t) => {
        const c = [...t]; const la = c[c.length - 1]
        if (!la || la.content !== '' || la.error) return t
        const nota = la.pensamiento ? `El modelo pensó (${la.pensamiento.length} caracteres) pero no trajo texto. Prueba con otro modelo.` : 'El modelo respondió vacío: no trajo texto. Prueba con otro modelo.'
        c[c.length - 1] = { ...la, content: nota, error: true }
        return c
      })
    })
    s.onError((m) => { setBusy(false); if (porVoz) props.onVivo?.(explicarFallo(m, current?.label ?? provider), true); setTurns((t) => { const c = [...t]; c[c.length - 1] = { ...c[c.length - 1], content: explicarFallo(m, current?.label ?? provider), error: true }; return c }) })
  }

  async function judge(i: number, useful: boolean) {
    const t = turns[i]
    if (!props.brain || !t.ids?.length || !t.query) return
    await props.brain.feedback(t.ids, useful, t.query).catch(() => {})
    setTurns((all) => all.map((x, k) => (k === i ? { ...x, judged: true } : x)))
  }

  const selector = 'h-8 min-w-0 appearance-none truncate rounded-2 border border-linea bg-s1 pr-7 pl-3 text-[13px] text-texto-2 outline-none transition-colors hover:border-linea-fuerte focus-visible:border-foco'
  return (
    <>
      <div className="flex items-center gap-2 pb-3">
        <label className="relative">
          <span className="sr-only">IA</span>
          <select className={cn(selector, 'max-w-[220px]')} value={provider} onChange={(e) => elegirMotor(e.target.value)}>
            {providers.map((p) => <option key={p.id} value={p.id} disabled={!p.hasKey}>{p.label}{p.hasKey ? '' : ' (sin clave)'}</option>)}
          </select>
          <ChevronDown className="pointer-events-none absolute top-2 right-2 size-4 text-texto-3" strokeWidth={1.5} aria-hidden />
        </label>
        <label className="relative min-w-0 max-w-[360px] flex-1">
          <span className="sr-only">Modelo</span>
          <select className={cn(selector, 'w-full')} value={model} onChange={(e) => { setModel(e.target.value); try { localStorage.setItem(`esme:modelo:${provider}`, e.target.value) } catch { /* sin almacenamiento */ } }}>
            {models.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <ChevronDown className="pointer-events-none absolute top-2 right-2 size-4 text-texto-3" strokeWidth={1.5} aria-hidden />
        </label>
      </div>
      {aviso && <p role="status" className="m-0 pb-1 text-[13px] text-atencion">{aviso}</p>}
      <div ref={log} className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto py-4" aria-live="polite">
        {!turns.length && (
          <div className="m-auto grid max-w-[380px] gap-2 text-center">
            <p className="font-display text-[22px] font-[600] tracking-[-0.02em] text-texto">¿En qué piensas?</p>
            <p className="text-sm text-texto-3">Esme le da a la IA solo lo que necesita de tu memoria. Verás qué recordó y podrás decirle si sirvió.</p>
          </div>
        )}
        {turns.map((t, i) => t.role === 'user' ? (
          <div key={i} className="max-w-[78%] self-end rounded-3 rounded-br-1 bg-s2 px-4 py-2.5 text-[15px] leading-6 whitespace-pre-wrap text-texto">{t.content}</div>
        ) : (
          <div key={i} className="grid max-w-[92%] gap-2 self-start pl-3 relative">
            <span aria-hidden className={cn('absolute inset-y-1 left-0 w-[2px] rounded-full', t.error ? 'bg-peligro/50' : '[background:var(--aurora-lineal)] opacity-60')} />
            <span className="text-xs text-texto-3">{t.who}</span>
            <div className={cn('text-[15px] leading-7', t.error ? 'text-peligro whitespace-pre-wrap' : 'text-texto')}>
              {t.content 
                ? (t.error ? t.content : <Markdown texto={t.content} />)
                : t.pensamiento
                  ? (
                    <div className="grid gap-1.5" aria-live="polite">
                      <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.08em] text-texto-3">
                        <Brain className="size-3" strokeWidth={1.5} />pensando
                      </span>
                      {busy || !t.content ? <p className="m-0 max-h-28 overflow-hidden text-[13px] leading-5 italic text-texto-2/80 [mask-image:linear-gradient(180deg,black_55%,transparent)]">{t.pensamiento}</p> : null}
                    </div>
                  )
                  : (busy && i === turns.length - 1 ? <span className="inline-flex gap-1 py-2" aria-label="Pensando">{[0, 1, 2].map((d) => <span key={d} className="size-1.5 animate-pulse rounded-full bg-texto-3" style={{ animationDelay: `${d * 160}ms` }} />)}</span> : '')}
            </div>
            {t.abstained && <span className="text-xs text-texto-3">Sin memoria relevante: respondió solo con lo que sabe.</span>}
            {!!t.ids?.length && (
              <div className="flex flex-wrap items-center gap-1.5">
                {t.ids.map((id, k) => (
                  <button key={id} type="button" onClick={() => props.onCite(id)}
                    className="aurora-borde inline-flex h-6 items-center rounded-full bg-memoria-velo px-2.5 text-xs font-medium text-memoria transition-opacity hover:opacity-80">recuerdo {k + 1}</button>
                ))}
                <span className="text-xs text-texto-3 tabular-nums">{t.tokens} tokens de memoria</span>
                {!t.judged && !(busy && i === turns.length - 1) && (
                  <span className="ml-1 flex gap-1">
                    <button type="button" onClick={() => judge(i, true)} className="h-6 rounded-full px-2.5 text-xs text-texto-2 transition-colors hover:bg-s2 hover:text-texto">sirvió</button>
                    <button type="button" onClick={() => judge(i, false)} className="h-6 rounded-full px-2.5 text-xs text-texto-2 transition-colors hover:bg-s2 hover:text-texto">no sirvió</button>
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="grid gap-1.5 pt-2">
        <Compositor onEnviar={(q) => void send(q)} memoria={memoryOn} onMemoria={setMemoryOn} />
        <TiraUso proveedor={provider} modelo={model} etiqueta={`${current?.label ?? provider} · ${model || 'sin modelo'}`} sesion={sesion} />
      </div>
    </>
  )
}
