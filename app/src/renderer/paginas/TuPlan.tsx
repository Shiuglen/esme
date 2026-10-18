// Ajustes › Tu plan (docs/superpowers/specs/2026-10-17-planes-y-licencias.md): el plan que tienes, para quién es y
// hasta cuándo; pegar un código de invitación o de licencia; y los planes. Los precios los pone el creador: aquí no se
// inventa ninguno. Durante la beta no se bloquea nada.
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { bridge, type EstadoPlan } from '../lib/bridge'
import { cn } from '../lib/cn'
import { ROTULO } from '../memoria/pintar'

const PLANES = [
  { id: 'gratis', nombre: 'Gratis', para: 'Con tus propios motores: locales, por API o con tu suscripción.', precio: 'Sin coste' },
  { id: 'colaborador', nombre: 'Colaborador', para: 'El equipo del creador de Esme. Todo incluido, por invitación.', precio: 'Por invitación' },
  { id: 'pro', nombre: 'Pro', para: 'Para quien vive en Esme.', precio: 'Muy pronto' },
  { id: 'equipo', nombre: 'Equipo', para: 'Para empresas y equipos.', precio: 'Muy pronto' },
] as const
const fecha = (ms: number) => new Date(ms).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })

export function TuPlan() {
  const [estado, setEstado] = useState<EstadoPlan | null>(null)
  const [codigo, setCodigo] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [activando, setActivando] = useState(false)
  useEffect(() => { void bridge.licencia.estado().then(setEstado) }, [])

  const activar = async () => {
    setActivando(true); setError(null)
    const r = await bridge.licencia.activar(codigo)
    setActivando(false); setEstado(r.estado)
    if (!r.ok) { setError(r.motivo ?? 'No se pudo activar.'); return }
    setCodigo(''); toast.success(`Plan ${r.estado.nombre} activado${r.estado.para ? ` para ${r.estado.para}` : ''}`)
  }
  const quitar = async () => { setEstado(await bridge.licencia.quitar()); toast('Has vuelto al plan Gratis') }

  return (
    <div className="grid gap-6">
      <section className="hoja grid gap-1 rounded-4 border border-linea p-6">
        <p className="m-0 text-xs text-texto-3">Tu plan</p>
        <h2 className="m-0 text-[34px] leading-tight italic font-medium text-texto" style={{ fontFamily: ROTULO }}>{estado?.nombre ?? '…'}</h2>
        {estado?.para && <p className="m-0 text-[15px] text-texto-2">A nombre de {estado.para}{estado.hasta ? `, hasta el ${fecha(estado.hasta)}` : ', sin caducidad'}.</p>}
        {estado?.plan === 'gratis' && <p className="m-0 text-[15px] text-texto-2">Durante la beta, Esme está abierta entera: nada se bloquea.</p>}
        {estado?.aviso && <p role="status" className="m-0 mt-1 text-sm text-atencion">El código que tenías ya no vale: {estado.aviso}</p>}
        {estado && estado.plan !== 'gratis' && (
          <button type="button" onClick={quitar} className="mt-2 justify-self-start text-sm text-texto-3 underline decoration-linea-fuerte underline-offset-4 hover:text-texto">Quitar este código</button>
        )}
      </section>

      <section className="grid gap-2">
        <label htmlFor="codigo-esme" className="text-sm font-medium text-texto">¿Tienes una invitación o una licencia?</label>
        <textarea id="codigo-esme" value={codigo} onChange={(e) => { setCodigo(e.target.value); setError(null) }} rows={3} spellCheck={false}
          placeholder="Pega aquí tu código: empieza por ESME-"
          className="resize-none rounded-3 border border-linea bg-s1 px-3 py-2.5 font-mono text-[13px] text-texto outline-none placeholder:text-texto-3 focus:border-acento" />
        {error && <p role="alert" className="m-0 text-sm text-peligro">{error}</p>}
        <button type="button" disabled={!codigo.trim() || activando} onClick={activar}
          className="justify-self-start rounded-3 bg-acento px-4 py-2 text-sm font-medium text-sobre-acento transition-opacity disabled:opacity-40">
          {activando ? 'Comprobando…' : 'Activar'}
        </button>
        <p className="m-0 text-xs text-texto-3">El código se comprueba en tu ordenador, sin enviar nada a ningún sitio.</p>
      </section>

      <section className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3" aria-label="Planes">
        {PLANES.map((p) => (
          <article key={p.id} className={cn('grid content-start gap-1.5 rounded-4 border p-4', estado?.plan === p.id ? 'border-acento bg-acento-velo' : 'border-linea')}>
            <h3 className="m-0 text-[15px] font-semibold text-texto">{p.nombre}{estado?.plan === p.id && <span className="ml-2 text-xs font-normal text-texto-2">· el tuyo</span>}</h3>
            <p className="m-0 text-[13.5px] leading-snug text-texto-2">{p.para}</p>
            <p className="m-0 mt-1 text-sm tabular-nums text-texto">{p.precio}</p>
          </article>
        ))}
      </section>
    </div>
  )
}
