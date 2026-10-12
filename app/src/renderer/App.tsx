// esme — la carcasa: barra superior, riel y secciones. Las secciones se montan una vez y se ocultan al salir,
// para que la conversación y las terminales del Taller sigan vivas mientras navegas.
import { useCallback, useEffect, useRef, useState } from 'react'
import { Toaster } from 'sonner'
import { BrainClient, type Atlas as AtlasData, type MindEvent } from './lib/brain'
import { bridge, type AgentView } from './lib/bridge'
import { cn } from './lib/cn'
import { RedNeuronal, type Recordado, type RedHandle } from './memoria/RedNeuronal'
import { Inicio, type EventoMente } from './paginas/Inicio'
import { Proximamente } from './paginas/Proximamente'
import { ChatPanel } from './panels/ChatPanel'
import { MemoryPanel } from './panels/MemoryPanel'
import { SettingsPanel } from './panels/SettingsPanel'
import { WorkshopPanel } from './panels/WorkshopPanel'
import { BarraSuperior } from './shell/BarraSuperior'
import { Paleta } from './shell/Paleta'
import { Riel } from './shell/Riel'
import { AJUSTES, SECCIONES, nombreDe, type SeccionId } from './shell/secciones'

const cargar = <T,>(k: string, d: T): T => { try { const v = localStorage.getItem(`esme:${k}`); return v === null ? d : (JSON.parse(v) as T) } catch { return d } }
const guardar = (k: string, v: unknown) => { try { localStorage.setItem(`esme:${k}`, JSON.stringify(v)) } catch { /* sin almacenamiento */ } }

export function App() {
  const [seccion, setSeccion] = useState<SeccionId>(() => cargar('seccion', 'inicio'))
  const [visitadas, setVisitadas] = useState<Set<SeccionId>>(() => new Set([cargar<SeccionId>('seccion', 'inicio')]))
  const [tema, setTema] = useState<'noche' | 'dia'>(() => cargar('tema', 'noche'))
  const [acento, setAcento] = useState<string>(() => cargar('acento', 'esmeralda'))
  const [paleta, setPaleta] = useState(false)
  const [brain, setBrain] = useState<BrainClient | null>(null)
  const [recuerdos, setRecuerdos] = useState<number | null>(null)
  const [atlas, setAtlas] = useState<AtlasData | null>(null)
  const [eventos, setEventos] = useState<EventoMente[]>([])
  const [agentes, setAgentes] = useState<AgentView[]>([])
  const [ahorrados, setAhorrados] = useState(0)
  const [preguntas, setPreguntas] = useState(0)
  const [pensando, setPensando] = useState(false)
  const [memoria, setMemoria] = useState(true)
  const [semilla, setSemilla] = useState<{ q: string; n: number }>({ q: '', n: 0 })
  const [enfocado, setEnfocado] = useState<string | null>(null)
  const redRef = useRef<RedHandle>(null)
  const [recordados, setRecordados] = useState<Recordado[]>([])
  const seqEvento = useRef(0)

  const ir = useCallback((id: SeccionId) => { setSeccion(id); setVisitadas((v) => (v.has(id) ? v : new Set(v).add(id))) }, [])
  useEffect(() => { guardar('seccion', seccion) }, [seccion])
  useEffect(() => { document.documentElement.dataset.theme = tema; guardar('tema', tema) }, [tema])
  useEffect(() => { document.documentElement.dataset.acento = acento; guardar('acento', acento) }, [acento])

  // atajos: Ctrl K paleta, Ctrl 1…6 secciones, Ctrl , ajustes
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return
      const t = e.key.toLowerCase()
      if (t === 'k') { e.preventDefault(); setPaleta((p) => !p) }
      else if (t === ',') { e.preventDefault(); ir('ajustes') }
      else if (/^[1-6]$/.test(t)) { e.preventDefault(); ir(SECCIONES[Number(t) - 1].id) }
    }
    addEventListener('keydown', k); return () => removeEventListener('keydown', k)
  }, [ir])

  // el cerebro: conexión, reconexión y lo que hace en vivo
  useEffect(() => {
    const conectar = (i: { url: string; token: string } | null) => setBrain(i ? new BrainClient(i.url, i.token) : null)
    void bridge.brainInfo().then(conectar)
    const off = bridge.onBrainChange(conectar)
    return off
  }, [])
  const refrescar = useCallback(() => {
    if (!brain) return
    void brain.health().then((h) => setRecuerdos(h.memories)).catch(() => setRecuerdos(null))
    void brain.atlas().then(setAtlas).catch(() => {})
  }, [brain])
  useEffect(refrescar, [refrescar])
  useEffect(() => {
    if (!brain) return
    return brain.events((e: MindEvent) => {
      const nuevo = (tipo: EventoMente['tipo'], texto: string, detalle?: string) =>
        setEventos((v) => [{ id: ++seqEvento.current, ts: Date.now(), tipo, texto, detalle }, ...v].slice(0, 40))
      if (e.type === 'recall') { if (e.ids.length) { redRef.current?.encender(e.ids); setRecordados((v) => [{ id: ++seqEvento.current, consulta: e.query.slice(0, 80), cuantos: e.ids.length }, ...v].slice(0, 10)); nuevo('recall', `Recordé ${e.ids.length} ${e.ids.length === 1 ? 'cosa' : 'cosas'} para «${e.query.slice(0, 60)}»`, e.who) } }
      if (e.type === 'remember') nuevo('remember', 'Guardé un recuerdo nuevo')
      if (e.type === 'forget') nuevo('forget', `Olvidé ${e.ids.length} ${e.ids.length === 1 ? 'recuerdo' : 'recuerdos'}`)
      if (e.type === 'ingest') nuevo('ingest', `Absorbí ${e.added} recuerdos nuevos`)
      if (e.type === 'forget' || e.type === 'ingest' || e.type === 'remember') refrescar()
    })
  }, [brain, refrescar])
  useEffect(() => { void bridge.agents?.().then(setAgentes).catch(() => setAgentes([])) }, [])

  const preguntar = (q: string) => { setSemilla((s) => ({ q, n: s.n + 1 })); setPreguntas((n) => n + 1); ir('conversacion') }
  const enfocarRecuerdo = (id: string) => { setEnfocado(id); ir('memoria'); setTimeout(() => redRef.current?.enfocar(id), 60) }

  const pagina = (id: SeccionId) => {
    switch (id) {
      case 'inicio': return <Inicio conectado={!!brain && recuerdos !== null} recuerdos={recuerdos} eventos={eventos} agentes={agentes} ahorrados={ahorrados} preguntas={preguntas}
        memoria={memoria} onMemoria={setMemoria} onPreguntar={preguntar} onIr={ir} />
      case 'conversacion': return (
        <div className="mx-auto flex h-full max-w-[880px] flex-col px-6 pt-4 pb-5">
          <ChatPanel brain={memoria ? brain : null} onCite={enfocarRecuerdo} onRecalled={(t) => setAhorrados((s) => s + Math.max(0, 1500 - t))} seed={semilla} onBusy={setPensando} />
        </div>)
      case 'taller': return <div className="flex h-full flex-col p-5"><WorkshopPanel day={tema === 'dia'} /></div>
      case 'memoria': return (
        <div className="grid h-full grid-cols-[400px_minmax(0,1fr)]">
          <div className="flex min-h-0 flex-col border-r border-linea bg-s1"><MemoryPanel brain={brain} focusId={enfocado} onFocus={(i) => redRef.current?.enfocar(i)} onChanged={refrescar} /></div>
          <div className="relative min-h-0 overflow-hidden"><RedNeuronal ref={redRef} atlas={atlas} tema={`${tema}-${acento}`} recordados={recordados} onPick={setEnfocado} /></div>
        </div>)
      case 'ajustes': return <div className="mx-auto h-full max-w-[760px] overflow-y-auto px-6 py-6"><SettingsPanel /></div>
      case 'uso': return <Proximamente titulo="Uso" texto="Aquí verás lo que gastas por modelo, tu actividad día a día como en GitHub, tus creaciones y cómo crece tu mente." />
      case 'tienda': return <Proximamente titulo="Tienda" texto="Aquí instalarás IAs, modelos locales, MCPs, plugins y compañeros para Esme, con un clic y con permiso." />
    }
  }

  return (
    <div className="grid h-full grid-rows-[48px_minmax(0,1fr)]">
      <BarraSuperior seccion={nombreDe(seccion)} estado={{ conectado: !!brain && recuerdos !== null, recuerdos, pensando }} tema={tema}
        onTema={() => setTema((t) => (t === 'noche' ? 'dia' : 'noche'))} onBuscar={() => setPaleta(true)} />
      <div className="flex min-h-0">
        <Riel actual={seccion} onIr={ir} cuentas={{ memoria: recuerdos !== null ? { texto: recuerdos.toLocaleString('es-ES') } : undefined }} />
        <main className="relative min-w-0 flex-1">
          {[...SECCIONES, AJUSTES].map(({ id }) => visitadas.has(id) && (
            <section key={id} hidden={seccion !== id} aria-label={nombreDe(id)} className={cn('absolute inset-0', seccion === id && 'animate-[aparecer_.22s_cubic-bezier(.16,1,.3,1)]')}>
              {pagina(id)}
            </section>
          ))}
        </main>
      </div>
      <Paleta abierta={paleta} onCerrar={() => setPaleta(false)} onIr={ir} onPreguntar={preguntar}
        onTema={() => setTema((t) => (t === 'noche' ? 'dia' : 'noche'))} onAcento={setAcento} />
      <Toaster theme={tema === 'noche' ? 'dark' : 'light'} position="bottom-right" toastOptions={{ style: { background: 'var(--superficie-2)', border: '1px solid var(--linea)', color: 'var(--texto)', fontFamily: 'inherit' } }} />
    </div>
  )
}
