// Estado del Taller en la interfaz: motores, tareas, la línea de tiempo de cada una y las acciones.
// Los eventos llegan numerados (n): se aplican en orden y sin duplicar; si falta alguno, se recarga el historial.
// Se aplican en lote, una vez por fotograma, para que una ráfaga de texto no repinte la página cien veces.
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { bridge, type EventoTaller, type MotorTaller, type ResultadoTaller, type TareaTaller, type AccesoTarea } from '../lib/bridge'
import { aplicar, plegar, type ItemLinea } from './linea'
import { Cola, type Entrada } from './cola'
import { activa } from './vista'

type Llegado = { n: number; e: EventoTaller }

export function useTaller() {
  const [motores, setMotores] = useState<MotorTaller[]>([])
  const [tareas, setTareas] = useState<TareaTaller[]>([])
  const [lineas, setLineas] = useState<Record<string, ItemLinea[]>>({})
  const aplicados = useRef(new Map<string, number>())          // el siguiente n que espera cada tarea
  const pendientes = useRef(new Map<string, Llegado[]>())      // llegados mientras se carga su historial
  const cargando = useRef(new Set<string>())
  const cola = useRef<Cola<EventoTaller> | null>(null)
  const inicioTurno = useRef(new Map<string, number>())

  // La cola vive fuera del estado: el estado guarda lo pintado, la cola lo que todavía no se pintó.
  const vaciar = useCallback((lote: Entrada<EventoTaller>[]) => {
    setLineas((prev) => { const sig = { ...prev }; for (const { id, e } of lote) sig[id] = aplicar(sig[id] ?? [], e); return sig })
  }, [])
  const encolar = useCallback((id: string, e: EventoTaller) => {
    if (e.tipo === 'usuario') inicioTurno.current.set(id, Date.now())
    if (!cola.current) {
      cola.current = new Cola<EventoTaller>({
        fotograma: (t) => requestAnimationFrame(t),
        reloj: (t, ms) => window.setTimeout(t, ms),
        cancelarFotograma: (i) => cancelAnimationFrame(i),
        cancelarReloj: (i) => clearTimeout(i),
      }, vaciar)
    }
    cola.current.meter(id, e)
  }, [vaciar])

  const cargar = useCallback(async (id: string) => {
    if (cargando.current.has(id) || aplicados.current.has(id)) return
    cargando.current.add(id)
    try {
      const hist = await bridge.taller.eventos(id)
      const resto = (pendientes.current.get(id) ?? []).filter((p) => p.n >= hist.length).sort((a, b) => a.n - b.n)
      pendientes.current.delete(id)
      cola.current?.quitar(id)                            // lo encolado ya viene en el historial
      aplicados.current.set(id, resto.length ? resto[resto.length - 1].n + 1 : hist.length)
      for (const p of resto) if (p.e.tipo === 'usuario') inicioTurno.current.set(id, Date.now())
      setLineas((prev) => ({ ...prev, [id]: resto.reduce((l, p) => aplicar(l, p.e), plegar(hist)) }))
    } finally { cargando.current.delete(id) }
  }, [])

  const recibir = useCallback(({ id, n, evento }: { id: string; n: number; evento: EventoTaller }) => {
    const esperado = aplicados.current.get(id)
    if (esperado === undefined) {
      if (n === 0 && !cargando.current.has(id)) { aplicados.current.set(id, 1); encolar(id, evento); return }   // tarea nueva: empieza en blanco
      pendientes.current.set(id, [...(pendientes.current.get(id) ?? []), { n, e: evento }])
      void cargar(id)
      return
    }
    if (n < esperado) return                                     // repetido
    if (n > esperado) {                                          // hueco: se recarga el historial entero
      aplicados.current.delete(id); pendientes.current.set(id, [{ n, e: evento }]); void cargar(id)
      return
    }
    aplicados.current.set(id, n + 1)
    encolar(id, evento)
  }, [cargar, encolar])

  useEffect(() => {
    void bridge.taller.motores().then(setMotores)
    void bridge.taller.lista().then((ts) => {
      setTareas((v) => { const ya = new Map(v.map((t) => [t.id, t])); return [...ts.map((t) => ya.get(t.id) ?? t), ...v.filter((t) => !ts.some((x) => x.id === t.id))] })
      for (const t of ts) if (activa(t)) void cargar(t.id)
    })
    const offs = [
      bridge.taller.onCambio((t) => setTareas((v) => { const i = v.findIndex((x) => x.id === t.id); if (i < 0) return [t, ...v]; const c = v.slice(); c[i] = t; return c })),
      bridge.taller.onQuitada((id) => {
        setTareas((v) => v.filter((x) => x.id !== id))
        setLineas((prev) => { const { [id]: _fuera, ...resto } = prev; return resto })
        aplicados.current.delete(id); pendientes.current.delete(id)
      }),
      bridge.taller.onEvento(recibir),
    ]
    return () => { offs.forEach((o) => o()); cola.current?.soltar(); cola.current = null }
  }, [cargar, recibir])

  // Solo en desarrollo: inyectar tareas de muestra para revisar la vista en todos sus estados.
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const w = window as unknown as { __tallerDemo?: (ts: TareaTaller[], ev?: Record<string, EventoTaller[]>) => void }
    w.__tallerDemo = (ts, ev) => {
      setTareas(ts)
      if (ev) setLineas(Object.fromEntries(Object.entries(ev).map(([k, v]) => [k, plegar(v)])))
      for (const t of ts) aplicados.current.set(t.id, Number.MAX_SAFE_INTEGER)
    }
    return () => { delete w.__tallerDemo }
  }, [])

  const hecho = (r: ResultadoTaller, ok?: string) => { if (!r.ok) toast.error(r.error); else if (ok) toast(ok); return r.ok }
  return {
    motores, tareas, lineas, inicioTurno: inicioTurno.current, cargar,
    crear: async (p: { motor: string; carpeta: string | null; texto: string; config: Record<string, string>; arena?: string; acceso?: AccesoTarea; rol?: string }) => {
      const r = await bridge.taller.crear(p)
      if (!r.ok) { toast.error(r.error); return null }
      setTareas((v) => (v.some((x) => x.id === r.tarea.id) ? v : [r.tarea, ...v]))
      return r.tarea.id
    },
    seguir: async (id: string, texto: string) => hecho(await bridge.taller.seguir(id, texto)),
    responder: (id: string, opcion: string) => { void bridge.taller.responder(id, opcion) },
    parar: async (id: string) => hecho(await bridge.taller.parar(id)),
    descartar: async (id: string) => hecho(await bridge.taller.descartar(id), 'Copia descartada: su carpeta y su rama ya no existen.'),
    configurar: async (id: string, opcion: string, valor: string) => hecho(await bridge.taller.configurar(id, opcion, valor)),
    abrir: (id: string) => { void bridge.taller.abrir(id) },
    aplicar: async (id: string, deshacer: () => void) => {
      const r = await bridge.taller.aplicar(id)
      if (!r.ok) { toast.error(r.error, r.ficheros?.length ? { description: r.ficheros.slice(0, 6).join(', ') + (r.ficheros.length > 6 ? '…' : '') } : undefined); return false }
      toast(`${r.ficheros} ${r.ficheros === 1 ? 'fichero aplicado' : 'ficheros aplicados'} a tu carpeta`, { description: 'Quedan como cambios sin commitear.', action: { label: 'Deshacer', onClick: deshacer } })
      return true
    },
    deshacer: async (id: string) => {
      const r = await bridge.taller.deshacer(id)
      if (!r.ok) { toast.error(r.error, r.ficheros?.length ? { description: r.ficheros.slice(0, 6).join(', ') } : undefined); return false }
      toast('Deshecho: tu carpeta está como antes.')
      return true
    },
    guardarRama: async (id: string) => {
      const r = await bridge.taller.guardarRama(id)
      if (!r.ok) { toast.error(r.error); return false }
      toast('Guardada en su rama', { description: `Commit ${r.commit.slice(0, 7)}: fusiónala cuando quieras.` })
      return true
    },
    exportar: async (id: string) => {
      const r = await bridge.taller.exportar(id)
      if (!r.ok) { if (r.error !== 'cancelado') toast.error(r.error); return false }
      toast('Guardada como proyecto')
      return true
    },
  }
}
