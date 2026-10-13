// La revisión de una tarea: primero lo que importa para decidir —qué dice el motor que hizo, cuánto cambió, qué ficheros y
// qué ejecutó—, después cada fichero con sus líneas coloreadas, y al pie la decisión: aplicarlo a tu carpeta (con deshacer),
// guardarlo en su rama o, si nació en una carpeta nueva, guardarlo como proyecto.
import { Check, ChevronDown, FileMinus2, FilePlus2, FileText, FolderInput, GitBranch, LoaderCircle, SquareTerminal, Undo2, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'
import { Markdown } from '../chat/Markdown'
import { bridge, type TareaTaller } from '../lib/bridge'
import { cn } from '../lib/cn'
import { lados, leerDiff, type FicheroDiff } from './diff'
import { describirHerramienta, type ItemLinea } from './linea'
import { lenguajeDe, resaltar, type Pieza } from './resaltado'
import { activa } from './vista'
import { Sello } from '../marca/Sello'
import { giroSello } from '../marca/sello'

const MAX_LINEAS = 400
const ancla = (ruta: string) => `fichero-${ruta.replace(/[^a-zA-Z0-9]/g, '-')}`

export type AccionesRevision = {
  onAplicar(): Promise<boolean>; onDeshacer(): Promise<boolean>; onGuardarRama(): Promise<boolean>; onExportar(): Promise<boolean>; onAbrir(): void
}

export function Revision({ t, linea, acciones }: { t: TareaTaller; linea: ItemLinea[] | undefined; acciones: AccionesRevision }) {
  const [ficheros, setFicheros] = useState<FicheroDiff[] | null>(null)
  const [truncado, setTruncado] = useState(false)
  const huella = `${t.id}:${t.turnos}:${t.cambios?.mas}:${t.cambios?.menos}:${t.cambios?.ficheros}:${t.aplicada?.cuando ?? ''}`
  useEffect(() => {
    let vivo = true
    void bridge.taller.diff(t.id).then((d) => { if (vivo) { setFicheros(leerDiff(d.texto)); setTruncado(d.truncado) } })
    return () => { vivo = false }
  }, [huella, t.id])

  const resumen = useMemo(() => [...(linea ?? [])].reverse().find((i) => i.tipo === 'texto')?.texto ?? null, [linea])
  const comandos = useMemo(() => (linea ?? []).flatMap((i) => (i.tipo === 'herramienta' && i.clase === 'execute' ? [i] : [])), [linea])
  const mas = ficheros?.reduce((s, f) => s + f.mas, 0) ?? 0, menos = ficheros?.reduce((s, f) => s + f.menos, 0) ?? 0
  const tope = Math.max(1, ...(ficheros ?? []).map((f) => f.mas + f.menos))

  if (!ficheros) return <p className="p-6 text-sm text-texto-3">Leyendo los cambios…</p>
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
        {resumen && (
          <section className="rounded-3 border border-linea bg-s1/60 px-4 py-3">
            <h3 className="mb-1 text-xs text-texto-3">Lo que dice {t.motorNombre}</h3>
            <div className="text-[13.5px] leading-[21px] text-texto"><Markdown texto={resumen} /></div>
          </section>
        )}
        {ficheros.length === 0 ? (
          <div className="grid place-items-center py-10 text-center">
            <p className="text-[15px] text-texto">Sin cambios en ficheros</p>
            <p className="mt-1 max-w-[340px] text-[13px] text-texto-3">{activa(t) ? 'Cuando el motor toque ficheros en su copia, aparecerán aquí.' : 'Esta tarea no cambió nada en su copia.'}</p>
          </div>
        ) : (
          <>
            <section aria-label="Resumen de cambios">
              <p className="flex items-baseline gap-3 text-[13px] text-texto-2">
                <span><span className="font-display text-[22px] text-texto tabular-nums">{ficheros.length}</span> {ficheros.length === 1 ? 'fichero' : 'ficheros'}</span>
                <span className="font-mono tabular-nums text-exito">+{mas}</span><span className="font-mono tabular-nums text-peligro">−{menos}</span>
              </p>
              <ul className="mt-2 space-y-0.5">
                {ficheros.map((f) => (
                  <li key={f.ruta}>
                    <a href={`#${ancla(f.ruta)}`} onClick={(e) => { e.preventDefault(); document.getElementById(ancla(f.ruta))?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }}
                      className="group flex h-7 items-center gap-2.5 rounded-2 px-1.5 text-[12.5px] hover:bg-s2/70">
                      <IconoFichero f={f} />
                      <span className="min-w-0 flex-1 truncate font-mono text-texto-2 group-hover:text-texto">{f.ruta}</span>
                      {f.binario ? <span className="text-[11px] text-texto-3">binario</span> : (
                        <span className="flex h-1.5 w-24 shrink-0 overflow-hidden rounded-full bg-s3/70" aria-label={`${f.mas} líneas añadidas y ${f.menos} quitadas`}>
                          <span className="bg-exito" style={{ width: `${(100 * f.mas) / tope}%` }} /><span className="bg-peligro" style={{ width: `${(100 * f.menos) / tope}%` }} />
                        </span>
                      )}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
            {comandos.length > 0 && (
              <section aria-label="Lo que ejecutó">
                <h3 className="mb-1.5 text-xs text-texto-3">Lo que ejecutó en su copia</h3>
                <ul className="space-y-1">
                  {comandos.map((c) => {
                    const d = describirHerramienta(c)
                    return (
                      <li key={c.clave} className="flex items-center gap-2 text-[12.5px]">
                        <SquareTerminal className="size-3.5 shrink-0 text-texto-3" strokeWidth={1.5} />
                        <code className="min-w-0 flex-1 truncate font-mono text-texto-2">{d.codigo ?? d.objeto ?? d.texto}</code>
                        {c.estado === 'completed' ? <Check className="size-3.5 text-exito" strokeWidth={2} aria-label="Bien" />
                          : c.estado === 'failed' ? <X className="size-3.5 text-peligro" strokeWidth={2} aria-label="Falló" /> : <LoaderCircle className="size-3.5 animate-spin text-texto-3" />}
                      </li>
                    )
                  })}
                </ul>
              </section>
            )}
            {truncado && <p className="rounded-2 border border-atencion/40 bg-atencion-velo px-3 py-2 text-xs text-atencion">El diff es muy grande: se muestra el principio. Abre la copia para verlo entero.</p>}
            <div className="space-y-3">{ficheros.map((f) => <Fichero key={f.ruta} f={f} abierto={ficheros.length <= 6} />)}</div>
          </>
        )}
      </div>
      {(ficheros.length > 0 || t.aplicada) && <Decision t={t} ficheros={ficheros.length} acciones={acciones} />}
    </div>
  )
}

function IconoFichero({ f }: { f: FicheroDiff }) {
  const Icono = f.estado === 'nuevo' ? FilePlus2 : f.estado === 'borrado' ? FileMinus2 : FileText
  return <Icono className={cn('size-3.5 shrink-0', f.estado === 'nuevo' ? 'text-exito' : f.estado === 'borrado' ? 'text-peligro' : 'text-texto-3')} strokeWidth={1.5} />
}

function Fichero({ f, abierto: inicial }: { f: FicheroDiff; abierto: boolean }) {
  const [abierto, setAbierto] = useState(inicial)
  const [todo, setTodo] = useState(false)
  const [color, setColor] = useState<{ viejo: Pieza[][]; nuevo: Pieza[][] } | null>(null)
  const l = useMemo(() => lados(f), [f])
  useEffect(() => {
    if (!abierto || f.binario) return
    let vivo = true
    const lenguaje = lenguajeDe(f.ruta)
    void Promise.all([resaltar(l.viejo, lenguaje), resaltar(l.nuevo, lenguaje)]).then(([viejo, nuevo]) => { if (vivo) setColor({ viejo, nuevo }) })
    return () => { vivo = false }
  }, [abierto, f, l])
  const lineas = todo ? f.lineas : f.lineas.slice(0, MAX_LINEAS)
  const dir = f.ruta.includes('/') ? f.ruta.slice(0, f.ruta.lastIndexOf('/') + 1) : ''
  return (
    <section id={ancla(f.ruta)} className="scroll-mt-3 overflow-hidden rounded-3 border border-linea bg-s1/70">
      <button type="button" onClick={() => setAbierto((v) => !v)} aria-expanded={abierto} className="flex h-10 w-full items-center gap-2.5 px-3 text-left hover:bg-s2/60">
        <IconoFichero f={f} />
        <span className="min-w-0 flex-1 truncate font-mono text-[12.5px]"><span className="text-texto-3">{dir}</span><span className="text-texto">{f.ruta.slice(dir.length)}</span></span>
        {f.binario ? <span className="text-xs text-texto-3">binario</span>
          : <span className="font-mono text-xs tabular-nums"><span className="text-exito">+{f.mas}</span> <span className="text-peligro">−{f.menos}</span></span>}
        <ChevronDown className={cn('size-4 text-texto-3 transition-transform', !abierto && '-rotate-90')} strokeWidth={1.5} />
      </button>
      {abierto && !f.binario && (
        <div className="overflow-x-auto border-t border-linea font-mono text-[12px] leading-[20px]">
          <table className="w-full border-collapse">
            <tbody>
              {lineas.map((x, i) => {
                if (x.tipo === 'trozo') return <tr key={i} className="bg-s2/70 text-texto-3"><td colSpan={3} className="px-3 py-0.5 text-[11px]">{x.texto}</td></tr>
                const sitio = l.indice[i]
                const piezas = sitio && color ? color[sitio.lado][sitio.k] : null
                return (
                  <tr key={i} className={cn(x.tipo === 'mas' && 'bg-exito-velo', x.tipo === 'menos' && 'bg-peligro-velo')}>
                    <td className="w-10 px-2 text-right text-texto-3 select-none">{x.tipo !== 'mas' ? x.a : ''}</td>
                    <td className="w-10 px-2 text-right text-texto-3 select-none">{x.tipo !== 'menos' ? x.b : ''}</td>
                    <td className="pr-4 whitespace-pre" style={{ color: 'var(--shiki-foreground)' }}>
                      <span className={cn('mr-2 inline-block w-2 select-none', x.tipo === 'mas' ? 'text-exito' : x.tipo === 'menos' ? 'text-peligro' : '')}>{x.tipo === 'mas' ? '+' : x.tipo === 'menos' ? '−' : ''}</span>
                      {piezas ? piezas.map((p, k) => <span key={k} style={{ color: p.color, fontStyle: p.cursiva ? 'italic' : undefined }}>{p.contenido}</span>) : x.texto || ' '}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {!todo && f.lineas.length > MAX_LINEAS && (
            <button type="button" onClick={() => setTodo(true)} className="w-full border-t border-linea py-2 font-sans text-xs text-texto-2 hover:bg-s2/60">
              Ver las {f.lineas.length - MAX_LINEAS} líneas que faltan
            </button>
          )}
        </div>
      )}
    </section>
  )
}

/** La decisión, al pie: siempre visible mientras revisas. Aplicar pide un segundo clic que dice exactamente qué va a pasar. */
function Decision({ t, ficheros, acciones }: { t: TareaTaller; ficheros: number; acciones: AccionesRevision }) {
  const [confirmar, setConfirmar] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  useEffect(() => { if (!confirmar) return; const k = setTimeout(() => setConfirmar(false), 5000); return () => clearTimeout(k) }, [confirmar])
  useEffect(() => setConfirmar(false), [t.id])
  const hacer = async (f: () => Promise<boolean>) => { setOcupado(true); try { await f() } finally { setOcupado(false); setConfirmar(false) } }
  const carpeta = t.carpeta?.split(/[\\/]/).filter(Boolean).pop() ?? 'tu carpeta'
  const enMarcha = activa(t)
  const a = t.aplicada
  return (
    <div className="flex min-h-[60px] flex-wrap items-center gap-2 border-t border-linea px-5 py-3">
      {a ? (
        <>
          <span className="inline-flex items-center gap-2 text-[13px] text-texto-2">
            <Sello lado={26} giro={giroSello(t.id)} estampar={Date.now() - a.cuando < 5000} titulo="Tu sello: lo aprobaste tú" />
            {a.modo === 'carpeta' ? <>Aplicada a <span className="text-texto">{carpeta}</span> como cambios sin commitear</>
              : a.modo === 'rama' ? <>Guardada en <span className="font-mono text-texto">{t.copia?.rama}</span>{a.commit && <span className="font-mono text-texto-3"> @{a.commit.slice(0, 7)}</span>}</>
              : <>Guardada en <span className="font-mono text-texto">{a.destino}</span></>}
          </span>
          <span className="ml-auto flex gap-2">
            {a.modo === 'carpeta' && <Boton icono={Undo2} onClick={() => void hacer(acciones.onDeshacer)} deshabilitado={ocupado}>Deshacer</Boton>}
            {a.modo === 'exportada' && <Boton icono={FolderInput} onClick={acciones.onAbrir}>Abrir</Boton>}
          </span>
        </>
      ) : t.copia?.repo ? (
        <>
          <span className="min-w-0 flex-1 truncate text-xs text-texto-3">{enMarcha ? 'Espera a que termine para decidir.' : `Tu carpeta ${carpeta} no ha cambiado todavía.`}</span>
          <Boton icono={GitBranch} onClick={() => void hacer(acciones.onGuardarRama)} deshabilitado={enMarcha || ocupado} titulo={`Hace un commit en ${t.copia.rama}: lo fusionas tú cuando quieras`}>Guardar en su rama</Boton>
          <AnimatePresence mode="popLayout" initial={false}>
            {confirmar ? (
              <motion.button key="si" type="button" layout initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.94 }}
                onClick={() => void hacer(acciones.onAplicar)} disabled={ocupado}
                className="inline-flex h-9 items-center gap-2 rounded-full bg-acento px-4 text-[13px] font-medium text-sobre-acento disabled:opacity-50">
                {ocupado ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" strokeWidth={2} />}
                Sí, aplicar {ficheros} {ficheros === 1 ? 'fichero' : 'ficheros'} a {carpeta}
              </motion.button>
            ) : (
              <motion.button key="aplicar" type="button" layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setConfirmar(true)} disabled={enMarcha || ocupado}
                title="Lleva los cambios a tu carpeta como cambios sin commitear. Si algo choca, no se toca nada. Se puede deshacer."
                className="inline-flex h-9 items-center gap-2 rounded-full bg-acento px-4 text-[13px] font-medium text-sobre-acento transition-opacity disabled:opacity-35">
                <FolderInput className="size-4" strokeWidth={1.75} />Aplicar a mi carpeta
              </motion.button>
            )}
          </AnimatePresence>
        </>
      ) : (
        <>
          <span className="min-w-0 flex-1 truncate text-xs text-texto-3">{enMarcha ? 'Espera a que termine para decidir.' : 'Nació en una carpeta nueva: guárdala donde quieras, con su historia.'}</span>
          <button type="button" onClick={() => void hacer(acciones.onExportar)} disabled={enMarcha || ocupado}
            className="inline-flex h-9 items-center gap-2 rounded-full bg-acento px-4 text-[13px] font-medium text-sobre-acento transition-opacity disabled:opacity-35">
            {ocupado ? <LoaderCircle className="size-4 animate-spin" /> : <FolderInput className="size-4" strokeWidth={1.75} />}Guardar como proyecto…
          </button>
        </>
      )}
    </div>
  )
}

function Boton({ icono: Icono, children, onClick, deshabilitado, titulo }: { icono: typeof Check; children: React.ReactNode; onClick(): void; deshabilitado?: boolean; titulo?: string }) {
  return (
    <button type="button" onClick={onClick} disabled={deshabilitado} title={titulo}
      className="inline-flex h-9 items-center gap-2 rounded-full border border-linea-fuerte/50 px-3.5 text-[13px] text-texto-2 transition-colors hover:bg-s2 hover:text-texto disabled:opacity-40">
      <Icono className="size-4" strokeWidth={1.5} />{children}
    </button>
  )
}
