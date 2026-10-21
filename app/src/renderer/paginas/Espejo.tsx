// El espejo: entender un programa y ver el informe con sus luces y sus sombras.
//
// La puerta que faltaba: el espejo ya se podía usar desde la conversación, desde MCP y desde la
// terminal, pero el informe —lo que REA vio y lo que no— sólo se leía en un fichero. Aquí se ve.
//
// Regla de la casa: sólo software propio, el del usuario con permiso o el forense del equipo.
import { useState } from 'react'
import { ScanSearch, Loader2, GitCompareArrows, ShieldAlert, Sparkles } from 'lucide-react'
import { Markdown } from '../chat/Markdown'
import { bridge } from '../lib/bridge'

type Estado =
  | { fase: 'idle' }
  | { fase: 'mirando'; ruta: string }
  | { fase: 'hecho'; ruta: string; texto: string; cuentas: string[] }
  | { fase: 'comparado'; ruta: string; texto: string; cuentas: string[] }
  | { fase: 'error'; mensaje: string }

/** Las cuentas del informe, en una línea: lo que se ve y lo que no. */
export function cuentasDe(r: { canales?: number; funciones?: number; desconocidos?: number; added?: number }): string[] {
  const out: string[] = []
  if (r.canales !== undefined) out.push(`${r.canales} canales IPC`)
  if (r.funciones !== undefined) out.push(`${r.funciones} funciones`)
  if (r.desconocidos !== undefined) out.push(`${r.desconocidos} cosas que no se pudo ver`)
  if (r.added !== undefined) out.push(`${r.added} recuerdos en la mente`)
  return out
}

export function Espejo() {
  const [ruta, setRuta] = useState('')
  const [motivo, setMotivo] = useState('')
  const [estado, setEstado] = useState<Estado>({ fase: 'idle' })

  const mirar = async () => {
    const limpio = ruta.trim()
    if (!limpio) return
    setEstado({ fase: 'mirando', ruta: limpio })
    const r = await bridge.mente.espejo(limpio, motivo.trim())
    if (!r.ok) { setEstado({ fase: 'error', mensaje: r.error ?? 'el espejo falló' }); return }
    const d = r.dato
    setEstado({ fase: 'hecho', ruta: limpio, texto: d.texto ?? '', cuentas: cuentasDe(d) })
  }

  const comparar = async () => {
    const limpio = ruta.trim()
    if (!limpio) return
    setEstado({ fase: 'mirando', ruta: limpio })
    const r = await bridge.mente.espejoComparar(limpio, '')
    if (!r.ok) { setEstado({ fase: 'error', mensaje: r.error ?? 'la comparación falló' }); return }
    const d = r.dato
    setEstado({ fase: 'comparado', ruta: limpio, texto: d.texto ?? '', cuentas: cuentasDe(d) })
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <h3 className="m-0 flex items-center gap-2 text-sm font-semibold">
          <ScanSearch className="size-4" strokeWidth={1.5} />Entender un programa
        </h3>
        <p className="m-0 text-[13px] text-texto-2">
          Le pasa el programa a REA y lo que vio queda en tu mente: los módulos, las funciones, la
          superficie (los canales IPC y las ventanas) y, lo más importante, <strong>lo que no se
          pudo ver</strong>. Luego puedes preguntarle por él a cualquier IA que trabaje contigo.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[12px] text-texto-2" htmlFor="espejo-ruta">El programa</label>
        <input
          id="espejo-ruta"
          value={ruta}
          onChange={(e) => setRuta(e.target.value)}
          placeholder="/home/tu/usuario/una/app/out  (o el .asar)"
          spellCheck={false}
          className="rounded-b border border-linea bg-s1 px-3 py-2 text-[13px] outline-none focus:border-acento"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[12px] text-texto-2" htmlFor="espejo-motivo">Por qué lo miras (queda junto al conocimiento)</label>
        <input
          id="espejo-motivo"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="p. ej. para recrear su mecanismo de hilos"
          spellCheck={false}
          className="rounded-b border border-linea bg-s1 px-3 py-2 text-[13px] outline-none focus:border-acento"
        />
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={mirar}
          disabled={!ruta.trim() || estado.fase === 'mirando'}
          className="inline-flex items-center gap-2 rounded-full bg-acento px-4 py-1.5 text-[13px] text-sobre-acento disabled:opacity-40"
        >
          {estado.fase === 'mirando' ? <Loader2 className="size-4 animate-spin" strokeWidth={1.5} /> : <ScanSearch className="size-4" strokeWidth={1.5} />}
          Mirar el programa
        </button>
        <button
          type="button"
          onClick={comparar}
          disabled={!ruta.trim() || estado.fase === 'mirando'}
          className="inline-flex items-center gap-2 rounded-full border border-linea px-4 py-1.5 text-[13px] text-texto-2 disabled:opacity-40"
        >
          <GitCompareArrows className="size-4" strokeWidth={1.5} />
          Qué cambió desde la última vez
        </button>
      </div>

      <p className="m-0 flex items-start gap-2 text-[12px] text-texto-2">
        <ShieldAlert className="mt-px size-3.5 shrink-0" strokeWidth={1.5} />
        Sólo software propio, el tuyo con permiso o el forense de tu equipo. Nunca para copiar apps
        de terceros. Mirar un programa tarda (un minuto o más: REA lo lee entero).
      </p>

      {estado.fase === 'error' && (
        <p className="m-0 rounded-b border border-peligro/40 bg-peligro/10 px-3 py-2 text-[13px] text-peligro">
          {estado.mensaje}
        </p>
      )}

      {estado.fase === 'hecho' && (
        <section className="flex flex-col gap-2">
          <p className="m-0 flex flex-wrap items-center gap-2 text-[12px] text-texto-2">
            <Sparkles className="size-3.5" strokeWidth={1.5} />
            {estado.cuentas.join(' · ')}
          </p>
          <div className="max-h-[520px] overflow-y-auto rounded-b border border-linea bg-s1/60 px-4 py-3 text-[13px]">
            <Markdown texto={estado.texto} />
          </div>
        </section>
      )}

      {estado.fase === 'comparado' && (
        <section className="flex flex-col gap-2">
          <p className="m-0 text-[12px] text-texto-2">La comparación de {estado.ruta}</p>
          <div className="max-h-[520px] overflow-y-auto rounded-b border border-linea bg-s1/60 px-4 py-3 text-[13px]">
            <Markdown texto={estado.texto} />
          </div>
        </section>
      )}
    </div>
  )
}
