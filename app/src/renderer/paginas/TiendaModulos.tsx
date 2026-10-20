// La Tienda › Módulos: programas que se instalan DENTRO de Esme (memoria extra,
// herramientas) y hablan con la mente por una puerta. Lo que se instala viene
// firmado por la Tienda; lo que se activa depende de lo que concedas tú, capa
// por capa. Nada se activa solo: el permiso es tuyo.
import { Package, Play, Power, ShieldCheck, Square } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { bridge, type ModuloPublicado, type VistaModulo } from '../lib/bridge'
import { cn } from '../lib/cn'

const ESTADO = {
  instalado: { texto: 'instalado', clase: 'text-texto-3' },
  activo: { texto: 'activo', clase: 'text-acento' },
  error: { texto: 'no arranca', clase: 'text-peligro' },
} as const

export function TiendaModulos() {
  const [catalogo, setCatalogo] = useState<{ modulos: ModuloPublicado[]; via: string } | null>(null)
  const [listados, setListados] = useState<VistaModulo[]>([])
  const [aviso, setAviso] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState<string | null>(null)

  const cargar = async () => {
    const [c, l] = await Promise.all([bridge.modulos.disponibles(), bridge.modulos.lista()])
    if (c.ok) setCatalogo({ modulos: c.modulos, via: c.via })
    else setAviso(c.error)
    if (l.ok) setListados(l.modulos)
    else setAviso(l.error)
  }
  useEffect(() => { void cargar() }, [])

  const con = async (id: string, que: () => Promise<{ ok: boolean; error?: string }>, sobra?: string) => {
    setOcupado(id)
    const r = await que()
    setOcupado(null)
    if (!r.ok) { toast.error(r.error ?? 'no pude'); return }
    await cargar()
    if (sobra) toast.success(sobra)
  }

  const instalar = (m: ModuloPublicado) =>
    con(m.id, async () => {
      const r = await bridge.modulos.instala(m.id)
      if (!r.ok) return { ok: false, error: r.error }
      toast.success(`Instalado ${m.id}`)
      return { ok: true }
    })

  const conceder = (m: VistaModulo, cap: string) =>
    con(m.id, async () => {
      const r = await bridge.modulos.concede(m.id, [cap])
      if (!r.ok) return { ok: false, error: r.error }
      return { ok: true }
    }, `Concedido ${cap}`)

  const revocar = (m: VistaModulo, cap: string) =>
    con(m.id, async () => {
      const r = await bridge.modulos.revoca(m.id, [cap])
      if (!r.ok) return { ok: false, error: r.error }
      return { ok: true }
    }, `Revocado ${cap}`)

  const activar = (m: VistaModulo) =>
    con(m.id, async () => {
      const r = await bridge.modulos.activa(m.id)
      if (!r.ok) return { ok: false, error: r.error }
      return { ok: true }
    }, `${m.id} está vivo`)

  const desactivar = (m: VistaModulo) =>
    con(m.id, async () => {
      const r = await bridge.modulos.desactiva(m.id)
      if (!r.ok) return { ok: false, error: r.error }
      return { ok: true }
    })

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-baseline gap-3">
        <h2 className="m-0 font-display text-[24px] leading-tight font-light tracking-[-0.03em] text-texto">Módulos</h2>
        <p className="m-0 text-[12.5px] text-texto-3">
          {catalogo ? `${catalogo.modulos.length} publicados · catálogo verificado (${catalogo.via === 'directa' ? 'firma directa' : 'vía la estirpe'})` : 'Cargando el catálogo…'}
        </p>
      </div>
      <p className="m-0 max-w-[70ch] text-[13px] leading-5 text-texto-2">
        Un módulo es un programa que se instala dentro de Esme y que habla con la mente por una puerta: no ve la mente,
        pide lo que necesita y usa sólo lo que le concedas. Lo que se instala viene firmado; lo que se activa depende de ti.
      </p>
      {aviso && <p className="m-0 text-[12.5px] text-atencion">{aviso}</p>}

      {listados.length > 0 && (
        <section className="grid gap-3">
          <h3 className="m-0 text-[11.5px] tracking-[0.18em] text-texto-3 uppercase">En tu Esme</h3>
          <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-px overflow-hidden rounded-3 border border-linea bg-linea p-0">
            {listados.map((m) => {
              const estado = ESTADO[m.estado]
              return (
                <li key={m.id} className="grid content-start gap-3 bg-[var(--hoja)] p-4">
                  <span className="flex items-baseline gap-2">
                    <span className="font-display text-[19px] leading-tight text-texto italic">{m.id}</span>
                    <span className={cn('ml-auto text-[11.5px]', estado.clase)}>{estado.texto}</span>
                  </span>
                  <span className="text-[12px] text-texto-3">v{m.version}</span>
                  {m.error && <span className="text-[12px] text-peligro">{m.error}</span>}
                  {m.declaradas.length > 0 && (
                    <span className="grid gap-1.5">
                      <span className="text-[11.5px] tracking-[0.14em] text-texto-3 uppercase">Lo que pide</span>
                      {m.declaradas.map((cap) => {
                        const concedida = laConcedida(m.concedidas, cap)
                        return (
                          <span key={cap} className="flex items-center gap-2 text-[12.5px]">
                            <ShieldCheck className={cn('size-3.5', concedida ? 'text-acento' : 'text-texto-3')} />
                            <span className="font-mono text-[12px] text-texto-2">{cap}</span>
                            <span className="ml-auto flex gap-1">
                              {concedida ? (
                                <button type="button" onClick={() => void revocar(m, cap)} className="rounded-full border border-linea px-2 py-0.5 text-[11px] text-texto-3 transition-colors hover:text-texto">revocar</button>
                              ) : (
                                <button type="button" onClick={() => void conceder(m, cap)} className="rounded-full border border-linea px-2 py-0.5 text-[11px] text-texto-3 transition-colors hover:text-texto">conceder</button>
                              )}
                            </span>
                          </span>
                        )
                      })}
                    </span>
                  )}
                  {m.usadas.length > 0 && (
                    <span className="text-[11.5px] text-texto-3">ha usado: {m.usadas.join(', ')}</span>
                  )}
                  {m.pendientes.length > 0 && (
                    <span className="text-[11.5px] text-atencion">esperando tu palabra: {m.pendientes.join(', ')}</span>
                  )}
                  <span className="flex gap-2">
                    {m.estado === 'activo' ? (
                      <button type="button" onClick={() => void desactivar(m)} disabled={ocupado === m.id}
                        className="inline-flex items-center gap-1.5 rounded-full border border-linea px-3 py-1 text-[12px] text-texto-2 transition-colors hover:text-texto disabled:opacity-50">
                        <Square className="size-3" />parar
                      </button>
                    ) : (
                      <button type="button" onClick={() => void activar(m)} disabled={ocupado === m.id}
                        className="inline-flex items-center gap-1.5 rounded-full border border-linea px-3 py-1 text-[12px] text-texto-2 transition-colors hover:text-texto disabled:opacity-50">
                        <Play className="size-3" />activar
                      </button>
                    )}
                  </span>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {catalogo && catalogo.modulos.length > 0 && (
        <section className="grid gap-3">
          <h3 className="m-0 text-[11.5px] tracking-[0.18em] text-texto-3 uppercase">Publicados</h3>
          <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-px overflow-hidden rounded-3 border border-linea bg-linea p-0">
            {catalogo.modulos.map((m) => {
              const instalado = listados.some((x) => x.id === m.id)
              return (
                <li key={m.id} className="grid content-start gap-2 bg-[var(--hoja)] p-4">
                  <span className="flex items-baseline gap-2">
                    <Package className="size-3.5 text-texto-3" />
                    <span className="font-display text-[17px] leading-tight text-texto italic">{m.id}</span>
                  </span>
                  <span className="text-[12px] text-texto-3">v{m.version}{m.bytes ? ` · ${(m.bytes / 1024).toFixed(1)} KB` : ''}</span>
                  <span>
                    <button type="button" onClick={() => void instalar(m)} disabled={instalado || ocupado === m.id}
                      className="inline-flex items-center gap-1.5 rounded-full border border-linea px-3 py-1 text-[12px] text-texto-2 transition-colors hover:text-texto disabled:opacity-50">
                      <Power className="size-3" />{instalado ? 'ya está' : 'instalar'}
                    </button>
                  </span>
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )
}

/** ¿Está concedida esa capacidad? */
const laConcedida = (concedidas: string[], cap: string): boolean => concedidas.includes(cap)
