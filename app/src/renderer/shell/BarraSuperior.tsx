// Barra superior: la palabra esme, dónde estás, la búsqueda (Ctrl K) y el estado de la mente.
import { Moon, Search, Sun } from 'lucide-react'
import { motion } from 'motion/react'
import { cn } from '../lib/cn'
import { Senal } from '../marca/Senal'
import { MUELLE } from './Paleta'

export type Estado = { conectado: boolean; recuerdos: number | null; pensando: boolean }

export function BarraSuperior({ seccion, estado, tema, onTema, onBuscar, paletaAbierta }: { seccion: string; estado: Estado; tema: 'noche' | 'dia'; onTema(): void; onBuscar(): void; paletaAbierta: boolean }) {
  return (
    <header className="barra-ventana flex h-12 shrink-0 items-center gap-3.5 vidrio-fino border-b border-linea pl-[18px]">
      <span className="flex items-center gap-2"><Senal tam={22} estado={estado.pensando ? 'pensando' : 'reposo'} tapa="var(--superficie-1)" /><span className="font-display text-[21px] leading-none font-[650] tracking-[-0.045em]">esme</span></span>
      <span className="text-texto-3">/</span>
      <span className="font-medium text-texto-2">{seccion}</span>
      {/* el buscador y la paleta son el mismo objeto: al abrirla, este botón se estira hasta convertirse en ella */}
      {paletaAbierta ? <span className="ml-auto h-[30px] w-[300px]" aria-hidden /> : (
        <motion.button layoutId="buscador" transition={MUELLE} type="button" onClick={onBuscar} style={{ borderRadius: 10 }}
          className="ml-auto flex h-[30px] w-[300px] items-center gap-2 bg-s2 px-2.5 text-[13px] text-texto-3 transition-colors hover:bg-s3">
          <Search className="size-4" strokeWidth={1.5} aria-hidden />Busca o pregunta
          <kbd className="ml-auto rounded-[5px] border border-linea bg-s1 px-1.5 py-0.5 font-sans text-[11px] text-texto-3">Ctrl K</kbd>
        </motion.button>
      )}
      <span className={cn('inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium',
        estado.conectado ? 'bg-acento-velo text-acento' : 'border border-linea bg-s2 text-texto-3')}
        title={estado.conectado ? 'El cerebro está en marcha' : 'No encuentro el cerebro'}>
        <span className={cn('size-1.5 rounded-full bg-current', estado.pensando && 'animate-late')} />
        {estado.conectado ? (estado.pensando ? 'pensando' : `${(estado.recuerdos ?? 0).toLocaleString('es-ES')} recuerdos`) : 'sin cerebro'}
      </span>
      <button type="button" onClick={onTema} aria-label={tema === 'noche' ? 'Pasar al tema de día' : 'Pasar al tema de noche'}
        className="grid size-8 place-items-center rounded-2 text-texto-2 transition-colors hover:bg-s2 hover:text-texto">
        {tema === 'noche' ? <Sun className="size-4" strokeWidth={1.5} /> : <Moon className="size-4" strokeWidth={1.5} />}
      </button>
    </header>
  )
}
