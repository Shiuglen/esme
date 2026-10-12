// Taller: donde los motores trabajan para ti. Arriba, la planta (una máquina por tarea alrededor de la mente);
// abajo, una fila por tarea y el detalle de la elegida, o la petición de una nueva. Cada tarea vive en su copia aislada.
import { Plus, SquareTerminal } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'
import type { SeccionId } from '../shell/secciones'
import { Detalle, type Pestana } from '../taller/Detalle'
import { Escena } from '../taller/Escena'
import { FilaMotor } from '../taller/FilaMotor'
import { actividadActual } from '../taller/linea'
import { NuevaTarea } from '../taller/NuevaTarea'
import { Terminales } from '../taller/Terminales'
import type { useTaller } from '../taller/useTaller'
import { activa, explicarError } from '../taller/vista'
import { cn } from '../lib/cn'

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
  const [seleccion, setSeleccion] = useState<string | null>(null)
  const [resaltada, setResaltada] = useState<string | null>(null)
  const [terminal, setTerminal] = useState(false)
  const [pestana, setPestana] = useState<Pestana>('vivo')
  const [pedida, setPedida] = useState<{ p: Pestana; n: number } | null>(null)
  const ahora = useAhora(tl.tareas.some(activa) ? 1000 : 0)

  // desde un aviso de fuera («Ver»): abre esa tarea
  useEffect(() => { if (foco) { setSeleccion(foco.id); void tl.cargar(foco.id) } }, [foco?.n])   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (seleccion && !tl.tareas.some((t) => t.id === seleccion)) setSeleccion(null) }, [tl.tareas, seleccion])
  // Un modelo que el motor rechaza por retirado o caído no se vuelve a proponer.
  useEffect(() => {
    const caidos = tl.tareas.flatMap((t) => (t.error && explicarError(t.error, '', '')?.tipo === 'modelo' ? t.opciones.filter((o) => o.id === 'model').map((o) => o.actual) : []))
    if (!caidos.length) return
    try {
      const ya: string[] = JSON.parse(localStorage.getItem('esme:taller:caidos') ?? '[]')
      localStorage.setItem('esme:taller:caidos', JSON.stringify([...new Set([...ya, ...caidos])]))
    } catch { /* sin almacenamiento */ }
  }, [tl.tareas])
  const login = (motor: string) => tl.motores.find((m) => m.id === motor)?.login ?? ''

  const ordenadas = useMemo(() => [...tl.tareas].sort((a, b) => Number(activa(b)) - Number(activa(a)) || b.inicio - a.inicio), [tl.tareas])
  const elegir = (id: string) => { setSeleccion(id); void tl.cargar(id) }
  const t = tl.tareas.find((x) => x.id === seleccion)
  const enfoque = !!t && pestana !== 'vivo'   // al revisar o comparar, la planta se recoge y el detalle gana sitio
  const rivales = t?.arena ? tl.tareas.filter((x) => x.arena === t.arena).sort((a, b) => a.inicio - b.inicio) : []
  // quedarse con una de la arena: las demás se descartan (veredicto negativo para su modelo) y se abre su revisión
  const quedarme = async (id: string) => {
    for (const x of rivales) if (x.id !== id) await tl.descartar(x.id)
    setSeleccion(id); setPedida((v) => ({ p: 'revision', n: (v?.n ?? 0) + 1 }))
  }
  const cuenta = (e: string) => tl.tareas.filter((x) => x.estado === e).length
  const chips = [
    { n: cuenta('trabajando') + cuenta('preparando'), texto: 'trabajando', punto: '[background:var(--aurora)]' },
    { n: cuenta('esperando'), texto: 'te necesita', punto: 'bg-atencion' },
    { n: cuenta('lista'), texto: cuenta('lista') === 1 ? 'lista' : 'listas', punto: 'bg-texto-3' },
    { n: cuenta('error'), texto: 'con error', punto: 'bg-peligro' },
  ].filter((c) => c.n > 0)

  return (
    <div className="relative flex h-full flex-col overflow-hidden">
      <div className={cn('relative shrink-0 transition-[height] duration-500 ease-salida', enfoque ? 'h-[150px]' : 'h-[clamp(240px,40vh,420px)]')}>
        <Escena tareas={tl.tareas} seleccion={seleccion} resaltada={resaltada} ahora={ahora} compacta={enfoque}
          onElegir={elegir} onResaltar={setResaltada} onNueva={() => setSeleccion(null)} />
        <div className="pointer-events-none absolute top-4 left-5 flex flex-wrap gap-2">
          {chips.map((c) => (
            <span key={c.texto} className="vidrio-fino inline-flex h-7 items-center gap-1.5 rounded-full border border-linea px-2.5 text-xs text-texto-2">
              <span className={`size-1.5 rounded-full ${c.punto}`} /><span className="tabular-nums text-texto">{c.n}</span>{c.texto}
            </span>
          ))}
        </div>
        <button type="button" onClick={() => setTerminal((v) => !v)} aria-pressed={terminal}
          className="vidrio-fino absolute top-4 right-5 inline-flex h-8 items-center gap-2 rounded-full border border-linea px-3 text-[12.5px] text-texto-2 transition-colors hover:text-texto">
          <SquareTerminal className="size-3.5" strokeWidth={1.5} />Terminal
        </button>
      </div>

      <div className={cn('grid min-h-0 flex-1 gap-4 px-5 pb-5 transition-[grid-template-columns] duration-500 ease-salida', enfoque ? 'grid-cols-[minmax(320px,0.62fr)_minmax(0,1.38fr)]' : 'grid-cols-[minmax(360px,0.92fr)_minmax(0,1.08fr)]')}>
        <section aria-label="Tareas" className="flex min-h-0 flex-col">
          <div className="flex h-9 items-center justify-between">
            <h2 className="text-[13px] font-medium text-texto-2">Tareas{tl.tareas.length > 0 && <span className="ml-1.5 tabular-nums text-texto-3">{tl.tareas.length}</span>}</h2>
            {seleccion && (
              <button type="button" onClick={() => setSeleccion(null)} className="inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[12.5px] text-texto-2 hover:bg-s2 hover:text-texto">
                <Plus className="size-3.5" />Nueva tarea
              </button>
            )}
          </div>
          <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto pr-1 pb-1">
            <AnimatePresence initial={false}>
              {ordenadas.map((x) => (
                <motion.div key={x.id} layout initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0, marginTop: 0 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 38 }}>
                  <FilaMotor t={x} login={login(x.motor)} ahora={ahora} inicioTurno={tl.inicioTurno.get(x.id)} haciendo={actividadActual(tl.lineas[x.id] ?? [])}
                    elegida={x.id === seleccion} resaltada={x.id === resaltada} onElegir={elegir} onResaltar={setResaltada} />
                </motion.div>
              ))}
            </AnimatePresence>
            {tl.tareas.length === 0 && (
              <p className="max-w-[340px] pt-1 text-[13px] leading-5 text-texto-3">
                Aún no hay tareas. Cuando pidas una, su máquina aparecerá en la planta y aquí verás cómo trabaja el motor, segundo a segundo.
              </p>
            )}
          </div>
        </section>
        <section aria-label={t ? 'Detalle de la tarea' : 'Nueva tarea'} className="vidrio min-h-0 overflow-hidden rounded-4 border">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={t?.id ?? 'nueva'} className="h-full" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18 }}>
              {t ? (
                <Detalle t={t} linea={tl.lineas[t.id]} onPestana={setPestana} pedida={pedida}
                  arena={rivales.length > 1 ? { tareas: rivales, lineas: tl.lineas, ahora, onVer: (id) => { elegir(id); setPedida((v) => ({ p: 'revision', n: (v?.n ?? 0) + 1 })) }, onQuedarme: quedarme, onCargar: (id) => void tl.cargar(id) } : undefined} login={login(t.motor)} onTerminal={() => setTerminal(true)}
                  revision={{ onAplicar: () => tl.aplicar(t.id, () => void tl.deshacer(t.id)), onDeshacer: () => tl.deshacer(t.id),
                    onGuardarRama: () => tl.guardarRama(t.id), onExportar: () => tl.exportar(t.id), onAbrir: () => tl.abrir(t.id) }} onSeguir={(q) => tl.seguir(t.id, q)} onResponder={(o) => tl.responder(t.id, o)}
                  onParar={() => void tl.parar(t.id)} onDescartar={() => void tl.descartar(t.id)} onAbrir={() => tl.abrir(t.id)}
                  onConfigurar={(o, v) => void tl.configurar(t.id, o, v)} />
              ) : (
                <NuevaTarea motores={tl.motores} onIrMotores={() => onIr('ajustes')}
                  onCrear={async (ps) => {
                    // en arena, los competidores salen escalonados: los proveedores gratis limitan las peticiones a la vez
                    let primera: string | null = null
                    for (const [i, p] of ps.entries()) {
                      if (i) await new Promise((ok) => setTimeout(ok, 6000))
                      const id = await tl.crear(p)
                      if (id && !primera) { primera = id; elegir(id) }
                    }
                    return !!primera
                  }} />
              )}
            </motion.div>
          </AnimatePresence>
        </section>
      </div>
      <Terminales abierto={terminal} onCerrar={() => setTerminal(false)} tema={tema} />
    </div>
  )
}
