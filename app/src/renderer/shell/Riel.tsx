// Riel: la navegación principal. La píldora se desliza al elemento actual (animación de layout de Motion).
import { motion } from 'motion/react'
import { cn } from '../lib/cn'
import { AJUSTES, SECCIONES, type Seccion, type SeccionId } from './secciones'

export function Riel({ actual, onIr, cuentas }: { actual: SeccionId; onIr(id: SeccionId): void; cuentas: Partial<Record<SeccionId, { texto: string; vivo?: boolean }>> }) {
  const item = (s: Seccion) => {
    const activo = actual === s.id, cuenta = cuentas[s.id]
    return (
      <button key={s.id} type="button" onClick={() => onIr(s.id)} aria-current={activo ? 'page' : undefined} title={`${s.nombre} (${s.atajo})`}
        className={cn('relative flex h-[34px] w-full items-center gap-2.5 rounded-2 px-2.5 text-left text-[13px] font-medium transition-colors duration-150',
          activo ? 'text-texto' : 'text-texto-2 hover:text-texto')}>
        {activo && <motion.span layoutId="pildora-riel" className="absolute inset-0 rounded-2 bg-s3" transition={{ type: 'spring', stiffness: 520, damping: 40 }}><span className="absolute top-2 bottom-2 left-0 w-[2px] rounded-full" style={{ background: 'var(--aurora-lineal)' }} /></motion.span>}
        <s.Icono className="relative size-4 shrink-0" strokeWidth={1.5} aria-hidden />
        <span className="relative">{s.nombre}</span>
        {cuenta && <span className={cn('relative ml-auto text-[11px] tabular-nums', cuenta.vivo ? 'text-acento' : 'text-texto-3')}>{cuenta.texto}</span>}
      </button>
    )
  }
  return (
    <nav aria-label="Secciones" className="flex w-[216px] shrink-0 flex-col gap-0.5 border-r border-linea bg-s1 px-2 py-2.5">
      {SECCIONES.map(item)}
      <div className="mx-1.5 my-2 h-px bg-linea" />
      {item(AJUSTES)}
    </nav>
  )
}
