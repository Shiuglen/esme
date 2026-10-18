// La conversación de Esme: con cualquier IA y con tu memoria. Cada conversación se guarda (main/hilos) y se retoma o se
// busca desde la columna de la izquierda. Esme escribe como texto de lectura (sin burbujas); tus mensajes van en cristal.
// Ves qué recordó (y lo previsualizas al pasar por encima), le enseñas si sirvió y puedes oír cualquier respuesta.
import { AnimatePresence, motion } from 'motion/react'
import { Check, ChevronDown, Copy, MessageSquarePlus, Search, Trash2, Volume2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { BrainClient, Memory } from '../lib/brain'
import { Markdown } from '../chat/Markdown'
import { TiraUso, type UsoSesion } from '../chat/TiraUso'
import { cn } from '../lib/cn'
import { Compositor } from '../shell/Compositor'
import { bridge, type ChatMsg, type ProviderView, type ResumenHilo, type TurnoHilo } from '../lib/bridge'
import { haceCuanto, recorta } from '../paginas/diario'
import { useMuelle } from '../tinta/movimiento'
import { explicarFallo, modeloInicial, ordenMotores } from './motor'

type Turn = TurnoHilo

export function ChatPanel(props: { brain: BrainClient | null; onCite(id: string): void; onRecalled(tokens: number): void; seed?: { q: string; n: number; voz?: boolean }; onBusy?(b: boolean): void; onHablar?(texto: string): void; onVivo?(texto: string, fin: boolean, sinPermiso?: { motor: string; id: string }): void; panorama?: string }) {
  const [providers, setProviders] = useState<ProviderView[]>([])
  const [provider, setProvider] = useState('')   // se elige el primero que responde (panels/motor.ts)
  const [aviso, setAviso] = useState<string | null>(null)
  const [models, setModels] = useState<string[]>([])
  const [model, setModel] = useState('')
  const [memoryOn, setMemoryOn] = useState(true)
  const [turns, setTurns] = useState<Turn[]>([])
  const [busy, setBusy] = useState(false)
  const [fase, setFase] = useState<string | null>(null)   // qué está haciendo Esme mientras responde
  const [sesion, setSesion] = useState<UsoSesion>({ costeUSD: 0, ultimaEntrada: 0, memoria: 0 })
  const log = useRef<HTMLDivElement>(null)

  // —— las conversaciones guardadas ——
  const hilo = useRef<{ id: string; creado: number } | null>(null)
  const [hiloId, setHiloId] = useState<string | null>(null)
  const [lista, setLista] = useState<ResumenHilo[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [encontrados, setEncontrados] = useState<(ResumenHilo & { trozo: string })[] | null>(null)
  const refrescar = () => void bridge.hilos.lista().then(setLista)
  useEffect(refrescar, [])
  useEffect(() => {
    if (!busqueda.trim()) { setEncontrados(null); return }
    const t = setTimeout(() => void bridge.hilos.buscar(busqueda).then(setEncontrados), 180)
    return () => clearTimeout(t)
  }, [busqueda])
  // se guarda al terminar cada respuesta (nunca a medias)
  useEffect(() => {
    if (busy || !turns.length) return
    void (async () => {
      if (!hilo.current) { hilo.current = { id: await bridge.hilos.nuevoId(), creado: Date.now() }; setHiloId(hilo.current.id) }
      const primera = turns.find((t) => t.role === 'user')?.content ?? ''
      await bridge.hilos.guardar({ id: hilo.current.id, titulo: primera ? recorta(primera, 55) : 'Conversación nueva', creado: hilo.current.creado, actualizado: Date.now(), motor: provider, modelo: model, turnos: turns })
      refrescar()
    })()
  }, [busy, turns])  // eslint-disable-line react-hooks/exhaustive-deps
  const nueva = () => { if (busy) return; hilo.current = null; setHiloId(null); setTurns([]); setSesion({ costeUSD: 0, ultimaEntrada: 0, memoria: 0 }) }
  const abrir = async (id: string) => {
    if (busy) return
    const h = await bridge.hilos.leer(id); if (!h) { refrescar(); return }
    hilo.current = { id: h.id, creado: h.creado }; setHiloId(h.id); setTurns(h.turnos)
  }
  const [borrando, setBorrando] = useState<string | null>(null)
  const borrar = async (id: string) => { await bridge.hilos.borrar(id); if (hilo.current?.id === id) nueva(); setBorrando(null); refrescar() }

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
  useEffect(() => {   // preguntas desde el centro de mando, la voz o Cmd+K: esperan a que haya modelo, nunca se pierden
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
    setTurns((t) => [...t, { role: 'user', content: q }])
    if (memoryOn && props.brain && permiso) {
      setFase('Recordando en tu memoria…')
      try {
        const r = await props.brain.recall(q, 1500, 'chat')
        memory = r.abstained ? null : { context: r.context, ids: r.ids }
        meta = { query: q, ids: r.ids, abstained: r.abstained, tokens: r.tokens }
        props.onRecalled(r.tokens)
        memTokens = r.abstained ? 0 : r.tokens
        if (r.ids.length) setFase(`Recordé ${r.ids.length} ${r.ids.length === 1 ? 'recuerdo' : 'recuerdos'}. Pensando…`)
      } catch (e) { meta = { abstained: true }; console.warn(e) }
    }
    if (!meta.ids?.length) setFase('Pensando…')
    const history: ChatMsg[] = [...turns.filter((t) => !t.error).map((t) => ({ role: t.role, content: t.content })), { role: 'user', content: q }]
    setTurns((t) => [...t, { role: 'assistant', content: '', who: `${current?.label ?? provider} · ${model}`, ...meta }])
    let dicho = ''
    // el panorama de tu mente viaja solo con la memoria activada (son datos tuyos, como la memoria)
    const s = bridge.chat(provider, model, history, memory, undefined, { panorama: conMemoria ? props.panorama : undefined, voz: porVoz })
    s.onUsage((u) => setSesion((v) => ({ costeUSD: v.costeUSD + u.costeUSD, ultimaEntrada: u.entrada, memoria: memTokens })))
    s.onChunk((d) => { dicho += d; setFase(null); if (porVoz) props.onVivo?.(dicho, false); return setTurns((t) => { const c = [...t]; c[c.length - 1] = { ...c[c.length - 1], content: c[c.length - 1].content + d }; return c }) })
    // El pensado viaja en su hilo: los que piensan antes de hablar no dejan el chat mudo.
    s.onPensamiento((d) => setTurns((t) => { const c = [...t]; const u = c[c.length - 1]; c[c.length - 1] = { ...u, pensamiento: (u.pensamiento ?? '') + d }; return c }))
    s.onDone(() => {
      setBusy(false); setFase(null)
      if (porVoz) props.onVivo?.(dicho.trim() || 'El modelo respondió vacío. Prueba con otro modelo.', true, memoryOn && props.brain && !permiso ? { motor: current?.label ?? provider, id: provider } : undefined)
      if (porVoz && dicho.trim()) props.onHablar?.(dicho)
      // Honestidad ante modelos que responden vacío: sin texto ni pensado, la respuesta no es una respuesta.
      setTurns((t) => {
        const c = [...t]; const la = c[c.length - 1]
        if (!la || la.content !== '' || la.error) return t
        const nota = la.pensamiento ? `El modelo pensó (${la.pensamiento.length} caracteres) pero no trajo texto. Prueba con otro modelo.` : 'El modelo respondió vacío: no trajo texto. Prueba con otro modelo.'
        c[c.length - 1] = { ...la, content: nota, error: true }
        return c
      })
    })
    s.onError((m) => { setBusy(false); setFase(null); if (porVoz) props.onVivo?.(explicarFallo(m, current?.label ?? provider), true); setTurns((t) => { const c = [...t]; c[c.length - 1] = { ...c[c.length - 1], content: explicarFallo(m, current?.label ?? provider), error: true }; return c }) })
  }

  async function judge(i: number, useful: boolean) {
    const t = turns[i]
    if (!props.brain || !t.ids?.length || !t.query) return
    await props.brain.feedback(t.ids, useful, t.query).catch(() => {})
    setTurns((all) => all.map((x, k) => (k === i ? { ...x, judged: true } : x)))
  }

  const muelle = useMuelle({ stiffness: 380, damping: 34 })
  const filas = encontrados ?? lista
  const selector = 'h-8 min-w-0 appearance-none truncate rounded-full border border-linea bg-s1/70 pr-7 pl-3.5 text-[13px] text-texto-2 outline-none backdrop-blur transition-colors hover:border-linea-fuerte focus-visible:border-foco'
  return (
    <div className="grid min-h-0 flex-1 grid-cols-[248px_minmax(0,1fr)] gap-4">
      {/* —— tus conversaciones —— */}
      <aside aria-label="Tus conversaciones" className="flex min-h-0 flex-col gap-2 border-r border-linea pr-3">
        <button type="button" onClick={nueva} disabled={busy}
          className="flex h-9 items-center gap-2 rounded-3 bg-acento px-3 text-[13.5px] font-medium text-sobre-acento shadow-[0_6px_20px_-8px_var(--acento)] transition-transform hover:-translate-y-px disabled:opacity-50">
          <MessageSquarePlus className="size-4" strokeWidth={1.75} />Conversación nueva
        </button>
        <label className="relative">
          <span className="sr-only">Buscar en tus conversaciones</span>
          <Search className="pointer-events-none absolute top-2.5 left-2.5 size-3.5 text-texto-3" strokeWidth={1.75} aria-hidden />
          <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar en lo hablado"
            className="h-9 w-full rounded-3 border border-linea bg-s1/60 pr-2 pl-8 text-[13px] text-texto outline-none placeholder:text-texto-3 focus:border-foco" />
        </label>
        <ol className="m-0 grid min-h-0 list-none content-start gap-0.5 overflow-y-auto p-0">
          {filas.map((h) => (
            <li key={h.id} className="group relative">
              <button type="button" onClick={() => void abrir(h.id)} aria-current={h.id === hiloId ? 'true' : undefined}
                className={cn('grid w-full gap-0.5 rounded-3 px-2.5 py-2 pr-8 text-left transition-colors hover:bg-s2/70', h.id === hiloId && 'bg-s2')}>
                <span className="truncate text-[13.5px] text-texto">{h.titulo}</span>
                <span className="truncate text-[11.5px] text-texto-3">{'trozo' in h ? (h as { trozo: string }).trozo : `${haceCuanto(h.actualizado, Date.now())} · ${h.mensajes} mensajes`}</span>
              </button>
              <button type="button" onClick={() => (borrando === h.id ? void borrar(h.id) : setBorrando(h.id))} onBlur={() => setBorrando(null)}
                aria-label={borrando === h.id ? `Confirmar: borrar «${h.titulo}»` : `Borrar «${h.titulo}»`}
                className={cn('absolute top-2 right-1.5 rounded-2 p-1 transition-opacity', borrando === h.id ? 'bg-peligro/15 text-peligro opacity-100' : 'text-texto-3 opacity-0 group-hover:opacity-100 hover:text-texto focus-visible:opacity-100')}>
                <Trash2 className="size-3.5" strokeWidth={1.75} />
              </button>
            </li>
          ))}
          {!filas.length && <li className="px-2.5 py-3 text-[13px] text-texto-3">{busqueda ? 'Nada de eso en lo hablado.' : 'Aquí quedarán tus conversaciones.'}</li>}
        </ol>
      </aside>

      {/* —— la conversación —— */}
      <section aria-label="Conversación" className="flex min-h-0 flex-col">
        <header className="flex items-center gap-2 pb-2">
          <label className="relative">
            <span className="sr-only">IA</span>
            <select className={cn(selector, 'max-w-[200px]')} value={provider} onChange={(e) => elegirMotor(e.target.value)}>
              {providers.map((p) => <option key={p.id} value={p.id} disabled={!p.hasKey}>{p.label}{p.hasKey ? '' : ' (sin clave)'}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute top-2 right-2 size-4 text-texto-3" strokeWidth={1.5} aria-hidden />
          </label>
          <label className="relative min-w-0 max-w-[340px] flex-1">
            <span className="sr-only">Modelo</span>
            <select className={cn(selector, 'w-full')} value={model} onChange={(e) => { setModel(e.target.value); try { localStorage.setItem(`esme:modelo:${provider}`, e.target.value) } catch { /* sin almacenamiento */ } }}>
              {models.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute top-2 right-2 size-4 text-texto-3" strokeWidth={1.5} aria-hidden />
          </label>
        </header>
        {aviso && <p role="status" className="m-0 pb-1 text-[13px] text-atencion">{aviso}</p>}

        <div ref={log} className="min-h-0 flex-1 overflow-y-auto" aria-live="polite">
          <div className="mx-auto grid w-full max-w-[760px] gap-7 px-2 py-6">
            {!turns.length && (
              <div className="grid justify-items-center gap-3 pt-[12vh] text-center">
                <Esfera grande />
                <p className="m-0 text-[30px] leading-tight font-light tracking-[-0.03em] text-texto">¿En qué piensas?</p>
                <p className="m-0 max-w-[46ch] text-[14.5px] text-texto-3">Esme le da a la IA solo lo que necesita de tu memoria. Verás qué recordó, podrás decirle si sirvió, y todo queda guardado aquí.</p>
              </div>
            )}
            <AnimatePresence initial={false}>
              {turns.map((t, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={muelle}>
                  {t.role === 'user' ? (
                    <div className="ml-auto w-fit max-w-[82%] rounded-4 rounded-br-2 border border-linea bg-s2/70 px-4 py-2.5 text-[15.5px] leading-[1.6] whitespace-pre-wrap text-texto shadow-[0_8px_30px_-18px_rgba(0,0,0,.6)] backdrop-blur-md">{t.content}</div>
                  ) : (
                    <Respuesta t={t} ultima={i === turns.length - 1} busy={busy} fase={fase} brain={props.brain} onCite={props.onCite}
                      onJuzgar={(u) => void judge(i, u)} onEscuchar={props.onHablar ? () => props.onHablar!(t.content) : undefined} />
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        <div className="mx-auto grid w-full max-w-[800px] gap-1.5 pt-2">
          <Compositor onEnviar={(q) => void send(q)} memoria={memoryOn} onMemoria={setMemoryOn} />
          <TiraUso proveedor={provider} modelo={model} etiqueta={`${current?.label ?? provider} · ${model || 'sin modelo'}`} sesion={sesion} />
        </div>
      </section>
    </div>
  )
}

// La pequeña presencia de Esme junto a lo que escribe: una esfera de luz del color de tu piel.
function Esfera({ grande, viva }: { grande?: boolean; viva?: boolean }) {
  return <span aria-hidden className={cn('relative block shrink-0 rounded-full', grande ? 'size-14' : 'size-6', viva && 'animate-[latido_1.6s_ease-in-out_infinite]')}
    style={{ background: 'radial-gradient(circle at 35% 30%, color-mix(in oklab, var(--acento), white 55%), var(--acento) 45%, color-mix(in oklab, var(--acento), black 45%))', boxShadow: '0 0 18px -2px var(--acento)' }} />
}

function Respuesta({ t, ultima, busy, fase, brain, onCite, onJuzgar, onEscuchar }: {
  t: Turn; ultima: boolean; busy: boolean; fase: string | null; brain: BrainClient | null; onCite(id: string): void; onJuzgar(util: boolean): void; onEscuchar?(): void
}) {
  const [copiado, setCopiado] = useState(false)
  const trabajando = busy && ultima
  return (
    <article className="grid grid-cols-[24px_minmax(0,1fr)] gap-x-3 gap-y-2">
      <Esfera viva={trabajando} />
      <div className="grid min-w-0 gap-2">
        <span className="text-xs text-texto-3">Esme · {t.who?.split(' · ').slice(1).join(' · ') || t.who}</span>
        <div className={cn('text-[16px] leading-[1.75]', t.error ? 'text-peligro whitespace-pre-wrap' : 'text-texto')}>
          {t.content
            ? (t.error ? t.content : <Markdown texto={t.content} />)
            : t.pensamiento
              ? <p className="m-0 max-h-28 overflow-hidden text-[13.5px] leading-6 italic text-texto-2/80 [mask-image:linear-gradient(180deg,black_55%,transparent)]">{t.pensamiento}</p>
              : trabajando ? <Brillo texto={fase ?? 'Pensando…'} /> : null}
        </div>
        {t.abstained && <span className="text-xs text-texto-3">Sin memoria relevante: respondió solo con lo que sabe.</span>}
        <div className="flex flex-wrap items-center gap-1.5">
          {t.ids?.map((id, k) => <Cita key={id} id={id} n={k + 1} brain={brain} onCite={onCite} />)}
          {!!t.ids?.length && <span className="text-xs text-texto-3 tabular-nums">{t.tokens} tokens de memoria</span>}
          {!!t.ids?.length && !t.judged && !trabajando && (
            <span className="flex gap-1">
              <button type="button" onClick={() => onJuzgar(true)} className="h-6 rounded-full px-2.5 text-xs text-texto-2 transition-colors hover:bg-s2 hover:text-texto">sirvió</button>
              <button type="button" onClick={() => onJuzgar(false)} className="h-6 rounded-full px-2.5 text-xs text-texto-2 transition-colors hover:bg-s2 hover:text-texto">no sirvió</button>
            </span>
          )}
          {t.content && !t.error && !trabajando && (
            <span className="ml-auto flex gap-0.5">
              {onEscuchar && <button type="button" onClick={onEscuchar} aria-label="Escuchar esta respuesta" title="Escuchar" className="rounded-2 p-1.5 text-texto-3 transition-colors hover:bg-s2 hover:text-texto"><Volume2 className="size-3.5" strokeWidth={1.75} /></button>}
              <button type="button" aria-label="Copiar esta respuesta" title="Copiar" onClick={() => { void navigator.clipboard.writeText(t.content); setCopiado(true); setTimeout(() => setCopiado(false), 1400) }}
                className="rounded-2 p-1.5 text-texto-3 transition-colors hover:bg-s2 hover:text-texto">{copiado ? <Check className="size-3.5 text-exito" strokeWidth={2} /> : <Copy className="size-3.5" strokeWidth={1.75} />}</button>
            </span>
          )}
        </div>
      </div>
    </article>
  )
}

// texto con un brillo que lo recorre: Esme está trabajando (y dice en qué)
function Brillo({ texto }: { texto: string }) {
  return <span role="status" className="inline-block bg-[linear-gradient(90deg,var(--texto-3)_0%,var(--texto)_45%,var(--texto-3)_90%)] bg-[length:200%_100%] bg-clip-text text-[15px] text-transparent animate-[brillo_1.8s_linear_infinite]">{texto}</span>
}

// una cita de tu memoria: al pasar por encima enseña qué recuerda; al pulsarla, lo enfoca en tu mente
const cache = new Map<string, Memory | null>()
function Cita({ id, n, brain, onCite }: { id: string; n: number; brain: BrainClient | null; onCite(id: string): void }) {
  const [abierta, setAbierta] = useState(false)
  const [m, setM] = useState<Memory | null | undefined>(cache.get(id))
  const ver = () => { setAbierta(true); if (m === undefined && brain) void brain.memory(id).then((x) => { cache.set(id, x); setM(x) }).catch(() => { cache.set(id, null); setM(null) }) }
  const fecha = useMemo(() => (m?.ts ? haceCuanto(Date.parse(m.ts), Date.now()) : ''), [m])
  return (
    <span className="relative" onMouseEnter={ver} onMouseLeave={() => setAbierta(false)} onFocus={ver} onBlur={() => setAbierta(false)}>
      <button type="button" onClick={() => onCite(id)}
        className="aurora-borde inline-flex h-6 items-center rounded-full bg-memoria-velo px-2.5 text-xs font-medium text-memoria transition-opacity hover:opacity-80">recuerdo {n}</button>
      {abierta && (
        <span role="tooltip" className="hoja absolute bottom-8 left-0 z-30 grid w-[320px] gap-1 rounded-3 border border-linea p-3 text-left shadow-xl backdrop-blur-xl">
          <span className="text-[11px] text-texto-3">{m ? `${m.kind} · ${fecha}` : m === null ? 'No lo encuentro en tu mente' : 'Recordando…'}</span>
          {m && <span className="text-[13px] leading-snug text-texto">{recorta(m.text, 260)}</span>}
        </span>
      )}
    </span>
  )
}
