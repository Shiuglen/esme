// esme — la carcasa: barra superior, riel y secciones. Las secciones se montan una vez y se ocultan al salir,
// para que la conversación y las terminales del Taller sigan vivas mientras navegas.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Toaster, toast } from 'sonner'
import { BrainClient, type Atlas as AtlasData, type MindEvent } from './lib/brain'
import { bridge } from './lib/bridge'
import { cn } from './lib/cn'
import { FirmaMente } from './marca/Sello'
import { firmaDe } from './marca/sello'
import { RedNeuronal, type Recordado, type RedHandle } from './memoria/RedNeuronal'
import { Ajustes } from './paginas/Ajustes'
import { Inicio, type EventoMente } from './paginas/Inicio'
import { Proximamente } from './paginas/Proximamente'
import { Taller } from './paginas/Taller'
import { avisosDe } from './taller/avisos'
import { useTaller } from './taller/useTaller'
import type { TareaTaller } from './lib/bridge'
import { Uso } from './paginas/Uso'
import { ChatPanel } from './panels/ChatPanel'
import { MemoryPanel } from './panels/MemoryPanel'
import { BarraSuperior } from './shell/BarraSuperior'
import { Paleta } from './shell/Paleta'
import { FondoVivo, useHalos } from './shell/FondoVivo'
import { Riel } from './shell/Riel'
import { AJUSTES, SECCIONES, nombreDe, type SeccionId } from './shell/secciones'

const cargar = <T,>(k: string, d: T): T => { try { const v = localStorage.getItem(`esme:${k}`); return v === null ? d : (JSON.parse(v) as T) } catch { return d } }
const guardar = (k: string, v: unknown) => { try { localStorage.setItem(`esme:${k}`, JSON.stringify(v)) } catch { /* sin almacenamiento */ } }

export function App() {
  const [seccion, setSeccion] = useState<SeccionId>(() => cargar('seccion', 'inicio'))
  const [visitadas, setVisitadas] = useState<Set<SeccionId>>(() => new Set([cargar<SeccionId>('seccion', 'inicio')]))
  const [tema, setTema] = useState<'noche' | 'dia'>(() => cargar('tema', 'noche'))
  const [paleta, setPaleta] = useState(false)
  const [brain, setBrain] = useState<BrainClient | null>(null)
  const [recuerdos, setRecuerdos] = useState<number | null>(null)
  const [atlas, setAtlas] = useState<AtlasData | null>(null)
  const firma = useMemo(() => firmaDe(atlas), [atlas])   // tu sello nace de tu mente
  const [eventos, setEventos] = useState<EventoMente[]>([])
  const [memoriaUsada, setMemoriaUsada] = useState(0)
  const [recordando, setRecordando] = useState(false)
  const [preguntas, setPreguntas] = useState(0)
  const [pensando, setPensando] = useState(false)
  const tl = useTaller()
  const [focoTaller, setFocoTaller] = useState<{ id: string; n: number } | null>(null)
  const vistas = useRef(new Map<string, TareaTaller>())
  const seccionRef = useRef(seccion); seccionRef.current = seccion
  const [memoria, setMemoria] = useState(true)
  const [semilla, setSemilla] = useState<{ q: string; n: number }>({ q: '', n: 0 })
  const [enfocado, setEnfocado] = useState<string | null>(null)
  const redRef = useRef<RedHandle>(null)
  const [recordados, setRecordados] = useState<Recordado[]>([])
  const seqEvento = useRef(0)
  const recordandoT = useRef<ReturnType<typeof setTimeout>>(undefined)

  const ir = useCallback((id: SeccionId) => { setSeccion(id); setVisitadas((v) => (v.has(id) ? v : new Set(v).add(id))) }, [])
  useEffect(() => { guardar('seccion', seccion) }, [seccion])

  // Avisos del Taller: al Inicio siempre; fuera del Taller, también un aviso con «Ver»; sin foco en la ventana, notificación del sistema.
  const verTarea = useCallback((id: string) => { ir('taller'); setFocoTaller((f) => ({ id, n: (f?.n ?? 0) + 1 })) }, [ir])
  useEffect(() => {
    for (const t of tl.tareas) {
      const avisos = avisosDe(vistas.current.get(t.id), t)
      vistas.current.set(t.id, t)
      for (const a of avisos) {
        setEventos((v) => [{ id: ++seqEvento.current, ts: Date.now(), tipo: `taller-${a.tipo}` as const, texto: a.texto, detalle: a.detalle, onVer: () => verTarea(a.id) }, ...v].slice(0, 40))
        if (seccionRef.current !== 'taller') (a.tipo === 'error' ? toast.error : toast)(a.texto, { description: a.detalle, action: { label: 'Ver', onClick: () => verTarea(a.id) } })
        if (!document.hasFocus() && typeof Notification !== 'undefined') { try { new Notification('esme', { body: a.detalle ? `${a.texto}\n${a.detalle}` : a.texto, silent: a.tipo === 'lista' }) } catch { /* sin notificaciones */ } }
      }
    }
  }, [tl.tareas, verTarea])
  useEffect(() => { document.documentElement.dataset.theme = tema; guardar('tema', tema) }, [tema])
  // en escritorio, los botones de la ventana toman el color de la barra del tema activo
  useEffect(() => {
    const v = bridge.ventana(); if (!v) return
    document.documentElement.dataset.plataforma = v.plataforma
    const css = getComputedStyle(document.documentElement)
    v.colores({ fondo: css.getPropertyValue('--superficie-1').trim(), simbolos: css.getPropertyValue('--texto-2').trim() })
  }, [tema])

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
      if (e.type === 'recall') { if (e.ids.length) { redRef.current?.encender(e.ids); setRecordando(true); clearTimeout(recordandoT.current); recordandoT.current = setTimeout(() => setRecordando(false), 2600); setRecordados((v) => [{ id: ++seqEvento.current, consulta: e.query.slice(0, 80), cuantos: e.ids.length }, ...v].slice(0, 10)); nuevo('recall', `Recordé ${e.ids.length} ${e.ids.length === 1 ? 'cosa' : 'cosas'} para «${e.query.slice(0, 60)}»`, e.who) } }
      if (e.type === 'remember') nuevo('remember', 'Guardé un recuerdo nuevo')
      if (e.type === 'forget') nuevo('forget', `Olvidé ${e.ids.length} ${e.ids.length === 1 ? 'recuerdo' : 'recuerdos'}`)
      if (e.type === 'ingest') nuevo('ingest', `Absorbí ${e.added} recuerdos nuevos`)
      if (e.type === 'forget' || e.type === 'ingest' || e.type === 'remember') refrescar()
    })
  }, [brain, refrescar])

  const preguntar = (q: string) => { setSemilla((s) => ({ q, n: s.n + 1 })); setPreguntas((n) => n + 1); ir('conversacion') }
  const enfocarRecuerdo = (id: string) => { setEnfocado(id); ir('memoria'); setTimeout(() => redRef.current?.enfocar(id), 60) }

  useHalos()
  const tallerOcupado = tl.tareas.some((t) => t.estado === 'trabajando' || t.estado === 'preparando')
  const resumenTaller = useMemo(() => {
    const k = (f: (t: (typeof tl.tareas)[number]) => boolean) => tl.tareas.filter(f).length
    return { trabajando: k((t) => t.estado === 'trabajando' || t.estado === 'preparando'), esperando: k((t) => t.estado === 'esperando'),
      listas: k((t) => t.estado === 'lista' && !t.aplicada), errores: k((t) => t.estado === 'error') }
  }, [tl.tareas])
  // Solo en desarrollo: forzar el estado de la mente para revisar el diseño (window.__estadoEsme('pensando'))
  const [forzado, setForzado] = useState<'reposo' | 'pensando' | 'recordando' | null>(null)
  useEffect(() => { if (import.meta.env.DEV) (window as unknown as { __estadoEsme?: typeof setForzado }).__estadoEsme = setForzado }, [])
  const estadoEsme = forzado ?? (pensando || tallerOcupado ? 'pensando' : recordando ? 'recordando' : 'reposo')

  const pagina = (id: SeccionId) => {
    switch (id) {
      case 'inicio': return <Inicio conectado={!!brain && recuerdos !== null} recuerdos={recuerdos} atlas={atlas} tema={tema} taller={resumenTaller} eventos={eventos} estadoEsme={estadoEsme} memoriaUsada={memoriaUsada} preguntas={preguntas}
        memoria={memoria} onMemoria={setMemoria} onPreguntar={preguntar} onIr={ir} />
      case 'conversacion': return (
        <div className="mx-auto flex h-full max-w-[880px] flex-col px-6 pt-4 pb-5">
          <ChatPanel brain={memoria ? brain : null} onCite={enfocarRecuerdo} onRecalled={(t) => setMemoriaUsada((s) => s + t)} seed={semilla} onBusy={setPensando} />
        </div>)
      case 'taller': return <Taller tema={tema} tl={tl} foco={focoTaller} onIr={ir} />
      case 'memoria': return (
        <div className="grid h-full grid-cols-[400px_minmax(0,1fr)]">
          <div className="vidrio-fino flex min-h-0 flex-col border-r border-linea"><MemoryPanel brain={brain} focusId={enfocado} onFocus={(i) => redRef.current?.enfocar(i)} onChanged={refrescar} /></div>
          <div className="relative min-h-0 overflow-hidden"><RedNeuronal ref={redRef} atlas={atlas} tema={tema} recordados={recordados} onPick={setEnfocado} /></div>
        </div>)
      case 'ajustes': return <Ajustes tema={tema} onTema={setTema} />
      case 'uso': return <Uso onIr={ir} />
      case 'tienda': return <Proximamente titulo="Tienda" texto="Aquí instalarás IAs, modelos locales, MCPs, plugins y compañeros para Esme, con un clic y con permiso." />
    }
  }

  return (
    <FirmaMente.Provider value={firma}>
    <FondoVivo tema={tema} estado={estadoEsme} />
    <div className="relative z-10 grid h-full grid-rows-[48px_minmax(0,1fr)]">
      <BarraSuperior seccion={nombreDe(seccion)} estado={{ conectado: !!brain && recuerdos !== null, recuerdos, pensando }} tema={tema}
        onTema={() => setTema((t) => (t === 'noche' ? 'dia' : 'noche'))} onBuscar={() => setPaleta(true)} paletaAbierta={paleta}
        taller={{ trabajando: tl.tareas.filter((t) => t.estado === 'trabajando' || t.estado === 'preparando').length, esperando: tl.tareas.filter((t) => t.estado === 'esperando').length }}
        onTaller={() => ir('taller')} />
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
        onTema={() => setTema((t) => (t === 'noche' ? 'dia' : 'noche'))} />
      <Toaster theme={tema === 'noche' ? 'dark' : 'light'} position="bottom-right" toastOptions={{ style: { background: 'var(--superficie-2)', border: '1px solid var(--linea)', color: 'var(--texto)', fontFamily: 'inherit' } }} />
    </div>
    </FirmaMente.Provider>
  )
}
