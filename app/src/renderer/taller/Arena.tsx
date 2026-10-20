// La arena: la misma tarea con varios modelos, lado a lado. Comparas tiempo, cambios, coste y lo que dice cada uno;
// eliges una y las demás se descartan (eso enseña al router qué funciona contigo).
import { Crown, Eye, LoaderCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Markdown } from '../chat/Markdown'
import { fmtTokens } from '../chat/formatos'
import type { TareaTaller } from '../lib/bridge'
import { cn } from '../lib/cn'
import { PastillaEstado } from './FilaMotor'
import type { ItemLinea } from './linea'
import { activa, duracion } from './vista'

const modelo = (t: TareaTaller) => t.modelo?.replace(/^[^/]+\//, '').replace(/\s*free$/i, '').trim() || t.motorNombre

export function Arena({ tareas, actual, lineas, ahora, onVer, onQuedarme, onCargar }: {
  tareas: TareaTaller[]; actual: string; lineas: Record<string, ItemLinea[]>; ahora: number
  onVer(id: string): void; onQuedarme(id: string): Promise<void>; onCargar(id: string): void
}) {
  const [eligiendo, setEligiendo] = useState<string | null>(null)
  useEffect(() => { for (const t of tareas) onCargar(t.id) }, [tareas.map((t) => t.id).join()])   // eslint-disable-line react-hooks/exhaustive-deps
  const enMarcha = tareas.some(activa)
  const mejorTiempo = Math.min(...tareas.filter((t) => t.estado === 'lista' && t.fin).map((t) => t.fin! - t.inicio))
  return (
    <div className="flex h-full min-h-0 flex-col">
      <p className="px-5 pt-3 text-xs text-texto-3">
        {enMarcha ? 'Compiten a la vez, cada uno en su copia. Cuando terminen, elige la que prefieras.' : 'Revisa cada una y elige la mejor: las demás se descartan y Esme aprende de tu elección.'}
      </p>
      <div className="grid min-h-0 flex-1 gap-3 overflow-x-auto px-5 py-3" style={{ gridTemplateColumns: `repeat(${tareas.length}, minmax(240px, 1fr))` }}>
        {tareas.map((t) => {
          const resumen = [...(lineas[t.id] ?? [])].reverse().find((i) => i.tipo === 'texto')
          const tiempo = (t.fin ?? ahora) - t.inicio
          const rapida = t.estado === 'lista' && t.fin && t.fin - t.inicio === mejorTiempo && tareas.length > 1
          return (
            <section key={t.id} className={cn('flex min-h-0 flex-col rounded-3 border bg-s1/60', t.id === actual ? 'aurora-borde border-transparent' : 'border-linea')}>
              <header className="border-b border-linea px-3.5 pt-3 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium text-texto" title={t.modelo ?? ''}>{modelo(t)}</span>
                  <PastillaEstado estado={t.estado} />
                </div>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-texto-3">
                  {t.motorNombre}
                  {t.rol && <span className="rounded-full border border-linea-fuerte/60 px-1.5 py-px text-[11px]">{t.rol}</span>}
                </p>
                <div className="mt-2 flex items-baseline gap-3 tabular-nums">
                  <span className={cn('font-display text-[24px] leading-none font-light', rapida ? 'text-texto' : 'text-texto-2')}>{duracion(tiempo)}</span>
                  {rapida && <span className="text-[11px] text-texto-3">la más rápida</span>}
                </div>
                <dl className="mt-2 grid grid-cols-3 gap-2 text-[11px]">
                  <div><dt className="text-texto-3">Cambios</dt><dd className="text-[12.5px]">{t.cambios?.ficheros ? <><span className="text-exito">+{t.cambios.mas}</span> <span className="text-peligro">−{t.cambios.menos}</span></> : '—'}</dd></div>
                  <div><dt className="text-texto-3">Ficheros</dt><dd className="text-[12.5px] text-texto">{t.cambios?.ficheros ?? '—'}</dd></div>
                  <div><dt className="text-texto-3">Tokens</dt><dd className="text-[12.5px] text-texto">{t.uso.entrada + t.uso.salida ? fmtTokens(t.uso.entrada + t.uso.salida) : '—'}</dd></div>
                </dl>
                {t.cambios?.lista?.length ? (
                  <ul className="mt-2 grid gap-0.5 text-[11.5px] text-texto-3">
                    {t.cambios.lista.slice(0, 4).map((f) => (
                      <li key={f.ruta} className="truncate" title={`${f.ruta} · +${f.mas} −${f.menos}`}>
                        <span className="text-texto-2">{f.ruta.split('/').pop()}</span>
                        <span className="text-exito"> +{f.mas}</span>
                        {f.menos > 0 && <span className="text-peligro"> −{f.menos}</span>}
                      </li>
                    ))}
                    {t.cambios.lista.length > 4 && <li className="text-texto-3">y {t.cambios.lista.length - 4} más…</li>}
                  </ul>
                ) : null}
              </header>
              <div className="min-h-0 flex-1 overflow-y-auto px-3.5 py-2.5 text-[13px] leading-5 text-texto-2">
                {t.estado === 'error' ? <p className="text-peligro">{t.error}</p>
                  : resumen?.tipo === 'texto' ? <Markdown texto={resumen.texto} />
                  : <p className="flex items-center gap-2 text-texto-3">{activa(t) && <LoaderCircle className="size-3.5 animate-spin" />}{activa(t) ? 'Trabajando…' : 'Sin resumen.'}</p>}
              </div>
              <footer className="flex gap-2 border-t border-linea p-2.5">
                <button type="button" onClick={() => onVer(t.id)} className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[12.5px] text-texto-2 hover:bg-s2 hover:text-texto">
                  <Eye className="size-3.5" strokeWidth={1.5} />Revisar
                </button>
                <button type="button" disabled={enMarcha || t.estado !== 'lista' || eligiendo !== null}
                  onClick={() => { setEligiendo(t.id); void onQuedarme(t.id).finally(() => setEligiendo(null)) }}
                  title={enMarcha ? 'Espera a que terminen todas' : 'Descarta las demás y abre la revisión de esta'}
                  className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-full bg-acento px-3 text-[12.5px] font-medium text-sobre-acento transition-opacity disabled:opacity-30">
                  {eligiendo === t.id ? <LoaderCircle className="size-3.5 animate-spin" /> : <Crown className="size-3.5" strokeWidth={1.75} />}Elegir esta
                </button>
              </footer>
            </section>
          )
        })}
      </div>
    </div>
  )
}
