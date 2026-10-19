// La tira de uso bajo el compositor: motor, contexto, coste de la conversación, memoria usada y gasto de hoy.
// Lo justo para decidir sin salir del chat; el detalle vive en Uso.
import { useEffect, useState } from 'react'
import { bridge, type EstadoUso } from '../lib/bridge'
import { cn } from '../lib/cn'
import { fmtTokens, fmtUSD, pctContexto } from './formatos'

export type UsoSesion = { costeUSD: number; ultimaEntrada: number; memoria: number }
const PROVEEDOR_CATALOGO: Record<string, string> = { 'opencode-zen': 'opencode' }

export function TiraUso({ proveedor, modelo, etiqueta, sesion }: { proveedor: string; modelo: string; etiqueta: string; sesion: UsoSesion }) {
  const [estado, setEstado] = useState<EstadoUso | null>(null)
  const [contexto, setContexto] = useState<number | undefined>()

  useEffect(() => {
    const leer = () => void bridge.uso.estado().then(setEstado).catch(() => {})
    leer()
    return bridge.uso.onConsumo(leer)
  }, [])
  useEffect(() => {
    setContexto(undefined)
    void bridge.catalogo.modelos(PROVEEDOR_CATALOGO[proveedor] ?? proveedor)
      .then((ms) => setContexto(ms.find((m) => m.id === modelo || m.id.endsWith(`/${modelo}`))?.contexto || undefined)).catch(() => {})
  }, [proveedor, modelo])

  const pct = pctContexto(sesion.ultimaEntrada, contexto)
  const tope = estado?.presupuesto.diarioUSD
  const nivel = estado?.evaluacion.estado ?? 'ok'
  return (
    <div className="flex h-7 items-center gap-3 px-1 text-[12px] text-texto-3 tabular-nums" aria-label="Uso de esta conversación">
      <span className="flex min-w-0 items-center gap-1.5 text-texto-2">
        <span className="size-1.5 shrink-0 rounded-full bg-acento" aria-hidden />
        <span className="truncate">{etiqueta}</span>
      </span>
      {pct !== null && pct > 0 && (
        <span className="flex items-center gap-1.5" title={`Contexto usado: ${fmtTokens(sesion.ultimaEntrada)} de ${fmtTokens(contexto)} tokens`}>
          <span className="relative h-1 w-12 overflow-hidden rounded-full bg-s3" aria-hidden>
            <span className={cn('absolute inset-y-0 left-0 rounded-full', pct > 85 ? 'bg-peligro' : pct > 60 ? 'bg-atencion' : 'bg-texto-2')} style={{ width: `${pct}%` }} />
          </span>
          {pct}%
        </span>
      )}
      {/* el dinero solo se dice cuando lo hay: «$0» en cada conversación era ruido */}
      {sesion.costeUSD > 0 && <span title="Coste de esta conversación">{fmtUSD(sesion.costeUSD)}</span>}
      {sesion.memoria > 0 && <span className="text-memoria" title="Tokens de tu memoria que Esme dio a la IA en la última respuesta">{fmtTokens(sesion.memoria)} de memoria</span>}
      {estado && (estado.hoyUSD > 0 || !!tope) && (
        <span className={cn('ml-auto', nivel === 'limite' ? 'text-peligro' : nivel === 'aviso' ? 'text-atencion' : '')}
          title={tope ? `Gasto de hoy frente a tu tope diario` : 'Gasto de hoy (sin tope diario)'}>
          hoy {fmtUSD(estado.hoyUSD)}{tope ? ` / ${fmtUSD(tope)}` : ''}
        </span>
      )}
    </div>
  )
}
