// Una fila del Taller por tarea, con densidad de HUD: motor y modelo, estado, la cifra grande (el tiempo), la micrográfica,
// qué hace ahora mismo, sus métricas si hablan y las acciones rápidas de su estado (aplica, reencarna o para) al pasar el foco.
import { Check, RefreshCcw, Square, Swords, type LucideIcon, Target } from 'lucide-react'
import type { TareaTaller } from '../lib/bridge'
import { cn } from '../lib/cn'
import { fmtTokens, fmtUSD } from '../chat/formatos'
import { BarrasActividad } from './Micrografica'
import { TintaVista, tintaDeTarea } from '../marca/PuntoVista'
import { Sello } from '../marca/SelloVista'
import { giroSello } from '../marca/sello'
import { barrasDe, ESTADOS, actividadAhora, activa, duracion, explicarError, silencioMs } from './vista'
import { nombreDeModelo } from '../lib/modelos'

const SILENCIO_AVISO = 25_000
// la cara de cada tarea dice en qué está (agentfaces)

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

const modeloCorto = (m: string | null) => nombreDeModelo(m) || null
const coste = (c: TareaTaller['uso']['coste']) => (!c ? null : c.moneda === 'USD' ? fmtUSD(c.cantidad) : `${c.cantidad.toFixed(2)} ${c.moneda}`)
const segundos = (ms?: number) => (ms === undefined ? '—' : ms < 10_000 ? `${(ms / 1000).toFixed(1).replace('.', ',')} s` : `${Math.round(ms / 1000)} s`)

export function FilaMotor({ t, login = '', ahora, inicioTurno, haciendo, elegida, resaltada, objetivo, onElegir, onResaltar, onReencarnar, onAplicar, onParar, radar }: {
  t: TareaTaller; login?: string; ahora: number; inicioTurno?: number; haciendo: string | null; elegida: boolean; resaltada: boolean
  objetivo?: string   // el texto del objetivo del rumbo (el id no se le enseña a nadie)
  onElegir(id: string): void; onResaltar(id: string | null): void; onReencarnar(): void; onAplicar(): void; onParar(): void
  radar?: number   // el radar del error: cuántos otros motores están listos para reencarnarla, a la vista sin abrir nada
}) {
  const enMarcha = activa(t)
  // terminada y sin elegir: una sola línea (la fila respira); las que trabajan, esperan o fallan enseñan todo
  const plegada = !elegida && (t.estado === 'lista' || t.estado === 'parada')
  const grande = t.estado === 'preparando' ? '—' : duracion((t.fin ?? ahora) - t.inicio)
  const silencio = silencioMs(t, ahora, inicioTurno)
  const callado = silencio !== null && silencio > SILENCIO_AVISO
  const pct = t.uso.contextoTotal ? Math.min(100, (100 * (t.uso.contextoUsado ?? 0)) / t.uso.contextoTotal) : null
  const tokens = t.uso.entrada + t.uso.salida
  const linea = callado ? `Sin señales desde hace ${segundos(silencio!)}${t.modelo ? `: ¿responde ${modeloCorto(t.modelo)}?` : '.'}`
    : t.estado === 'esperando' ? `Pide permiso: ${t.permiso?.titulo || 'una acción'}`
    : t.estado === 'error' ? (t.error && explicarError(t.error, t.motorNombre, login)?.titulo) || t.error || 'Algo falló.'
    : haciendo ?? (t.estado === 'preparando' ? 'Montando la copia aislada…' : t.estado === 'lista' ? `${t.turnos} ${t.turnos === 1 ? 'turno' : 'turnos'} en ${t.copia?.rama ?? 'una carpeta nueva'}` : '')
  // Métricas que hablan: las que no dicen nada salen de la fila; si nada habla, una sola línea de espera.
  const metricas = [
    // el radar del error, a la vista sin abrir nada: si hay 0, la reencarnación no tiene a dónde ir
    ...(t.estado === 'error' && radar !== undefined ? [{ nombre: 'Motores listos', valor: radar > 0 ? String(radar) : 'Ninguno' }] : []),
    { nombre: 'Herramientas', valor: t.herramientas > 0 ? String(t.herramientas) : null },
    { nombre: tokens ? 'Tokens' : '', valor: tokens ? fmtTokens(tokens) : null },
    { nombre: t.uso.coste ? 'Coste' : '', valor: t.uso.coste ? coste(t.uso.coste)! : null },
    { nombre: 'Cambios', valor: t.cambios?.ficheros ? <><span className="text-exito">+{t.cambios.mas}</span> <span className="text-peligro">−{t.cambios.menos}</span></> : null },
    { nombre: t.primeraRespuestaMs ? '1.ª respuesta' : '', valor: t.primeraRespuestaMs ? segundos(t.primeraRespuestaMs) : null },
  ].filter((m) => m.valor !== null)
  const AccionRapida = ({ icono: Icono, texto, onClick, tono = 'normal' }: { icono: LucideIcon; texto: string; onClick(): void; tono?: 'normal' | 'vx' }) => (
    <button type="button" onClick={(e) => { e.stopPropagation(); onClick() }}
      className={cn('inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[12px] font-medium opacity-0 transition-all duration-200 group-hover/card:opacity-100 group-focus-within/card:opacity-100',
        tono === 'vx' ? 'border-exito/40 bg-exito-velo/60 text-exito hover:bg-exito-velo' : 'border-linea-fuerte/70 bg-s2/90 text-texto hover:bg-s3')}
      aria-label={texto}>
      <Icono className="size-3" strokeWidth={1.75} />{texto}
    </button>
  )

  return (
    <div role="button" tabIndex={0} onClick={() => onElegir(t.id)} onPointerEnter={() => onResaltar(t.id)} onPointerLeave={() => onResaltar(null)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onElegir(t.id) } }}
      aria-pressed={elegida} aria-label={`${t.motorNombre}: ${t.titulo}. ${ESTADOS[t.estado].texto}.`}
      className={cn('halo group/card relative w-full overflow-hidden rounded-3 border border-linea/70 bg-s1/40 px-4 text-left outline-none hover:border-linea-fuerte', plegada ? 'py-2' : 'pt-3 pb-2.5', ' transition-[transform,background-color] duration-300 ease-salida',
        elegida ? 'aurora-borde bg-s2/40' : resaltada && '-translate-y-px')}>
      <span aria-hidden className={cn('absolute inset-y-3 left-0 w-[2px] rounded-full',
        t.estado === 'trabajando' && '[background:var(--aurora)]', t.estado === 'esperando' && 'bg-atencion', t.estado === 'error' && 'bg-peligro',
        (t.estado === 'lista' || t.estado === 'parada' || t.estado === 'preparando') && 'bg-linea-fuerte/60')} />
      {/* Las acciones rápidas flotan sobre la esquina superior derecha al pasar el foco: no reservan sitio, no empujan la fila */}
      <div className="pointer-events-none absolute right-2.5 top-2 flex items-center gap-1.5 opacity-0 transition-opacity duration-200 group-hover/card:pointer-events-auto group-hover/card:opacity-100 group-focus-within/card:pointer-events-auto group-focus-within/card:opacity-100">
        {t.estado === 'error' && <AccionRapida icono={RefreshCcw} texto="Reencarna" onClick={onReencarnar} />}
        {t.estado === 'lista' && <AccionRapida icono={Check} texto="Aplica" onClick={onAplicar} tono="vx" />}
        {enMarcha && <AccionRapida icono={Square} texto="Parar" onClick={onParar} />}
      </div>
      <div className="flex items-center gap-2">
        <TintaVista motor={t.motor} px={plegada ? 22 : 30} estado={tintaDeTarea(t.estado)} />
        <span className="shrink-0 whitespace-nowrap text-[13px] font-medium text-texto">{t.motorNombre}</span>
        {t.rol && <span title="Su oficio en la arena" className="shrink-0 whitespace-nowrap rounded-full border border-linea-fuerte/60 px-1.5 py-px text-[12px] text-texto-3">{t.rol}</span>}
        {t.objetivo && objetivo && <span title="El objetivo de tu rumbo al que sirve" className="inline-flex h-5 max-w-[180px] shrink-0 items-center gap-1 rounded-full border border-acento/40 px-1.5 text-[12px] text-acento">
          <Target className="size-3 shrink-0" strokeWidth={1.75} /><span className="truncate">{objetivo}</span>
        </span>}
        {t.modelo && <span className="min-w-0 truncate text-[12px] text-texto-3" title={t.modelo}>{modeloCorto(t.modelo)}</span>}
        <PastillaEstado estado={t.estado} />
        {t.aplicada && <Sello lado={16} giro={giroSello(t.id)} titulo="Aprobada por ti" />}
        {t.arena && <span className="inline-flex h-5 shrink-0 items-center gap-1 rounded-full border border-linea px-1.5 text-[11px] text-texto-3" title="Compite en una arena"><Swords className="size-3" strokeWidth={1.75} />arena</span>}
        <span className={cn('ml-auto font-display leading-none font-light tabular-nums', plegada ? 'text-[18px]' : 'text-[26px]', enMarcha ? 'text-texto' : 'text-texto-2')}>{grande}</span>
      </div>
      <div className="mt-1.5 flex items-center gap-3">
        <p className="min-w-0 flex-1 truncate text-[13.5px] text-texto-2">{t.titulo}</p>
        <BarrasActividad valores={barrasDe(t.actividad)} viva={t.estado === 'trabajando'} />
      </div>
      {!plegada && <p className={cn('mt-0.5 min-h-[18px] truncate text-xs', callado || t.estado === 'esperando' ? 'text-atencion' : t.estado === 'error' ? 'text-peligro' : 'text-texto-3')}>{linea}</p>}
      {!plegada && <dl className="mt-2.5 grid grid-cols-[repeat(auto-fit,minmax(72px,1fr))] gap-x-3 gap-y-2 border-t border-linea/80 pt-2.5">
        {metricas.length === 0 ? (
          <dd className="col-span-full text-[12px] text-texto-3">Sin huellas todavía.</dd>
        ) : metricas.map((m) => (
          <div key={m.nombre} className="min-w-0">
            <dt className="truncate text-[11.5px] text-texto-3">{m.nombre}</dt>
            <dd className="truncate text-[13px] text-texto tabular-nums">{m.valor}</dd>
          </div>
        ))}
      </dl>}
      {pct !== null && (
        <span aria-hidden className="absolute bottom-0 left-0 h-[2px] [background:var(--aurora-lineal)] opacity-80" style={{ width: `${pct}%` }} title={`Contexto: ${Math.round(pct)} %`} />
      )}
    </div>
  )
}


