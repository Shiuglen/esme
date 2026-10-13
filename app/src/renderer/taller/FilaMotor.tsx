// Una fila del Taller por tarea, con densidad de HUD: motor y modelo, estado, la cifra grande (el tiempo), la micrográfica,
// qué hace ahora mismo y cuatro métricas. Si un motor lleva rato sin dar señales, lo dice y propone qué mirar.
import { Swords } from 'lucide-react'
import type { TareaTaller } from '../lib/bridge'
import { cn } from '../lib/cn'
import { fmtTokens, fmtUSD } from '../chat/formatos'
import { Micrografica } from './Micrografica'
import { Sello } from '../marca/Sello'
import { giroSello } from '../marca/sello'
import { ESTADOS, actividadAhora, activa, duracion, explicarError, silencioMs } from './vista'

const SILENCIO_AVISO = 25_000

export function PastillaEstado({ estado }: { estado: TareaTaller['estado'] }) {
  const { texto, tono } = ESTADOS[estado]
  return (
    <span className={cn('inline-flex h-5 shrink-0 items-center gap-1.5 rounded-full px-2 text-[11px] font-medium',
      tono === 'vida' && 'bg-s2/80 text-texto', tono === 'atencion' && 'bg-atencion-velo text-atencion', tono === 'peligro' && 'bg-peligro-velo text-peligro',
      tono === 'neutro' && 'bg-s2/80 text-texto-2', tono === 'apagado' && 'border border-linea text-texto-3')}>
      <span className={cn('size-1.5 rounded-full', tono === 'vida' && 'animate-[respirar_1.4s_ease-in-out_infinite] [background:var(--aurora)]',
        tono === 'atencion' && 'animate-[baliza_1.3s_ease-in-out_infinite] bg-atencion', tono === 'peligro' && 'bg-peligro',
        tono === 'neutro' && 'bg-texto-3', tono === 'apagado' && 'bg-linea-fuerte')} />
      {texto}
    </span>
  )
}

const modeloCorto = (m: string | null) => m?.replace(/^[^/]+\//, '').replace(/\s*free$/i, '').trim() || null
const coste = (c: TareaTaller['uso']['coste']) => (!c ? null : c.moneda === 'USD' ? fmtUSD(c.cantidad) : `${c.cantidad.toFixed(2)} ${c.moneda}`)
const segundos = (ms?: number) => (ms === undefined ? '—' : ms < 10_000 ? `${(ms / 1000).toFixed(1).replace('.', ',')} s` : `${Math.round(ms / 1000)} s`)

export function FilaMotor({ t, login = '', ahora, inicioTurno, haciendo, elegida, resaltada, onElegir, onResaltar }: {
  t: TareaTaller; login?: string; ahora: number; inicioTurno?: number; haciendo: string | null; elegida: boolean; resaltada: boolean
  onElegir(id: string): void; onResaltar(id: string | null): void
}) {
  const enMarcha = activa(t)
  const grande = t.estado === 'preparando' ? '—' : duracion((t.fin ?? ahora) - t.inicio)
  const silencio = silencioMs(t, ahora, inicioTurno)
  const callado = silencio !== null && silencio > SILENCIO_AVISO
  const pct = t.uso.contextoTotal ? Math.min(100, (100 * (t.uso.contextoUsado ?? 0)) / t.uso.contextoTotal) : null
  const tokens = t.uso.entrada + t.uso.salida
  const linea = callado ? `Sin señales desde hace ${segundos(silencio!)}${t.modelo ? `: ¿responde ${modeloCorto(t.modelo)}?` : '.'}`
    : t.estado === 'esperando' ? `Pide permiso: ${t.permiso?.titulo || 'una acción'}`
    : t.estado === 'error' ? (t.error && explicarError(t.error, t.motorNombre, login)?.titulo) || t.error || 'Algo falló.'
    : haciendo ?? (t.estado === 'preparando' ? 'Montando la copia aislada…' : t.estado === 'lista' ? `${t.turnos} ${t.turnos === 1 ? 'turno' : 'turnos'} en ${t.copia?.rama ?? 'una carpeta nueva'}` : '')

  return (
    <button type="button" onClick={() => onElegir(t.id)} onPointerEnter={() => onResaltar(t.id)} onPointerLeave={() => onResaltar(null)}
      aria-pressed={elegida} aria-label={`${t.motorNombre}: ${t.titulo}. ${ESTADOS[t.estado].texto}.`}
      className={cn('vidrio halo group relative w-full overflow-hidden rounded-3 border px-4 pt-3 pb-2.5 text-left transition-[transform,background-color] duration-300 ease-salida',
        elegida ? 'aurora-borde bg-s2/40' : resaltada && '-translate-y-px')}>
      <span aria-hidden className={cn('absolute inset-y-3 left-0 w-[2px] rounded-full',
        t.estado === 'trabajando' && '[background:var(--aurora)]', t.estado === 'esperando' && 'bg-atencion', t.estado === 'error' && 'bg-peligro',
        (t.estado === 'lista' || t.estado === 'parada' || t.estado === 'preparando') && 'bg-linea-fuerte/60')} />
      <div className="flex items-center gap-2">
        <span className="text-[13px] font-medium text-texto">{t.motorNombre}</span>
        {t.modelo && <span className="min-w-0 truncate font-mono text-[11px] text-texto-3">{modeloCorto(t.modelo)}</span>}
        <PastillaEstado estado={t.estado} />
        {t.aplicada && <Sello lado={16} giro={giroSello(t.id)} titulo="Aprobada por ti" />}
        {t.arena && <span className="inline-flex h-5 shrink-0 items-center gap-1 rounded-full border border-linea px-1.5 text-[11px] text-texto-3" title="Compite en una arena"><Swords className="size-3" strokeWidth={1.75} />arena</span>}
        <span className={cn('ml-auto font-display text-[26px] leading-none font-light tabular-nums', enMarcha ? 'text-texto' : 'text-texto-2')}>{grande}</span>
      </div>
      <div className="mt-1.5 flex items-center gap-3">
        <p className="min-w-0 flex-1 truncate text-[13.5px] text-texto-2">{t.titulo}</p>
        <Micrografica valores={actividadAhora(t, ahora)} viva={t.estado === 'trabajando'} />
      </div>
      <p className={cn('mt-0.5 min-h-[18px] truncate text-xs', callado || t.estado === 'esperando' ? 'text-atencion' : t.estado === 'error' ? 'text-peligro' : 'text-texto-3')}>{linea}</p>
      <dl className="mt-2 grid grid-cols-4 gap-2 border-t border-linea/80 pt-2">
        <Metrica nombre="Herramientas" valor={String(t.herramientas)} />
        <Metrica nombre="Cambios" valor={t.cambios ? (t.cambios.ficheros ? <><span className="text-exito">+{t.cambios.mas}</span> <span className="text-peligro">−{t.cambios.menos}</span></> : '0') : '—'} />
        <Metrica nombre="Tokens" valor={tokens ? fmtTokens(tokens) : '—'} />
        {coste(t.uso.coste) ? <Metrica nombre="Coste" valor={coste(t.uso.coste)!} /> : <Metrica nombre="1.ª respuesta" valor={segundos(t.primeraRespuestaMs)} />}
      </dl>
      {pct !== null && (
        <span aria-hidden className="absolute bottom-0 left-0 h-[2px] [background:var(--aurora-lineal)] opacity-80" style={{ width: `${pct}%` }} title={`Contexto: ${Math.round(pct)} %`} />
      )}
    </button>
  )
}

function Metrica({ nombre, valor }: { nombre: string; valor: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="truncate text-[10.5px] text-texto-3">{nombre}</dt>
      <dd className="truncate text-[12.5px] text-texto tabular-nums">{valor}</dd>
    </div>
  )
}
