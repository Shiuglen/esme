// En el detalle de una tarea de la Forja: qué herramienta se está fabricando, qué conviene saber de su código y el botón
// para instalarla cuando el agente termina. Al instalarla, Esme y tu equipo ya pueden usarla (con permiso por acción).
import { AlertTriangle, Check, Hammer } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { bridge, type EncargoForja, type TareaTaller } from '../lib/bridge'

export function Forja({ t }: { t: TareaTaller }) {
  const [x, setX] = useState<EncargoForja | null>(null)
  const [instalando, setInstalando] = useState(false)
  const [acciones, setAcciones] = useState<{ nombre: string; descripcion: string }[] | null>(null)
  const [probando, setProbando] = useState(false)
  const probar = async () => {
    setProbando(true)
    const r = await bridge.forja.probar(t.id)
    setProbando(false)
    if (r.ok) setAcciones(r.acciones); else toast.error(r.error)
  }
  useEffect(() => { let vivo = true; void bridge.forja.de(t.id).then((r) => { if (vivo) setX(r) }); return () => { vivo = false } }, [t.id, t.estado])
  if (!x) return null
  const instalar = async () => {
    setInstalando(true)
    const r = await bridge.forja.instalar(t.id)
    setInstalando(false)
    if (!r.ok) { toast.error(r.error); return }
    toast.success(`«${r.herramienta}» instalada`, { description: `${r.acciones} ${r.acciones === 1 ? 'acción' : 'acciones'} para Esme y tu equipo.` })
    setX({ ...x, instalada: true })
  }
  return (
    <section aria-label="La Forja" className="mx-5 mt-3 grid gap-2 rounded-3 border border-acento/35 bg-[color-mix(in_oklab,var(--acento)_7%,transparent)] p-3.5">
      <p className="m-0 flex items-center gap-2 text-[13px] font-medium text-texto"><Hammer className="size-4 text-acento" strokeWidth={1.75} />La Forja · herramienta «{x.slug}»</p>
      <p className="m-0 text-[12.5px] leading-5 text-texto-2">{x.necesidad}</p>
      {x.avisos.map((a) => <p key={a} className="m-0 flex items-center gap-1.5 text-[12px] text-atencion"><AlertTriangle className="size-3.5" strokeWidth={2} />{a} Revisa el código antes de instalarla.</p>)}
      {acciones && (
        <ul aria-label="Lo que trae" className="m-0 grid list-none gap-1 rounded-2 bg-s1/70 p-2.5">
          {acciones.length === 0 && <li className="text-[12px] text-peligro">No trae ninguna acción: no la instales.</li>}
          {acciones.map((a) => <li key={a.nombre} className="text-[12px] leading-5 text-texto-2"><code className="text-texto">{a.nombre}</code> · {a.descripcion.split('\n').find((l) => l.trim())?.trim() ?? 'sin descripción'}</li>)}
        </ul>
      )}
      {!x.instalada && t.estado === 'lista' && x.listo && !acciones && (
        <button type="button" disabled={probando} onClick={() => void probar()} className="h-8 w-fit rounded-full border border-linea px-4 text-[12.5px] text-texto-2 hover:text-texto disabled:opacity-40">
          {probando ? 'Arrancándola…' : 'Ver qué hace (sin instalarla)'}
        </button>
      )}
      {x.instalada ? <p className="m-0 flex items-center gap-1.5 text-[12.5px] text-exito"><Check className="size-3.5" strokeWidth={2.25} />Instalada: está en Tienda › Herramientas.</p>
        : <button type="button" disabled={t.estado !== 'lista' || !x.listo || instalando} onClick={() => void instalar()}
            className="h-8 w-fit rounded-full bg-acento px-4 text-[12.5px] font-medium text-sobre-acento disabled:opacity-40">
            {instalando ? 'Instalando y probando…' : t.estado !== 'lista' ? 'Se podrá instalar cuando el agente termine' : !x.listo ? 'El agente no dejó herramienta.py' : 'Instalar como herramienta'}
          </button>}
    </section>
  )
}
