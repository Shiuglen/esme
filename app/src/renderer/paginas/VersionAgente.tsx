// Tus agentes al día, en su fila de Ajustes: qué versión tienes y, si hay otra, actualizar con un clic (o la orden exacta si
// hace falta administrador). Después de actualizar se vuelve a leer la versión de verdad (main/motores/actualizar.ts).
import { ArrowUpCircle, Copy } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { bridge, type VersionAgente } from '../lib/bridge'

export function useVersiones() {
  const [versiones, setVersiones] = useState<Record<string, VersionAgente>>({})
  const cargar = useCallback(() => void bridge.taller.versiones().then((l) => setVersiones(Object.fromEntries(l.map((v) => [v.id, v])))), [])
  useEffect(cargar, [cargar])
  return { versiones, recargar: cargar }
}

export function VersionDeAgente({ id, nombre, v, onCambio }: { id: string; nombre: string; v?: VersionAgente; onCambio(): void }) {
  const [ocupado, setOcupado] = useState(false)
  if (!v?.instalada) return null
  const actualizar = async () => {
    setOcupado(true)
    const r = await bridge.taller.actualizar(id)
    setOcupado(false)
    if (r.ok) toast(`${nombre}: ${r.detalle}`); else toast.error(`${nombre}: ${r.detalle}`)
    onCambio()
  }
  return (
    <div className="flex flex-wrap items-center gap-2 pt-1.5 text-xs text-texto-3">
      <span>versión {v.instalada}{v.hayNueva && v.ultima ? <> · <span className="text-atencion">hay {v.ultima}</span></> : v.ultima ? ' · al día' : ''}</span>
      {v.orden?.tipo === 'auto' && (v.hayNueva || !v.ultima) && (
        <button type="button" disabled={ocupado} onClick={() => void actualizar()}
          className="inline-flex h-7 items-center gap-1.5 rounded-full border border-linea px-2.5 text-texto-2 transition-colors hover:border-linea-fuerte hover:text-texto disabled:opacity-50">
          <ArrowUpCircle className="size-3.5" />{ocupado ? 'Actualizando…' : v.ultima ? `Actualizar a ${v.ultima}` : 'Buscar actualización'}
        </button>
      )}
      {v.orden?.tipo === 'manual' && v.hayNueva && (
        <span className="inline-flex items-center gap-1.5">
          necesita administrador: <code className="rounded-1 bg-s2 px-1.5 py-0.5 text-[11px] text-texto-2">{v.orden.orden}</code>
          <button type="button" aria-label="Copiar la orden" onClick={() => { void navigator.clipboard.writeText(v.orden!.tipo === 'manual' ? v.orden!.orden : ''); toast('Orden copiada: pégala en una terminal.') }}
            className="grid size-6 place-items-center rounded-full hover:bg-s2 hover:text-texto"><Copy className="size-3" /></button>
        </span>
      )}
    </div>
  )
}
