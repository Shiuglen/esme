// Vista previa de la copia: la web tal como la deja el motor, recargada sola cuando edita ficheros. Con «Inspeccionar»,
// pasas el ratón por la página, eliges un elemento y le pides al motor un cambio justo ahí (en la misma tarea).
import { Crosshair, LoaderCircle, Monitor, RotateCw, Smartphone, Tablet, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { bridge, type TareaTaller } from '../lib/bridge'
import { cn } from '../lib/cn'
import { limpiarElegido, pedidoSobre, type Elegido } from './inspector'
import type { ItemLinea } from './linea'
import { activa } from './vista'
import { useMuelle } from '../tinta/movimiento'

const ANCHOS = { movil: 390, tableta: 820, escritorio: 0 } as const
type Ancho = keyof typeof ANCHOS

export function VistaPrevia({ t, linea, onPedir }: { t: TareaTaller; linea: ItemLinea[] | undefined; onPedir(texto: string): Promise<boolean> }) {
  const muelle = useMuelle({ stiffness: 420, damping: 34 })
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [ancho, setAncho] = useState<Ancho>('escritorio')
  const [inspeccionar, setInspeccionar] = useState(false)
  const [elegido, setElegido] = useState<Elegido | null>(null)
  const [cambio, setCambio] = useState('')
  const [version, setVersion] = useState(0)
  const [cargando, setCargando] = useState(true)
  const marco = useRef<HTMLIFrameElement>(null)
  const origen = useMemo(() => (url ? new URL(url).origin : null), [url])

  useEffect(() => {
    let vivo = true
    setUrl(null); setError(null); setElegido(null)
    void bridge.taller.vistaPrevia(t.id).then((r) => { if (vivo) { if (r.ok) setUrl(r.url); else setError(r.error) } })
    return () => { vivo = false; void bridge.taller.cerrarVista(t.id) }
  }, [t.id])

  // Cuando el motor termina de editar un fichero, la página se recarga sola.
  const ediciones = (linea ?? []).filter((i) => i.tipo === 'herramienta' && ['edit', 'delete', 'move'].includes(i.clase ?? '') && i.estado === 'completed').length
  useEffect(() => { if (!ediciones) return; const k = setTimeout(() => setVersion((v) => v + 1), 450); return () => clearTimeout(k) }, [ediciones])

  // El inspector solo se escucha si viene de este marco y de su origen; lo que manda se valida como dato.
  useEffect(() => {
    if (!origen) return
    const oir = (e: MessageEvent) => {
      if (e.origin !== origen || e.source !== marco.current?.contentWindow) return
      if (e.data?.esme === 'listo') { setCargando(false); marco.current?.contentWindow?.postMessage({ esme: 'inspeccionar', activo: inspeccionar }, origen) }
      const el = limpiarElegido(e.data)
      if (el) { setElegido(el); setInspeccionar(false) }
    }
    addEventListener('message', oir)
    return () => removeEventListener('message', oir)
  }, [origen, inspeccionar])
  useEffect(() => { if (origen) marco.current?.contentWindow?.postMessage({ esme: 'inspeccionar', activo: inspeccionar }, origen) }, [inspeccionar, origen])

  const pedir = async () => {
    if (!elegido || !cambio.trim() || activa(t)) return
    if (await onPedir(pedidoSobre(elegido, cambio))) { setElegido(null); setCambio('') }
  }

  if (error) return (
    <div className="grid h-full place-items-center p-8 text-center">
      <div><p className="text-[15px] text-texto">Sin vista previa</p><p className="mt-1 max-w-[360px] text-[13px] text-texto-3">{error}</p></div>
    </div>
  )
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-11 shrink-0 items-center gap-1.5 border-b border-linea px-4">
        <button type="button" onClick={() => { setInspeccionar((v) => !v); setElegido(null) }} aria-pressed={inspeccionar}
          className={cn('inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[12.5px] transition-colors',
            inspeccionar ? 'aurora-borde bg-s2 text-texto' : 'text-texto-2 hover:bg-s2 hover:text-texto')}>
          <Crosshair className="size-3.5" strokeWidth={1.75} />{inspeccionar ? 'Elige un elemento…' : 'Inspeccionar'}
        </button>
        <span className="mx-1 h-5 w-px bg-linea" />
        {([['movil', Smartphone, 'Móvil'], ['tableta', Tablet, 'Tableta'], ['escritorio', Monitor, 'Escritorio']] as const).map(([k, Icono, nombre]) => (
          <button key={k} type="button" onClick={() => setAncho(k)} aria-pressed={ancho === k} title={nombre} aria-label={nombre}
            className={cn('grid size-8 place-items-center rounded-full transition-colors', ancho === k ? 'bg-s2 text-texto' : 'text-texto-3 hover:text-texto')}>
            <Icono className="size-4" strokeWidth={1.5} />
          </button>
        ))}
        <button type="button" onClick={() => { setCargando(true); setVersion((v) => v + 1) }} title="Recargar" aria-label="Recargar"
          className="grid size-8 place-items-center rounded-full text-texto-3 transition-colors hover:text-texto">
          <RotateCw className={cn('size-4', cargando && url && 'animate-spin')} strokeWidth={1.5} />
        </button>
        <span className="ml-auto min-w-0 truncate font-mono text-[11.5px] text-texto-3">{url ?? 'Montando la vista previa…'}</span>
      </div>
      <div className="relative min-h-0 flex-1 overflow-auto bg-s2/40 p-4">
        {url ? (
          <iframe key={version} ref={marco} src={url} title={`Vista previa de «${t.titulo}»`} onLoad={() => setCargando(false)}
            sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
            className="mx-auto block h-full rounded-3 border border-linea bg-white shadow-flotante transition-[width] duration-500 ease-salida"
            style={{ width: ANCHOS[ancho] ? `${ANCHOS[ancho]}px` : '100%', maxWidth: '100%' }} />
        ) : <p className="flex items-center gap-2 text-sm text-texto-3"><LoaderCircle className="size-4 animate-spin" />Montando la vista previa…</p>}
        <AnimatePresence>
          {elegido && (
            <motion.div initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8 }}
              transition={muelle}
              className="vidrio absolute inset-x-6 bottom-6 mx-auto max-w-[560px] rounded-4 border p-3.5 shadow-flotante">
              <div className="flex items-start gap-2">
                <p className="min-w-0 flex-1 text-[12.5px] text-texto-2">
                  <span className="font-mono text-texto">{elegido.etiqueta}{elegido.id && `#${elegido.id}`}</span>
                  {elegido.texto && <span className="text-texto-3"> «{elegido.texto.slice(0, 60)}{elegido.texto.length > 60 ? '…' : ''}»</span>}
                </p>
                <button type="button" onClick={() => setElegido(null)} aria-label="Olvidar el elemento" className="grid size-6 place-items-center rounded-full text-texto-3 hover:bg-s2 hover:text-texto"><X className="size-3.5" /></button>
              </div>
              <div className="aurora-foco mt-2 flex items-center gap-2 rounded-3 border border-linea bg-s1/80 px-3 py-1.5">
                <input value={cambio} onChange={(e) => setCambio(e.target.value)} autoFocus disabled={activa(t)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void pedir() } }}
                  placeholder={activa(t) ? `${t.motorNombre} está trabajando…` : '¿Qué cambio quieres aquí?'}
                  className="min-w-0 flex-1 bg-transparent py-1 text-[13.5px] text-texto outline-none placeholder:text-texto-3" />
                <button type="button" onClick={() => void pedir()} disabled={!cambio.trim() || activa(t)}
                  className="h-8 shrink-0 rounded-full bg-acento px-3.5 text-[12.5px] font-medium text-sobre-acento transition-opacity disabled:opacity-35">Pedírselo</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
