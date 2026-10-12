// Pedir una tarea: qué quieres, con qué motor y modelo, y sobre qué carpeta. Esme monta una copia aislada y el motor trabaja ahí.
// Recuerda tu motor, tu carpeta y tus opciones por motor; si el motor trae un modelo lento o de pago, propone uno gratis.
import { CornerDownLeft, Folder, FolderPlus, X } from 'lucide-react'
import { motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { bridge, type MotorTaller, type OpcionMotor } from '../lib/bridge'
import { cn } from '../lib/cn'
import { configInicial, SelectorOpcion } from './Opciones'

const leer = <T,>(k: string, d: T): T => { try { const v = localStorage.getItem(`esme:taller:${k}`); return v === null ? d : (JSON.parse(v) as T) } catch { return d } }
const guardar = (k: string, v: unknown) => { try { localStorage.setItem(`esme:taller:${k}`, JSON.stringify(v)) } catch { /* sin almacenamiento */ } }
const IDEAS = ['Revisa el proyecto y dime qué mejorarías primero', 'Escribe tests para lo que aún no tenga', 'Arregla los errores de tipos', 'Crea una página de presentación para este proyecto']

export function NuevaTarea({ motores, onCrear, onIrMotores }: {
  motores: MotorTaller[]; onCrear(p: { motor: string; carpeta: string | null; texto: string; config: Record<string, string> }): Promise<boolean>; onIrMotores(): void
}) {
  const instalados = motores.filter((m) => m.instalado)
  const [motor, setMotor] = useState<string | null>(() => leer<string | null>('motor', null))
  const [carpeta, setCarpeta] = useState<string | null>(() => leer<string | null>('carpeta', null))
  const [texto, setTexto] = useState('')
  const [opciones, setOpciones] = useState<OpcionMotor[] | null>(null)
  const [config, setConfig] = useState<Record<string, string>>({})
  const [enviando, setEnviando] = useState(false)
  const actual = instalados.find((m) => m.id === motor) ?? instalados[0]

  useEffect(() => {
    if (!actual) return
    let vivo = true
    setOpciones(null)
    void bridge.taller.opcionesMotor(actual.id).then((o) => {
      if (!vivo) return
      setOpciones(o); setConfig(configInicial(o, leer<Record<string, string>>(`config:${actual.id}`, {}), leer<string[]>('caidos', [])))
    })
    return () => { vivo = false }
  }, [actual?.id])

  const elegirMotor = (id: string) => { setMotor(id); guardar('motor', id) }
  const cambiarOpcion = (id: string, v: string) => {
    const n = { ...config, [id]: v }; setConfig(n)
    if (actual) guardar(`config:${actual.id}`, { ...leer<Record<string, string>>(`config:${actual.id}`, {}), [id]: v })
  }
  const elegirCarpeta = async () => { const c = await bridge.taller.carpeta(); if (c) { setCarpeta(c); guardar('carpeta', c) } }
  const empezar = async () => {
    const q = texto.trim()
    if (!q || !actual || enviando || opciones === null) return
    setEnviando(true)
    // Lo que ves es lo que se usa: se envía siempre el valor mostrado de cada selector (el motor puede cambiarlo al abrir).
    const elegida = Object.fromEntries((opciones ?? []).filter((o) => o.id === 'model' || o.id === 'mode').map((o) => [o.id, config[o.id] ?? o.actual]))
    if (await onCrear({ motor: actual.id, carpeta, texto: q, config: { ...config, ...elegida } })) setTexto('')
    setEnviando(false)
  }
  const nombreCarpeta = carpeta?.split(/[\\/]/).filter(Boolean).pop()

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto px-6 pt-6 pb-5">
      <h2 className="font-display text-[22px] leading-7 tracking-[-0.015em] text-texto">Nueva tarea</h2>
      <p className="mt-1.5 max-w-[470px] text-[13.5px] leading-5 text-texto-3">
        Esme monta una copia aislada de tu proyecto y un motor trabaja en ella. Tú revisas los cambios y decides qué se queda.
      </p>

      {instalados.length === 0 ? (
        <div className="mt-6 rounded-3 border border-linea bg-s1/60 p-4 text-[13.5px] text-texto-2">
          No hay ningún motor instalado en este equipo.
          <button type="button" onClick={onIrMotores} className="ml-1 text-texto underline decoration-texto-3 underline-offset-2 hover:decoration-texto">Ver motores</button>
        </div>
      ) : (
        <div className="vidrio aurora-foco mt-5 rounded-4 border">
          <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={4} autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); void empezar() } }}
            placeholder="Describe qué quieres. Por ejemplo: añade un modo oscuro a la página de ajustes, con sus tests."
            className="block w-full resize-none bg-transparent px-4 pt-3.5 pb-2 text-[14.5px] leading-[22px] text-texto outline-none placeholder:text-texto-3" />
          <div className="flex flex-wrap items-center gap-2 border-t border-linea px-3 py-2.5">
            <div role="radiogroup" aria-label="Motor" className="relative flex rounded-full border border-linea bg-s1/70 p-0.5">
              {instalados.map((m) => {
                const on = m.id === actual?.id
                return (
                  <button key={m.id} type="button" role="radio" aria-checked={on} onClick={() => elegirMotor(m.id)}
                    className={cn('relative h-7 rounded-full px-3 text-[12.5px] transition-colors', on ? 'text-sobre-acento' : 'text-texto-2 hover:text-texto')}>
                    {on && <motion.span layoutId="motor-elegido" className="absolute inset-0 rounded-full bg-acento" transition={{ type: 'spring', stiffness: 480, damping: 36 }} />}
                    <span className="relative">{m.nombre}</span>
                  </button>
                )
              })}
            </div>
            {opciones === null ? <span className="h-8 w-40 animate-pulse rounded-2 bg-s2/70" aria-label="Leyendo los modelos del motor" />
              : opciones.filter((o) => o.id === 'model' || o.id === 'mode').map((o) => (
                <SelectorOpcion key={o.id} o={o} valor={config[o.id]} onCambiar={(v) => cambiarOpcion(o.id, v)} className={o.id === 'model' ? 'max-w-[220px]' : 'max-w-[150px]'} />
              ))}
            <span className="inline-flex h-8 items-center rounded-2 border border-linea bg-s1/70 text-[12.5px]">
              <button type="button" onClick={() => void elegirCarpeta()} title={carpeta ?? 'Empieza en una carpeta nueva, vacía'}
                className="inline-flex h-full items-center gap-1.5 rounded-l-2 pr-2 pl-2.5 text-texto-2 hover:text-texto">
                {carpeta ? <Folder className="size-3.5" strokeWidth={1.5} /> : <FolderPlus className="size-3.5" strokeWidth={1.5} />}
                <span className="max-w-[160px] truncate">{nombreCarpeta ?? 'Carpeta nueva'}</span>
              </button>
              {carpeta && (
                <button type="button" onClick={() => { setCarpeta(null); guardar('carpeta', null) }} aria-label="Empezar en una carpeta nueva"
                  className="grid h-full w-7 place-items-center rounded-r-2 border-l border-linea text-texto-3 hover:text-texto"><X className="size-3" /></button>
              )}
            </span>
            <button type="button" onClick={() => void empezar()} disabled={!texto.trim() || enviando || opciones === null}
              className="ml-auto inline-flex h-8 items-center gap-2 rounded-full bg-acento px-4 text-[13px] font-medium text-sobre-acento transition-opacity disabled:opacity-35">
              {enviando ? 'Montando…' : opciones === null ? 'Leyendo el motor…' : 'Empezar'}
              <kbd className="inline-flex items-center gap-0.5 font-sans text-[11px] opacity-70">Ctrl<CornerDownLeft className="size-3" /></kbd>
            </button>
          </div>
        </div>
      )}

      {instalados.length > 0 && !texto && (
        <div className="mt-4 flex flex-wrap gap-2">
          {IDEAS.map((i) => (
            <button key={i} type="button" onClick={() => setTexto(i)}
              className="h-8 rounded-full border border-linea bg-s1/50 px-3 text-[12.5px] text-texto-2 transition-colors hover:border-linea-fuerte hover:text-texto">{i}</button>
          ))}
        </div>
      )}
      {motores.some((m) => !m.instalado) && (
        <p className="mt-auto pt-6 text-xs text-texto-3">
          {motores.filter((m) => !m.instalado).length} motores más disponibles.{' '}
          <button type="button" onClick={onIrMotores} className="underline decoration-texto-3/60 underline-offset-2 hover:text-texto-2">Instalar o conectar</button>
        </p>
      )}
    </div>
  )
}
