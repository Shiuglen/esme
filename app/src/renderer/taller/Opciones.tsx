// Las opciones que expone cada motor (modelo, esfuerzo, modo) como selectores con el estilo de Esme.
// Los modelos gratis se marcan; el modo «plan» de OpenCode es de solo lectura y se dice así.
import { ChevronDown } from 'lucide-react'
import type { OpcionMotor } from '../lib/bridge'
import { cn } from '../lib/cn'

const NOMBRES: Record<string, string> = { model: 'Modelo', effort: 'Esfuerzo', mode: 'Modo' }
const VALORES: Record<string, string> = { build: 'Construir', plan: 'Solo planear', default: 'Normal', high: 'Alto' }
export const nombreValor = (v: { id: string; nombre: string }) =>
  VALORES[v.id] ?? v.nombre.replace(/^[^/]+\//, '').replace(/\s*Free$/i, ' (gratis)')

const selector = 'h-8 min-w-0 appearance-none truncate rounded-2 border border-linea bg-s1/80 pr-7 pl-2.5 text-[12.5px] text-texto-2 outline-none transition-colors hover:border-linea-fuerte focus-visible:border-foco disabled:opacity-60'

export function SelectorOpcion({ o, valor, onCambiar, deshabilitado, className }: {
  o: OpcionMotor; valor?: string; onCambiar(v: string): void; deshabilitado?: boolean; className?: string
}) {
  return (
    <label className={cn('relative inline-flex min-w-0', className)} title={NOMBRES[o.id] ?? o.nombre}>
      <span className="sr-only">{NOMBRES[o.id] ?? o.nombre}</span>
      <select className={cn(selector, 'w-full')} value={valor ?? o.actual} disabled={deshabilitado} onChange={(e) => onCambiar(e.target.value)}>
        {o.valores.map((v) => <option key={v.id} value={v.id}>{nombreValor(v)}</option>)}
      </select>
      <ChevronDown className="pointer-events-none absolute top-2 right-2 size-4 text-texto-3" strokeWidth={1.5} aria-hidden />
    </label>
  )
}

/** Si el motor no trae un modelo gratis elegido (o el suyo ya falló), propone el primero gratis que no haya fallado. El usuario manda: puede cambiarlo. */
export function configInicial(opciones: OpcionMotor[], guardada: Record<string, string>, caidos: string[] = []): Record<string, string> {
  const out: Record<string, string> = {}
  const sirve = (id: string) => !caidos.includes(id)
  for (const o of opciones) {
    const g = guardada[o.id]
    if (g && sirve(g) && o.valores.some((v) => v.id === g)) out[o.id] = g
    else if (o.id === 'model' && (!/free/i.test(o.actual) || !sirve(o.actual))) {
      const gratis = o.valores.find((v) => /free/i.test(v.id) && sirve(v.id))
      if (gratis) out[o.id] = gratis.id
    }
  }
  return out
}
