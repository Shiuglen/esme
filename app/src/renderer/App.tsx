// Daimon — trabajas dentro de tu mente. El Atlas es el fondo; el trabajo flota encima.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Atlas, type AtlasHandle } from './atlas/Atlas'
import { CoreView, type CoreHandle } from './core/CoreView'
import { CommandPalette, type Command } from './components/CommandPalette'
import { Panel } from './components/Panel'
import { BrainClient, type Atlas as AtlasData, type MindEvent } from './lib/brain'
import { bridge } from './lib/bridge'
import { ChatPanel } from './panels/ChatPanel'
import { MemoryPanel } from './panels/MemoryPanel'
import { SettingsPanel } from './panels/SettingsPanel'
import { WorkshopPanel } from './panels/WorkshopPanel'

type PanelId = 'chat' | 'taller' | 'memoria' | 'ias'
const TITLES: Record<PanelId, string> = { chat: 'Conversación', taller: 'Taller', memoria: 'Memoria', ias: 'IAs y claves' }
const initial = (id: PanelId) => {
  const W = innerWidth, H = innerHeight
  return {
    chat: { x: W - 470, y: 70, w: 440, h: H - 180 },
    taller: { x: 24, y: H - 430, w: Math.min(820, W - 520), h: 340 },
    memoria: { x: 24, y: 76, w: 380, h: Math.max(320, H - 540) },
    ias: { x: W / 2 - 260, y: 110, w: 520, h: 560 },
  }[id]
}
const load = <T,>(k: string, d: T): T => { try { return JSON.parse(localStorage.getItem(k) ?? '') as T } catch { return d } }
const save = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* sin almacenamiento */ } }

export function App() {
  const [brain, setBrain] = useState<BrainClient | null>(null)
  const [memories, setMemories] = useState<number | null>(null)
  const [atlas, setAtlas] = useState<AtlasData | null>(null)
  const [day, setDay] = useState<boolean>(() => load('day', false))
  const [open, setOpen] = useState<PanelId[]>(() => load('open', ['chat', 'memoria']))
  const [front, setFront] = useState<PanelId>('chat')
  const [palette, setPalette] = useState(false)
  const [focusId, setFocusId] = useState<string | null>(null)
  const [saved, setSaved] = useState(0)
  const [seed, setSeed] = useState<{ q: string; n: number }>({ q: '', n: 0 })
  const [ask, setAsk] = useState('')
  const [thinking, setThinking] = useState(false)
  const atlasRef = useRef<AtlasHandle>(null)
  const coreRef = useRef<CoreHandle>(null)
  const [view, setView] = useState<'nucleo' | 'mapa'>(() => load('view', 'nucleo'))
  useEffect(() => { save('view', view) }, [view])

  // conexión con el cerebro (y reconexión si se reinicia)
  useEffect(() => {
    const connect = (info: { url: string; token: string } | null) => setBrain(info ? new BrainClient(info.url, info.token) : null)
    void bridge.brainInfo().then(connect)
    const off = bridge.onBrainChange(connect)
    const retry = setInterval(() => { if (!brain) void bridge.brainInfo().then((i) => i && connect(i)) }, 3000)
    return () => { off(); clearInterval(retry) }
  }, [])

  const refreshAtlas = useCallback(() => {
    if (!brain) return
    void brain.health().then((h) => setMemories(h.memories)).catch(() => setMemories(null))
    void brain.atlas().then(setAtlas).catch(() => {})
  }, [brain])
  useEffect(refreshAtlas, [refreshAtlas])

  // lo que hace la mente, en vivo: quién recordó qué
  useEffect(() => {
    if (!brain) return
    return brain.events((e: MindEvent) => {
      if (e.type === 'recall' && e.ids.length) { atlasRef.current?.light(e.ids, e.who, `recordó ${e.ids.length}`); coreRef.current?.recall(e.ids) }
      if (e.type === 'forget' || e.type === 'ingest' || e.type === 'remember') refreshAtlas()
    })
  }, [brain, refreshAtlas])

  useEffect(() => { document.documentElement.dataset.theme = day ? 'day' : 'night'; save('day', day) }, [day])
  useEffect(() => { save('open', open) }, [open])
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPalette((p) => !p) } }
    addEventListener('keydown', k); return () => removeEventListener('keydown', k)
  }, [])

  const show = (id: PanelId) => { setOpen((o) => (o.includes(id) ? o : [...o, id])); setFront(id) }
  const toggle = (id: PanelId) => setOpen((o) => (o.includes(id) ? o.filter((x) => x !== id) : [...o, id]))
  const focusMemory = (id: string) => { atlasRef.current?.focus(id); setFocusId(id); show('memoria') }

  const commands: Command[] = useMemo(() => [
    { id: 'ask', label: 'Preguntar a tu mente…', hint: 'Enter', run: (q) => { show('chat'); if (q.trim()) setSeed((s) => ({ q, n: s.n + 1 })) } },
    { id: 'taller', label: 'Abrir el Taller de agentes', hint: 'Claude · OpenCode · terminal', run: () => show('taller') },
    { id: 'memoria', label: 'Buscar en la memoria', run: () => show('memoria') },
    { id: 'ias', label: 'IAs y claves', run: () => show('ias') },
    { id: 'dia', label: day ? 'Pasar a la noche (luz)' : 'Pasar al día (tinta)', run: () => setDay((d) => !d) },
    { id: 'mapa', label: 'Recalcular el mapa', run: refreshAtlas },
  ], [day, refreshAtlas])

  const body = (id: PanelId) => {
    if (id === 'chat') return <ChatPanel brain={brain} onCite={focusMemory} onRecalled={(t) => setSaved((s) => s + Math.max(0, 1500 - t))} seed={seed} onBusy={setThinking} />
    if (id === 'taller') return <WorkshopPanel day={day} />
    if (id === 'memoria') return <MemoryPanel brain={brain} focusId={focusId} onFocus={(i) => atlasRef.current?.focus(i)} onChanged={refreshAtlas} />
    return <SettingsPanel />
  }

  return (
    <>
      {view === 'mapa' ? <Atlas ref={atlasRef} data={atlas} day={day} brain={brain} onPick={focusMemory} /> : <CoreView ref={coreRef} data={atlas} shift={open.includes('chat') ? 0.2 : 0} />}
      <div className="brand"><h1>Daimon</h1></div>

      {open.map((id) => (
        <Panel key={id} id={id} title={TITLES[id]} initial={initial(id)} front={front === id} onFront={() => setFront(id)} onClose={() => toggle(id)}>
          {body(id)}
        </Panel>
      ))}

      <div className="meta">
        <span title={brain ? brain.url : 'buscando el cerebro…'}>{brain && memories !== null ? <><b>{memories.toLocaleString('es')}</b> recuerdos</> : 'cerebro desconectado'}</span>
        {saved > 0 && <span title="Tokens que no hizo falta enviar a la IA"><b>{saved.toLocaleString('es')}</b> tokens ahorrados</span>}
        <button onClick={() => setPalette(true)}>Ctrl K</button>
      </div>
      <form className="dock" onSubmit={(e) => { e.preventDefault(); if (ask.trim()) { show('chat'); setSeed((s) => ({ q: ask, n: s.n + 1 })); setAsk('') } }}>
        <span className={`orb${brain && memories !== null ? '' : ' off'}${thinking ? ' thinking' : ''}`} aria-hidden="true" />
        <input value={ask} onChange={(e) => setAsk(e.target.value)} placeholder="Pregúntale a tu mente…" aria-label="Pregúntale a tu mente" />
        <div className="tools">
          {(['taller', 'memoria'] as PanelId[]).map((id) => (
            <button type="button" key={id} className={`tool${open.includes(id) ? ' on' : ''}`} onClick={() => toggle(id)}>{TITLES[id]}</button>
          ))}
          <button type="button" className={`tool${view === 'mapa' ? ' on' : ''}`} onClick={() => setView((v) => (v === 'nucleo' ? 'mapa' : 'nucleo'))}>Mapa</button>
        </div>
        <button className="send" disabled={!ask.trim()} aria-label="Preguntar">↑</button>
      </form>
      <nav className="statusbar" aria-label="Barra de estado">
        <span className="chip" title={brain ? brain.url : 'buscando el cerebro…'}>
          <span className={`dot${brain && memories !== null ? '' : ' off'}`} />
          {brain && memories !== null ? `${memories.toLocaleString('es')} recuerdos` : 'cerebro desconectado'}
        </span>
        <span className="sep" />
        {(['chat', 'taller', 'memoria', 'ias'] as PanelId[]).map((id) => (
          <button key={id} className={`chip${open.includes(id) ? ' on' : ''}`} onClick={() => toggle(id)}>{TITLES[id]}</button>
        ))}
        <span className="sep" />
        <button className="chip" onClick={() => setView((v) => (v === 'nucleo' ? 'mapa' : 'nucleo'))}>{view === 'nucleo' ? 'mapa' : 'núcleo'}</button>
        <button className="chip" onClick={() => setPalette(true)}>buscar <span className="kbd">Ctrl K</span></button>
        {saved > 0 && <span className="chip" title="Tokens que el Tálamo no tuvo que mandar">−{saved.toLocaleString('es')} tokens</span>}
      </nav>

      <CommandPalette open={palette} commands={commands} onClose={() => setPalette(false)} />
    </>
  )
}
