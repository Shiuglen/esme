// Uso: cuánto gastas en IA, en qué modelos y con qué ritmo. Datos reales del registro local; nada sale del equipo.
import NumberFlow from '@number-flow/react'
import { ArrowRight } from 'lucide-react'
import { motion } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'
import { fmtTokens, fmtUSD } from '../chat/formatos'
import { bridge, type EstadoUso, type ResumenUso, type UsoExterno } from '../lib/bridge'
import { cn } from '../lib/cn'
import { diasSeguidos, rejillaActividad } from '../uso/vista'
import { Bicho } from '../marca/Ser'
import { useMuelle } from '../tinta/movimiento'

type Rango = 'hoy' | '7' | '30'
const DIA = 86_400_000
const inicioDe = (r: Rango) => { const h = new Date(); h.setHours(0, 0, 0, 0); return r === 'hoy' ? h.getTime() : h.getTime() - (Number(r) - 1) * DIA }
const entrada = (i: number) => ({ initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5, delay: 0.05 * i, ease: [0.16, 1, 0.3, 1] as const } })
const NOMBRE_DIA = ['L', '', 'X', '', 'V', '', 'D']

function Cifra({ etiqueta, children, pie }: { etiqueta: string; children: React.ReactNode; pie?: React.ReactNode }) {
  return (
    <div className="grid min-w-0 content-start gap-1.5 rounded-3 vidrio halo border px-4 py-3.5">
      <span className="text-xs text-texto-3">{etiqueta}</span>
      <div className="font-display text-[30px] leading-9 font-light tracking-[-0.01em] tabular-nums">{children}</div>
      {pie && <div className="text-xs text-texto-3">{pie}</div>}
    </div>
  )
}

export function Uso({ onIr }: { onIr(id: 'ajustes'): void }) {
  const muelle = useMuelle({ stiffness: 520, damping: 40 })
  const [rango, setRango] = useState<Rango>('30')
  const [resumen, setResumen] = useState<ResumenUso | null>(null)
  const [anual, setAnual] = useState<ResumenUso | null>(null)
  const [estado, setEstado] = useState<EstadoUso | null>(null)
  const [externo, setExterno] = useState<UsoExterno | null>(null)
  useEffect(() => {
    const leer = () => {
      void bridge.uso.resumen(inicioDe(rango), Date.now()).then(setResumen)
      void bridge.uso.resumen(Date.now() - 52 * 7 * DIA, Date.now()).then(setAnual)
      void bridge.uso.externo().then(setExterno).catch(() => {})
      void bridge.uso.estado().then(setEstado)
    }
    leer(); return bridge.uso.onConsumo(leer)
  }, [rango])

  const hoy = new Date()
  // la actividad suma todo tu uso de IA: el de Esme y el de fuera (Claude Code, Codex)
  const todos = useMemo(() => {
    const m = new Map<string, { dia: string; costeUSD: number; tokens: number }>()
    const sumar = (dia: string, tokens: number, costeUSD = 0) => { const x = m.get(dia) ?? { dia, costeUSD: 0, tokens: 0 }; x.tokens += tokens; x.costeUSD += costeUSD; m.set(dia, x) }
    anual?.porDia.forEach((d) => sumar(d.dia, d.tokens, d.costeUSD))
    if (externo) for (const v of Object.values(externo.ventanas)) v.porDia.forEach((d) => sumar(d.dia, d.tokens))
    return [...m.values()]
  }, [anual, externo])
  const rejilla = useMemo(() => rejillaActividad(todos, hoy, 52), [todos])
  const barras = useMemo(() => diasSeguidos(anual?.porDia ?? [], hoy, 30), [anual])
  const maxBarra = Math.max(...barras.map((b) => b.costeUSD), 0.0001)
  const llamadas = resumen?.porModelo.reduce((s, m) => s + m.llamadas, 0) ?? 0
  const tope = estado?.presupuesto.diarioUSD
  const web = bridge.mode() === 'web'
  const activos = rejilla.flat().filter((c) => c.tokens > 0)
  const pico = activos.reduce<(typeof activos)[number] | null>((a, c) => (!a || c.tokens > a.tokens ? c : a), null)
  const diaCaro = barras.reduce((a, b) => (b.costeUSD > a.costeUSD ? b : a), barras[0] ?? { dia: '', costeUSD: 0, tokens: 0 })

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto grid max-w-[1160px] gap-6 px-10 pt-10 pb-12">
        <motion.div {...entrada(0)} className="flex flex-wrap items-end justify-between gap-4">
          <div className="grid gap-2">
            <h1 className="m-0 font-display text-[32px] leading-[1.1] font-semibold tracking-[-0.03em]">Uso</h1>
            <p className="m-0 text-[15px] text-texto-2">Cuánto gastas en IA, en qué y a qué ritmo. Todo se calcula en tu equipo.</p>
          </div>
          <div role="tablist" className="inline-flex gap-0.5 vidrio rounded-3 border p-1">
            {([['hoy', 'Hoy'], ['7', '7 días'], ['30', '30 días']] as const).map(([id, t]) => (
              <button key={id} type="button" role="tab" aria-selected={rango === id} onClick={() => setRango(id)}
                className={cn('relative h-8 rounded-2 px-3.5 text-[13px] font-medium transition-colors', rango === id ? 'text-texto' : 'text-texto-2 hover:text-texto')}>
                {rango === id && <motion.span layoutId="rango-uso" className="absolute inset-0 rounded-2 bg-s3" transition={muelle} />}
                <span className="relative">{t}</span>
              </button>))}
          </div>
        </motion.div>

        {web && <p className="m-0 rounded-3 border border-dashed border-linea p-4 text-sm text-texto-3">El registro de uso vive en la app de escritorio. Aquí, en el navegador, solo ves la estructura.</p>}

        <motion.div {...entrada(1)} className="grid grid-cols-4 gap-3 max-[900px]:grid-cols-2">
          <Cifra etiqueta="Gasto" pie={rango === 'hoy' ? 'hoy' : `últimos ${rango} días`}>{fmtUSD(resumen?.costeUSD ?? 0)}</Cifra>
          <Cifra etiqueta="Tokens" pie="entrada + salida">{fmtTokens(resumen?.tokens ?? 0)}</Cifra>
          <Cifra etiqueta="Llamadas" pie={`${resumen?.porModelo.length ?? 0} ${(resumen?.porModelo.length ?? 0) === 1 ? 'modelo' : 'modelos distintos'}`}><NumberFlow value={llamadas} locales="es-ES" /></Cifra>
          <Cifra etiqueta="Presupuesto de hoy" pie={tope ? <span className="flex items-center gap-2"><span className="h-1 flex-1 overflow-hidden rounded-full bg-s3"><span className={cn('block h-full rounded-full', estado!.evaluacion.estado === 'limite' ? 'bg-peligro' : estado!.evaluacion.estado === 'aviso' ? 'bg-atencion' : 'bg-acento')} style={{ width: `${Math.min(100, (estado!.hoyUSD / tope) * 100)}%` }} /></span>de {fmtUSD(tope)}</span>
            : <button type="button" onClick={() => onIr('ajustes')} className="inline-flex items-center gap-1 text-texto-2 hover:text-texto">pon un tope <ArrowRight className="size-3" /></button>}>
            {fmtUSD(estado?.hoyUSD ?? 0)}
          </Cifra>
        </motion.div>

        <motion.section {...entrada(2)} className="grid gap-3 rounded-3 vidrio halo border p-4">
          <div className="flex items-center justify-between gap-3"><h2 className="m-0 text-[15px] font-semibold">{activos.length ? `${activos.length} ${activos.length === 1 ? 'día' : 'días'} con actividad este año` : 'Aún sin actividad'}</h2><span className="text-xs text-texto-3">{pico ? `pico: ${fmtTokens(pico.tokens)} tokens el ${pico.dia}` : 'tokens por día'}{externo?.disponible.claudeCode ? ' · incluye Claude Code' : ''}</span></div>
          <div className="flex gap-2 overflow-x-auto pb-1" role="img" aria-label={`Actividad del último año: ${activos.length} días con uso${pico ? `; el día de más uso fue el ${pico.dia}, con ${fmtTokens(pico.tokens)} tokens` : ''}.`}>
            <div className="grid grid-rows-7 gap-[3px] pt-[1px] text-[10px] leading-[13px] text-texto-3">{NOMBRE_DIA.map((n, i) => <span key={i} className="h-[13px]">{n}</span>)}</div>
            <div className="flex gap-[3px]">
              {rejilla.map((semana, s) => (
                <div key={s} className="grid grid-rows-7 gap-[3px]">
                  {semana.map((c) => (
                    <span key={c.dia} title={c.futuro ? '' : `${c.dia} · ${fmtTokens(c.tokens)} tokens · ${fmtUSD(c.costeUSD)}`}
                      className={cn('size-[13px] rounded-[3px]', c.futuro && 'opacity-0')}
                      style={{ background: `var(--actividad-${c.nivel})` }} />))}
                </div>))}
            </div>
          </div>
          <div className="flex items-center justify-end gap-1.5 text-[11px] text-texto-3">menos{[0, 1, 2, 3, 4].map((n) => <span key={n} className="size-[11px] rounded-[3px]" style={{ background: `var(--actividad-${n})` }} />)}más</div>
        </motion.section>

        <motion.div {...entrada(3)} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-4 max-[1000px]:grid-cols-1">
          <section className="grid content-start gap-3 rounded-3 vidrio halo border p-4">
            <div className="flex items-center justify-between gap-3"><h2 className="m-0 text-[15px] font-semibold">{diaCaro.costeUSD > 0 ? `Tu día más caro: ${diaCaro.dia.slice(5)}, ${fmtUSD(diaCaro.costeUSD)}` : 'Sin gasto en 30 días'}</h2><span className="text-xs text-texto-3">USD por día · 30 días</span></div>
            <div className="flex h-[140px] items-end gap-[3px]" role="img" aria-label={`Gasto de los últimos 30 días; máximo ${fmtUSD(maxBarra)} en un día`}>
              {barras.map((b) => (
                <span key={b.dia} title={`${b.dia} · ${fmtUSD(b.costeUSD)}`} className={cn('flex-1 rounded-t-[3px] transition-colors', b.costeUSD > 0 ? 'bg-texto-2 hover:bg-texto' : 'bg-linea')}
                  style={{ height: b.costeUSD > 0 ? `${Math.max(4, (b.costeUSD / maxBarra) * 100)}%` : '2px' }} />))}
            </div>
            <div className="flex justify-between text-[11px] text-texto-3"><span>{barras[0]?.dia.slice(5)}</span><span>hoy</span></div>
          </section>
          <section className="grid content-start gap-3 rounded-3 vidrio halo border p-4">
            <div className="flex items-center justify-between"><h2 className="m-0 text-[15px] font-semibold">Por modelo</h2><span className="text-xs text-texto-3">{rango === 'hoy' ? 'hoy' : `${rango} días`}</span></div>
            {!resumen?.porModelo.length ? <p className="m-0 text-sm text-texto-3">Sin consumo en este rango. Cada respuesta del chat queda anotada aquí con su coste real.</p> : (
              <div className="grid gap-2.5">
                {resumen.porModelo.slice(0, 8).map((m) => { const parte = resumen.costeUSD > 0 ? m.costeUSD / resumen.costeUSD : m.tokens / Math.max(1, resumen.tokens); return (
                  <div key={`${m.proveedor}/${m.modelo}`} className="grid gap-1">
                    <div className="flex items-center gap-2 text-[13px]"><span className="truncate">{m.modelo}</span><span className="text-xs text-texto-3">{m.proveedor}</span>
                      <span className="ml-auto shrink-0 text-xs text-texto-2 tabular-nums">{m.llamadas} · {fmtTokens(m.tokens)} · {fmtUSD(m.costeUSD)}</span></div>
                    <span className="h-1 overflow-hidden rounded-full bg-s3"><span className="block h-full rounded-full" style={{ width: `${Math.max(2, parte * 100)}%`, background: 'var(--aurora-lineal)' }} /></span>
                  </div>) })}
              </div>)}
          </section>
        </motion.div>

        {!!resumen?.porTarea.length && (
          <motion.section {...entrada(4)} className="grid gap-3 rounded-3 vidrio halo border p-4">
            <div className="flex items-center justify-between">
              <h2 className="m-0 text-[15px] font-semibold">El Taller</h2>
              <span className="text-xs text-texto-3">cada tarea, su historia</span>
            </div>
            <div className="grid gap-2.5">
              {resumen.porTarea.slice(0, 6).map((a) => (
                <div key={a.tarea} className="flex items-center gap-2 text-[13px]">
                  <Bicho de={a.motor} tamaño={13} className="shrink-0 text-texto-3" />
                  <span className="truncate">{a.titulo || 'Tarea'}</span>
                  <span className="shrink-0 rounded-full border px-1.5 text-[11px] text-texto-3">{a.motor}</span>
                  <span className="ml-auto shrink-0 text-xs text-texto-2 tabular-nums">{a.turnos} {a.turnos === 1 ? 'turno' : 'turnos'} · {fmtTokens(a.tokens)} · {fmtUSD(a.costeUSD)}</span>
                </div>
              ))}
            </div>
          </motion.section>
        )}

        {externo && (externo.disponible.claudeCode || externo.disponible.codex) && (
          <motion.section {...entrada(4)} className="grid gap-3">
            <div className="grid gap-1">
              <h2 className="m-0 text-[15px] font-semibold">Fuera de Esme</h2>
              <p className="m-0 text-sm text-texto-3">Tu uso con suscripción, leído de los registros locales: solo contadores, nunca el contenido. El coste es lo que te costaría por API.</p>
            </div>
            <div className="grid grid-cols-2 gap-4 max-[1000px]:grid-cols-1">
              {([['claude-code', 'Claude Code', externo.disponible.claudeCode], ['codex', 'Codex', externo.disponible.codex]] as const).filter(([, , ok]) => ok).map(([id, nombre]) => {
                const v = externo.ventanas[id], max = Math.max(...v.porDia.map((d) => d.tokens), 1)
                return (
                  <div key={id} className="grid gap-3 rounded-3 vidrio halo border p-4">
                    <div className="flex items-center justify-between gap-3"><span className="text-sm font-semibold">{nombre}</span>
                      <span className="text-xs text-texto-3 tabular-nums">ritmo: {fmtTokens(v.ritmoPorHora)} tokens/h</span></div>
                    <div className="grid grid-cols-2 gap-3">
                      {([['últimas 5 h', v.h5], ['últimos 7 días', v.d7]] as const).map(([t, w]) => (
                        <div key={t} className="grid gap-0.5"><span className="text-xs text-texto-3">{t}</span>
                          <span className="text-[22px] leading-7 font-semibold tabular-nums">{fmtTokens(w.tokens)}</span>
                          <span className="text-xs text-texto-3">{w.costeUSD !== undefined ? `≈ ${fmtUSD(w.costeUSD)} por API` : 'sin precio para este modelo'}</span></div>))}
                    </div>
                    <div className="flex h-12 items-end gap-[2px]" role="img" aria-label={`${nombre}: tokens por día en los últimos 30 días`}>
                      {v.porDia.map((d) => <span key={d.dia} title={`${d.dia} · ${fmtTokens(d.tokens)} tokens`} className={cn('flex-1 rounded-t-[2px]', d.tokens > 0 ? 'bg-texto-2' : 'bg-linea')} style={{ height: d.tokens > 0 ? `${Math.max(6, (d.tokens / max) * 100)}%` : '2px' }} />)}
                    </div>
                  </div>)
              })}
            </div>
          </motion.section>
        )}
      </div>
    </div>
  )
}
