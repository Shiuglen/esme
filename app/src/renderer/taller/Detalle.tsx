// El detalle de una tarea: qué se pidió, qué hace el motor en vivo (plan, herramientas, texto), los permisos que pide,
// los cambios en su copia y cómo seguir. Descartar es en dos pasos: borra la copia y su rama, y eso no se deshace.
import { TintaVista, tintaDeTarea } from '../marca/PuntoVista'
import AILoadingState from '../ui/ai-loading'
import { pasosDe } from '../paginas/mando'
import {
  ArrowUp, Brain, Hourglass, Check, ChevronRight, Circle, CircleCheck, Eye, FolderOpen, GitBranch, Globe, LoaderCircle, MoveRight, PencilLine, RefreshCcw,
  Search, ShieldCheck, Square, SquareTerminal, Trash2, Undo2, Wrench, X, type LucideIcon,
} from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { memo, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Markdown } from '../chat/Markdown'
import type { TareaTaller } from '../lib/bridge'
import { cn } from '../lib/cn'
import { useMuelle } from '../tinta/movimiento'
import { Revision, type AccionesRevision } from './Revision'
import { Arena } from './Arena'
import { Forja } from './Forja'
import { VistaPrevia } from './VistaPrevia'
import { contarLineas } from './diff'
import { PastillaEstado } from './FilaMotor'
import { describirHerramienta, type ItemLinea } from './linea'
import { SelectorOpcion } from './Opciones'
import { activa, barrasDe, duracion, explicarError, motivoFin } from './vista'
import { BarrasActividad } from './Micrografica'
import { VENTANA, ventanaDe, visiblesDe } from './ventana'

const ICONO_CLASE: Record<string, LucideIcon> = {
  read: Eye, edit: PencilLine, delete: Trash2, move: MoveRight, search: Search, execute: SquareTerminal, think: Brain, fetch: Globe,
}
const PERMISO: Record<string, string> = { allow_once: 'Permitir', allow_always: 'Permitir siempre', reject_once: 'Rechazar', reject_always: 'Rechazar siempre' }


export type Pestana = 'vivo' | 'revision' | 'previa' | 'arena'
export function Detalle({ t, linea, login = '', onSeguir, onResponder, onParar, onDescartar, onAbrir, onConfigurar, onTerminal, revision, onPestana, arena, pedida, onReencarnar, onDeshacerTurno, ahora = Date.now() }: {
  ahora?: number
  t: TareaTaller; linea: ItemLinea[] | undefined; login?: string; onTerminal(): void; revision: AccionesRevision; onPestana?(p: Pestana): void
  arena?: Omit<React.ComponentProps<typeof Arena>, 'actual'>; pedida?: { p: Pestana; n: number } | null
  onSeguir(texto: string): Promise<boolean>; onResponder(opcion: string): void; onParar(): void; onDescartar(): void; onAbrir(): void; onReencarnar(): void
  onDeshacerTurno(): Promise<boolean> | void
  onConfigurar(opcion: string, valor: string): void
}) {
  const muelle = useMuelle({ stiffness: 500, damping: 40 })
  const [pestana, setPestana] = useState<Pestana>(t.arena ? 'arena' : 'vivo')
  const [confirmar, setConfirmar] = useState(false)
  const [confirmarTurno, setConfirmarTurno] = useState(false)
  useEffect(() => { setPestana(t.arena && arena && arena.tareas.length > 1 ? 'arena' : 'vivo'); setConfirmar(false); setConfirmarTurno(false) }, [t.id])   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (pedida) setPestana(pedida.p) }, [pedida?.n])   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { onPestana?.(pestana) }, [pestana, onPestana])
  useEffect(() => { if (!confirmar) return; const k = setTimeout(() => setConfirmar(false), 4500); return () => clearTimeout(k) }, [confirmar])
  useEffect(() => { if (!confirmarTurno) return; const k = setTimeout(() => setConfirmarTurno(false), 4500); return () => clearTimeout(k) }, [confirmarTurno])
  const enMarcha = activa(t)
  const carpeta = t.carpeta ? t.carpeta.split(/[\\/]/).filter(Boolean).pop() : null
  // Deshacer un turno sólo tiene sentido con una copia (todo lo que trabaja vive en un repo, sea el
  // del proyecto o uno nuevo) y con un turno anterior al que volver.
  const sePuedeDeshacerTurno = !!t.copia && t.turnos >= 2 && !enMarcha

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="border-b border-linea px-5 pt-4 pb-3">
        <div className="flex items-start gap-3">
          {/* quién trabaja: la cara del agente, que dice en qué está (agentfaces) */}
          <span className="shrink-0"><TintaVista motor={t.motor} px={52} estado={tintaDeTarea(t.estado)} /></span>
          <h2 className="line-clamp-2 min-w-0 flex-1 font-display text-[19px] leading-[25px] tracking-[-0.01em] text-texto">{t.titulo}</h2>
          <div className="flex shrink-0 items-center gap-1">
            {enMarcha && <Accion icono={Square} texto="Parar" onClick={onParar} />}
            {t.copia && <Accion icono={FolderOpen} texto="Abrir la copia" onClick={onAbrir} />}
            {t.estado === 'error' && <Accion icono={RefreshCcw} texto="Reencarna con otro motor" onClick={onReencarnar} />}
            <AnimatePresence mode="popLayout" initial={false}>
              {sePuedeDeshacerTurno && (confirmarTurno ? (
                <motion.button key="turno-si" type="button" onClick={() => { setConfirmarTurno(false); void onDeshacerTurno() }} initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.92 }}
                  className="inline-flex h-8 items-center gap-1.5 rounded-full bg-atencion-velo px-3 text-xs font-medium text-atencion">
                  <Undo2 className="size-3.5" strokeWidth={1.75} />¿Deshacer el turno?
                </motion.button>
              ) : (
                <motion.span key="turno-no" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <Accion icono={Undo2} texto="Deshacer el último turno" onClick={() => setConfirmarTurno(true)} />
                </motion.span>
              ))}
            </AnimatePresence>
            <AnimatePresence mode="popLayout" initial={false}>
              {confirmar ? (
                <motion.button key="si" type="button" onClick={onDescartar} initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.92 }}
                  className="inline-flex h-8 items-center gap-1.5 rounded-full bg-peligro-velo px-3 text-xs font-medium text-peligro">
                  <Trash2 className="size-3.5" strokeWidth={1.75} />Borrar la copia y su rama
                </motion.button>
              ) : (
                <motion.span key="no" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <Accion icono={Trash2} texto="Descartar" onClick={() => setConfirmar(true)} />
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </div>
        <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs text-texto-3">
          <PastillaEstado estado={t.estado} />
          <span className="text-[12.5px] text-texto-2">{t.motorNombre}</span>
          {t.opciones.filter((o) => o.id === 'model' || o.id === 'mode').map((o) => (
            <SelectorOpcion key={o.id} o={o} onCambiar={(v) => onConfigurar(o.id, v)} className={o.id === 'model' ? 'max-w-[210px]' : 'max-w-[150px]'} />
          ))}
          {t.copia && (
            <span className="inline-flex items-center gap-1 font-mono text-[11.5px]" title={`Copia aislada en ${t.copia.ruta}\nParte de ${t.copia.base.slice(0, 7)}: los cambios sin commitear de tu carpeta no viajan.`}>
              <GitBranch className="size-3.5" strokeWidth={1.5} />{t.copia.rama ?? 'carpeta nueva'}
              {carpeta && <span className="text-texto-3">de {carpeta}@{t.copia.base.slice(0, 7)}</span>}
            </span>
          )}
          <span className="inline-flex items-center gap-1" title="Trabaja en un git worktree: tu carpeta original no se toca hasta que tú decidas.">
            <ShieldCheck className="size-3.5" strokeWidth={1.5} />copia aislada
          </span>
        </div>
        {/* La línea de vida: los cubos de actividad como píldoras de código de barras, con sus dos orillas de tiempo */}
        <div className="mt-3 flex items-center gap-2.5" aria-label="La línea de vida del turno">
          <span className="shrink-0 font-mono text-[10.5px] text-texto-3">0:00</span>
          <BarrasActividad valores={barrasDe(t.actividad, 30)} viva={t.estado === 'trabajando'} ancho={440} alto={18} completo className="min-w-0 flex-1" />
          <span className="shrink-0 font-mono text-[10.5px] text-texto" title="Cuánto lleva (o llevó) el turno">{t.primeraRespuestaMs ? `1.ª res. ${duracion(t.primeraRespuestaMs)} · ` : ''}{duracion((t.fin ?? ahora) - t.inicio)}</span>
        </div>
        {/* mientras trabaja o espera, sus pasos en directo (Kokonut UI) */}
        {(enMarcha || t.estado === 'esperando') && <div className="mt-3 rounded-3 border border-linea/60 bg-s1/40 p-2"><AILoadingState steps={pasosDe(t)} collapseWhenDone={false} /></div>}
        <nav className="mt-3 flex items-center gap-1 border-b border-linea/70 pb-1" aria-label="Vista de la tarea">
          {(['vivo', 'revision', 'previa', ...(arena && arena.tareas.length > 1 ? ['arena' as const] : [])] as Pestana[]).map((p) => (
            <button key={p} type="button" onClick={() => setPestana(p)} aria-current={pestana === p}
              className={cn('relative h-8 rounded-2 px-3 text-[13px] transition-colors', pestana === p ? 'text-texto' : 'text-texto-3 hover:text-texto-2')}>
              {p === 'vivo' ? 'En vivo' : p === 'revision' ? 'Revisión' : p === 'previa' ? 'Vista previa' : 'Arena'}
              {p === 'arena' && arena && <span className="ml-1.5 rounded-full bg-s3 px-1.5 text-[11px] tabular-nums text-texto-2">{arena.tareas.length}</span>}
              {p === 'revision' && !!t.cambios?.ficheros && <span className="ml-1.5 rounded-full bg-s3 px-1.5 text-[11px] tabular-nums text-texto-2">{t.cambios.ficheros}</span>}
              {pestana === p && (
                <motion.span layoutId="pestaña-taller" aria-hidden
                  className="absolute inset-x-2.5 -bottom-1 h-[2px] rounded-full [background:var(--aurora-lineal)]"
                  transition={muelle} />
              )}
            </button>
          ))}
        </nav>
      </header>

      {t.estado === 'error' && t.error && (() => {
        const x = explicarError(t.error, t.motorNombre, login)
        return x && (
          <div role="status" className="mx-4 mt-3 rounded-3 border border-atencion/40 bg-atencion-velo px-4 py-3">
            <p className="text-[14px] text-texto">{x.titulo}</p>
            <p className="mt-0.5 text-[13px] text-texto-2">{x.consejo.split('`').map((p, k) => (k % 2 ? <code key={k} className="rounded-1 bg-s2 px-1.5 py-0.5 font-mono text-[12px] text-texto">{p}</code> : p))}</p>
            <p className="mt-2 text-xs text-texto-3">{x.tipo === 'sesion' ? 'El inicio de sesión lo haces tú, en tu terminal: Esme no ve ni guarda tus claves. Después, pídele algo más aquí abajo.' : 'Tu copia sigue intacta: puedes pedírselo otra vez con otro modelo.'}</p>
            {x.tipo === 'sesion' && (
              <button type="button" onClick={onTerminal} className="mt-2.5 inline-flex h-8 items-center gap-1.5 rounded-full bg-acento px-3.5 text-[13px] font-medium text-sobre-acento">
                <SquareTerminal className="size-3.5" strokeWidth={1.75} />Abrir una terminal
              </button>
            )}
          </div>
        )
      })()}
      <div className="min-h-0 flex-1">
        {pestana === 'arena' && arena ? <Arena {...arena} actual={t.id} /> : pestana === 'previa' ? <VistaPrevia t={t} linea={linea} onPedir={onSeguir} /> : pestana === 'revision' ? <Revision t={t} linea={linea} acciones={revision} /> : <EnVivo t={t} linea={linea} />}
      </div>

      <Forja t={t} />
      {t.permiso && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} role="alertdialog" aria-label={`${t.motorNombre} pide permiso`}
          className="mx-4 mb-3 rounded-3 border border-atencion/50 bg-atencion-velo px-4 py-3">
          <p className="text-xs text-atencion">{t.motorNombre} te pide permiso</p>
          <p className="mt-0.5 text-[14px] text-texto">{t.permiso.titulo || 'Una acción sin descripción'}</p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {[...t.permiso.opciones].sort((a, b) => orden(a.tipo) - orden(b.tipo)).map((o, i) => (
              <button key={o.id} type="button" onClick={() => onResponder(o.id)} autoFocus={i === 0}
                className={cn('h-8 rounded-full px-3.5 text-[13px] font-medium transition-colors',
                  o.tipo === 'allow_once' ? 'bg-acento text-sobre-acento hover:opacity-90' : 'border border-linea-fuerte/60 text-texto-2 hover:bg-s2')}>
                {PERMISO[o.tipo] ?? o.nombre}
              </button>
            ))}
          </div>
        </motion.div>
      )}
      <Seguir t={t} onSeguir={onSeguir} />
    </div>
  )
}
const orden = (tipo: string) => ['allow_once', 'allow_always', 'reject_once', 'reject_always'].indexOf(tipo) + 1 || 9

function Accion({ icono: Icono, texto, onClick }: { icono: LucideIcon; texto: string; onClick(): void }) {
  return (
    <button type="button" onClick={onClick} title={texto} aria-label={texto}
      className="grid size-8 place-items-center rounded-full text-texto-3 transition-colors hover:bg-s2 hover:text-texto">
      <Icono className="size-4" strokeWidth={1.5} />
    </button>
  )
}

function EnVivo({ t, linea }: { t: TareaTaller; linea: ItemLinea[] | undefined }) {
  const caja = useRef<HTMLDivElement>(null)
  const pegado = useRef(true)
  const [cuantas, setCuantas] = useState(VENTANA)
  const [ancla, setAncla] = useState<number | null>(null)   // dónde se para la ventana si se sube a leer
  const total = linea?.length ?? 0
  useLayoutEffect(() => { const el = caja.current; if (el && pegado.current) el.scrollTop = el.scrollHeight }, [linea])
  if (!linea) return <p className="p-6 text-sm text-texto-3">Cargando lo que ha hecho…</p>
  const ventana = ventanaDe(linea, cuantas, ancla)
  const visibles = visiblesDe(linea, ventana)
  return (
    <div ref={caja} className="h-full space-y-2.5 overflow-y-auto px-5 py-4"
      onScroll={(e) => {
        const el = e.currentTarget
        const abajo = el.scrollHeight - el.scrollTop - el.clientHeight < 80
        pegado.current = abajo
        // al subir a leer, la ventana se para donde estaba: lo que llega después no te empuja
        setAncla(abajo ? null : total)
      }}>
      {ventana.hayAntes && (
        <button type="button" onClick={() => setCuantas((c) => c + VENTANA)}
          className="w-full rounded-3 border border-linea bg-s1/60 py-1.5 text-[12px] text-texto-2 transition-colors hover:bg-s2/60 hover:text-texto">
          Ver los {ventana.desde} anteriores
        </button>
      )}
      {linea.length === 0 && <p className="text-sm text-texto-3">{t.estado === 'preparando' ? 'Montando la copia aislada y despertando al motor…' : 'Todavía no hay nada.'}</p>}
      {visibles.map((i) => <Item key={i.clave} i={i} />)}
      {t.estado === 'trabajando' && linea.at(-1)?.tipo !== 'texto' && (
        <p className="flex items-center gap-2 text-xs text-texto-3"><LoaderCircle className="size-3.5 animate-spin" strokeWidth={1.75} />Trabajando</p>
      )}
    </div>
  )
}

const Item = memo(function Item({ i }: { i: ItemLinea }) {
  switch (i.tipo) {
    case 'usuario': return <div className="rounded-3 border border-linea bg-s2/60 px-3.5 py-2.5 text-[13.5px] whitespace-pre-wrap text-texto">{i.texto}</div>
    case 'texto': return <div className="text-[14px] leading-[22px] text-texto"><Markdown texto={i.texto} /></div>
    case 'pensamiento': return <Pensamiento texto={i.texto} />
    case 'herramienta': return <Herramienta i={i} />
    case 'plan': return (
      <div className="rounded-3 border border-linea bg-s1/60 px-3.5 py-2.5">
        <ol className="space-y-1.5">
          {i.pasos.map((p, k) => (
            <li key={k} className="flex items-start gap-2 text-[13px]">
              {p.estado === 'completed' ? <CircleCheck className="mt-0.5 size-4 shrink-0 text-exito" strokeWidth={1.5} />
                : p.estado === 'in_progress' ? <LoaderCircle className="mt-0.5 size-4 shrink-0 animate-spin text-texto-2" strokeWidth={1.5} />
                : <Circle className="mt-0.5 size-4 shrink-0 text-texto-3" strokeWidth={1.5} />}
              <span className={cn(p.estado === 'completed' ? 'text-texto-3 line-through decoration-texto-3/40' : 'text-texto-2')}>{p.texto}</span>
            </li>
          ))}
        </ol>
      </div>)
    case 'fin': return (
      <div className="flex items-center gap-3 py-1.5 text-xs text-texto-3">
        <span className="h-px flex-1 bg-linea" />
        <span className="font-[450] text-texto-2">{motivoFin(i.motivo)} en {duracion(i.ms)}</span>
        <span className="grid size-4 place-items-center rounded-full" style={{ background: 'color-mix(in oklab, var(--luz) 16%, transparent)' }} aria-hidden>
          <CircleCheck className="size-3" strokeWidth={1.75} style={{ color: 'var(--luz)' }} />
        </span>
        <span className="h-px flex-1 bg-linea" />
      </div>)
    case 'fallo': return <div className="rounded-3 border border-peligro/40 bg-peligro-velo px-3.5 py-2.5 text-[13px] text-peligro">{i.mensaje}</div>
    case 'aprobado': return (
      <p className="flex items-center gap-2 text-[12px] text-texto-3" title="La tarea trabaja en una copia aislada: lo que no sale de ella lo apruebo yo, según su modo de acceso">
        <ShieldCheck className="size-3.5 shrink-0" strokeWidth={1.75} />Lo aprobé yo, dentro de la copia: {i.titulo}
      </p>)
    case 'reintento': return (
      <p className="flex items-center gap-2 text-[12.5px] text-atencion" title={i.motivo}>
        <Hourglass className="size-3.5 shrink-0" strokeWidth={1.75} />El proveedor limita las peticiones: lo reintento en {Math.round(i.ms / 1000)} s
      </p>)
    case 'herencia': return (
      <p className="flex items-center gap-2 text-[12px] text-texto-3" title="Lo que tu mente ya sabía del encargo: el motor arranca con esto, sin que tengas que pegarle nada">
        <Brain className="size-3.5 shrink-0" strokeWidth={1.5} />Le heredé tu memoria: {i.recuerdos} {i.recuerdos === 1 ? 'recuerdo' : 'recuerdos'} ({i.tokens} tokens)
      </p>)
  }
})

function Pensamiento({ texto }: { texto: string }) {
  const [abierto, setAbierto] = useState(false)
  return (
    <div className="text-[13px]">
      <button type="button" onClick={() => setAbierto((v) => !v)} aria-expanded={abierto} className="flex max-w-full items-center gap-1.5 text-texto-3 hover:text-texto-2">
        <ChevronRight className={cn('size-3.5 shrink-0 transition-transform', abierto && 'rotate-90')} strokeWidth={1.75} />
        <Brain className="size-3.5 shrink-0" strokeWidth={1.5} />
        <span className="truncate">{abierto ? 'Pensamiento' : texto.trim().split('\n')[0]}</span>
      </button>
      {abierto && <p className="mt-1.5 border-l border-linea pl-3 whitespace-pre-wrap text-texto-3">{texto.trim()}</p>}
    </div>
  )
}

function Herramienta({ i }: { i: Extract<ItemLinea, { tipo: 'herramienta' }> }) {
  const Icono = ICONO_CLASE[i.clase ?? ''] ?? Wrench
  return (
    <div className="flex items-start gap-2.5 rounded-2 px-1 py-0.5 text-[13px]">
      <Icono className="mt-0.5 size-4 shrink-0 text-texto-3" strokeWidth={1.5} />
      <div className="min-w-0 flex-1">
        <p className="flex min-w-0 items-baseline gap-1.5 text-texto-2">
          {(() => { const d = describirHerramienta(i); return (
            <>
              <span className="shrink-0">{d.texto}</span>
              {d.objeto && <span className="min-w-0 truncate font-mono text-[12px] text-texto" title={i.rutas?.join('\n')}>{d.objeto}</span>}
              {d.codigo && <code className="min-w-0 truncate rounded-1 bg-s2 px-1.5 py-px font-mono text-[12px] text-texto" title={d.codigo}>{d.codigo}</code>}
            </>
          ) })()}
        </p>
        {i.diff && (
          <div className="mt-1 flex flex-wrap gap-1.5">
            {i.diff.map((d) => {
              const c = contarLineas(d.antes, d.despues)
              return (
                <span key={d.ruta} className="inline-flex h-6 items-center gap-1.5 rounded-full border border-linea bg-s1/70 px-2 font-mono text-[11px]">
                  <span className="max-w-[220px] truncate text-texto-2">{d.ruta.split('/').pop()}</span>
                  <span className="text-exito">+{c.mas}</span><span className="text-peligro">−{c.menos}</span>
                </span>
              )
            })}
          </div>
        )}
      </div>
      {i.estado === 'completed' ? <Check className="mt-0.5 size-4 shrink-0 text-exito" strokeWidth={1.75} aria-label="Hecho" />
        : i.estado === 'failed' ? <X className="mt-0.5 size-4 shrink-0 text-peligro" strokeWidth={1.75} aria-label="Falló" />
        : <LoaderCircle className="mt-0.5 size-4 shrink-0 animate-spin text-texto-3" strokeWidth={1.75} aria-label="En curso" />}
    </div>
  )
}

function Seguir({ t, onSeguir }: { t: TareaTaller; onSeguir(texto: string): Promise<boolean> }) {
  const [texto, setTexto] = useState('')
  const enMarcha = activa(t)
  const enviar = async () => { const q = texto.trim(); if (!q || enMarcha) return; if (await onSeguir(q)) setTexto('') }
  return (
    <div className="px-4 pb-4">
      <div className="vidrio aurora-foco flex items-end gap-2 rounded-4 border px-3.5 py-2.5">
        <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={1} disabled={enMarcha}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void enviar() } }}
          placeholder={enMarcha ? `${t.motorNombre} está trabajando…` : `Pídele algo más a ${t.motorNombre}…`}
          className="max-h-40 min-h-[24px] flex-1 resize-none bg-transparent py-0.5 text-[14px] text-texto outline-none placeholder:text-texto-3 [field-sizing:content] disabled:cursor-not-allowed" />
        <button type="button" onClick={() => void enviar()} disabled={!texto.trim() || enMarcha} aria-label="Enviar"
          className="grid size-8 shrink-0 place-items-center rounded-full bg-acento text-sobre-acento transition-opacity disabled:opacity-30">
          <ArrowUp className="size-4" strokeWidth={2} />
        </button>
      </div>
    </div>
  )
}
