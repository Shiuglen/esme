// Paleta (Ctrl K): nace del buscador de la barra superior y vuelve a él al cerrarse (animación compartida de Motion).
// Busca, navega y actúa; lo que no sea una acción se convierte en una pregunta para Esme. Recuerda tus últimas preguntas.
import { Command } from 'cmdk'
import { Clock, CornerDownLeft, MessageSquare, Search, SunMoon, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { AJUSTES, SECCIONES, type SeccionId } from './secciones'
import { useMuelle } from '../tinta/movimiento'

const fila = 'flex h-[38px] cursor-pointer items-center gap-2.5 rounded-2 px-2.5 text-texto-2 data-[selected=true]:bg-s3/80 data-[selected=true]:text-texto'
const titulo = '[&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-texto-3'
export const MUELLE = { type: 'spring', stiffness: 420, damping: 38, mass: 0.9 } as const

const leer = (): string[] => { try { return JSON.parse(localStorage.getItem('esme:recientes') ?? '[]') as string[] } catch { return [] } }
const guardar = (v: string[]) => { try { localStorage.setItem('esme:recientes', JSON.stringify(v)) } catch { /* sin almacenamiento */ } }

export function Paleta({ abierta, onCerrar, onIr, onPreguntar, onTema }: {
  abierta: boolean; onCerrar(): void; onIr(id: SeccionId): void; onPreguntar(q: string): void; onTema(): void
}) {
  const muelle = useMuelle(MUELLE)
  const [texto, setTexto] = useState('')
  const [recientes, setRecientes] = useState<string[]>(leer)
  const entrada = useRef<HTMLInputElement>(null)
  useEffect(() => { if (abierta) { setTexto(''); setTimeout(() => entrada.current?.focus(), 30) } }, [abierta])

  const hecho = (f: () => void) => () => { f(); setTexto(''); onCerrar() }
  const preguntar = (q: string) => hecho(() => { const n = [q, ...recientes.filter((r) => r !== q)].slice(0, 6); setRecientes(n); guardar(n); onPreguntar(q) })
  const quitar = (q: string) => { const n = recientes.filter((r) => r !== q); setRecientes(n); guardar(n) }

  return (
    <AnimatePresence>
      {abierta && (
        <>
          <motion.div key="velo" className="fixed inset-0 z-40 bg-black/35 backdrop-blur-[3px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }} onClick={onCerrar} aria-hidden />
          <motion.div key="paleta" layoutId="buscador" transition={muelle} role="dialog" aria-modal="true" aria-label="Paleta de comandos"
            className="vidrio fixed top-[14vh] z-50 w-[600px] max-w-[calc(100vw-32px)] overflow-hidden border shadow-flotante"
            style={{ left: 'calc(50% - min(300px, (100vw - 32px) / 2))', borderRadius: 22 }}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.08, duration: 0.18 } }} exit={{ opacity: 0, transition: { duration: 0.06 } }}>
              <Command label="Paleta de comandos" loop onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); onCerrar() } }}>
                <div className="flex items-center gap-2.5 border-b border-linea px-4 py-3.5 text-texto-3">
                  <Search className="size-4" strokeWidth={1.5} aria-hidden />
                  <Command.Input ref={entrada} value={texto} onValueChange={setTexto} placeholder="Busca, pregunta o da una orden…" className="min-w-0 flex-1 bg-transparent text-[15px] text-texto outline-none placeholder:text-texto-3" />
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
                <Command.List className="max-h-[380px] overflow-y-auto p-1.5">
                  <Command.Empty className="px-2.5 py-3 text-texto-3">Pulsa Enter para preguntárselo a Esme.</Command.Empty>
                  {texto.trim() && (
                    <Command.Group heading="Esme" className={titulo}>
                      <Command.Item value={`preguntar ${texto}`} onSelect={preguntar(texto.trim())} className={fila}>
                        <MessageSquare className="size-4" strokeWidth={1.5} />Preguntar «{texto.trim()}»<CornerDownLeft className="ml-auto size-3.5 text-texto-3" />
                      </Command.Item>
                    </Command.Group>
                  )}
                  <Command.Group heading="Ir a" className={titulo}>
                    {[...SECCIONES, AJUSTES].map((s) => (
                      <Command.Item key={s.id} value={`ir ${s.nombre}`} onSelect={hecho(() => onIr(s.id))} className={fila}>
                        <s.Icono className="size-4" strokeWidth={1.5} />{s.nombre}<kbd className="ml-auto rounded-[5px] border border-linea bg-s2 px-1.5 py-0.5 font-sans text-[11px] text-texto-3">{s.atajo}</kbd>
                      </Command.Item>
                    ))}
                  </Command.Group>
                  <Command.Group heading="Apariencia" className={titulo}>
                    <Command.Item value="cambiar tema día noche" onSelect={hecho(onTema)} className={fila}><SunMoon className="size-4" strokeWidth={1.5} />Cambiar entre día y noche</Command.Item>
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
