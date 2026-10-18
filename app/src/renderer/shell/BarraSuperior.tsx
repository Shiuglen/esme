// Barra superior: la palabra esme, dónde estás, la búsqueda (Ctrl K) y el estado de la mente.
import { Moon, Search, Sun } from 'lucide-react'
import { motion } from 'motion/react'
import { cn } from '../lib/cn'
import { Senal } from '../marca/Senal'
import { Bicho, SerCasa } from '../marca/Ser'
import { MUELLE } from './Paleta'
import { useMuelle } from '../tinta/movimiento'

export type Estado = { conectado: boolean; recuerdos: number | null; pensando: boolean }

export function BarraSuperior({ seccion, estado, tema, onTema, onBuscar, paletaAbierta, taller, onTaller }: { seccion: string; estado: Estado; tema: 'noche' | 'dia'; onTema(): void; onBuscar(): void; paletaAbierta: boolean
  taller: { trabajando: number; esperando: number }; onTaller(): void }) {
  const muelle = useMuelle(MUELLE)
  return (
    <header className="barra-ventana flex h-12 shrink-0 items-center gap-3.5 vidrio-fino border-b border-linea pl-[18px]">
      <span className="flex items-center gap-2"><Senal tam={22} estado={estado.pensando ? 'pensando' : 'reposo'} tapa="var(--superficie-1)" /><span className="font-display text-[21px] leading-none font-[650] tracking-[-0.045em]">esme</span></span>
      <span className="text-texto-3">/</span>
      <span className="font-medium text-texto-2">{seccion}</span>
      {/* el buscador y la paleta son el mismo objeto: al abrirla, este botón se estira hasta convertirse en ella */}
      {paletaAbierta ? <span className="ml-auto h-[30px] w-[300px]" aria-hidden /> : (
        <motion.button layoutId="buscador" transition={muelle} type="button" onClick={onBuscar} style={{ borderRadius: 10 }}
          className="ml-auto flex h-[30px] w-[300px] items-center gap-2 bg-s2 px-2.5 text-[13px] text-texto-3 transition-colors hover:bg-s3">
          <Search className="size-4" strokeWidth={1.5} aria-hidden />Busca o pregunta
          <kbd className="ml-auto rounded-[5px] border border-linea bg-s1 px-1.5 py-0.5 font-sans text-[11px] text-texto-3">Ctrl K</kbd>
        </motion.button>
      )}
      {(taller.esperando > 0 || taller.trabajando > 0) && (
        <button type="button" onClick={onTaller} title="Ir al Taller"
          className={cn('inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium transition-colors',
            taller.esperando ? 'bg-atencion-velo text-atencion hover:brightness-110' : 'border border-linea bg-s2 text-texto-2 hover:text-texto')}>
          <span className={cn('size-1.5 rounded-full', taller.esperando ? 'animate-[baliza_1.3s_ease-in-out_infinite] bg-atencion' : 'animate-[respirar_1.4s_ease-in-out_infinite] [background:var(--aurora)]')} />
          <SerCasa tamaño={13} vivo className="shrink-0" />
          {taller.esperando ? `${taller.esperando} te ${taller.esperando === 1 ? 'necesita' : 'necesitan'}` : `${taller.trabajando} trabajando`}
        </button>
      )}
      <span className={cn('inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium',
        estado.conectado ? 'bg-acento-velo text-acento' : 'border border-linea bg-s2 text-texto-3')}
        title={estado.conectado ? 'El cerebro está en marcha' : 'No encuentro el cerebro'}>
        {estado.conectado && <SerCasa tamaño={13} vivo={estado.pensando} className="shrink-0 -ml-0.5" />}
        {estado.conectado ? (estado.pensando ? 'pensando' : `${(estado.recuerdos ?? 0).toLocaleString('es-ES')} recuerdos`) : 'sin cerebro'}
      </span>
      <button type="button" onClick={onTema} aria-label={tema === 'noche' ? 'Pasar al tema de día' : 'Pasar al tema de noche'}
        className="grid size-8 place-items-center rounded-2 text-texto-2 transition-colors hover:bg-s2 hover:text-texto">
        {tema === 'noche' ? <Sun className="size-4" strokeWidth={1.5} /> : <Moon className="size-4" strokeWidth={1.5} />}
      </button>
    </header>
  )
}
