// Terminales del Taller, en un cajón: una shell o un agente en su forma original (por ejemplo, el binario oficial de Claude
// con tu propio login). Siguen vivas aunque cierres el cajón o cambies de sección. Los colores salen del tema.
import { FitAddon } from '@xterm/addon-fit'
import { Terminal } from '@xterm/xterm'
import '@xterm/xterm/css/xterm.css'
import { Plus, SquareTerminal, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { bridge, type AgentView } from '../lib/bridge'
import { cn } from '../lib/cn'

type Pestana = { id: string; agente: AgentView }
const color = (v: string) => getComputedStyle(document.documentElement).getPropertyValue(v).trim()

function Consola({ p, visible, tema }: { p: Pestana; visible: boolean; tema: string }) {
  const host = useRef<HTMLDivElement>(null)
  const ajuste = useRef<FitAddon | null>(null)
  const term = useRef<Terminal | null>(null)
  useEffect(() => {
    const pty = bridge.pty()!
    const t = new Terminal({ fontFamily: '"JetBrains Mono Variable", ui-monospace, monospace', fontSize: 12.5, lineHeight: 1.25, cursorBlink: true, allowTransparency: true })
    const f = new FitAddon(); t.loadAddon(f); ajuste.current = f; term.current = t
    t.open(host.current!); f.fit()
    const offs = [pty.onData(p.id, (d) => t.write(d)), pty.onExit(p.id, (c) => t.write(`\r\n\x1b[2m[terminado, código ${c}]\x1b[0m\r\n`))]
    const sub = t.onData((d) => pty.write(p.id, d))
    const ro = new ResizeObserver(() => { try { f.fit(); pty.resize(p.id, t.cols, t.rows) } catch { /* oculta */ } })
    ro.observe(host.current!)
    void pty.spawn({ id: p.id, agent: p.agente.id, cols: t.cols, rows: t.rows })
    return () => { ro.disconnect(); sub.dispose(); offs.forEach((o) => o()); pty.kill(p.id); t.dispose() }
  }, [p.id, p.agente.id])
  useEffect(() => {
    if (term.current) term.current.options.theme = { background: '#00000000', foreground: color('--texto'), cursor: color('--texto'), selectionBackground: color('--acento-velo') }
  }, [tema])
  useEffect(() => { if (visible) setTimeout(() => ajuste.current?.fit(), 40) }, [visible])
  return <div ref={host} className="size-full px-3 py-2" style={{ display: visible ? 'block' : 'none' }} />
}

export function Terminales({ abierto, onCerrar, tema }: { abierto: boolean; onCerrar(): void; tema: string }) {
  const [agentes, setAgentes] = useState<AgentView[]>([])
  const [pestanas, setPestanas] = useState<Pestana[]>([])
  const [activa, setActiva] = useState<string | null>(null)
  useEffect(() => { void bridge.agents().then(setAgentes) }, [])
  const abrir = (a: AgentView) => { const p = { id: bridge.newId(), agente: a }; setPestanas((v) => [...v, p]); setActiva(p.id) }
  const cerrar = (id: string) => { setPestanas((v) => v.filter((p) => p.id !== id)); setActiva((c) => (c === id ? null : c)) }
  const instalados = agentes.filter((a) => a.installed)

  return (
    <AnimatePresence>
      {(abierto || pestanas.length > 0) && (
        <motion.div initial={{ y: '100%' }} animate={{ y: abierto ? 0 : '100%' }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 380, damping: 40 }}
          className="vidrio absolute inset-x-5 bottom-0 z-30 flex h-[46%] min-h-[260px] flex-col overflow-hidden rounded-t-4 border border-b-0 shadow-flotante" aria-hidden={!abierto}>
          <div className="flex h-11 shrink-0 items-center gap-1 border-b border-linea px-2">
            {pestanas.map((p) => (
              <span key={p.id} className={cn('inline-flex h-8 items-center gap-1 rounded-2 pr-1 pl-3 text-[12.5px]', activa === p.id ? 'bg-s2 text-texto' : 'text-texto-3 hover:text-texto-2')}>
                <button type="button" onClick={() => setActiva(p.id)}>{p.agente.label}</button>
                <button type="button" onClick={() => cerrar(p.id)} aria-label={`Cerrar ${p.agente.label}`} className="grid size-6 place-items-center rounded-1 hover:bg-s3"><X className="size-3" /></button>
              </span>
            ))}
            <button type="button" onClick={() => setActiva(null)} className={cn('inline-flex h-8 items-center gap-1.5 rounded-2 px-2.5 text-[12.5px]', activa === null ? 'bg-s2 text-texto' : 'text-texto-3 hover:text-texto-2')}>
              <Plus className="size-3.5" />Abrir
            </button>
            <button type="button" onClick={onCerrar} aria-label="Cerrar el cajón de terminales" className="ml-auto grid size-8 place-items-center rounded-full text-texto-3 hover:bg-s2 hover:text-texto"><X className="size-4" strokeWidth={1.5} /></button>
          </div>
          <div className="relative min-h-0 flex-1">
            {activa === null && (
              <div className="grid h-full content-start gap-2 overflow-y-auto p-4 sm:grid-cols-2 lg:grid-cols-3">
                {agentes.map((a) => (
                  <button key={a.id} type="button" disabled={!a.installed} onClick={() => abrir(a)}
                    className="flex items-start gap-3 rounded-3 border border-linea bg-s1/60 p-3 text-left transition-colors hover:border-linea-fuerte disabled:opacity-45">
                    <SquareTerminal className="mt-0.5 size-4 shrink-0 text-texto-3" strokeWidth={1.5} />
                    <span className="min-w-0">
                      <span className="block text-[13px] text-texto">{a.label}</span>
                      <span className="block truncate text-xs text-texto-3">{!a.installed ? 'No instalado' : a.memory ? 'Con tu memoria' : a.note ?? 'Sin memoria por ahora'}</span>
                    </span>
                  </button>
                ))}
                {!instalados.length && <p className="text-sm text-texto-3">No encuentro terminales ni agentes instalados.</p>}
              </div>
            )}
            {pestanas.map((p) => <Consola key={p.id} p={p} visible={activa === p.id} tema={tema} />)}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
