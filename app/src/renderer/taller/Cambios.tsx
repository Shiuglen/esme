// Los cambios de una tarea frente a su punto de partida: un fichero por tarjeta, con sus líneas numeradas como en el original.
// (La revisión guiada —resumen, guía y diagrama antes/después— llega en el paso 3c; esto es la base legible.)
import { ChevronDown, FileMinus2, FilePlus2, FileText } from 'lucide-react'
import { useEffect, useState } from 'react'
import { bridge, type TareaTaller } from '../lib/bridge'
import { cn } from '../lib/cn'
import { leerDiff, type FicheroDiff } from './diff'

const MAX_LINEAS = 400

export function Cambios({ t }: { t: TareaTaller }) {
  const [ficheros, setFicheros] = useState<FicheroDiff[] | null>(null)
  const [truncado, setTruncado] = useState(false)
  const huella = `${t.id}:${t.turnos}:${t.cambios?.mas}:${t.cambios?.menos}:${t.cambios?.ficheros}`
  useEffect(() => {
    let vivo = true
    void bridge.taller.diff(t.id).then((d) => { if (vivo) { setFicheros(leerDiff(d.texto)); setTruncado(d.truncado) } })
    return () => { vivo = false }
  }, [huella, t.id])

  if (!ficheros) return <p className="p-6 text-sm text-texto-3">Leyendo los cambios…</p>
  if (!ficheros.length) return (
    <div className="grid h-full place-items-center p-8 text-center">
      <div>
        <p className="text-[15px] text-texto">Sin cambios todavía</p>
        <p className="mt-1 max-w-[340px] text-[13px] text-texto-3">Cuando el motor toque ficheros en su copia, aquí verás cada línea antes y después. Tu carpeta original no cambia.</p>
      </div>
    </div>
  )
  return (
    <div className="space-y-3 p-4">
      {truncado && <p className="rounded-2 border border-atencion/40 bg-atencion-velo px-3 py-2 text-xs text-atencion">El diff es muy grande: se muestra el principio. Abre la carpeta de la copia para verlo entero.</p>}
      {ficheros.map((f) => <Fichero key={f.ruta} f={f} abierto={ficheros.length <= 6} />)}
    </div>
  )
}

function Fichero({ f, abierto: inicial }: { f: FicheroDiff; abierto: boolean }) {
  const [abierto, setAbierto] = useState(inicial)
  const [todo, setTodo] = useState(false)
  const Icono = f.estado === 'nuevo' ? FilePlus2 : f.estado === 'borrado' ? FileMinus2 : FileText
  const lineas = todo ? f.lineas : f.lineas.slice(0, MAX_LINEAS)
  const dir = f.ruta.includes('/') ? f.ruta.slice(0, f.ruta.lastIndexOf('/') + 1) : ''
  return (
    <section className="overflow-hidden rounded-3 border border-linea bg-s1/70">
      <button type="button" onClick={() => setAbierto((v) => !v)} aria-expanded={abierto}
        className="flex h-10 w-full items-center gap-2.5 px-3 text-left hover:bg-s2/60">
        <Icono className={cn('size-4 shrink-0', f.estado === 'nuevo' ? 'text-exito' : f.estado === 'borrado' ? 'text-peligro' : 'text-texto-3')} strokeWidth={1.5} />
        <span className="min-w-0 flex-1 truncate font-mono text-[12.5px]"><span className="text-texto-3">{dir}</span><span className="text-texto">{f.ruta.slice(dir.length)}</span></span>
        {f.binario ? <span className="text-xs text-texto-3">binario</span>
          : <span className="font-mono text-xs tabular-nums"><span className="text-exito">+{f.mas}</span> <span className="text-peligro">−{f.menos}</span></span>}
        <ChevronDown className={cn('size-4 text-texto-3 transition-transform', !abierto && '-rotate-90')} strokeWidth={1.5} />
      </button>
      {abierto && !f.binario && (
        <div className="overflow-x-auto border-t border-linea font-mono text-[12px] leading-[20px]">
          <table className="w-full border-collapse">
            <tbody>
              {lineas.map((l, i) => l.tipo === 'trozo' ? (
                <tr key={i} className="bg-s2/70 text-texto-3"><td colSpan={3} className="px-3 py-0.5 text-[11px]">{l.texto}</td></tr>
              ) : (
                <tr key={i} className={cn(l.tipo === 'mas' && 'bg-exito-velo', l.tipo === 'menos' && 'bg-peligro-velo')}>
                  <td className="w-10 px-2 text-right text-texto-3 select-none">{l.tipo !== 'mas' ? l.a : ''}</td>
                  <td className="w-10 px-2 text-right text-texto-3 select-none">{l.tipo !== 'menos' ? l.b : ''}</td>
                  <td className={cn('pr-4 whitespace-pre', l.tipo === 'mas' ? 'text-exito' : l.tipo === 'menos' ? 'text-peligro' : 'text-texto-2')}>
                    <span className="mr-2 inline-block w-2 select-none">{l.tipo === 'mas' ? '+' : l.tipo === 'menos' ? '−' : ''}</span>{l.texto || ' '}
                  </td>
                </tr>
              ))}
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
