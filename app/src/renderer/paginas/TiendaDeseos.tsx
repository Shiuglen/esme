// La Tienda, paso 0: lo que guardaste. La demanda de la tienda es tuya: cada cosa que guardaste (en X o donde sea) es
// algo que querías, y Esme lo cumple — buscando la herramienta en el registro oficial, o haciéndote una piel con los
// colores de la web que guardaste.
//
// Las referencias se van viendo solas (poco a poco, sin abusar de sus webs) y la lista se va pintando con sus colores.
import { Palette, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { bridge, type Deseo } from '../lib/bridge'
import { pielDeColores } from '../tinta/deriva'
import type { Piel } from '../tinta/piel'
import type { Pieles } from './Apariencia'

export function TiendaDeseos({ pieles, onBuscar }: { pieles?: Pieles; onBuscar?(q: string): void }) {
  const [deseos, setDeseos] = useState<Deseo[]>([])
  const [paletas, setPaletas] = useState<Record<string, { colores: string[]; titulo: string }>>({})
  const [nota, setNota] = useState<string | null>(null)
  // la piel hecha con una referencia: se prueba en vivo y, si te gusta, te la quedas
  const [vestida, setVestida] = useState<{ deseo: Deseo; piel: Piel; acento: string; fondo: string } | null>(null)
  const [derivando, setDerivando] = useState<string | null>(null)

  useEffect(() => {
    void bridge.tienda.deseos().then((r) => {
      if (!r.ok) { setNota(r.error); return }
      setDeseos(r.deseos)
      // las referencias se van viendo a trozos: sus colores llegan solos y la lista se va pintando
      const refs = r.deseos.filter((d) => d.destino.startsWith('http') && !d.destino.includes('x.com')).map((d) => d.destino)
      if (refs.length) void bridge.tienda.mirar(refs)
    }).catch(() => setNota('No pude leer lo que guardaste.'))
  }, [])

  // una paleta nueva: se pinta sin preguntar
  useEffect(() => bridge.tienda.onPaleta((p) => setPaletas((v) => ({ ...v, [p.url]: { colores: p.colores, titulo: p.titulo } }))), [])

  /** De una web guardada, una piel: se leen sus colores y se hacen los de Esme. */
  const vestirReferencia = async (d: Deseo) => {
    setDerivando(d.destino)
    const r = await bridge.tienda.colores(d.destino)
    if (!r.ok) { setNota(r.error); setDerivando(null); return }
    const p = pielDeColores(r.colores, { nombre: `Veste ${d.dominio}` })
    if (!p.ok) { setNota(p.errores[0] ?? 'con esos colores no hay una piel'); setDerivando(null); return }
    setVestida({ deseo: d, piel: p.piel, acento: p.acento, fondo: p.fondo })
    setDerivando(null)
  }

  if (nota && !deseos.length) {
    return (
      <div className="vidrio grid gap-2 rounded-4 border p-6">
        <p className="m-0 text-[14px] text-texto">{nota}</p>
        <p className="m-0 text-[13px] text-texto-3">Guardaste algo en X y absolvélo de la memoria: lo que guardaste aparece aquí como una lista de deseos.</p>
      </div>
    )
  }
  if (!deseos.length) {
    return (
      <div className="vidrio grid gap-2 rounded-4 border p-6">
        <p className="m-0 text-[14px] text-texto">Aquí estará lo que guardaste.</p>
        <p className="m-0 max-w-[60ch] text-[13px] leading-5 text-texto-2">
          Cada cosa que guardes (un post de X, una web, un repo) es algo que querías. Esme lo cumple: busca la herramienta
          en el registro oficial, o te hace una piel con los colores de la web que guardaste.
        </p>
      </div>
    )
  }

  return (
    <div className="grid gap-5">
      <div className="grid gap-1.5">
        <h2 className="m-0 text-[15px] font-medium text-texto">Lo que guardaste</h2>
        <p className="m-0 max-w-[68ch] text-[13px] leading-5 text-texto-2">
          {deseos.length} {deseos.length === 1 ? 'cosa' : 'cosas'} que querías. Cada una se puede buscar en el registro o
          convertirse en una piel.
        </p>
        {nota && <p className="m-0 text-[12.5px] text-texto-3">{nota}</p>}
      </div>

      <ul className="m-0 grid list-none gap-2 p-0">
        {deseos.map((d) => (
          <li key={d.destino} className="vidrio flex flex-wrap items-center gap-3 rounded-3 border px-4 py-3">
            {paletas[d.destino] && (
              <span aria-hidden className="flex shrink-0 overflow-hidden rounded-3 border border-linea">
                {paletas[d.destino].colores.slice(0, 5).map((c, k) => <span key={k} className="h-8 w-3" style={{ background: c }} />)}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="m-0 truncate text-[14px] text-texto">{paletas[d.destino]?.titulo || d.herramienta || d.dominio}</p>
              <p className="m-0 line-clamp-1 text-[12px] text-texto-3">
                {d.autor ? `${d.autor} · ` : ''}{d.texto}
              </p>
            </div>
            {d.herramienta && (
              <button type="button" onClick={() => onBuscar?.(d.herramienta)}
                className="inline-flex h-8 items-center gap-1.5 rounded-full border border-linea px-3 text-[12.5px] text-texto-2 transition-colors hover:border-linea-fuerte hover:text-texto">
                <Search className="size-3.5" strokeWidth={1.75} />Buscar en el registro
              </button>
            )}
            {d.destino.startsWith('http') && (
              <button type="button" onClick={() => void vestirReferencia(d)} disabled={derivando === d.destino}
                className="inline-flex h-8 items-center gap-1.5 rounded-full border border-linea px-3 text-[12.5px] text-texto-2 transition-colors hover:border-linea-fuerte hover:text-texto disabled:opacity-50">
                <Palette className="size-3.5" strokeWidth={1.75} />{derivando === d.destino ? 'Mirando sus colores…' : 'Veste esto'}
              </button>
            )}
            {d.post && (
              <a href={d.post} target="_blank" rel="noreferrer" className="text-[12.5px] text-texto-3 underline decoration-linea underline-offset-2 hover:text-texto">El post</a>
            )}
          </li>
        ))}
      </ul>

      {vestida && (() => {
        const c = vestida.piel.color
        const tinte = c.tipo === 'libre'
          ? { fondo: c.noche.fondo, superficie: c.noche.superficie, texto: c.noche.texto, acento: c.noche.acento }
          : { fondo: vestida.fondo, superficie: vestida.fondo, texto: vestida.fondo, acento: vestida.acento }
        return (
          <section className="vidrio grid gap-3 rounded-4 border p-5">
            <h3 className="m-0 text-[15px] font-medium text-texto">La piel de {vestida.deseo.dominio}</h3>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex overflow-hidden rounded-3 border border-linea">
                <span className="size-12" style={{ background: tinte.fondo }} title="fondo de noche" />
                <span className="size-12" style={{ background: tinte.superficie }} title="superficie" />
                <span className="size-12" style={{ background: tinte.acento }} title="acento" />
                <span className="size-12" style={{ background: tinte.texto }} title="texto" />
              </div>
              <p className="m-0 max-w-[46ch] text-[13px] leading-5 text-texto-2">
                Esos son los colores que usa <span className="text-texto">{vestida.deseo.dominio}</span>. Con ellos te he hecho
                una piel: pruébala puesta y, si te gusta, quédatela.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {pieles && (
                <>
                  <button type="button" onClick={() => pieles.ensayar(vestida.piel)}
                    className="inline-flex h-9 items-center rounded-full border border-linea px-4 text-[13px] text-texto-2 transition-colors hover:border-linea-fuerte hover:text-texto">Probar en vivo</button>
                  <button type="button" onClick={() => { pieles.vestir(vestida.piel); toast.success(`Ahora vestes «${vestida.piel.nombre}»`) }}
                    className="inline-flex h-9 items-center rounded-full bg-acento px-4 text-[13px] font-medium text-sobre-acento">Quedármela</button>
                  <button type="button" onClick={() => { void bridge.pieles.guardar(vestida.piel, { nombre: vestida.piel.nombre, origen: { tipo: 'referencia', url: vestida.deseo.destino, dominio: vestida.deseo.dominio } }).then((r) => toast(r.ok ? 'Guardada en tus pieles (Apariencia → Tus pieles).' : r.error)) }}
                    className="inline-flex h-9 items-center rounded-full border border-linea px-4 text-[13px] text-texto-2 transition-colors hover:border-linea-fuerte hover:text-texto">Guardarla</button>
                </>
              )}
              <button type="button" onClick={() => setVestida(null)}
                className="inline-flex h-9 items-center rounded-full px-3 text-[13px] text-texto-3 transition-colors hover:text-texto">Cerrar</button>
            </div>
          </section>
        )
      })()}
    </div>
  )
}
