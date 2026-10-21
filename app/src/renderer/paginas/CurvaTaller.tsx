// La curva del Taller: qué rindieron las tareas de verdad. Sin juez y sin gastar un token.
//
// La etiqueta es del propio creador (aplicar los cambios de una tarea es un sí, descartarlos un no)
// y las medidas las dejó la app al trabajar. Con eso se sabe si el equipo sube o baja, día a día.
import { fmtTokens } from '../chat/formatos'
import { cn } from '../lib/cn'
import type { Curva } from '../lib/bridge'
import { vistaCurva } from './uso-curva'

export function CurvaTaller({ curva }: { curva: Curva | null }) {
  const vista = vistaCurva(curva)
  if (!vista.hayCurva) return null
  return (
    <section className="grid gap-4 rounded-3 vidrio halo border p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="m-0 text-[15px] font-semibold">{vista.titulo}</h2>
        <span className="text-xs text-texto-3">{vista.subtitulo}</span>
      </div>

      {vista.estados.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-texto-3">
          {vista.estados.map((e) => (
            <span key={e.texto} className="inline-flex items-baseline gap-1">
              <span className={cn('font-display text-[15px] leading-none', e.tono === 'mal' ? 'text-peligro' : e.tono === 'bien' ? 'text-exito' : 'text-texto-2')}>{e.valor}</span>
              {e.texto}
            </span>
          ))}
        </div>
      )}

      {vista.sinAciertos && (
        <p className="text-xs text-texto-3">Todavía no te has quedado ninguna tarea: la línea sube el primer día que digas «esta sí».</p>
      )}

      {vista.barras.length > 0 && !vista.sinAciertos && (
        <div className="flex h-14 items-end gap-[4px] border-b border-linea pb-px" role="img" aria-label="Aciertos por día del Taller: la altura de cada barra es la proporción de tareas que te quedaste">
          {vista.barras.map((b) => (
            <span key={b.dia} title={b.titulo}
              className={cn('w-[22px] rounded-t-[2px]', b.acierto ? 'bg-acento' : 'bg-peligro opacity-60')}
              style={{ height: `${b.altura}%` }} />
          ))}
        </div>
      )}

      <div className="grid gap-1.5">
        {vista.motores.map((m) => (
          <div key={m.motor} className="grid grid-cols-[minmax(0,1fr)_auto_auto_auto] items-baseline gap-4 text-xs">
            <span className="truncate font-medium">{m.motor}</span>
            <span className="text-texto-3 tabular-nums">{m.tareas} tareas</span>
            <span className={cn('tabular-nums', m.error > 0 ? 'text-peligro' : 'text-texto-3')}>{m.error} con error</span>
            <span className="text-texto-3 tabular-nums">{fmtTokens(m.tokens)} tokens/tarea</span>
          </div>
        ))}
      </div>

      {vista.grupos.length > 1 && (
        <div className="grid gap-1.5 border-t border-linea pt-3">
          <span className="text-xs text-texto-3">dos agentes o uno solo</span>
          {vista.grupos.map((g) => (
            <div key={g.grupo} className="grid grid-cols-[minmax(0,1fr)_auto_auto_auto] items-baseline gap-4 text-xs">
              <span className="truncate font-medium">{g.titulo}</span>
              <span className="text-texto-3 tabular-nums">{g.tareas} tareas</span>
              <span className="text-texto-3 tabular-nums">
                {g.veredictos ? `${g.aciertos} de ${g.veredictos} te quedaste` : 'sin veredicto aún'}
              </span>
              <span className="text-texto-3 tabular-nums">{fmtTokens(g.tokens)} tokens/tarea</span>
            </div>
          ))}
        </div>
      )}

      {vista.costeDelAcierto && <span className="text-xs text-texto-3">{vista.costeDelAcierto}</span>}

      {vista.fallos.length > 0 && (
        <div className="grid gap-1.5 border-t border-linea pt-3">
          <span className="text-xs text-texto-3">lo que falla</span>
          {vista.fallos.map((f) => (
            <div key={f.mensaje} className="flex items-baseline justify-between gap-4 text-xs">
              <span className="truncate text-texto-2">{f.mensaje}</span>
              <span className="text-texto-3 tabular-nums">{f.veces}×</span>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
