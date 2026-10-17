// esme — La Ventana (docs/superpowers/specs/2026-10-12-la-ventana.md): la ventana entera es tu mente, una sola red viva de
// fondo. Encima, la portada (el cartucho y la pregunta) y la leyenda, que es la navegación. Cada lugar es una hoja que nace
// desde su sitio en la leyenda y se pliega al cerrarla; se monta una vez y queda viva (conversación y terminales siguen).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Toaster, toast } from 'sonner'
import { BrainClient, type Atlas as AtlasData, type MindEvent } from './lib/brain'
import { bridge } from './lib/bridge'
import { cn } from './lib/cn'
import { FirmaMente } from './marca/Sello'
import { firmaDe } from './marca/sello'
import { RedNeuronal, type Hueco, type Recordado, type RedHandle } from './memoria/RedNeuronal'
import { Ajustes } from './paginas/Ajustes'
import { aplicarPropio, quitarPropio, type EstiloId, type Gustos } from './tinta/estilo-propio'
import { Portada, type EventoMente } from './paginas/Portada'
import { notaTaller } from './paginas/portada'
import { Proximamente } from './paginas/Proximamente'
import { Taller } from './paginas/Taller'
import { avisosDe } from './taller/avisos'
import { useTaller } from './taller/useTaller'
import { HojasVivas } from './shell/HojasVivas'
import type { TareaTaller } from './lib/bridge'
import { Uso } from './paginas/Uso'
import { ChatPanel } from './panels/ChatPanel'
import { MemoryPanel } from './panels/MemoryPanel'
import { BarraSuperior } from './shell/BarraSuperior'
import { Paleta } from './shell/Paleta'
import { FondoVivo, useHalos } from './shell/FondoVivo'
import { Hoja, type Origen } from './shell/Hoja'
import { Leyenda, type NotaLugar } from './shell/Leyenda'
import { AJUSTES, SECCIONES, nombreDe, type SeccionId } from './shell/secciones'

const cargar = <T,>(k: string, d: T): T => { try { const v = localStorage.getItem(`esme:${k}`); return v === null ? d : (JSON.parse(v) as T) } catch { return d } }
const guardar = (k: string, v: unknown) => { try { localStorage.setItem(`esme:${k}`, JSON.stringify(v)) } catch { /* sin almacenamiento */ } }

export function App() {
  const [seccion, setSeccion] = useState<SeccionId>(() => cargar('seccion', 'inicio'))
  const [visitadas, setVisitadas] = useState<Set<SeccionId>>(() => new Set([cargar<SeccionId>('seccion', 'inicio')]))
  const [tema, setTema] = useState<'noche' | 'dia'>(() => cargar('tema', 'noche'))
  const [estilo, setEstilo] = useState<EstiloId>(() => cargar('estilo', 'esmeralda'))
  const [gustos, setGustos] = useState<Gustos>(() => cargar('gustos', { tono: 165, papel: 30, fuerza: 70 }))
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

  // Ir a un lugar: su hoja nace desde donde se pidió (o desde su sitio en la leyenda)
  const [origenes, setOrigenes] = useState<Partial<Record<SeccionId, Origen>>>({})
  const ir = useCallback((id: SeccionId, origen?: Origen) => {
    const el = origen ? null : document.querySelector(`[data-lugar="${id}"]`)?.getBoundingClientRect()
    const o = origen ?? (el ? { x: el.left + el.width / 2, y: el.top + el.height / 2 } : { x: 40, y: innerHeight - 40 })
    setOrigenes((v) => ({ ...v, [id]: o }))
    setSeccion(id); setVisitadas((v) => (v.has(id) ? v : new Set(v).add(id)))
  }, [])
  const [ancho, setAncho] = useState(() => innerWidth)
  useEffect(() => { const r = () => setAncho(innerWidth); addEventListener('resize', r); return () => removeEventListener('resize', r) }, [])
  // Motores locales que no responden (como Ollama): se dicen en la leyenda, no se presentan como listos
  const [callados, setCallados] = useState<string[]>([])
  useEffect(() => {
    void bridge.providers().then((ps) => { for (const p of ps.filter((x) => x.local)) void bridge.models(p.id).then((m) => { if (!m.length) setCallados((v) => [...v, p.label]) }).catch(() => setCallados((v) => [...v, p.label])) }).catch(() => {})
  }, [])
  useEffect(() => { guardar('seccion', seccion) }, [seccion])

  // Avisos del Taller: al Inicio siempre; fuera del Taller, también un aviso con «Ver»; sin foco en la ventana, notificación del sistema.
  const verTarea = useCallback((id: string) => { ir('taller'); setFocoTaller((f) => ({ id, n: (f?.n ?? 0) + 1 })) }, [ir])
  useEffect(() => {
    for (const t of tl.tareas) {
      const avisos = avisosDe(vistas.current.get(t.id), t)
      vistas.current.set(t.id, t)
      for (const a of avisos) {
        setEventos((v) => [{ id: ++seqEvento.current, ts: Date.now(), tipo: `taller-${a.tipo}` as const, texto: a.texto, detalle: a.detalle, onVer: () => verTarea(a.id) }, ...v].slice(0, 40))
        if (seccionRef.current !== 'taller' && a.tipo === 'permiso') toast(a.texto, { description: a.detalle, action: { label: 'Ver', onClick: () => verTarea(a.id) } })
        if (!document.hasFocus() && typeof Notification !== 'undefined') { try { new Notification('esme', { body: a.detalle ? `${a.texto}\n${a.detalle}` : a.texto, silent: a.tipo === 'lista' }) } catch { /* sin notificaciones */ } }
      }
    }
  }, [tl.tareas, verTarea])
  useEffect(() => { document.documentElement.dataset.theme = tema; guardar('tema', tema) }, [tema])
  // El estilo viste y el propio pinta en vivo: sin data-estilo, la raíz dice esmeralda.
  useEffect(() => {
    guardar('estilo', estilo)
    if (estilo === 'propio') { guardar('gustos', gustos); aplicarPropio(gustos, tema); delete document.documentElement.dataset.estilo }
    else { quitarPropio(); estilo === 'esmeralda' ? delete document.documentElement.dataset.estilo : (document.documentElement.dataset.estilo = estilo) }
  }, [estilo, gustos, tema])
  // en escritorio, los botones de la ventana toman el color de la barra del tema activo
  useEffect(() => {
    const v = bridge.ventana(); if (!v) return
    document.documentElement.dataset.plataforma = v.plataforma
    // la barra del sistema exige un color real: la variable se resuelve en un sondeo y, si llega vacía
    // (los estilos aún no aterrizaron), se suelta el valor de reposo antes de que el main pise una mezcla cruda
    const resuelto = (variable: string, flotado: string) => {
      const sonda = document.documentElement.appendChild(document.createElement('div'))
      sonda.style.display = 'none'; sonda.style.background = variable
      const valor = getComputedStyle(sonda).backgroundColor
      sonda.remove()
      const manchas = valor && valor !== 'transparent' && !/^rgba\(0, 0, 0, 0\)/.test(valor)
      return manchas ? valor : flotado
    }
    v.colores({
      fondo: resuelto('var(--superficie-1)', '#0e1015'),
      simbolos: resuelto('var(--texto-2)', '#a3a9b4'),
    })
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
    // Esc pliega la hoja abierta y vuelve a tu mente (salvo si escribes, o en una terminal o un diálogo)
    const esc = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented || seccionRef.current === 'inicio' || document.querySelector('[role=dialog]')) return
      const el = e.target as HTMLElement | null
      if (el?.closest('input, textarea, select, [contenteditable=true], .xterm')) return
      ir('inicio')
    }
    addEventListener('keydown', esc)
    addEventListener('keydown', k); return () => { removeEventListener('keydown', k); removeEventListener('keydown', esc) }
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
  // una cita enfoca su recuerdo en tu mente sin salir de donde estás (la mente está siempre de fondo)
  const enfocarRecuerdo = (id: string) => { setEnfocado(id); redRef.current?.enfocar(id) }

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
      case 'inicio': return null
      case 'conversacion': return (
        <div className="flex h-full flex-col px-5 pt-4 pb-4">
          <ChatPanel brain={memoria ? brain : null} onCite={enfocarRecuerdo} onRecalled={(t) => setMemoriaUsada((s) => s + t)} seed={semilla} onBusy={setPensando} />
        </div>)
      case 'taller': return <Taller tema={tema} tl={tl} foco={focoTaller} onIr={ir} />
      case 'memoria': return (
        <div className="flex h-full min-h-0 flex-col"><MemoryPanel brain={brain} focusId={enfocado} onFocus={(i) => redRef.current?.enfocar(i)} onChanged={refrescar} /></div>)
      case 'ajustes': return <Ajustes tema={tema} onTema={setTema} estilo={estilo} onEstilo={setEstilo} gustos={gustos} onGustos={setGustos} />
      case 'uso': return <Uso onIr={ir} />
      case 'tienda': return <Proximamente titulo="Tienda" texto="Aquí instalarás IAs, modelos locales, MCPs, plugins y compañeros para Esme, con un clic y con permiso." />
    }
  }

  // Dónde va cada hoja, qué tapa de tu mente (para que la cámara la encuadre en el resto) y cuánto se atenúa la mente
  const HOJA: Partial<Record<SeccionId, string>> = { conversacion: 'top-3 right-3 bottom-3 w-[min(680px,50%)]', memoria: 'top-3 bottom-3 left-[76px] w-[400px]' }
  const grande = 'top-3 right-3 bottom-3 left-[76px]'
  const hueco: Hueco = seccion === 'conversacion' ? { izquierda: 76, derecha: Math.min(680, ancho * 0.5) + 12 }
    : seccion === 'memoria' ? { izquierda: 76 + 400 + 12, derecha: 0 } : seccion === 'inicio' ? { izquierda: 300, derecha: 0 } : { izquierda: 0, derecha: 0 }
  const tapada = seccion === 'taller' || seccion === 'uso' || seccion === 'tienda' || seccion === 'ajustes'
  const notas: Partial<Record<SeccionId, NotaLugar>> = {
    conversacion: preguntas ? { texto: `${preguntas} ${preguntas === 1 ? 'pregunta' : 'preguntas'} en esta sesión` } : undefined,
    taller: notaTaller(resumenTaller),
    memoria: recuerdos !== null ? { texto: `${recuerdos.toLocaleString('es-ES')} recuerdos` } : { texto: 'sin cerebro', tono: 'peligro' },
    tienda: { texto: 'Pronto' },
    ajustes: callados.length ? { texto: `${callados.join(', ')} no ${callados.length === 1 ? 'responde' : 'responden'}` } : undefined,
  }

  return (
    <FirmaMente.Provider value={firma}>
    <FondoVivo tema={tema} estado={estadoEsme} />
    <div className="relative z-10 grid h-full grid-rows-[48px_minmax(0,1fr)]">
      <BarraSuperior seccion={nombreDe(seccion)} estado={{ conectado: !!brain && recuerdos !== null, recuerdos, pensando }} tema={tema}
        onTema={() => setTema((t) => (t === 'noche' ? 'dia' : 'noche'))} onBuscar={() => setPaleta(true)} paletaAbierta={paleta}
        taller={{ trabajando: tl.tareas.filter((t) => t.estado === 'trabajando' || t.estado === 'preparando').length, esperando: tl.tareas.filter((t) => t.estado === 'esperando').length }}
        onTaller={() => ir('taller')} />
      <main className="relative min-h-0 overflow-hidden">
        <div className={cn('absolute inset-0 transition-opacity duration-500', tapada && 'opacity-40')}>
          <RedNeuronal ref={redRef} atlas={atlas} tema={tema} recordados={recordados} onPick={(id) => { setEnfocado(id); if (seccion !== 'memoria') ir('memoria') }}
            adornos={seccion === 'memoria'} hueco={hueco} />
        </div>
        <Portada visible={seccion === 'inicio'} conectado={!!brain && recuerdos !== null} recuerdos={recuerdos} atlas={atlas} eventos={eventos}
          memoria={memoria} onMemoria={setMemoria} onPreguntar={preguntar} />
        {[...SECCIONES, AJUSTES].filter(({ id }) => id !== 'inicio' && visitadas.has(id)).map(({ id }) => (
          <Hoja key={id} abierta={seccion === id} origen={origenes[id] ?? { x: 40, y: innerHeight - 40 }} etiqueta={nombreDe(id)} className={HOJA[id] ?? grande}>
            {pagina(id)}
          </Hoja>
        ))}
        <Leyenda actual={seccion} recogida={seccion !== 'inicio'} estado={estadoEsme} notas={notas} onIr={ir} />
      </main>
      <Paleta abierta={paleta} onCerrar={() => setPaleta(false)} onIr={ir} onPreguntar={preguntar}
        onTema={() => setTema((t) => (t === 'noche' ? 'dia' : 'noche'))} />
      <Toaster theme={tema === 'noche' ? 'dark' : 'light'} position="bottom-right" toastOptions={{ style: { background: 'var(--superficie-2)', border: '1px solid var(--linea)', color: 'var(--texto)', fontFamily: 'inherit' } }} />
      <HojasVivas tareas={tl.tareas} onVer={verTarea} />
    </div>
    </FirmaMente.Provider>
  )
}
