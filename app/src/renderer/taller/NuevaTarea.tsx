// Pedir una tarea: qué quieres, con qué motor y modelo, y sobre qué carpeta. Esme monta una copia aislada y el motor trabaja ahí.
// Recuerda tu motor, tu carpeta y tus opciones por motor; si el motor trae un modelo lento o de pago, propone uno gratis.
import { LayoutTemplate as ILayoutTemplate, Rocket as IRocket, Plus as IPlus, FlaskConical as IFlaskConical, Wrench as IWrench, ScanSearch as IScanSearch, ShieldCheck as IShieldCheck, PackageCheck as IPackageCheck, BookOpen as IBookOpen, FileText as IFileText, Shuffle as IShuffle, Languages as ILanguages, Gauge as IGauge, Accessibility as IAccessibility, Sparkles as ISparkles, type LucideIcon, Target } from 'lucide-react'
import { CATEGORIAS, RECETAS } from './recetas'
import { CalendarClock, CornerDownLeft, Dices, Folder, FolderPlus, ShieldCheck, Sparkles, Swords, X } from 'lucide-react'
import { cuandoDe, fraseCuando, type OpcionCuando } from './cuando'
import { AnimatePresence, motion } from 'motion/react'
import { toast } from 'sonner'
import { useEffect, useMemo, useState } from 'react'
import { bridge, type MotorTaller, type OpcionMotor, type AccesoTarea, type Repeticion, type EncargoFuera } from '../lib/bridge'
import type { Rol } from '../../main/taller/roles'
import { cn } from '../lib/cn'
import { candidatosDe, elegibles, elegir, elegirVarios, historial, type Eleccion, type Veredicto } from './eleccion'
import { configInicial, nombreValor, SelectorOpcion } from './Opciones'
import { Bicho } from '../marca/SerVista'
import { Oficios } from './Oficios'
import { TarjetaNecesidad, TarjetaRepeticion, TarjetaEncargoFuera, EditorSkill, useNecesidades, useRepeticiones, useEncargosFuera } from './Repeticion'
import { useMuelle } from '../tinta/movimiento'

const leer = <T,>(k: string, d: T): T => { try { const v = localStorage.getItem(`esme:taller:${k}`); return v === null ? d : (JSON.parse(v) as T) } catch { return d } }
const guardar = (k: string, v: unknown) => { try { localStorage.setItem(`esme:taller:${k}`, JSON.stringify(v)) } catch { /* sin almacenamiento */ } }

type Peticion = { motor: string; carpeta: string | null; texto: string; config: Record<string, string>; arena?: string; acceso?: AccesoTarea; rol?: string; objetivo?: string }
const AUTO = 'auto'
const nuevoId = () => Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => 'abcdefghijklmnopqrstuvwxyz0123456789'[b % 36]).join('')
const corto = (e: Eleccion) => nombreValor({ id: e.modelo, nombre: e.modeloNombre })

export function NuevaTarea({ motores, noListos = new Map(), fallos = [], onCrear, onIrMotores, motorPedido }: {
  motores: MotorTaller[]; noListos?: Map<string, string>; fallos?: Veredicto[]; onCrear(p: Peticion[]): Promise<boolean>; onIrMotores(): void; motorPedido?: { id: string; n: number } | null
}) {
  const muelle = useMuelle({ stiffness: 480, damping: 36 })
  const instalados = motores.filter((m) => m.instalado)
  const [motor, setMotor] = useState<string | null>(() => leer<string | null>('motor', AUTO))
  // pulsar un agente libre en la sala lo deja elegido aquí
  useEffect(() => { if (motorPedido) setMotor(motorPedido.id) }, [motorPedido?.n])  // eslint-disable-line react-hooks/exhaustive-deps
  const [arena, setArena] = useState(false)
  const [rivales, setRivales] = useState<Eleccion[]>([])
  // los oficios del equipo: los del creador si ha puesto los suyos, si no los de casa
  const [roles, setRoles] = useState<Rol[]>([])
  const [oficios, setOficios] = useState<string[]>(() => leer<string[]>('oficios', []))
  const [todas, setTodas] = useState<Record<string, OpcionMotor[]> | null>(null)
  // lo que el creador repite: la mente lo ve y lo propone (no se crea nada solo)
  const repetidas = useRepeticiones()
  const [fuera, quitarFuera] = useEncargosFuera()
  // lo que falta: herramientas que el equipo echa de menos (el fallo se repitió)
  const necesidades = useNecesidades()
  // la receta que se está escribiendo: una repetición convertida en skill (la escribe el creador)
  const [receta, setReceta] = useState<Repeticion | null>(null)
  // Fabricar una herramienta que falta: la Forja la escribe y tú la apruebas.
  const fabricar = async (encargo: string) => {
    const r = await bridge.forja.encargar(encargo)
    if (r.ok) toast.success(`Fabricando «${r.herramienta}». La revisas en el Taller cuando esté lista.`)
    else toast.error(r.error)
  }
  const [veredictos, setVeredictos] = useState<Veredicto[]>([])
  const [carpeta, setCarpeta] = useState<string | null>(() => leer<string | null>('carpeta', null))
  const [texto, setTexto] = useState('')
  const [opciones, setOpciones] = useState<OpcionMotor[] | null>(null)
  const [config, setConfig] = useState<Record<string, string>>({})
  const [enviando, setEnviando] = useState(false)
  const [cuando, setCuando] = useState<OpcionCuando>({ modo: 'ahora' })
  // cuánto puede hacer sin preguntarte; se recuerda (por defecto, ediciones: dentro de su copia aislada no rompe nada tuyo)
  const [acceso, setAcceso] = useState<AccesoTarea>(() => { try { const v = localStorage.getItem('esme:taller:acceso'); return v === 'preguntar' || v === 'todo' ? v : 'ediciones' } catch { return 'ediciones' } })
  useEffect(() => { try { localStorage.setItem('esme:taller:acceso', acceso) } catch { /* sin almacenamiento */ } }, [acceso])
  const regla = arena ? null : cuandoDe(cuando, Date.now())
  const auto = motor === AUTO
  const actual = auto ? undefined : instalados.find((m) => m.id === motor) ?? instalados[0]

  // En automático y en la arena, Esme mira los modelos de todos los motores y lo que has aplicado o descartado antes.
  useEffect(() => {
    if (!instalados.length) return
    let vivo = true
    void Promise.all([Promise.all(instalados.map(async (m) => [m.id, await bridge.taller.opcionesMotor(m.id)] as const)), bridge.taller.veredictos()])
      .then(([os, vs]) => { if (vivo) { setTodas(Object.fromEntries(os)); setVeredictos(vs) } })
    return () => { vivo = false }
  }, [instalados.map((m) => m.id).join()])   // eslint-disable-line react-hooks/exhaustive-deps
  const candidatos = todas ? elegibles(candidatosDe(instalados, todas, leer<string[]>('caidos', [])), veredictos).filter((c) => auto ? !noListos.has(c.motor) : c.motor === actual?.id) : []
  // lo que el creador aplicó o descartó, más lo que ya falló por su cuenta: el router elige con las dos cosas
  const pasado = useMemo(() => historial(veredictos, fallos), [veredictos, fallos])
  const tirar = () => setRivales(elegirVarios(candidatos, pasado, 3))
  useEffect(() => { if (arena) tirar() }, [arena, auto, actual?.id, todas])   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { void bridge.taller.roles().then(setRoles).catch(() => {}) }, [])

  useEffect(() => {
    if (!actual) { setOpciones([]); return }
    let vivo = true
    setOpciones(null)
    void bridge.taller.opcionesMotor(actual.id).then((o) => {
      if (!vivo) return
      setOpciones(o); setConfig(configInicial(o, leer<Record<string, string>>(`config:${actual.id}`, {}), leer<string[]>('caidos', [])))
    })
    return () => { vivo = false }
  }, [actual?.id])

  const elegirMotor = (id: string) => { setMotor(id); guardar('motor', id) }
  const cambiarOpcion = (id: string, v: string) => {
    const n = { ...config, [id]: v }; setConfig(n)
    if (actual) guardar(`config:${actual.id}`, { ...leer<Record<string, string>>(`config:${actual.id}`, {}), [id]: v })
  }
  const elegirCarpeta = async () => { const c = await bridge.taller.carpeta(); if (c) { setCarpeta(c); guardar('carpeta', c) } }
  // el objetivo del rumbo al que sirve este encargo (si hay rumbo; si no, se trabaja sin él)
  const [objetivos, setObjetivos] = useState<{ id: string; texto: string }[]>([])
  useEffect(() => { void bridge.mente.rumbo().then((r) => setObjetivos(r.objetivos.filter((o) => o.estado === 'activo').map((o) => ({ id: o.id, texto: o.texto })))).catch(() => setObjetivos([])) }, [])
  const [objetivo, setObjetivo] = useState('')
  const listo = auto || arena ? todas !== null && candidatos.length > 0 : !!actual && opciones !== null
  /** La petición que este panel haría con un encargo dado (el motor de la vista, la carpeta y el acceso).
   *  En arena no sirve: la puerta no entra en competiciones. `null` si no hay motor de verdad. */
  const peticionPara = (txt: string, o: { acceso?: AccesoTarea; origen?: string; objetivo?: string } = {}): Peticion | null => {
    if (arena) return null
    if (auto) {
      const e = elegir(candidatos, pasado)
      if (!e) return null
      return { motor: e.motor, carpeta, texto: txt, config: { model: e.modelo }, acceso: o.acceso ?? acceso, ...(o.origen ? { origen: o.origen } : {}), ...(o.objetivo ? { objetivo: o.objetivo } : {}) }
    }
    if (!actual) return null
    const elegida = Object.fromEntries((opciones ?? []).filter((x) => x.id === 'model' || x.id === 'mode').map((x) => [x.id, config[x.id] ?? x.actual]))
    return { motor: actual.id, carpeta, texto: txt, config: { ...config, ...elegida }, acceso: o.acceso ?? acceso, ...(o.origen ? { origen: o.origen } : {}), ...(o.objetivo ? { objetivo: o.objetivo } : {}) }
  }
  const empezar = async () => {
    const q = texto.trim()
    if (!q || enviando || !listo) return
    setEnviando(true)
    let peticiones: Peticion[]
    if (arena) {
      const id = nuevoId()
      const elegidos = oficios.length ? oficios : roles.slice(0, 2).map((r) => r.id)
      peticiones = rivales.map((r, i) => ({ motor: r.motor, carpeta, texto: q, config: { model: r.modelo }, arena: id, acceso,
        ...(elegidos.length ? { rol: elegidos[i % elegidos.length] } : {}), ...(objetivo ? { objetivo } : {}) }))
    } else {
      // Lo que ves es lo que se usa: la misma petición que la puerta de fuera construiría, con el motor de la vista.
      const p = peticionPara(q, { objetivo })
      if (!p) { setEnviando(false); return }
      if (auto) { const e = elegir(candidatos, pasado)!; toast(`Esme eligió ${e.motorNombre} con ${corto(e)}`, { description: e.motivo }) }
      peticiones = [p]
    }
    if (regla && peticiones[0]) {
      // programado: la agenda lo lanzará a su hora como una tarea normal
      const r = await bridge.taller.programar({ motor: peticiones[0].motor, carpeta, texto: q, cuando: regla })
      if (r.ok) { toast(`Programado: ${fraseCuando(regla)}`, { description: 'Tu equipo lo hará solo, con la app abierta. Lo ves en la agenda del Taller.' }); setTexto(''); setCuando({ modo: 'ahora' }) }
      else toast.error(r.error)
    } else if (peticiones.length && await onCrear(peticiones)) { setTexto(''); setArena(false) }
    setEnviando(false)
  }
  const nombreCarpeta = carpeta?.split(/[\\/]/).filter(Boolean).pop()
  /** La aprobación de un encargo de fuera: tarea con la puerta apretada (ediciones, sin credenciales).
   *  La decisión a la cola llega DESPUÉS de crear: si la tarea no arranca, el encargo sigue esperando. */
  const aprobarFuera = async (e: EncargoFuera) => {
    const p = peticionPara(e.texto, { acceso: 'ediciones', origen: 'fuera' })
    if (!p) { toast.error('Elige un motor (o deja «auto») para poder arrancar el encargo de fuera.'); return }
    if (!await onCrear([p])) return
    quitarFuera(e.id)
    try {
      await bridge.mente.tallerEncargoResponder(e.id, 'aceptado')
      toast('Encargo aceptado', { description: 'La tarea está en marcha con acceso «ediciones» y sin ninguna credencial.' })
    } catch (err) { toast.error(err instanceof Error ? err.message : 'la mente no respondió') }
  }
  const rechazarFuera = async (e: EncargoFuera) => {
    try {
      await bridge.mente.tallerEncargoResponder(e.id, 'rechazado')
      quitarFuera(e.id)
      toast('Encargo rechazado', { description: 'Se lo contó a la cola; nadie lo creará.' })
    } catch (err) { toast.error(err instanceof Error ? err.message : 'la mente no respondió') }
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto px-6 pt-6 pb-5">
      <h2 className="font-display text-[22px] leading-7 tracking-[-0.015em] text-texto">Nueva tarea</h2>
      <p className="mt-1.5 max-w-[470px] text-[13.5px] leading-5 text-texto-3">
        Esme monta una copia aislada de tu proyecto y un motor trabaja en ella. Tú revisas los cambios y decides qué se queda.
      </p>

      {instalados.length === 0 ? (
        <div className="mt-6 rounded-3 border border-linea bg-s1/60 p-4 text-[13.5px] text-texto-2">
          No hay ningún motor instalado en este equipo.
          <button type="button" onClick={onIrMotores} className="ml-1 text-texto underline decoration-texto-3 underline-offset-2 hover:decoration-texto">Ver motores</button>
        </div>
      ) : (
        <div className="vidrio aurora-foco mt-5 rounded-4 border">
          <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={4} autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); void empezar() } }}
            placeholder="Describe qué quieres. Por ejemplo: añade un modo oscuro a la página de ajustes, con sus tests."
            className="block w-full resize-none bg-transparent px-4 pt-3.5 pb-2 text-[14.5px] leading-[22px] text-texto outline-none placeholder:text-texto-3" />
          <div className="flex flex-wrap items-center gap-2 border-t border-linea px-3 py-2.5">
            <div role="radiogroup" aria-label="Motor" className="relative flex max-w-full overflow-x-auto rounded-full border border-linea bg-s1/70 p-0.5 [scrollbar-width:none]">
              {[{ id: AUTO, nombre: 'Automático' }, ...instalados].map((m) => {
                const on = m.id === AUTO ? auto : m.id === actual?.id, motivo = noListos.get(m.id)
                return (
                  <button key={m.id} type="button" role="radio" aria-checked={on} onClick={() => elegirMotor(m.id)} title={motivo}
                    aria-description={motivo}
                    className={cn('relative h-7 shrink-0 whitespace-nowrap rounded-full px-3 text-[12.5px] transition-colors', on ? 'text-sobre-acento' : 'text-texto-2 hover:text-texto', motivo && !on && 'opacity-50 line-through decoration-texto-3/60')}>
                    {on && <motion.span layoutId="motor-elegido" className="absolute inset-0 rounded-full bg-acento" transition={muelle} />}
                    <span className="relative inline-flex items-center gap-1.5">{m.id === AUTO ? <Sparkles className="size-3" strokeWidth={2} /> : <Bicho de={m.id} tamaño={13} vivo={on} />}{m.nombre}</span>
                  </button>
                )
              })}
            </div>
            {arena && (
              <Oficios roles={roles} elegidos={oficios}
                onCambiar={(n) => { setOficios(n); guardar('oficios', n) }} />
            )}
            {!auto && !arena && (opciones === null ? <span className="h-8 w-40 animate-pulse rounded-2 bg-s2/70" aria-label="Leyendo los modelos del motor" />
              : opciones.filter((o) => o.id === 'model' || o.id === 'mode').map((o) => (
                <SelectorOpcion key={o.id} o={o} valor={config[o.id]} onCambiar={(v) => cambiarOpcion(o.id, v)} className={o.id === 'model' ? 'max-w-[220px]' : 'max-w-[150px]'} />
              )))}
            <button type="button" role="switch" aria-checked={arena} onClick={() => setArena((v) => !v)}
              title="La misma tarea con tres modelos a la vez: te quedas con la mejor y Esme aprende de tu elección"
              className={cn('inline-flex h-8 items-center gap-1.5 rounded-2 border px-2.5 text-[12.5px] transition-colors',
                arena ? 'aurora-borde border-transparent bg-s2 text-texto' : 'border-linea bg-s1/70 text-texto-2 hover:text-texto')}>
              <Swords className="size-3.5" strokeWidth={1.75} />Arena
            </button>
            <span className="inline-flex h-8 items-center rounded-2 border border-linea bg-s1/70 text-[12.5px]">
              <button type="button" onClick={() => void elegirCarpeta()} title={carpeta ?? 'Empieza en una carpeta nueva, vacía'}
                className="inline-flex h-full items-center gap-1.5 rounded-l-2 pr-2 pl-2.5 text-texto-2 hover:text-texto">
                {carpeta ? <Folder className="size-3.5" strokeWidth={1.5} /> : <FolderPlus className="size-3.5" strokeWidth={1.5} />}
                <span className="max-w-[160px] truncate">{nombreCarpeta ?? 'Carpeta nueva'}</span>
              </button>
              {carpeta && (
                <button type="button" onClick={() => { setCarpeta(null); guardar('carpeta', null) }} aria-label="Empezar en una carpeta nueva"
                  className="grid h-full w-7 place-items-center rounded-r-2 border-l border-linea text-texto-3 hover:text-texto"><X className="size-3" /></button>
              )}
            </span>
            <button type="button" onClick={() => void empezar()} disabled={!texto.trim() || enviando || !listo || (arena && rivales.length < 2)}
              className="cta-viva ml-auto inline-flex h-8 items-center gap-2 rounded-full bg-acento px-4 text-[13px] font-medium text-sobre-acento transition-opacity disabled:opacity-35">
              {enviando ? 'Montando…' : !listo ? 'Leyendo los motores…' : arena ? `Empezar arena de ${rivales.length}` : regla ? 'Programar' : 'Empezar'}
              <kbd className="inline-flex items-center gap-0.5 font-sans text-[11px] opacity-70">Ctrl<CornerDownLeft className="size-3" /></kbd>
            </button>
          </div>
          <div role="radiogroup" aria-label="Qué puede hacer sin preguntarte" className="flex flex-wrap items-center gap-1.5 border-t border-linea px-3 py-2 text-[12.5px]">
            <ShieldCheck className="mr-0.5 size-3.5 text-texto-3" strokeWidth={1.5} aria-hidden />
            {([['ediciones', 'Ediciones solas'], ['preguntar', 'Preguntar todo'], ['todo', 'Todo']] as const).map(([m, nombre]) => (
              <button key={m} type="button" role="radio" aria-checked={acceso === m} onClick={() => setAcceso(m)}
                className={cn('h-7 rounded-full px-2.5 transition-colors', acceso === m ? 'bg-s2 text-texto' : 'text-texto-3 hover:text-texto')}>{nombre}</button>
            ))}
            <span className={cn('ml-auto', acceso === 'todo' ? 'text-atencion' : 'text-texto-3')}>
              {acceso === 'ediciones' ? 'Lee y edita en su copia; pregunta antes de ejecutar o salir a la red' : acceso === 'preguntar' ? 'Te pregunta cada paso' : 'No pregunta nada: también ejecuta órdenes'}
            </span>
          </div>
          {objetivos.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 border-t border-linea px-3 py-2 text-[12.5px]">
              <Target className="size-3.5 shrink-0 text-texto-3" strokeWidth={1.5} aria-hidden />
              <label htmlFor="objetivo-taller" className="text-texto-3">Para</label>
              <select id="objetivo-taller" value={objetivo} onChange={(e) => setObjetivo(e.target.value)}
                className="h-7 min-w-0 max-w-[320px] flex-1 rounded-full border border-linea bg-s1/50 px-2.5 text-[12.5px] text-texto-2 outline-none focus:border-foco">
                <option value="">Sin objetivo (trabajo suelto)</option>
                {objetivos.map((o) => <option key={o.id} value={o.id}>{o.texto}</option>)}
              </select>
              <span className="text-texto-3">de tu rumbo</span>
            </div>
          )}
          {!arena && (
            <div role="radiogroup" aria-label="Cuándo" className="flex flex-wrap items-center gap-1.5 border-t border-linea px-3 py-2 text-[12.5px]">
              <CalendarClock className="mr-0.5 size-3.5 text-texto-3" strokeWidth={1.5} aria-hidden />
              {([['ahora', 'Ahora'], ['noche', 'Esta noche'], ['manana', 'Mañana a las 9'], ['diaria', 'Cada día']] as const).map(([m, nombre]) => (
                <button key={m} type="button" role="radio" aria-checked={cuando.modo === m}
                  onClick={() => setCuando(m === 'diaria' ? { modo: 'diaria', hora: '07:00', laborables: false } : { modo: m })}
                  className={cn('h-7 rounded-full px-2.5 transition-colors', cuando.modo === m ? 'bg-s2 text-texto' : 'text-texto-3 hover:text-texto')}>{nombre}</button>
              ))}
              {cuando.modo === 'diaria' && (
                <>
                  <input type="time" value={cuando.hora} aria-label="Hora" onChange={(e) => setCuando({ ...cuando, hora: e.target.value })}
                    className="h-7 rounded-2 border border-linea bg-s1/70 px-2 text-texto outline-none [color-scheme:dark] focus:border-acento" />
                  <button type="button" role="switch" aria-checked={!!cuando.laborables} onClick={() => setCuando({ ...cuando, laborables: !cuando.laborables })}
                    className={cn('h-7 rounded-full border px-2.5 transition-colors', cuando.laborables ? 'border-acento/60 text-texto' : 'border-linea text-texto-3 hover:text-texto')}>Solo laborables</button>
                </>
              )}
              {regla && <span className="ml-auto text-texto-3">{fraseCuando(regla)}</span>}
            </div>
          )}
          <AnimatePresence initial={false}>
            {(arena || auto) && todas && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="flex flex-wrap items-center gap-2 border-t border-linea px-3 py-2.5 text-[12.5px] text-texto-3">
                  {arena ? (
                    <>
                      <span>Compiten</span>
                      {rivales.map((r) => (
                        <span key={r.motor + r.modelo} title={r.motivo} className="inline-flex h-7 items-center gap-1 rounded-full border border-linea bg-s1/70 pr-1 pl-2.5 text-texto-2">
                          {r.motorNombre} · {corto(r)}
                          <button type="button" onClick={() => setRivales((v) => v.filter((x) => x !== r))} aria-label={`Quitar ${corto(r)}`}
                            className="grid size-5 place-items-center rounded-full text-texto-3 hover:bg-s3 hover:text-texto"><X className="size-3" /></button>
                        </span>
                      ))}
                      <button type="button" onClick={tirar} className="inline-flex h-7 items-center gap-1.5 rounded-full px-2 text-texto-3 hover:bg-s2 hover:text-texto"><Dices className="size-3.5" strokeWidth={1.5} />Otra tirada</button>
                    </>
                  ) : candidatos.length ? (
                    <span>Esme elegirá entre {candidatos.length} {candidatos.length === 1 ? 'modelo' : 'modelos'}{candidatos.every((c) => c.gratis) ? ' gratis' : ''} según lo que has aplicado y descartado antes.</span>
                  ) : <span>No encuentro modelos que respondan: elige un motor concreto.</span>}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {instalados.length > 0 && !texto && <Recetas onElegir={setTexto} />}
      {instalados.length > 0 && !texto && repetidas.length > 0 && (
        <section aria-label="Tareas repetidas" className="mt-5 grid gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-[13px] font-medium text-texto">Lo que repites</span>
            <span className="text-[12px] text-texto-3">La mente lo ha visto. Si quieres, úsalo como receta.</span>
          </div>
          {receta ? (
            <EditorSkill r={receta} onCerrar={() => setReceta(null)} />
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-2.5">
              {repetidas.map((r) => <TarjetaRepeticion key={`${r.titulo}-${r.desde}`} r={r} onElegir={setTexto} onConvertir={setReceta} />)}
            </div>
          )}
        </section>
      )}
      {fuera.length > 0 && (
        <section aria-label="Encargos de fuera" className="mt-5 grid gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-[13px] font-medium text-texto">Encargos de fuera</span>
            <span className="text-[12px] text-texto-3">Llegaron por tu mente a la puerta del Taller. Tú decides si entran.</span>
          </div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-2.5">
            {fuera.map((e) => (
              <TarjetaEncargoFuera key={e.id} e={e} ahora={Date.now() / 1000}
                onAprobar={aprobarFuera} onRechazar={rechazarFuera} />
            ))}
          </div>
        </section>
      )}
      {instalados.length > 0 && !texto && necesidades.length > 0 && (
        <section aria-label="Herramientas que faltan" className="mt-5 grid gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-[13px] font-medium text-texto">Lo que falta</span>
            <span className="text-[12px] text-texto-3">Se rompió lo mismo más de una vez. Puedo fabricarlo.</span>
          </div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-2.5">
            {necesidades.map((n) => <TarjetaNecesidad key={`${n.titulo}-${n.fallo}`} n={n} onFabricar={fabricar} />)}
          </div>
        </section>
      )}
      {motores.some((m) => !m.instalado) && (
        <p className="mt-auto pt-6 text-xs text-texto-3">
          {motores.filter((m) => !m.instalado).length} motores más disponibles.{' '}
          <button type="button" onClick={onIrMotores} className="underline decoration-texto-3/60 underline-offset-2 hover:text-texto-2">Instalar o conectar</button>
        </p>
      )}
    </div>
  )
}

const ICONOS_RECETA: Record<string, LucideIcon> = { LayoutTemplate: ILayoutTemplate, Rocket: IRocket, Plus: IPlus, FlaskConical: IFlaskConical, Wrench: IWrench, ScanSearch: IScanSearch, ShieldCheck: IShieldCheck, PackageCheck: IPackageCheck, BookOpen: IBookOpen, FileText: IFileText, Shuffle: IShuffle, Languages: ILanguages, Gauge: IGauge, Accessibility: IAccessibility, Sparkles: ISparkles }

// La galería de recetas (taller/recetas.ts): encargos completos por categoría; al elegir uno, su texto queda en la caja.
function Recetas({ onElegir }: { onElegir(texto: string): void }) {
  const [cat, setCat] = useState<(typeof CATEGORIAS)[number] | 'Todas'>('Todas')
  const vistas = RECETAS.filter((r) => cat === 'Todas' || r.categoria === cat)
  return (
    <section aria-label="Recetas" className="mt-5 grid gap-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-[13px] font-medium text-texto">Recetas</span>
        {(['Todas', ...CATEGORIAS] as const).map((c) => (
          <button key={c} type="button" onClick={() => setCat(c)} aria-pressed={cat === c}
            className={cn('h-7 rounded-full px-3 text-[12.5px] transition-colors', cat === c ? 'bg-s3 text-texto' : 'text-texto-2 hover:text-texto')}>{c}</button>
        ))}
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-2.5">
        {vistas.map((r) => {
          const Icono = ICONOS_RECETA[r.icono] ?? ISparkles
          return (
            <button key={r.titulo} type="button" onClick={() => onElegir(r.encargo)}
              className="group grid content-start gap-1.5 rounded-3 border border-linea/70 bg-s1/40 p-3.5 text-left transition-all hover:-translate-y-0.5 hover:border-linea-fuerte hover:bg-s2/50">
              <span className="flex items-center gap-2">
                <span className="grid size-7 place-items-center rounded-2 bg-acento-velo text-acento"><Icono className="size-4" strokeWidth={1.75} /></span>
                <span className="text-[13.5px] font-medium text-texto">{r.titulo}</span>
              </span>
              <span className="text-[12.5px] leading-snug text-texto-2">{r.descripcion}</span>
              <span className="text-[11px] text-texto-3">{r.categoria}</span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
