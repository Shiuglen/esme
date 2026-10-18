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
import type { EstiloId, Gustos } from './tinta/estilo-propio'
import { deshacer, historialDe, rehacer, vestir, type Historial } from './tinta/historial'
import { PIEL_BASE, validarPiel, type Piel } from './tinta/piel'
import { vestirApp } from './tinta/vestir'
import { Portada, type EventoMente } from './paginas/Portada'
import { Mando } from './paginas/Mando'
import { panoramaDe } from './paginas/panorama'
import { notaTaller } from './paginas/portada'
import { Proximamente } from './paginas/Proximamente'
import { Tienda } from './paginas/Tienda'
import { Taller } from './paginas/Taller'
import { avisosDe } from './taller/avisos'
import { archivable } from './taller/vista'
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
import { marcoDe } from './shell/marcos'
import { callar, paraDecir, reproducir } from './lib/voz'
import { Escena } from './shell/Escena'
import { AlPulsar } from './tinta/PiezasVivas'
import { encenderLuz } from './shell/Luz'
import { ponerModoSonido, sonar } from './tinta/sonido'
import { MovimientoPiel } from './tinta/movimiento'
import { MotionConfig } from 'motion/react'
import { Leyenda, type NotaLugar } from './shell/Leyenda'
import { AJUSTES, SECCIONES, nombreDe, type SeccionId } from './shell/secciones'

const cargar = <T,>(k: string, d: T): T => { try { const v = localStorage.getItem(`esme:${k}`); return v === null ? d : (JSON.parse(v) as T) } catch { return d } }
const guardar = (k: string, v: unknown) => { try { localStorage.setItem(`esme:${k}`, JSON.stringify(v)) } catch { /* sin almacenamiento */ } }

export function App() {
  const [seccion, setSeccion] = useState<SeccionId>(() => cargar('seccion', 'inicio'))
  const [visitadas, setVisitadas] = useState<Set<SeccionId>>(() => new Set([cargar<SeccionId>('seccion', 'inicio')]))
  const [tema, setTema] = useState<'noche' | 'dia'>(() => cargar('tema', 'noche'))
  // La piel (docs/superpowers/specs/2026-10-17-pieles.md) con su historial; quien ya tenía un estilo elegido lo conserva.
  const [historial, setHistorial] = useState<Historial>(() => {
    const guardado = cargar<Historial | null>('pieles', null), ok = guardado && validarPiel(guardado.actual)
    const sanas = (l: unknown) => (Array.isArray(l) ? l : []).flatMap((x) => { const r = validarPiel(x); return r.ok ? [r.piel] : [] })
    if (guardado && ok && ok.ok) return { actual: ok.piel, pasado: sanas(guardado.pasado), futuro: sanas(guardado.futuro) }
    const estilo = cargar<EstiloId>('estilo', 'esmeralda'), gustos = cargar<Gustos>('gustos', { tono: 165, papel: 30, fuerza: 70 })
    return historialDe({ ...PIEL_BASE, nombre: estilo === 'propio' ? 'Mi estilo' : PIEL_BASE.nombre,
      color: estilo === 'propio' ? { tipo: 'gustos', gustos } : { tipo: 'estilo', estilo } })
  })
  // un ensayo (mientras arrastras un deslizador) se ve en vivo pero no entra en el historial hasta que sueltas
  const [ensayo, setEnsayo] = useState<Piel | null>(null)
  const piel = ensayo ?? historial.actual
  const pieles = {
    actual: piel, puedeDeshacer: historial.pasado.length > 0, puedeRehacer: historial.futuro.length > 0,
    ensayar: (p: Piel) => setEnsayo(p),
    vestir: (p: Piel) => { setEnsayo(null); setHistorial((h) => (JSON.stringify(h.actual) === JSON.stringify(p) ? h : vestir(h, p))) },
    deshacer: () => { setEnsayo(null); setHistorial(deshacer) }, rehacer: () => { setEnsayo(null); setHistorial(rehacer) },
  }
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
  const [semilla, setSemilla] = useState<{ q: string; n: number; voz?: boolean }>({ q: '', n: 0 })
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
        void sonar(a.tipo === 'lista' ? 'listo' : a.tipo === 'error' ? 'error' : 'aviso')
        setEventos((v) => [{ id: ++seqEvento.current, ts: Date.now(), tipo: `taller-${a.tipo}` as const, texto: a.texto, detalle: a.detalle, onVer: () => verTarea(a.id) }, ...v].slice(0, 40))
        if (seccionRef.current !== 'taller' && a.tipo === 'permiso') toast(a.texto, { description: a.detalle, action: { label: 'Ver', onClick: () => verTarea(a.id) } })
        if (!document.hasFocus() && typeof Notification !== 'undefined') { try { new Notification('esme', { body: a.detalle ? `${a.texto}\n${a.detalle}` : a.texto, silent: a.tipo === 'lista' }) } catch { /* sin notificaciones */ } }
      }
    }
  }, [tl.tareas, verTarea])
  useEffect(() => { document.documentElement.dataset.theme = tema; guardar('tema', tema) }, [tema])
  // La piel viste toda la app en vivo; el historial se guarda para deshacer también mañana.
  useEffect(() => { vestirApp(piel, tema); guardar('pieles', historial) }, [piel, tema, historial])
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
  }, [tema, piel])

  // atajos: Ctrl K paleta, Ctrl 1…6 secciones, Ctrl , ajustes
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return
      const t = e.key.toLowerCase()
      // la salida de emergencia: Ctrl+Mayús+0 vuelve a la piel de casa, por mal que haya quedado la actual (se puede deshacer)
      if (e.shiftKey && e.code === 'Digit0') { e.preventDefault(); setHistorial((h) => vestir(h, PIEL_BASE)); return }
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

  // por voz, te quedas en el centro de mando: la respuesta sale como subtítulos y Esme la dice (la conversación trabaja detrás)
  const [vivo, setVivo] = useState<{ pregunta: string; texto: string; fin: boolean; sinPermiso?: { motor: string; id: string } } | null>(null)
  const [turnoVoz, setTurnoVoz] = useState(0)
  const preguntar = (q: string, voz = false) => {
    setSemilla((s) => ({ q, n: s.n + 1, voz })); setPreguntas((n) => n + 1)
    if (voz && piel.portada === 'mando') { setVisitadas((v) => (v.has('conversacion') ? v : new Set(v).add('conversacion'))); setVivo({ pregunta: q, texto: '', fin: false }) }
    else ir('conversacion')
  }
  // la voz (lib/voz.ts): lo que dices se oye en el cerebro local; la respuesta a una pregunta hablada, Esme la dice
  const oir = async (pcm: Float32Array) => {
    if (!brain) { toast.error('Para oírte necesito el cerebro encendido.'); return }
    try { const t = (await brain.oir(pcm)).trim(); if (t) { toast(`Te oí: «${t}»`); preguntar(t, true) } else toast('No te entendí bien. ¿Me lo repites?') }
    catch (e) { toast.error(`No pude oírte: ${(e as Error).message}`) }
  }
  const panorama = useMemo(() => panoramaDe(atlas, tl.tareas), [atlas, tl.tareas])
  const hablar = (texto: string) => { if (brain) void brain.decir(paraDecir(texto)).then((wav) => reproducir(wav, () => setTurnoVoz((n) => n + 1))).catch(() => {}) }
  // una cita enfoca su recuerdo en tu mente sin salir de donde estás (la mente está siempre de fondo)
  const enfocarRecuerdo = (id: string) => { setEnfocado(id); redRef.current?.enfocar(id) }

  useHalos()
  useEffect(() => encenderLuz(), [])
  // el sonido de la piel: el modo, y un clic suave al pulsar cualquier botón (solo con «También al pulsar»)
  useEffect(() => { ponerModoSonido(piel.piezas.sonido) }, [piel.piezas.sonido])
  useEffect(() => { const f = (e: PointerEvent) => { if ((e.target as HTMLElement | null)?.closest('button, [role=radio], [role=tab], a')) void sonar('pulsar') }; addEventListener('pointerdown', f); return () => removeEventListener('pointerdown', f) }, [])   // los filos de cristal brillan donde está el cursor (shell/Luz.ts)
  const tallerOcupado = tl.tareas.some((t) => t.estado === 'trabajando' || t.estado === 'preparando')
  const resumenTaller = useMemo(() => {
    const k = (f: (t: (typeof tl.tareas)[number]) => boolean) => tl.tareas.filter(f).length
    return { trabajando: k((t) => t.estado === 'trabajando' || t.estado === 'preparando'), esperando: k((t) => t.estado === 'esperando'),
      listas: k((t) => t.estado === 'lista' && !t.aplicada), errores: k((t) => t.estado === 'error' && !archivable(t, Date.now())) }
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
          <ChatPanel brain={memoria ? brain : null} onCite={enfocarRecuerdo} onRecalled={(t) => setMemoriaUsada((s) => s + t)} seed={semilla} onBusy={setPensando} onHablar={hablar} onVivo={(texto, fin, sinPermiso) => setVivo((v) => (v ? { ...v, texto, fin, sinPermiso } : v))} panorama={panorama} />
        </div>)
      case 'taller': return <Taller tema={tema} tl={tl} foco={focoTaller} onIr={ir} />
      case 'memoria': return (
        <div className="flex h-full min-h-0 flex-col"><MemoryPanel brain={brain} focusId={enfocado} onFocus={(i) => redRef.current?.enfocar(i)} onChanged={refrescar} /></div>)
      case 'ajustes': return <Ajustes tema={tema} onTema={setTema} pieles={pieles} />
      case 'uso': return <Uso onIr={ir} />
      case 'tienda': return <Tienda tema={tema} pieles={pieles} />
    }
  }

  // Dónde va cada hoja, qué tapa de tu mente (para que la cámara la encuadre en el resto) y cuánto se atenúa la mente
  // (el sitio libre depende de cómo navega la piel: leyenda, riel o muelle — shell/marcos.ts)
  const marco = marcoDe(piel.navegacion)
  const movimientoPiel = useMemo(() => ({ caracter: piel.caracter, movimiento: piel.movimiento, piezas: piel.piezas }), [piel.caracter, piel.movimiento, piel.piezas])
  const HOJA: Partial<Record<SeccionId, string>> = { memoria: 'top-3 w-[400px]' }
  const grande = 'top-3 right-3'
  const sitioDe = (_id: SeccionId): React.CSSProperties => ({ left: marco.izquierda, bottom: marco.abajo })
  const hueco: Hueco = seccion === 'memoria' ? { izquierda: marco.izquierda + 400 + 12, derecha: 0 } : seccion === 'inicio' ? { izquierda: marco.inicio, derecha: 0 } : { izquierda: 0, derecha: 0 }
  const tapada = seccion === 'conversacion' || seccion === 'taller' || seccion === 'uso' || seccion === 'tienda' || seccion === 'ajustes'
  const notas: Partial<Record<SeccionId, NotaLugar>> = {
    conversacion: preguntas ? { texto: `${preguntas} ${preguntas === 1 ? 'pregunta' : 'preguntas'} en esta sesión` } : undefined,
    taller: notaTaller(resumenTaller),
    memoria: recuerdos !== null ? { texto: `${recuerdos.toLocaleString('es-ES')} recuerdos` } : { texto: 'sin cerebro', tono: 'peligro' },
    tienda: { texto: 'Pronto' },
    ajustes: callados.length ? { texto: `${callados.join(', ')} no ${callados.length === 1 ? 'responde' : 'responden'}` } : undefined,
  }

  return (
    <FirmaMente.Provider value={firma}>
    <MovimientoPiel value={movimientoPiel}>
    {/* con el movimiento en «nada», Motion tampoco anima (lo de JavaScript no lo para el CSS) */}
    <MotionConfig reducedMotion={piel.movimiento === 'nada' ? 'always' : 'user'}>
    <FondoVivo tema={tema} estado={estadoEsme} fondo={piel.fondo} clave={JSON.stringify(piel.color)} />
    <Escena id={piel.escena} atenuada={seccion !== 'inicio'} clave={`${tema}${JSON.stringify(piel.color)}`} />
    <AlPulsar pieza={piel.piezas.pulsar}>
    <div className="relative z-10 grid h-full grid-rows-[48px_minmax(0,1fr)]">
      <BarraSuperior seccion={nombreDe(seccion)} estado={{ conectado: !!brain && recuerdos !== null, recuerdos, pensando }} tema={tema}
        onTema={() => setTema((t) => (t === 'noche' ? 'dia' : 'noche'))} onBuscar={() => setPaleta(true)} paletaAbierta={paleta}
        taller={{ trabajando: tl.tareas.filter((t) => t.estado === 'trabajando' || t.estado === 'preparando').length, esperando: tl.tareas.filter((t) => t.estado === 'esperando').length }}
        onTaller={() => ir('taller')} />
      <main className="relative min-h-0 overflow-hidden">
        <div className={cn('absolute inset-0 transition-opacity duration-500', tapada && 'opacity-40', piel.portada === 'mando' && seccion === 'inicio' && 'opacity-0')}>
          <RedNeuronal ref={redRef} atlas={atlas} tema={tema} recordados={recordados} onPick={(id) => { setEnfocado(id); if (seccion !== 'memoria') ir('memoria') }}
            adornos={seccion === 'memoria'} hueco={hueco} />
        </div>
        {piel.portada === 'mando' ? (
          <Mando presencia={piel.presencia} sitio={marco.portada} visible={seccion === 'inicio'} conectado={!!brain && recuerdos !== null} recuerdos={recuerdos} atlas={atlas} tareas={tl.tareas}
            memoria={memoria} onMemoria={setMemoria} onPreguntar={preguntar} onOir={oir} vivo={vivo} turnoVoz={turnoVoz}
            onCerrarVivo={() => { callar(); setVivo(null) }} onConversacion={() => ir('conversacion')} onIr={(d) => (d.lugar === 'taller' ? verTarea(d.id) : ir('memoria'))} />
        ) : <Portada sitio={marco.portada} visible={seccion === 'inicio'} conectado={!!brain && recuerdos !== null} recuerdos={recuerdos} atlas={atlas} eventos={eventos}
          memoria={memoria} onMemoria={setMemoria} onPreguntar={preguntar}
          tareas={tl.tareas} onIr={(d) => (d.lugar === 'taller' ? verTarea(d.id) : ir('memoria'))} />}
        {[...SECCIONES, AJUSTES].filter(({ id }) => id !== 'inicio' && visitadas.has(id)).map(({ id }) => (
          <Hoja key={id} abierta={seccion === id} origen={origenes[id] ?? { x: 40, y: innerHeight - 40 }} etiqueta={nombreDe(id)} className={HOJA[id] ?? grande} sitio={sitioDe(id)}>
            {pagina(id)}
          </Hoja>
        ))}
        <Leyenda modo={piel.navegacion} actual={seccion} recogida={seccion !== 'inicio'} estado={estadoEsme} notas={notas} onIr={ir} />
      </main>
      <Paleta abierta={paleta} onCerrar={() => setPaleta(false)} onIr={ir} onPreguntar={preguntar}
        onTema={() => setTema((t) => (t === 'noche' ? 'dia' : 'noche'))} />
      <Toaster theme={tema === 'noche' ? 'dark' : 'light'} position="bottom-right" toastOptions={{ style: { background: 'var(--superficie-2)', border: '1px solid var(--linea)', color: 'var(--texto)', fontFamily: 'inherit' } }} />
      <HojasVivas tareas={tl.tareas} onVer={verTarea} />
    </div>
    </AlPulsar>
    </MotionConfig>
    </MovimientoPiel>
    </FirmaMente.Provider>
  )
}
