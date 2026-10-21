// La cadena viva del comité: el parlamento no es una competición, es un RELEVO. Cada nodo es un
// relevo real del Taller (con su motor y su estado); el testigo pasa por la cadena y aquí se ve
// dónde está ahora. Sin datos nuevos: lo que ya suda cada tarea del taller (estados, cambios,
// tiempos) dibuja la cadena. De un detalle de un relevo ves el comité entero en una línea.
import { Check, LoaderCircle, OctagonAlert } from 'lucide-react'
import type { TareaTaller } from '../lib/bridge'
import { type ItemLinea } from './linea'
import { activa } from './vista'

/** La cadena del comité: los relevos del mismo parlamento ordenados por nacimiento. */
function Nodo({ orden, t, ahora, esActual, onVer }: { orden: number; t: TareaTaller; ahora: number; esActual: boolean; onVer(): void }) {
  const mas = t.cambios?.mas ?? 0
  const menos = t.cambios?.menos ?? 0
  const segundos = Math.round(((t.fin ?? ahora) - t.inicio) / 1000)
  return (
    <button type="button" onClick={onVer}
      className={esActual ? 'group flex w-40 shrink-0 flex-col items-start rounded-2 border border-transparent aurora-borde bg-s1/60 p-2.5 text-left'
        : 'group flex w-40 shrink-0 flex-col items-start rounded-2 border border-linea/60 bg-s1/40 p-2.5 text-left hover:bg-s2/70'}>
      <span className="flex items-center gap-1.5 text-[10.5px] uppercase tracking-wide text-texto-3">
        {t.estado === 'lista' ? <Check className="size-3 text-exito" strokeWidth={2} />
          : activa(t) ? <LoaderCircle className="size-3 animate-spin text-texto-2" strokeWidth={2} />
          : <OctagonAlert className="size-3 text-peligro" strokeWidth={2} />}
        relevo {orden}
      </span>
      <span className="mt-1 max-w-full truncate font-mono text-[12px] text-texto-2" title={`${t.motorNombre} · ${t.modelo ?? ''}`}>{t.motorNombre}</span>
      <span className="mt-0.5 text-[11px] text-texto-3">
        {activa(t) ? 'trabajando…' : `${segundos} s`}
        {(mas || menos) ? <span> · {mas > 0 && <span className="text-exito">+{mas}</span>}{menos > 0 && <span className="text-peligro"> −{menos}</span>}</span> : null}
      </span>
    </button>
  )
}

export function CadenaComite({ tareas, actual, lineas, ahora, onVer }: {
  tareas: TareaTaller[]; actual: string; lineas: Record<string, ItemLinea[]>; ahora: number; onVer(id: string): void
}) {
  const orden = [...tareas].sort((a, b) => a.inicio - b.inicio)
  const vivaVentana = tareas.some(activa)
  const ultimoTexto = () => {
    for (let i = orden.length - 1; i >= 0; i--) {
      const r = [...(lineas[orden[i].id] ?? [])].reverse().find((x) => x.tipo === 'texto')
      if (r?.tipo === 'texto' && r.texto.trim()) return { motor: orden[i].motorNombre, texto: r.texto.trim() }
    }
    return null
  }
  const voz = ultimoTexto()
  return (
    <div className="border-b border-linea px-5 py-2.5">
      <div className="flex items-center gap-2 text-[11.5px] uppercase tracking-wide text-texto-3">
        <span className="font-medium">La cadena del comité</span>
        <span className="normal-case text-texto-3">{vivaVentana ? 'el testigo pasa en vivo' : 'el comité cerró'}</span>
      </div>
      <div className="mt-2 flex min-w-0 flex-wrap items-stretch gap-1.5">
        {orden.map((t, i) => (
          <span key={t.id} className="flex items-stretch gap-1.5">
            <Nodo orden={i + 1} t={t} ahora={ahora} esActual={t.id === actual} onVer={() => onVer(t.id)} />
            {i < orden.length - 1 && <span className="self-center text-texto-3" aria-hidden>→</span>}
          </span>
        ))}
      </div>
      {voz && (
        <p className="mt-2 line-clamp-2 text-[12.5px] leading-4.5 text-texto-2">
          <span className="font-mono text-[11px] text-texto-3">{voz.motor}:</span> {voz.texto.length > 220 ? voz.texto.slice(0, 220) + '…' : voz.texto}
        </p>
      )}
    </div>
  )
}
