// La leyenda del mapa: la navegación de Esme vive dentro de tu mente, como la leyenda de un atlas grabado.
// En reposo lista los lugares con su estado vivo (en frases cortas); con una hoja abierta se recoge en una columna de
// iconos para no quitarle sitio. Encabeza la rosa de los vientos: la Señal, Esme viva.
import { cn } from '../lib/cn'
import type { EstadoSenal } from '../marca/SenalVista'
import { PuntoVista } from '../marca/PuntoVista'
import { ROTULO } from '../memoria/pintar'
import type { Navegacion } from '../tinta/piel'
import type { Origen } from './Hoja'
import { Vidrio } from './Vidrio'
import { AJUSTES, SECCIONES, type SeccionId } from './secciones'

export type NotaLugar = { texto: string; tono?: 'atencion' | 'peligro' | 'vida' }
const LUGARES = [...SECCIONES.filter((s) => s.id !== 'inicio'), AJUSTES]
const TONO = { atencion: 'text-atencion', peligro: 'text-peligro', vida: 'text-texto' }

// Tres formas de la misma navegación (la elige la piel): «leyenda» (la caja de la esquina, que se recoge con una hoja abierta),
// «riel» (una columna fina a la izquierda, siempre recogida) y «muelle» (una barra flotante abajo en el centro).
export function Leyenda({ actual, recogida: recogidaPedida, estado, notas, onIr, modo = 'leyenda' }: {
  modo?: Navegacion; actual: SeccionId; recogida: boolean; estado: EstadoSenal; notas: Partial<Record<SeccionId, NotaLugar>>; onIr(id: SeccionId, origen: Origen): void
}) {
  const recogida = modo !== 'leyenda' || recogidaPedida, muelle = modo === 'muelle'
  const ir = (id: SeccionId, e: React.MouseEvent<HTMLElement>) => { const r = e.currentTarget.getBoundingClientRect(); onIr(id, { x: r.left + r.width / 2, y: r.top + r.height / 2 }) }
  return (
    // la navegación es capa de navegación: vidrio líquido (shell/Vidrio.tsx), no una hoja de contenido
    <Vidrio radio={18} className={cn('!absolute z-30 overflow-hidden border border-[color-mix(in_oklab,var(--texto)_10%,transparent)] bg-[color-mix(in_oklab,var(--superficie-1)_35%,transparent)] shadow-[inset_0_1px_0_rgb(255_255_255/0.08),0_24px_60px_-24px_rgb(0_0_0/0.7)] transition-[width] duration-500 ease-salida',
        modo === 'leyenda' && cn('bottom-4 left-4', recogida ? 'w-[52px]' : 'w-[232px]'),
        modo === 'riel' && 'top-3 bottom-3 left-3 w-[52px]',
        muelle && 'bottom-3 left-1/2 -translate-x-1/2')}>
    <nav aria-label="Lugares de Esme" className={cn('flex h-full', muelle ? 'flex-row items-center' : 'flex-col')}>
      <button type="button" data-lugar="inicio" onClick={(e) => ir('inicio', e)} title="Tu mente (Esc)"
        className={cn('flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-s2/60', muelle ? 'border-r border-linea' : 'border-b border-linea', actual === 'inicio' && 'bg-s2/40')}>
        <PuntoVista px={26} estado={estado === 'pensando' || estado === 'recordando' ? 'pensando' : 'reposo'} titulo="Esme" className="text-acento" />
        {!recogida && <span className="truncate text-[15px] italic" style={{ fontFamily: ROTULO }}>Tu mente</span>}
      </button>
      <ul className={cn('m-0 list-none gap-0.5 p-1.5', muelle ? 'flex' : 'grid')}>
        {LUGARES.map(({ id, nombre, Icono, atajo }) => {
          const nota = notas[id], activo = actual === id
          return (
            <li key={id}>
              <button type="button" data-lugar={id} onClick={(e) => ir(id, e)} aria-current={activo ? 'page' : undefined} title={`${nombre} (${atajo})`}
                className={cn('group relative grid w-full grid-cols-[20px_minmax(0,1fr)] items-center gap-x-2.5 rounded-2 px-2 py-1.5 text-left transition-colors hover:bg-s2/60',
                  activo && 'bg-s2/70')}>
                <Icono className={cn('size-[18px]', activo ? 'text-texto' : 'text-texto-2')} strokeWidth={1.5} />
                {!recogida && (
                  <span className="grid min-w-0 leading-tight">
                    <span className={cn('truncate text-[13.5px]', activo ? 'font-medium text-texto underline decoration-texto/60 decoration-[1.5px] underline-offset-4' : 'text-texto')}>{nombre}</span>
                    {nota && <span className={cn('truncate text-[11.5px]', nota.tono ? TONO[nota.tono] : 'text-texto-3')}>{nota.texto}</span>}
                  </span>
                )}
                {recogida && nota?.tono && <span aria-hidden className={cn('absolute top-1 left-6 size-1.5 rounded-full', nota.tono === 'peligro' ? 'bg-peligro' : nota.tono === 'atencion' ? 'bg-atencion' : 'bg-luz')} />}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
    </Vidrio>
  )
}
