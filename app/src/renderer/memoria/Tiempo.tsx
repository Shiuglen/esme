// La regla del tiempo: cuántos recuerdos nacieron cada día, en la tinta de su edad, y un cursor para volver a
// cualquier día. Lo que aún no había pasado en ese día queda en grafito tenue.
import { Pause, Play } from 'lucide-react'
import { etiquetaFecha } from './tiempo'

const DIA = 864e5, HORA = 36e5

type Props = {
  desde: number; hasta: number; corte: number | null; hist: number[]; creciendo: boolean
  colorDe(t: number): string; onCorte(c: number | null): void; onCrecer(): void
}

export function Tiempo({ desde, hasta, corte, hist, creciendo, colorDe, onCorte, onCrecer }: Props) {
  const valor = corte ?? hasta, lapso = hasta - desde || 1, pos = (valor - desde) / lapso
  const tope = Math.max(1, ...hist), n = hist.length
  const ir = (c: number) => onCorte(c >= hasta - HORA ? null : Math.max(desde, c))
  return (
    <div className="flex min-w-[280px] flex-1 items-center gap-3">
      <button type="button" onClick={onCrecer} aria-label={creciendo ? 'Pausar' : 'Ver cómo creció tu mente'} title={creciendo ? 'Pausar' : 'Ver cómo creció tu mente'}
        className="grid size-8 shrink-0 place-items-center rounded-full border border-linea-fuerte/50 text-texto transition-colors hover:border-texto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-texto">
        {creciendo ? <Pause className="size-3.5" aria-hidden /> : <Play className="ml-0.5 size-3.5" aria-hidden />}
      </button>
      <div className="relative h-8 flex-1">
        <svg className="absolute inset-0 size-full" viewBox={`0 0 ${n} 32`} preserveAspectRatio="none" aria-hidden>
          {hist.map((v, i) => {
            const t = desde + ((i + 0.5) / n) * lapso, pasado = t <= valor, alto = v ? 3 + (v / tope) * 27 : 1
            return <rect key={i} x={i + 0.12} width={0.76} y={32 - alto} height={alto} style={{ fill: pasado ? colorDe(t) : 'var(--grafito)' }} opacity={pasado ? 0.92 : 0.3} />
          })}
        </svg>
        <input type="range" min={desde} max={hasta} step={HORA} value={valor} aria-label="Deslizar el tiempo" aria-valuetext={etiquetaFecha(valor)}
          onChange={(e) => ir(Number(e.target.value))}
          onKeyDown={(e) => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); ir(valor + (e.key === 'ArrowRight' ? DIA : -DIA)) } }}
          className="peer absolute inset-0 w-full cursor-ew-resize opacity-0" />
        <div className="pointer-events-none absolute -inset-y-1 w-0.5 -translate-x-1/2 rounded-full bg-texto peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-texto" style={{ left: `${pos * 100}%` }} />
      </div>
      <span className="w-14 shrink-0 text-right text-xs font-medium tabular-nums text-texto">{etiquetaFecha(valor)}</span>
    </div>
  )
}
