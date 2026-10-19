// Entrar en un agente que pide sesión (Cline, OpenCode, Qwen…): Esme le pregunta cómo se entra (su `authMethods` de ACP),
// tú eliges el método y Esme llama a authenticate; algunos abren tu navegador para que entres con tu cuenta (Cline deja
// entrar con tu suscripción de ChatGPT). El método elegido se recuerda para el Taller y la conversación.
import { Check, LogIn, X } from 'lucide-react'
import { useState } from 'react'
import { bridge, type MetodoEntrada } from '../lib/bridge'
import { cn } from '../lib/cn'
import { nombreDeMetodo } from './entrar-nombres'

type Estado = { fase: 'cerrado' } | { fase: 'mirando' } | { fase: 'eligiendo'; metodos: MetodoEntrada[]; actual: string | null }
  | { fase: 'entrando'; nombre: string } | { fase: 'hecho'; texto: string; ok: boolean }

export function EntrarAgente({ motor, nombre }: { motor: string; nombre: string }) {
  const [e, setE] = useState<Estado>({ fase: 'cerrado' })
  const mirar = async () => {
    setE({ fase: 'mirando' })
    const r = await bridge.taller.metodosEntrada(motor)
    if (!r.ok) return setE({ fase: 'hecho', ok: false, texto: r.error })
    if (!r.metodos.length) return setE({ fase: 'hecho', ok: true, texto: `${nombre} no pide iniciar sesión: usa la que ya tengas en este equipo.` })
    setE({ fase: 'eligiendo', metodos: r.metodos, actual: r.actual })
  }
  const entrar = async (m: MetodoEntrada) => {
    setE({ fase: 'entrando', nombre: nombreDeMetodo(m.nombre) })
    const r = await bridge.taller.entrar(motor, m.id)
    setE({ fase: 'hecho', ok: r.ok, texto: r.ok ? `Listo: entro en ${nombre} con «${nombreDeMetodo(m.nombre)}».` : r.error ?? 'No se pudo entrar.' })
  }
  const boton = 'inline-flex h-7 items-center gap-1.5 rounded-full border border-linea px-2.5 text-xs text-texto-2 transition-colors hover:border-linea-fuerte hover:text-texto'

  if (e.fase === 'cerrado') return <button type="button" onClick={() => void mirar()} className={boton}><LogIn className="size-3.5" />Entrar…</button>
  return (
    <div className="grid w-full gap-2 pt-2" role="group" aria-label={`Entrar en ${nombre}`}>
      {e.fase === 'mirando' && <p className="m-0 text-xs text-texto-3">Preguntando a {nombre} cómo se entra…</p>}
      {e.fase === 'eligiendo' && (
        <>
          <p className="m-0 text-xs text-texto-3">¿Cómo quieres que entre en {nombre}? Algunos abren tu navegador para que inicies sesión con tu cuenta.</p>
          <div className="flex flex-wrap gap-1.5">
            {e.metodos.map((m) => (
              <button key={m.id} type="button" onClick={() => void entrar(m)} title={m.descripcion || m.nombre}
                className={cn(boton, e.actual === m.id && 'border-acento/60 text-texto')}>
                {e.actual === m.id && <Check className="size-3.5 text-acento" />}{nombreDeMetodo(m.nombre)}{m.terminal && <span className="text-texto-3">· en terminal</span>}
              </button>
            ))}
            <button type="button" onClick={() => setE({ fase: 'cerrado' })} aria-label="Cerrar" className="grid size-7 place-items-center rounded-full text-texto-3 hover:text-texto"><X className="size-3.5" /></button>
          </div>
        </>
      )}
      {e.fase === 'entrando' && <p className="m-0 text-xs text-texto-2">Entrando con «{e.nombre}»… si se abre tu navegador, inicia sesión allí.</p>}
      {e.fase === 'hecho' && (
        <p className={cn('m-0 flex items-center gap-2 text-xs', e.ok ? 'text-texto-2' : 'text-atencion')}>
          {e.texto}<button type="button" onClick={() => setE({ fase: 'cerrado' })} className="text-texto-3 underline underline-offset-4 hover:text-texto">Vale</button>
        </p>
      )}
    </div>
  )
}
