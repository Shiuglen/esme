// El lanzador de Esme (estado del arte: «contexto con un gesto», Raycast Quick AI): desde cualquier app, Ctrl+Mayús+Espacio.
// Tres modos: preguntar (Esme responde aquí, con sus manos y sus pasos), encargar al equipo (una tarea en el Taller) y
// buscar en tu mente (por significado, al teclear). Esc lo esconde; «Seguir en Esme» abre la conversación entera.
import { ArrowUpRight, Brain, CornerDownLeft, Hammer, MessageCircle } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { Markdown } from '../chat/Markdown'
import { aplicarPaso, type PasoVisto } from '../chat/pasos'
import { Pasos, PidePermiso } from '../chat/PasosVivos'
import { bridge, type ProviderView } from '../lib/bridge'
import { explicarFallo, modeloInicial, ordenMotores } from '../panels/motor'
import type { PermisoPedido } from '../lib/bridge'
import { BrainClient, type Memory } from '../lib/brain'
import { cn } from '../lib/cn'
import { haceCuanto } from '../paginas/diario'
import { sinMarkdown } from '../lib/texto-plano'
import { PuntoVista } from '../marca/PuntoVista'

type Modo = 'preguntar' | 'encargar' | 'mente'
const MODOS: { id: Modo; nombre: string; tecla: string; icono: typeof MessageCircle }[] = [
  { id: 'preguntar', nombre: 'Preguntar', tecla: 'Intro', icono: MessageCircle },
  { id: 'encargar', nombre: 'Encargar al equipo', tecla: 'Ctrl Intro', icono: Hammer },
  { id: 'mente', nombre: 'Buscar en tu mente', tecla: 'Tab', icono: Brain },
]
const leer = (k: string) => { try { return localStorage.getItem(k) } catch { return null } }
const lz = () => (window as unknown as { daimon?: { lanzador?: { ocultar(): void; abrirEsme(x: unknown): void; encargar(t: string): Promise<{ ok: boolean; error?: string; titulo?: string; agente?: string }>; onAbierto(f: () => void): () => void } } }).daimon?.lanzador

export function Lanzador() {
  const [texto, setTexto] = useState('')
  const [modo, setModo] = useState<Modo>('preguntar')
  const [respuesta, setRespuesta] = useState<{ pregunta: string; texto: string; pasos: PasoVisto[]; fin: boolean; error?: string } | null>(null)
  const [pidiendo, setPidiendo] = useState<(PermisoPedido & { responder(r: 'una' | 'siempre' | 'no'): void }) | null>(null)
  const [aviso, setAviso] = useState('')
  const [recuerdos, setRecuerdos] = useState<Memory[]>([])
  const campo = useRef<HTMLTextAreaElement>(null)
  const cerebro = useRef<BrainClient | null>(null)
  const flujo = useRef<{ stop(): void } | null>(null)

  useEffect(() => {
    void bridge.brainInfo().then((i) => { if (i) cerebro.current = new BrainClient() })
    const reiniciar = () => { setTimeout(() => campo.current?.focus(), 30); setAviso('') }
    reiniciar()
    return lz()?.onAbierto(reiniciar)
  }, [])
  useEffect(() => {
    if (modo !== 'mente' || !texto.trim() || !cerebro.current) { setRecuerdos([]); return }
    const t = setTimeout(() => void cerebro.current!.search(texto.trim(), 6).then(setRecuerdos).catch(() => setRecuerdos([])), 180)
    return () => clearTimeout(t)
  }, [texto, modo])

  const preguntar = async (q: string) => {
    flujo.current?.stop()
    // el mismo motor que elegiría el chat: el último que usaste si responde, si no el primero vivo (locales antes que API)
    const ps = await bridge.providers().catch(() => [] as ProviderView[])
    let proveedor = leer('esme:proveedor') ?? '', modelo = ''
    for (const p of ordenMotores(ps, proveedor || null)) {
      const ms = await bridge.models(p.id).catch(() => [] as string[])
      if (ms.length) { proveedor = p.id; modelo = modeloInicial(ms, p.defaultModel, leer(`esme:modelo:${p.id}`)); break }
    }
    if (!proveedor) { setRespuesta({ pregunta: q, texto: '', pasos: [], fin: true, error: 'Ningún motor responde ahora. Conecta uno en Ajustes.' }); return }
    setRespuesta({ pregunta: q, texto: '', pasos: [], fin: false }); setTexto('')
    const s = bridge.chat(proveedor, modelo, [{ role: 'user', content: q }], null)
    flujo.current = s
    s.onChunk((d) => setRespuesta((r) => r && { ...r, texto: r.texto + d }))
    s.onPaso((p) => setRespuesta((r) => r && { ...r, pasos: aplicarPaso(r.pasos, p) }))
    s.onPermiso((p) => setPidiendo({ ...p, responder: (x) => { s.responder(p.id, x); setPidiendo(null) } }))
    s.onDone(() => { setRespuesta((r) => r && { ...r, fin: true }); setPidiendo(null) })
    s.onError((m) => { setRespuesta((r) => r && { ...r, fin: true, error: explicarFallo(m, ps.find((p) => p.id === proveedor)?.label ?? proveedor) }); setPidiendo(null) })
  }
  const encargar = async (t: string) => {
    setAviso('Encargando…')
    const r = await lz()?.encargar(t)
    setAviso(r?.ok ? `${r.agente} ya trabaja en «${r.titulo}». Lo ves en el Taller.` : r?.error ?? 'No se pudo encargar.')
    if (r?.ok) setTexto('')
  }
  const enviar = (m: Modo = modo) => {
    const q = texto.trim()
    if (!q) return
    if (m === 'encargar') void encargar(q)
    else if (m === 'mente') lz()?.abrirEsme({ seccion: 'memoria' })
    else preguntar(q)
  }

  return (
    <div className="grid h-screen place-items-start bg-transparent p-2" onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); lz()?.ocultar() } }}>
      <section className="flex max-h-[calc(100vh-16px)] w-full flex-col overflow-hidden rounded-[18px] border border-linea bg-[color-mix(in_oklab,var(--fondo)_96%,transparent)] shadow-[0_30px_80px_-20px_rgb(0_0_0/0.7)]">
        <div className="flex items-start gap-3 pl-6">
        {/* Esme está aquí: su Punto, que se revuelve mientras piensa */}
        <PuntoVista px={30} tam="30px" estado={respuesta && !respuesta.fin ? 'pensando' : 'reposo'} titulo="Esme" className="mt-[26px] shrink-0 text-acento" />
        <textarea ref={campo} value={texto} rows={1} onChange={(e) => setTexto(e.target.value)} aria-label="Escribe a Esme"
          placeholder={modo === 'mente' ? 'Busca en tu mente…' : modo === 'encargar' ? '¿Qué hace tu equipo?' : 'Dime.'}
          onKeyDown={(e) => {
            if (e.key === 'Tab') { e.preventDefault(); setModo((m) => MODOS[(MODOS.findIndex((x) => x.id === m) + (e.shiftKey ? 2 : 1)) % 3].id) }
            else if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(e.ctrlKey || e.metaKey ? 'encargar' : modo) }
          }}
          className="block max-h-40 w-full resize-none bg-transparent pt-5 pr-6 pb-3 font-display text-[28px] leading-[1.25] text-texto italic outline-none placeholder:text-texto-3" />
        </div>
        <div role="tablist" aria-label="Qué hacer" className="flex flex-wrap items-center gap-1 border-b border-linea px-4 pb-3">
          {MODOS.map(({ id, nombre, tecla, icono: I }) => (
            <button key={id} type="button" role="tab" aria-selected={modo === id} onClick={() => { setModo(id); campo.current?.focus() }}
              className={cn('inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[12.5px] transition-colors', modo === id ? 'bg-s2 text-texto' : 'text-texto-3 hover:text-texto')}>
              <I className="size-3.5" strokeWidth={1.75} />{nombre}<kbd className="font-sans text-[10.5px] opacity-60">{tecla}</kbd>
            </button>
          ))}
          <span className="ml-auto inline-flex items-center gap-1 text-[11.5px] text-texto-3"><CornerDownLeft className="size-3" />{modo === 'encargar' ? 'encargar' : modo === 'mente' ? 'abrir tu mente' : 'preguntar'}</span>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          <AnimatePresence mode="wait" initial={false}>
            {modo === 'mente' ? (
              <motion.ol key="mente" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="m-0 grid list-none gap-0 p-0">
                {recuerdos.map((m) => (
                  <li key={m.id} className="border-b border-dashed border-linea/70 py-2.5 last:border-0">
                    <p className="m-0 text-[11.5px] text-texto-3">{haceCuanto(Date.parse(m.ts), Date.now())} · {m.source.split('/').pop()}</p>
                    <p className="m-0 line-clamp-2 text-[13.5px] leading-5 text-texto-2">{sinMarkdown(m.text)}</p>
                  </li>
                ))}
                {!recuerdos.length && (
                  <li className="grid gap-2 py-3">
                    <p className="m-0 text-[13px] text-texto-3">
                      {!cerebro.current ? 'Tu mente está apagada: no puedo buscar en lo que aún no recuerda.' : texto.trim() ? 'Nada con ese significado.' : 'Escribe y Esme busca por significado, no por palabras.'}
                    </p>
                    {!cerebro.current && <p className="m-0 text-[12px] text-texto-3">Enciéndela en Esme y vuelve a buscar.</p>}
                  </li>
                )}
              </motion.ol>
            ) : respuesta ? (
              <motion.div key="respuesta" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="grid gap-3">
                <p className="m-0 text-[12.5px] text-texto-3">Tú: <span className="text-texto-2">{respuesta.pregunta}</span></p>
                {!!respuesta.pasos.length && <Pasos pasos={respuesta.pasos} />}
                {pidiendo && <PidePermiso pedido={pidiendo} onResponder={pidiendo.responder} />}
                <div className={cn('text-[15px] leading-[1.7]', respuesta.error ? 'text-peligro' : 'text-texto')}>
                  {respuesta.error ?? (respuesta.texto ? <Markdown texto={respuesta.texto} /> : !pidiendo && <span className="animate-pulse text-texto-3">Pensando…</span>)}
                </div>
                {respuesta.fin && (
                  <button type="button" onClick={() => lz()?.abrirEsme({ seccion: 'conversacion', pregunta: respuesta.pregunta })}
                    className="inline-flex w-fit items-center gap-1 text-[12.5px] text-texto-3 underline decoration-linea underline-offset-4 hover:text-texto">Seguir en Esme<ArrowUpRight className="size-3.5" /></button>
                )}
              </motion.div>
            ) : (
              <motion.p key="vacio" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="m-0 text-[13px] leading-6 text-texto-3">
                {aviso || 'Pregunta, encarga o busca. Esme usa tu memoria, internet y tu equipo; lo que actúa te pide permiso.'}
              </motion.p>
            )}
          </AnimatePresence>
          {aviso && respuesta && <p className="m-0 mt-3 text-[12.5px] text-texto-2">{aviso}</p>}
        </div>
        <p className="m-0 border-t border-linea px-6 py-2 text-[11px] text-texto-3">Ctrl+Mayús+Espacio desde cualquier sitio · Esc para cerrar</p>
      </section>
    </div>
  )
}
