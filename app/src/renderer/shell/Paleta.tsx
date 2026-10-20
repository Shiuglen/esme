// Paleta (Ctrl K): nace del buscador de la barra superior y vuelve a él al cerrarse (animación compartida de Motion).
// Un centro de mando de verdad: pregunta a Esme o encarga al equipo lo que escribas, encuentra en tu mente por
// significado, encuentra tus tareas, viste cualquier piel y te lleva a cualquier sitio. Recuerda tus últimas preguntas.
import { Command } from 'cmdk'
import { Brain, Clock, CornerDownLeft, Hammer, MessageSquare, Palette, Search, SquareTerminal, SunMoon, Undo2, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import type { BrainClient, Memory } from '../lib/brain'
import { haceCuanto } from '../paginas/diario'
import { sinMarkdown } from '../lib/texto-plano'
import { PIEL_BASE, type Piel } from '../tinta/piel'
import { PIELES_TIENDA } from '../tinta/pieles-tienda'
import { useMuelle } from '../tinta/movimiento'
import { AJUSTES, SECCIONES, type SeccionId } from './secciones'
import { coincide, tareasQueCoinciden } from './paleta-buscar'

const fila = 'flex min-h-[38px] cursor-pointer items-center gap-2.5 rounded-2 px-2.5 py-1.5 text-texto-2 data-[selected=true]:bg-s3/80 data-[selected=true]:text-texto'
const titulo = '[&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-texto-3'
const icono = 'size-4 shrink-0'
export const MUELLE = { type: 'spring', stiffness: 420, damping: 38, mass: 0.9 } as const

const leer = (): string[] => { try { return JSON.parse(localStorage.getItem('esme:recientes') ?? '[]') as string[] } catch { return [] } }
const guardar = (v: string[]) => { try { localStorage.setItem('esme:recientes', JSON.stringify(v)) } catch { /* sin almacenamiento */ } }

type TareaPaleta = { id: string; titulo: string; texto: string; inicio: number; estado: string; motorNombre: string }

export function Paleta({ abierta, onCerrar, onIr, onPreguntar, onTema, brain = null, tareas = [], onTarea, onRecuerdo, onVestir, onEncargar }: {
  abierta: boolean; onCerrar(): void; onIr(id: SeccionId): void; onPreguntar(q: string): void; onTema(): void
  brain?: BrainClient | null; tareas?: TareaPaleta[]; onTarea?(id: string): void; onRecuerdo?(id: string): void; onVestir?(p: Piel): void; onEncargar?(t: string): void
}) {
  const muelle = useMuelle(MUELLE)
  const [texto, setTexto] = useState('')
  const [recientes, setRecientes] = useState<string[]>(leer)
  const [recuerdos, setRecuerdos] = useState<Memory[]>([])
  const entrada = useRef<HTMLInputElement>(null)
  useEffect(() => { if (abierta) { setTexto(''); setTimeout(() => entrada.current?.focus(), 30) } }, [abierta])
  // tu mente, por significado (no por palabras): con calma, para no buscar en cada tecla
  useEffect(() => {
    const q = texto.trim()
    if (!abierta || !brain || q.length < 3) { setRecuerdos([]); return }
    const t = setTimeout(() => void brain.search(q, 4).then(setRecuerdos).catch(() => setRecuerdos([])), 220)
    return () => clearTimeout(t)
  }, [texto, abierta, brain])

  const hecho = (f: () => void) => () => { f(); setTexto(''); onCerrar() }
  const preguntar = (q: string) => hecho(() => { const n = [q, ...recientes.filter((r) => r !== q)].slice(0, 6); setRecientes(n); guardar(n); onPreguntar(q) })
  const quitar = (q: string) => { const n = recientes.filter((r) => r !== q); setRecientes(n); guardar(n) }
  const q = texto.trim()
  const susTareas = q ? tareasQueCoinciden(q, tareas, 4) : []
  const pieles = q ? PIELES_TIENDA.filter((p) => coincide(q, `${p.piel.nombre} ${p.descripcion} ${p.etiquetas.join(' ')} piel diseño`)).slice(0, 4) : []

  return (
    <AnimatePresence>
      {abierta && (
        <>
          <motion.div key="velo" className="fixed inset-0 z-40 bg-velo" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }} onClick={onCerrar} aria-hidden />
          <motion.div key="paleta" layoutId="buscador" transition={muelle} role="dialog" aria-modal="true" aria-label="Paleta de comandos"
            className="vidrio fixed top-[14vh] z-50 w-[640px] max-w-[calc(100vw-32px)] overflow-hidden border shadow-flotante"
            style={{ left: 'calc(50% - min(320px, (100vw - 32px) / 2))', borderRadius: 18 }}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.08, duration: 0.18 } }} exit={{ opacity: 0, transition: { duration: 0.06 } }}>
              <Command label="Paleta de comandos" loop onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); onCerrar() } }}>
                <div className="flex items-center gap-2.5 border-b border-linea px-4 py-3.5 text-texto-3">
                  <Search className="size-4" strokeWidth={1.5} aria-hidden />
                  <Command.Input ref={entrada} value={texto} onValueChange={setTexto} placeholder="Busca en tu mente, pregunta, encarga o ve a cualquier sitio…" className="min-w-0 flex-1 bg-transparent text-[15px] text-texto outline-none placeholder:text-texto-3" />
                  <kbd className="rounded-[5px] border border-linea bg-s2 px-1.5 py-0.5 font-sans text-[11px]">Esc</kbd>
                </div>
                {!texto && recientes.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 border-b border-linea px-4 py-2.5">
                    <Clock className="size-3.5 text-texto-3" strokeWidth={1.5} aria-hidden />
                    {recientes.map((r) => (
                      <span key={r} className="inline-flex h-7 max-w-[220px] items-center gap-1 rounded-full border border-linea bg-s2/70 pr-1 pl-2.5 text-xs text-texto-2">
                        <button type="button" onClick={() => setTexto(r)} className="truncate hover:text-texto">{r}</button>
                        <button type="button" onClick={() => quitar(r)} aria-label={`Olvidar «${r}»`} className="grid size-5 place-items-center rounded-full text-texto-3 hover:bg-s3 hover:text-texto"><X className="size-3" /></button>
                      </span>))}
                  </div>
                )}
                <Command.List className="max-h-[420px] overflow-y-auto p-1.5">
                  {/* con texto siempre hay «Preguntar» (forceMount): el aviso de vacío solo tendría sentido sin él */}
                  {q && (
                    <Command.Group heading="Esme" className={titulo} forceMount>
                      <Command.Item forceMount value={`preguntar ${q}`} onSelect={preguntar(q)} className={fila}>
                        <MessageSquare className={icono} strokeWidth={1.5} /><span className="truncate">Preguntar «{q}»</span><CornerDownLeft className="ml-auto size-3.5 shrink-0 text-texto-3" />
                      </Command.Item>
                      {onEncargar && (
                        <Command.Item forceMount value={`encargar ${q}`} onSelect={hecho(() => onEncargar(q))} className={fila}>
                          <Hammer className={icono} strokeWidth={1.5} /><span className="truncate">Encargar al equipo «{q}»</span><span className="ml-auto shrink-0 text-xs text-texto-3">trabaja en una copia aislada</span>
                        </Command.Item>
                      )}
                    </Command.Group>
                  )}
                  {recuerdos.length > 0 && (
                    <Command.Group heading="En tu mente" className={titulo} forceMount>
                      {recuerdos.map((m) => (
                        <Command.Item forceMount key={m.id} value={`recuerdo ${m.id}`} onSelect={hecho(() => onRecuerdo?.(m.id))} className={fila}>
                          <Brain className={icono} strokeWidth={1.5} />
                          <span className="min-w-0 flex-1 truncate">{sinMarkdown(m.text)}</span>
                          <span className="shrink-0 text-xs text-texto-3">{haceCuanto(Date.parse(m.ts), Date.now())}</span>
                        </Command.Item>
                      ))}
                    </Command.Group>
                  )}
                  {susTareas.length > 0 && (
                    <Command.Group heading="Taller" className={titulo} forceMount>
                      {susTareas.map((t) => (
                        <Command.Item forceMount key={t.id} value={`tarea ${t.id}`} onSelect={hecho(() => onTarea?.(t.id))} className={fila}>
                          <SquareTerminal className={icono} strokeWidth={1.5} />
                          <span className="min-w-0 flex-1 truncate">{t.titulo}</span>
                          <span className="shrink-0 text-xs text-texto-3">{t.motorNombre} · {t.estado}</span>
                        </Command.Item>
                      ))}
                    </Command.Group>
                  )}
                  {pieles.length > 0 && onVestir && (
                    <Command.Group heading="Pieles" className={titulo} forceMount>
                      {pieles.map((p) => (
                        <Command.Item forceMount key={p.id} value={`piel ${p.id}`} onSelect={hecho(() => onVestir(p.piel))} className={fila}>
                          <Palette className={icono} strokeWidth={1.5} /><span className="truncate">Vestir «{p.piel.nombre}»</span>
                          <span className="ml-auto truncate text-xs text-texto-3">{p.descripcion}</span>
                        </Command.Item>
                      ))}
                    </Command.Group>
                  )}
                  <Command.Group heading="Ir a" className={titulo}>
                    {[...SECCIONES, AJUSTES].map((s) => (
                      <Command.Item key={s.id} value={`ir ${s.nombre}`} onSelect={hecho(() => onIr(s.id))} className={fila}>
                        <s.Icono className={icono} strokeWidth={1.5} />{s.nombre}<kbd className="ml-auto rounded-[5px] border border-linea bg-s2 px-1.5 py-0.5 font-sans text-[11px] text-texto-3">{s.atajo}</kbd>
                      </Command.Item>
                    ))}
                  </Command.Group>
                  <Command.Group heading="Apariencia" className={titulo}>
                    <Command.Item value="cambiar tema día noche" onSelect={hecho(onTema)} className={fila}><SunMoon className={icono} strokeWidth={1.5} />Cambiar entre día y noche</Command.Item>
                    {onVestir && <Command.Item value="volver piel de casa tinta y luz" onSelect={hecho(() => onVestir(PIEL_BASE))} className={fila}><Undo2 className={icono} strokeWidth={1.5} />Volver a la piel de casa</Command.Item>}
                  </Command.Group>
                </Command.List>
              </Command>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
