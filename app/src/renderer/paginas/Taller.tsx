// Taller: donde los motores trabajan para ti. Arriba, la planta (una máquina por tarea alrededor de la mente);
// abajo, una fila por tarea y el detalle de la elegida, o la petición de una nueva. Cada tarea vive en su copia aislada.
import { Plus, SquareTerminal } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import type { SeccionId } from '../shell/secciones'
import type { TareaTaller } from '../lib/bridge'
import { Detalle, type Pestana } from '../taller/Detalle'
import { FilaMotor } from '../taller/FilaMotor'
import { useRumbo } from './Rumbo'
import { TintaVista, tintaDeTarea } from '../marca/PuntoVista'
import { actividadActual } from '../taller/linea'
import { NuevaTarea } from '../taller/NuevaTarea'
import { Terminales } from '../taller/Terminales'
import type { useTaller } from '../taller/useTaller'
import { activa, archivable, ESTADOS, explicarError } from '../taller/vista'
import { caidosDe, fallosDe, noListos } from '../taller/eleccion'
import { cn } from '../lib/cn'
import { useMuelle } from '../tinta/movimiento'
import { ofrece, TIPO_AGENTE, type PeticionDeAgente } from '../lib/peticiones'
import { useEstrecho } from '../lib/estrecho'
import { BottomSheet } from '../ui/motion/bottom-sheet'
import { Agenda, useAgenda } from '../taller/Agenda'

function useAhora(cada: number) {
  const [ahora, setAhora] = useState(() => Date.now())
  useEffect(() => {
    setAhora(Date.now())
    if (!cada) return
    const k = setInterval(() => setAhora(Date.now()), cada)
    return () => clearInterval(k)
  }, [cada])
  return ahora
}


export function Taller({ tema, tl, foco, onIr }: { tema: string; tl: ReturnType<typeof useTaller>; foco: { id: string; n: number } | null; onIr(id: SeccionId): void }) {
  const muelle = useMuelle({ stiffness: 420, damping: 38 })
  // el rumbo: para saber qué objetivo sirve cada tarea (los ids son de la mente; aquí van sus palabras)
  const { rumbo } = useRumbo()
  const objetivosDe = Object.fromEntries((rumbo?.objetivos ?? []).map((o) => [o.id, o.texto]))
  const [seleccion, setSeleccion] = useState<string | null>(null)
  const [pedirNuevo, setPedirNuevo] = useState(false)   // la pantalla de encargar, abierta a propósito
  // en una ventana estrecha el detalle no cabe al lado: se abre abajo, en una hoja que se desliza
  const estrecho = useEstrecho(900)
  const [hoja, setHoja] = useState(false)
  const [motorVisto, setMotorVisto] = useState<string | null>(null)
  const [motorPedido, setMotorPedido] = useState<{ id: string; n: number } | null>(null)   // pulsar un agente de la sala filtra la fila por él
  const [resaltada, setResaltada] = useState<string | null>(null)
  const [terminal, setTerminal] = useState(false)
  const [pestana, setPestana] = useState<Pestana>('vivo')
  const [pedida, setPedida] = useState<{ p: Pestana; n: number } | null>(null)
  const ahora = useAhora(tl.tareas.some(activa) ? 1000 : 0)

  // desde un aviso de fuera («Ver»): abre esa tarea
  useEffect(() => { if (foco) { setSeleccion(foco.id); void tl.cargar(foco.id) } }, [foco?.n])   // eslint-disable-line react-hooks/exhaustive-deps
  // la Tienda pide un agente: este Taller lo recoge, lo deja elegido y abre la pantalla de encargar.
  useEffect(() => ofrece<PeticionDeAgente>(TIPO_AGENTE, (p) => {
    setMotorPedido({ id: p.motor, n: (motorPedido?.n ?? 0) + 1 })
    setPedirNuevo(true)
    toast(`«${p.nombre}» te espera: escribe qué quieres que haga.`)
  }), [motorPedido?.n])   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (seleccion && !tl.tareas.some((t) => t.id === seleccion)) setSeleccion(null) }, [tl.tareas, seleccion])
  // Un modelo que el motor rechaza por retirado o caído no se vuelve a proponer... salvo que vuelva a funcionar.
  const caidos = useMemo(() => caidosDe(tl.tareas), [tl.tareas])
  useEffect(() => {
    try {
      localStorage.setItem('esme:taller:caidos', JSON.stringify(caidos))
    } catch { /* sin almacenamiento */ }
  }, [caidos])
  const agenda = useAgenda()
  const login = (motor: string) => tl.motores.find((m) => m.id === motor)?.login ?? ''

  // Reencarna una tarea muerta con el siguiente motor instalado: misma petición, copia nueva, hermana de la fallida.
  const reincarna = async (muerta: TareaTaller) => {
    const destino = tl.motores.find((m) => m.instalado && m.id !== muerta.motor)
    if (!destino) { toast.error('No hay otro motor instalado que pueda reencarnarla.'); return }
    const texto = `Reencarnación de una tarea que falló con ${muerta.motorNombre}. ${muerta.texto}`
    const id = await tl.crear({ motor: destino.id, carpeta: muerta.carpeta, texto, config: {} })
    if (id) elegir(id)
  }

  // Los errores y paradas de hace más de un día se archivan: no se borran, pero dejan de llenar la fila y las cuentas
  const [verArchivadas, setVerArchivadas] = useState(false)
  const todas = useMemo(() => [...tl.tareas].sort((a, b) => Number(activa(b)) - Number(activa(a)) || b.inicio - a.inicio), [tl.tareas])
  const archivadas = todas.filter((x) => archivable(x, ahora))
  const ordenadas = todas.filter((x) => !archivable(x, ahora))
  const elegir = (id: string) => { setSeleccion(id); setPedirNuevo(false); if (estrecho) setHoja(true); void tl.cargar(id) }
  const t = pedirNuevo ? undefined : tl.tareas.find((x) => x.id === seleccion)
  const enfoque = !!t && pestana !== 'vivo'   // al revisar o comparar, la planta se recoge y el detalle gana sitio
  const rivales = t?.arena ? tl.tareas.filter((x) => x.arena === t.arena).sort((a, b) => a.inicio - b.inicio) : []
  // quedarse con una de la arena: las demás se descartan (veredicto negativo para su modelo) y se abre su revisión
  const quedarme = async (id: string) => {
    for (const x of rivales) if (x.id !== id) await tl.descartar(x.id)
    setSeleccion(id); setPedida((v) => ({ p: 'revision', n: (v?.n ?? 0) + 1 }))
  }
  const sinListo = useMemo(() => noListos(tl.tareas), [tl.tareas])
  // lo que ya falló sin que el creador etiquete nada: el router lo tiene en cuenta al elegir
  const fallos = useMemo(() => fallosDe(tl.tareas), [tl.tareas])
  const cuenta = (e: string) => ordenadas.filter((x) => x.estado === e).length
  // el tablero: cada banda es una etapa del trabajo; nada se esconde
  const bandas = [
    { id: 'te-necesita', titulo: 'Te necesita', punto: 'bg-atencion', items: ordenadas.filter((x) => x.estado === 'esperando') },
    { id: 'trabajando', titulo: 'Trabajando', punto: '[background:var(--aurora)]', items: ordenadas.filter((x) => x.estado === 'preparando' || x.estado === 'trabajando') },
    { id: 'listas', titulo: 'Listas para aplicar', punto: 'bg-exito', items: ordenadas.filter((x) => x.estado === 'lista') },
    { id: 'con-error', titulo: 'Con error', punto: 'bg-peligro', items: ordenadas.filter((x) => x.estado === 'error') },
  ].filter((b) => b.items.length > 0)
  const estadoCerrado = (s: string) => !['esperando', 'preparando', 'trabajando', 'lista', 'error'].includes(s)
  const fuera = ordenadas.filter((x) => estadoCerrado(x.estado))
  if (fuera.length > 0) bandas.push({ id: 'cerradas', titulo: 'Cerradas', punto: 'bg-texto-3', items: fuera })
  if (verArchivadas && archivadas.length > 0) bandas.push({ id: 'archivadas', titulo: 'Archivadas', punto: 'bg-texto-3', items: archivadas })
  const bandasVistas = motorVisto ? bandas.map((b) => ({ ...b, items: b.items.filter((x) => x.motor === motorVisto) })).filter((b) => b.items.length > 0) : bandas
  const chips = [
    { n: cuenta('trabajando') + cuenta('preparando'), texto: 'trabajando', punto: '[background:var(--aurora)]' },
    { n: cuenta('esperando'), texto: 'te necesita', punto: 'bg-atencion' },
    { n: cuenta('lista'), texto: cuenta('lista') === 1 ? 'lista' : 'listas', punto: 'bg-texto-3' },
    { n: cuenta('error'), texto: 'con error', punto: 'bg-peligro' },
  ].filter((c) => c.n > 0)

  // tu equipo: un agente por motor, con su estado más urgente (te espera > trabaja > falló > listo) y cuántas tareas lleva
  const URGENCIA = ['esperando', 'trabajando', 'preparando', 'error', 'lista', 'parada'] as const
  const equipo = Object.values(ordenadas.reduce<Record<string, { motor: string; nombre: string; total: number; estado: (typeof URGENCIA)[number] }>>((acc, x) => {
    const a = acc[x.motor] ?? { motor: x.motor, nombre: x.motorNombre, total: 0, estado: 'parada' }
    a.total++; if (URGENCIA.indexOf(x.estado) < URGENCIA.indexOf(a.estado)) a.estado = x.estado
    acc[x.motor] = a; return acc
  }, {})).sort((a, b) => URGENCIA.indexOf(a.estado) - URGENCIA.indexOf(b.estado) || b.total - a.total)
  // los agentes libres: instalados, listos y sin tareas ahora mismo (esperan encargo)
  const libres = tl.motores.filter((m) => m.instalado && !sinListo.has(m.id) && !equipo.some((e) => e.motor === m.id)).slice(0, 8)
  const acento = getComputedStyle(document.documentElement).getPropertyValue('--acento').trim() || undefined
  return (
    <div className="relative flex h-full flex-col overflow-hidden">
      {/* la sala de agentes: tu equipo, cada uno con su cara diciendo en qué está; pulsar uno abre su trabajo */}
      <header className="flex shrink-0 items-end gap-6 px-6 pt-5 pb-4">
        <div className="grid gap-1">
          <h1 className="m-0 text-[34px] leading-none font-light tracking-[-0.04em] text-texto">Taller</h1>
          <p className="m-0 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-texto-2">
            {chips.length ? chips.map((c) => <span key={c.texto} className="inline-flex items-center gap-1.5"><span className={`size-1.5 rounded-full ${c.punto}`} /><b className="font-medium tabular-nums text-texto">{c.n}</b>{c.texto}</span>) : 'Tu equipo de agentes está libre. Pídele algo.'}
          </p>
        </div>
        <ol aria-label="Tu equipo de agentes" className="m-0 flex min-w-0 flex-1 list-none items-end gap-2 overflow-x-auto p-0 pb-1">
          {equipo.map((m) => (
            <li key={m.motor}>
              <button type="button" onClick={() => setMotorVisto((v) => (v === m.motor ? null : m.motor))} aria-pressed={motorVisto === m.motor} title={`${m.nombre}: ${m.total} ${m.total === 1 ? 'tarea' : 'tareas'}`}
                className={cn('grid w-[96px] justify-items-center gap-1 rounded-4 px-1.5 pt-2 pb-1.5 transition-all hover:bg-s2/60', motorVisto === m.motor && 'bg-s2/80 ring-1 ring-acento/50')}>
                <span className="relative">
                  <TintaVista motor={m.motor} px={m.estado === 'trabajando' || m.estado === 'esperando' ? 48 : 40} estado={tintaDeTarea(m.estado)} />
                  <span className="absolute -right-1.5 -bottom-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-s3 px-1 text-[10.5px] font-medium tabular-nums text-texto">{m.total}</span>
                </span>
                <span className="w-full truncate text-center text-[11.5px] font-medium text-texto">{m.nombre}</span>
                <span className={cn('w-full truncate text-center text-[10.5px]', m.estado === 'esperando' ? 'text-atencion' : m.estado === 'error' ? 'text-peligro' : 'text-texto-3')}>{ESTADOS[m.estado].texto}</span>
              </button>
            </li>
          ))}
          {libres.map((m) => (
            <li key={m.id}>
              <button type="button" onClick={() => { setSeleccion(null); setMotorPedido((v) => ({ id: m.id, n: (v?.n ?? 0) + 1 })) }} title={`${m.nombre}: libre. Pulsa para darle un encargo`}
                className="grid w-[96px] justify-items-center gap-1 rounded-4 px-1.5 pt-2 pb-1.5 opacity-70 transition-all hover:bg-s2/60 hover:opacity-100">
                <TintaVista motor={m.id} px={36} estado="quieto" />
                <span className="w-full truncate text-center text-[11.5px] font-medium text-texto">{m.nombre}</span>
                <span className="w-full truncate text-center text-[10.5px] text-texto-3">Libre</span>
              </button>
            </li>
          ))}
        </ol>
        <button type="button" onClick={() => setTerminal((v) => !v)} aria-pressed={terminal}
          className="inline-flex h-9 shrink-0 items-center gap-2 rounded-full border border-linea bg-s1/50 px-3.5 text-[12.5px] text-texto-2 backdrop-blur transition-colors hover:text-texto">
          <SquareTerminal className="size-3.5" strokeWidth={1.5} />Terminal
        </button>
      </header>

      <div className={cn('grid min-h-0 flex-1 gap-4 px-5 pb-5 transition-[grid-template-columns] duration-500 ease-salida', enfoque ? 'grid-cols-[minmax(320px,0.62fr)_minmax(0,1.38fr)]' : 'grid-cols-[minmax(360px,0.92fr)_minmax(0,1.08fr)]')}>
        <section aria-label="Tareas" className="flex min-h-0 flex-col">
          <div className="flex h-9 items-center justify-between">
            <h2 className="flex items-center gap-3 text-[13px] font-medium text-texto-2">
              <span>Lo que trabaja ahora{ordenadas.length > 0 && <span className="ml-1.5 tabular-nums text-texto-3">{ordenadas.length}</span>}</span>
              {archivadas.length > 0 && (
                <button type="button" onClick={() => setVerArchivadas((v) => !v)} aria-pressed={verArchivadas}
                  className="rounded-full px-2 py-0.5 text-[12px] font-normal text-texto-3 underline decoration-linea-fuerte underline-offset-2 hover:text-texto">
                  {verArchivadas ? 'Ocultar archivadas' : `${archivadas.length} archivadas`}
                </button>
              )}
            </h2>
            {seleccion && (
              <button type="button" onClick={() => setSeleccion(null)} className="inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[12.5px] text-texto-2 hover:bg-s2 hover:text-texto">
                <Plus className="size-3.5" />Nueva tarea
              </button>
            )}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto pr-1 pb-1">
            <Agenda lista={agenda} nombreDe={(id) => tl.motores.find((m) => m.id === id)?.nombre ?? id} />
            <AnimatePresence initial={false}>
              {bandasVistas.map((b) => (
                <motion.section key={b.id} layout initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  aria-label={b.titulo}
                  className="mb-4">
                  <div className="sticky top-0 z-10 flex h-9 items-center gap-2.5 bg-[color-mix(in_oklab,var(--hoja)_85%,transparent)] pl-1 pr-1 backdrop-blur-md">
                    <span className={cn('shrink-0 rounded-full', b.punto, b.id === 'trabajando' && 'size-2 animate-pulse')} style={{ width: b.id === 'trabajando' ? 8 : 6, height: b.id === 'trabajando' ? 8 : 6 }} aria-hidden />
                    <h3 className="text-[10.5px] font-medium uppercase tracking-[0.1em] text-texto-3">{b.titulo}</h3>
                    <span aria-hidden className="min-w-0 flex-1 self-center border-t border-dashed border-linea/70" />
                    <span className="inline-flex h-[19px] min-w-[19px] shrink-0 items-center justify-center rounded-full bg-s2 px-1.5 text-[11px] font-medium tabular-nums text-texto-2">{b.items.length}</span>
                  </div>
                  <div className="space-y-2 pt-1">
                    <AnimatePresence initial={false}>
                      {b.items.map((x) => (
                        <motion.div key={x.id} layout initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0, marginTop: 0 }}
                          transition={muelle}>
                          <FilaMotor t={x} login={login(x.motor)} ahora={ahora} inicioTurno={tl.inicioTurno.get(x.id)} haciendo={actividadActual(tl.lineas[x.id] ?? [])} objetivo={objetivosDe[x.objetivo ?? '']}
                            elegida={x.id === seleccion} resaltada={x.id === resaltada} onElegir={elegir} onResaltar={setResaltada}
                            onReencarnar={() => void reincarna(x)} onAplicar={() => tl.aplicar(x.id, () => void tl.deshacer(x.id))} onParar={() => void tl.parar(x.id)} />
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </motion.section>
              ))}
            </AnimatePresence>
            {tl.tareas.length === 0 && (
              <p className="max-w-[360px] self-start pt-1 text-[13px] leading-5 text-texto-3">
                Aún no hay tareas. Cuando pidas una, entra aquí como una pieza de la fila: verás en qué banda vive y cómo trabaja el motor, segundo a segundo.
              </p>
            )}
          </div>
        </section>
        <section aria-label={t ? 'Detalle de la tarea' : 'Nueva tarea'} className={cn('vidrio min-h-0 overflow-hidden rounded-4 border', estrecho && 'hidden')}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={t?.id ?? 'nueva'} className="h-full" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18 }}>
              {t ? (
                <Detalle t={t} linea={tl.lineas[t.id]} onPestana={setPestana} pedida={pedida} ahora={ahora}
                  arena={rivales.length > 1 ? { tareas: rivales, lineas: tl.lineas, ahora, onVer: (id) => { elegir(id); setPedida((v) => ({ p: 'revision', n: (v?.n ?? 0) + 1 })) }, onQuedarme: quedarme, onCargar: (id) => void tl.cargar(id) } : undefined} login={login(t.motor)} onTerminal={() => setTerminal(true)}
                  revision={{ onAplicar: () => tl.aplicar(t.id, () => void tl.deshacer(t.id)), onDeshacer: () => tl.deshacer(t.id),
                    onGuardarRama: () => tl.guardarRama(t.id), onExportar: () => tl.exportar(t.id), onAbrir: () => tl.abrir(t.id),
                    onVolverTurno: (sha, n) => tl.deshacerTurno(t.id, sha, n) }} onSeguir={(q) => tl.seguir(t.id, q)} onResponder={(o) => tl.responder(t.id, o)}
                  onParar={() => void tl.parar(t.id)} onDescartar={() => void tl.descartar(t.id)} onAbrir={() => tl.abrir(t.id)} onReencarnar={() => void reincarna(t)}
                  onDeshacerTurno={() => tl.deshacerUltimoTurno(t.id)}
                  onConfigurar={(o, v) => void tl.configurar(t.id, o, v)} />
              ) : (
                <NuevaTarea motores={tl.motores} noListos={sinListo} fallos={fallos} motorPedido={motorPedido} onIrMotores={() => onIr('ajustes')}
                  onCrear={async (ps) => {
                    // en arena, los competidores salen escalonados: los proveedores gratis limitan las peticiones a la vez
                    let primera: string | null = null
                    for (const [i, p] of ps.entries()) {
                      if (i) await new Promise((ok) => setTimeout(ok, 6000))
                      const id = await tl.crear(p)
                      if (id && !primera) { primera = id; elegir(id) }
                    }
                    if (primera) setPedirNuevo(false)   // la tarea ya está: la pantalla de encargar se cierra
                    return !!primera
                  }} />
              )}
            </motion.div>
          </AnimatePresence>
        </section>
      </div>

      {/* En una ventana estrecha, el detalle va en una hoja que sube desde abajo: no cabe al lado. Se arrastra
          para ver más, y se cierra bajándola. */}
      {estrecho && t && (
        <BottomSheet open={hoja} onOpenChange={setHoja} snapPoints={[0.55, 0.9, 'auto']} defaultSnap={1}
          title={t.titulo} description={t.motorNombre}>
          <Detalle t={t} linea={tl.lineas[t.id]} onPestana={setPestana} pedida={pedida} ahora={ahora}
            arena={rivales.length > 1 ? { tareas: rivales, lineas: tl.lineas, ahora, onVer: (id) => { elegir(id); setPedida((v) => ({ p: 'revision', n: (v?.n ?? 0) + 1 })) }, onQuedarme: quedarme, onCargar: (id) => void tl.cargar(id) } : undefined} login={login(t.motor)} onTerminal={() => setTerminal(true)}
            revision={{ onAplicar: () => tl.aplicar(t.id, () => void tl.deshacer(t.id)), onDeshacer: () => tl.deshacer(t.id),
              onGuardarRama: () => tl.guardarRama(t.id), onExportar: () => tl.exportar(t.id), onAbrir: () => tl.abrir(t.id),
                    onVolverTurno: (sha, n) => tl.deshacerTurno(t.id, sha, n) }} onSeguir={(q) => tl.seguir(t.id, q)} onResponder={(o) => tl.responder(t.id, o)}
            onParar={() => void tl.parar(t.id)} onDescartar={() => void tl.descartar(t.id)} onAbrir={() => tl.abrir(t.id)} onReencarnar={() => void reincarna(t)}
                  onDeshacerTurno={() => tl.deshacerUltimoTurno(t.id)}
            onConfigurar={(o, v) => void tl.configurar(t.id, o, v)} />
        </BottomSheet>
      )}

      <Terminales abierto={terminal} onCerrar={() => setTerminal(false)} tema={tema} />
    </div>
  )
}
