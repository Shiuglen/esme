// El flujo a la vista: los pasos de una plantilla de varios pasos, cada uno con el oficio del relevo que lo llevará
// (flujo.ts). Lo usan «Nueva tarea», bajo el cuadro del encargo, y el laboratorio (?pieza=flujo).
import { Workflow } from 'lucide-react'
import { flujoLanzable } from '../../main/taller/flujo'
import type { Relevo } from '../../main/taller/parlamento'
import { cn } from '../lib/cn'

export function PanelFlujo({ relevos, roles }: { relevos: Relevo[]; roles: { id: string; nombre: string }[] }) {
  const lanzable = flujoLanzable(relevos)
  const nombre = (id: string) => roles.find((r) => r.id === id)?.nombre ?? id
  return (
    <div className="border-t border-linea px-4 py-3">
      <p className="m-0 mb-2 flex items-center gap-1.5 text-[12.5px] text-texto-2">
        <Workflow className="size-3.5 text-acento" strokeWidth={1.75} aria-hidden />Corre como flujo: {relevos.length} relevos en cadena
      </p>
      <ol className="m-0 grid list-none gap-1.5 p-0">
        {relevos.map((r, i) => (
          <li key={i} className="flex items-baseline gap-2 text-[12.5px]">
            <span className="w-4 shrink-0 text-right tabular-nums text-texto-3">{i + 1}</span>
            <span className="shrink-0 rounded-full bg-s2 px-2 py-0.5 text-[11px] text-texto-2">{nombre(r.rol)}</span>
            <span className="min-w-0 text-texto-2">{r.etapa}</span>
          </li>
        ))}
      </ol>
      <p className={cn('m-0 mt-2 text-[11.5px]', lanzable.ok ? 'text-texto-3' : 'text-atencion')}>
        {lanzable.ok
          ? 'Cada relevo es una tarea real en su copia: hereda la evidencia y el parche del anterior, y al final el juez firma el acta. Los relevos arrancan con la configuración por defecto de su motor.'
          : lanzable.motivo}
      </p>
    </div>
  )
}
