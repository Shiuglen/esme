// La Tienda de Esme (docs/superpowers/specs/2026-10-18-la-tienda.md), paso 1: pieles. Lo de casa (la colección de
// lanzamiento) más el catálogo firmado de la red. Descubrir por palabras, por color o «Sorpréndeme»; probar en vivo sobre
// tu propia Esme antes de quedártela; vestir; guardar en tu colección. Paso 2: herramientas MCP (TiendaHerramientas.tsx).
import { Heart, Shuffle, Sparkles } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { bridge } from '../lib/bridge'
import { cn } from '../lib/cn'
import { ESCENAS } from '../tinta/escenas'
import { LETRAS, validarPiel, type Piel } from '../tinta/piel'
import { PIELES_TIENDA } from '../tinta/pieles-tienda'
import { PIEZAS } from '../tinta/piezas'
import { cargarLetra } from '../tinta/vestir'
import { muestra, type Pieles, type Tema } from './Apariencia'
import { buscarEnTienda, FAMILIAS, familiaDe, sorprendeme, type Familia, type ItemTienda } from './tienda'
import { TiendaHerramientas } from './TiendaHerramientas'
import { TiendaSkills } from './TiendaSkills'
import { PuntoVista } from '../marca/PuntoVista'

const PUNTO: Record<Familia, string> = { rojo: '#ef4444', naranja: '#f97316', amarillo: '#eab308', verde: '#22c55e', cian: '#06b6d4', azul: '#3b82f6', violeta: '#8b5cf6', rosa: '#ec4899', gris: '#9ca3af' }
const leerColeccion = (): string[] => { try { return JSON.parse(localStorage.getItem('esme:coleccion') ?? '[]') } catch { return [] } }

export function Tienda({ tema, pieles }: { tema: Tema; pieles: Pieles }) {
  const [remotos, setRemotos] = useState<ItemTienda[]>([])
  const [origen, setOrigen] = useState<string>('')
  useEffect(() => {
    void bridge.tienda.catalogo().then((r) => {
      setOrigen(r.origen === 'red' ? 'catálogo al día' : r.origen === 'copia' ? 'catálogo guardado (sin conexión)' : 'colección de casa')
      setRemotos(r.productos.flatMap((p) => {
        if (p.tipo !== 'piel') return []
        const v = validarPiel(p.contenido)   // un producto ajeno se valida como cualquier piel
        return v.ok ? [{ id: p.id, tipo: 'piel' as const, piel: v.piel, descripcion: p.descripcion, etiquetas: p.etiquetas, autor: p.autor, origen: 'tienda' as const }] : []
      }))
    })
  }, [])
  const todos = useMemo<ItemTienda[]>(() => [...PIELES_TIENDA.map((p) => ({ ...p, tipo: 'piel' as const, origen: 'casa' as const })), ...remotos], [remotos])
  // cada ficha se enseña con su letra: se cargan las de los diseños de la Tienda (una vez cada una)
  useEffect(() => { for (const i of todos) { void cargarLetra(i.piel.letra.titulos); void cargarLetra(i.piel.letra.texto) } }, [todos])
  const [seccion, setSeccion] = useState<'disenos' | 'herramientas' | 'skills'>('disenos')
  const [texto, setTexto] = useState('')
  const [color, setColor] = useState<Familia | null>(null)
  const [vista, setVista] = useState<'todo' | 'coleccion'>('todo')
  const [coleccion, setColeccion] = useState<string[]>(leerColeccion)
  useEffect(() => { try { localStorage.setItem('esme:coleccion', JSON.stringify(coleccion)) } catch { /* sin almacenamiento */ } }, [coleccion])
  const filtrados = buscarEnTienda(vista === 'coleccion' ? todos.filter((i) => coleccion.includes(i.id)) : todos, { texto, color })

  // probar en vivo: toda Esme se viste con la piel; quedártela o volver a la tuya
  const [probando, setProbando] = useState<{ item: ItemTienda; antes: Piel } | null>(null)
  const probar = (i: ItemTienda) => { setProbando((pr) => ({ item: i, antes: pr?.antes ?? pieles.actual })); pieles.ensayar(i.piel) }
  const quedarse = () => { if (!probando) return; pieles.vestir(probando.item.piel); toast.success(`Llevas «${probando.item.piel.nombre}»`); setProbando(null) }
  const volver = () => { if (!probando) return; pieles.vestir(probando.antes); setProbando(null) }
  useEffect(() => () => { if (probando) pieles.vestir(probando.antes) }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto grid max-w-[1180px] gap-6 px-10 pt-10 pb-28">
        <header className="grid gap-2">
          <h1 className="m-0 text-[40px] leading-none font-light tracking-[-0.04em] text-texto">Tienda</h1>
          <p className="m-0 max-w-[66ch] text-[15px] text-texto-2">Pieles para cambiarme por fuera, manos nuevas para hacer más cosas y skills para que yo y tus agentes trabajemos como expertos. Pruébalo todo antes de quedártelo; nada actúa sin tu permiso.</p>
        </header>
        <div role="tablist" aria-label="Qué buscas" className="flex w-fit gap-1 rounded-full border border-linea p-1 text-[14px]">
          {([['disenos', 'Diseños'], ['herramientas', 'Herramientas'], ['skills', 'Skills']] as const).map(([id, nombre]) => (
            <button key={id} type="button" role="tab" aria-selected={seccion === id} onClick={() => setSeccion(id)}
              className={cn('rounded-full px-4 py-1.5', seccion === id ? 'bg-s3 text-texto' : 'text-texto-2 hover:text-texto')}>{nombre}</button>
          ))}
        </div>

        {seccion === 'skills' ? <TiendaSkills /> : seccion === 'herramientas' ? <TiendaHerramientas /> : <>
        <div className="flex flex-wrap items-center gap-3">
          <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Busca: neón, calma, editorial, verde…" aria-label="Buscar en la Tienda"
            className="h-10 w-[320px] rounded-full border border-linea bg-s1/70 px-4 text-[14px] text-texto outline-none backdrop-blur placeholder:text-texto-3 focus:border-foco" />
          <div role="radiogroup" aria-label="Color" className="flex items-center gap-1.5">
            {FAMILIAS.map((f) => (
              <button key={f} type="button" role="radio" aria-checked={color === f} title={f} onClick={() => setColor((c) => (c === f ? null : f))}
                className={cn('size-6 rounded-full border-2 transition-transform hover:scale-110', color === f ? 'scale-110 border-texto' : 'border-transparent')} style={{ background: PUNTO[f] }} />
            ))}
          </div>
          <button type="button" onClick={() => { const s = sorprendeme(filtrados.length ? filtrados : todos, probando?.item.id ?? null); if (s) probar(s) }}
            className="flex h-10 items-center gap-2 rounded-full bg-acento px-4 text-[14px] font-medium text-sobre-acento shadow-[0_8px_24px_-10px_var(--acento)]"><Shuffle className="size-4" />Sorpréndeme</button>
          <div className="ml-auto flex gap-1 rounded-full border border-linea p-1 text-[13px]">
            {(['todo', 'coleccion'] as const).map((v) => (
              <button key={v} type="button" onClick={() => setVista(v)} className={cn('rounded-full px-3 py-1', vista === v ? 'bg-s3 text-texto' : 'text-texto-2 hover:text-texto')}>{v === 'todo' ? 'Todo' : `Mi colección (${coleccion.length})`}</button>
            ))}
          </div>
        </div>
        {origen && <p className="m-0 -mt-3 text-xs text-texto-3">{filtrados.length} {filtrados.length === 1 ? 'diseño' : 'diseños'} · {origen}</p>}

        <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-5">
          {filtrados.map((i) => (
            <Ficha key={i.id} i={i} tema={tema} probando={probando?.item.id === i.id} puesta={JSON.stringify(pieles.actual) === JSON.stringify(i.piel) && !probando}
              guardada={coleccion.includes(i.id)} onProbar={() => probar(i)} onVestir={() => { pieles.vestir(i.piel); setProbando(null); toast.success(`Llevas «${i.piel.nombre}»`) }}
              onGuardar={() => setColeccion((c) => (c.includes(i.id) ? c.filter((x) => x !== i.id) : [...c, i.id]))} />
          ))}
          {!filtrados.length && <p className="col-span-full m-0 py-10 text-center text-texto-3">{vista === 'coleccion' ? 'Tu colección está vacía: guarda diseños con el corazón.' : 'Nada con esos filtros. Prueba otra palabra u otro color.'}</p>}
        </div>
        </>}
      </div>

      {probando && (
        <div role="status" className="hoja fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-full border border-linea px-5 py-2.5 shadow-2xl backdrop-blur-xl">
          <Sparkles className="size-4 text-acento" />
          <span className="text-[14px] text-texto">Probando «{probando.item.piel.nombre}»</span>
          <button type="button" onClick={quedarse} className="rounded-full bg-acento px-4 py-1.5 text-[13px] font-medium text-sobre-acento">Quedármela</button>
          <button type="button" onClick={volver} className="rounded-full px-3 py-1.5 text-[13px] text-texto-2 hover:text-texto">Volver a la mía</button>
        </div>
      )}
    </div>
  )
}

// La ficha de un diseño: una Esme en miniatura vestida con él (fondo, cápsulas, presencia, texto y botón con sus colores,
// su letra, su forma y su superficie), y lo que trae.
function Ficha({ i, tema, probando, puesta, guardada, onProbar, onVestir, onGuardar }: {
  i: ItemTienda; tema: Tema; probando: boolean; puesta: boolean; guardada: boolean; onProbar(): void; onVestir(): void; onGuardar(): void
}) {
  const p = i.piel, m = muestra(p, tema), t = LETRAS[p.letra.titulos], x = LETRAS[p.letra.texto]
  const r = (b: number) => `${Math.round(b * p.forma.radio)}px`
  const sup = PIEZAS.superficie.variantes.find((v) => v.id === p.piezas.superficie)?.nombre
  const borde = p.piezas.superficie === 'neon' ? `1px solid ${m.acento}` : p.piezas.superficie === 'brutal' ? `2px solid ${m.texto}` : '1px solid rgba(255,255,255,.08)'
  const sombra = p.piezas.superficie === 'brutal' ? `4px 4px 0 ${m.texto}` : p.piezas.superficie === 'neon' ? `0 0 16px -4px ${m.acento}` : '0 10px 24px -14px rgba(0,0,0,.6)'
  return (
    <article className={cn('group grid gap-3 rounded-4 border p-3 transition-all', probando ? 'border-acento ring-2 ring-acento/40' : 'border-linea hover:border-linea-fuerte')}>
      <button type="button" onClick={onProbar} aria-label={`Probar «${p.nombre}» en vivo`} className="relative block h-[168px] overflow-hidden text-left" style={{ background: m.fondo, borderRadius: r(14) }}>
        <span aria-hidden className="absolute inset-0 opacity-60" style={{ background: `radial-gradient(70% 60% at 50% 35%, ${m.acento}55, transparent 70%)` }} />
        <span aria-hidden className="absolute top-2.5 left-2.5 h-4 w-16" style={{ background: m.superficie, border: borde, borderRadius: r(10), boxShadow: sombra }} />
        <span aria-hidden className="absolute top-2.5 right-2.5 h-4 w-10" style={{ background: m.superficie, border: borde, borderRadius: r(10), boxShadow: sombra }} />
        {/* la piel viste a Esme por fuera; por dentro sigue siendo ella: el mismo Punto, con el color de esta piel */}
        {p.presencia !== 'ninguna' && <span aria-hidden className="absolute top-6 left-1/2 -translate-x-1/2" style={{ color: m.acento }}><PuntoVista px={48} /></span>}
        <span className="absolute top-[86px] right-0 left-0 text-center text-[19px] leading-none" style={{ color: m.texto, fontFamily: t.titulos }}>Buenas noches.</span>
        <span aria-hidden className="absolute right-5 bottom-3 left-5 flex h-8 items-center justify-between px-3" style={{ background: m.superficie, border: borde, borderRadius: r(12), boxShadow: sombra }}>
          <span className="h-1.5 w-1/2 rounded-full opacity-50" style={{ background: m.texto }} />
          <span className="size-4 rounded-full" style={{ background: m.acento }} />
        </span>
      </button>
      <div className="grid gap-1 px-0.5">
        <div className="flex items-center gap-2">
          <h3 className="m-0 truncate text-[15px] font-semibold text-texto">{p.nombre}</h3>
          {puesta && <span className="rounded-full bg-acento-velo px-2 text-[11px] text-acento">la llevas</span>}
          <button type="button" onClick={onGuardar} aria-pressed={guardada} aria-label={guardada ? 'Quitar de mi colección' : 'Guardar en mi colección'} className="ml-auto rounded-full p-1 text-texto-3 hover:text-texto">
            <Heart className={cn('size-4', guardada && 'fill-current text-acento')} strokeWidth={1.75} />
          </button>
        </div>
        <p className="m-0 line-clamp-2 text-[13px] leading-snug text-texto-2" style={{ fontFamily: x.texto }}>{i.descripcion}</p>
        <p className="m-0 text-[11.5px] text-texto-3">{sup} · {p.escena === 'ninguna' ? 'sin escena' : ESCENAS[p.escena].nombre} · {t.nombre} · {i.autor}</p>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={onProbar} className="flex-1 rounded-full border border-linea py-1.5 text-[13px] text-texto-2 transition-colors hover:border-linea-fuerte hover:text-texto">Probar en vivo</button>
        <button type="button" onClick={onVestir} className="flex-1 rounded-full bg-acento py-1.5 text-[13px] font-medium text-sobre-acento">Vestir</button>
      </div>
    </article>
  )
}
