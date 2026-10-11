// Taller: agentes reales en terminales dentro de la app, conectados a tu memoria por MCP. Aquí se construye Daimon.
import { FitAddon } from '@xterm/addon-fit'
import { Terminal } from '@xterm/xterm'
import '@xterm/xterm/css/xterm.css'
import { useEffect, useRef, useState } from 'react'
import { bridge, type AgentView } from '../lib/bridge'

type Tab = { id: string; agent: AgentView }

function TermView({ tab, visible, day }: { tab: Tab; visible: boolean; day: boolean }) {
  const host = useRef<HTMLDivElement>(null)
  const fit = useRef<FitAddon | null>(null)
  useEffect(() => {
    const pty = bridge.pty()!
    const term = new Terminal({ fontFamily: 'ui-monospace, "JetBrains Mono", monospace', fontSize: 13, cursorBlink: true, allowTransparency: true,
      theme: { background: '#00000000', foreground: day ? '#2b241c' : '#dfeee9', cursor: day ? '#8a4a1c' : '#7ef2d0', selectionBackground: '#7ef2d044' } })
    const f = new FitAddon(); term.loadAddon(f); fit.current = f
    term.open(host.current!); f.fit()
    const offs = [pty.onData(tab.id, (d) => term.write(d)), pty.onExit(tab.id, (c) => term.write(`\r\n\x1b[2m[terminado · código ${c}]\x1b[0m\r\n`))]
    const sub = term.onData((d) => pty.write(tab.id, d))
    const ro = new ResizeObserver(() => { try { f.fit(); pty.resize(tab.id, term.cols, term.rows) } catch { /* oculto */ } })
    ro.observe(host.current!)
    void pty.spawn({ id: tab.id, agent: tab.agent.id, cols: term.cols, rows: term.rows })
    return () => { ro.disconnect(); sub.dispose(); offs.forEach((o) => o()); pty.kill(tab.id); term.dispose() }
  }, [tab.id])
  useEffect(() => { if (visible) setTimeout(() => fit.current?.fit(), 30) }, [visible])
  return <div ref={host} className="term" style={{ display: visible ? 'block' : 'none' }} />
}

export function WorkshopPanel({ day }: { day: boolean }) {
  const [agents, setAgents] = useState<AgentView[]>([])
  const [tabs, setTabs] = useState<Tab[]>([])
  const [active, setActive] = useState<string | null>(null)
  useEffect(() => { void bridge.agents().then(setAgents) }, [])

  if (bridge.mode() === 'web') return <p className="muted" style={{ padding: 16 }}>El Taller corre agentes reales: ábrelo en la app de escritorio (npm run dev).</p>

  const open = (a: AgentView) => { const t = { id: bridge.newId(), agent: a }; setTabs((x) => [...x, t]); setActive(t.id) }
  const close = (id: string) => { setTabs((x) => x.filter((t) => t.id !== id)); setActive((cur) => (cur === id ? null : cur)) }

  return (
    <>
      <div className="tabs">
        <button className={`tab${active === null ? ' on' : ''}`} onClick={() => setActive(null)}>＋ agente</button>
        {tabs.map((t) => (
          <button key={t.id} className={`tab${active === t.id ? ' on' : ''}`} onClick={() => setActive(t.id)}>
            {t.agent.label}<span onClick={(e) => { e.stopPropagation(); close(t.id) }} aria-label="Cerrar">✕</span>
          </button>
        ))}
      </div>
      {active === null && (
        <div className="agents scroll">
          {agents.map((a) => (
            <button key={a.id} className="agent" disabled={!a.installed} onClick={() => open(a)}>
              <b>{a.label}</b>
              {a.installed ? (a.memory ? <span className="mem">● conectado a tu memoria</span> : <span className="muted">sin memoria (por ahora)</span>) : <span className="muted">no instalado</span>}
              {a.note && <div className="muted" style={{ marginTop: 4 }}>{a.note}</div>}
            </button>
          ))}
        </div>
      )}
      {tabs.map((t) => <TermView key={t.id} tab={t} visible={active === t.id} day={day} />)}
    </>
  )
}
