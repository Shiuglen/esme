// La mente en tinta («Tinta y Luz», paso 4b; spec: docs/superpowers/specs/2026-10-12-tinta-y-luz.md).
// Cada recuerdo es un punto de tinta: su color es su edad (tinta fresca → vieja) y su tamaño, su confianza.
// Lo que nadie ha verificado sigue en grafito, un anillo de lápiz. Cada tema es una aguada con su nombre rotulado
// como en un atlas grabado. Al recordar, la luz recorre los trazos. Y el tiempo se puede deslizar: la mente tal
// como era cualquier día, con la tinta fresca de entonces. La primera vez en cada sesión, la mente se dibuja sola.
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import ForceGraph2D, { type ForceGraphMethods, type LinkObject, type NodeObject } from 'react-force-graph-2d'
import type { Atlas } from '../lib/brain'
import { luzViva } from '../tinta/luz'
import { forma, trazarMancha } from '../tinta/mancha'
import { esGrafito, nivelTinta, radioTrazo } from '../tinta/trazo'
import { aguadasDe } from './aguadas'
import { leerTinta, pintarAguadas as pintarAguadasEn, pintarPuntos, radioEn, rotular as rotularTemas, ROTULO, tintaDe } from './pintar'
import { construirRed, type EnlaceRed, type NodoRed } from './red'
import { Tiempo } from './Tiempo'
import { etiquetaFecha, histograma, rangoDe, visiblesEn } from './tiempo'

export type RedHandle = { encender(ids: string[]): void; enfocar(id: string): void }
export type Recordado = { id: number; consulta: string; cuantos: number }
type N = NodeObject<NodoRed>
type L = LinkObject<NodoRed, EnlaceRed>

const DIA = 864e5, TAU = Math.PI * 2
const largo = (l: L) => { const a = l.source as N, b = l.target as N, d = Math.hypot((a.x ?? 0) - (b.x ?? 0), (a.y ?? 0) - (b.y ?? 0)); return d < 14 ? 0 : d < 40 ? 1 : 2 }
const ENCENDIDO_MS = 3500, SECADO_MS = 600, CRECER_MS = 9000, INTRO_MS = 4500
const CLASES: Record<string, string> = { user_msg: 'Mensaje tuyo', ai_msg: 'Respuesta de una IA', doc: 'Documento', note: 'Nota' }
const quieto = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
let introVista = false // la mente se dibuja sola solo la primera vez que se abre en cada sesión

// La luz de un recuerdo encendido es bioluminiscente (tinta/luz.ts): cada nodo tiene su fase
const matiz = (id: string) => { let h = 0; for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360; return h }
const aurora = (id = '') => luzViva(performance.now() / 1000, matiz(id) / 360)
const idDe = (e: L['source']) => (typeof e === 'object' ? String((e as N).id) : String(e))
const escapar = (t: string) => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)
const deCuando = (ms: number) => { const e = etiquetaFecha(ms); return e === 'Hoy' || e === 'Ayer' ? `de ${e.toLowerCase()}` : `del ${e}` }

export const RedNeuronal = forwardRef<RedHandle, { atlas: Atlas | null; tema: string; recordados: Recordado[]; onPick(id: string): void }>(
  function RedNeuronal({ atlas, tema, recordados, onPick }, ref) {
    const caja = useRef<HTMLDivElement>(null)
    const fg = useRef<ForceGraphMethods<N, L> | undefined>(undefined)
    const [tam, setTam] = useState({ w: 800, h: 600 })
    const [tinta, setTinta] = useState(leerTinta)
    const encendidos = useRef(new Map<string, number>())
    const gotas = useRef(new Map<string, number>()) // cuándo apareció cada recuerdo: su tinta aún se está secando
    const enfocado = useRef<string | null>(null)
    const tocado = useRef(false) // el usuario ya movió la vista: no se la quitamos al reencuadrar
    const centros = useRef<{ tema: number; x: number; y: number; n: number }[]>([])
    const capa = useRef<HTMLCanvasElement | null>(null) // las aguadas se pintan opacas aquí y se posan de una vez: sin niebla al solaparse

    // Redibujar cada fotograma solo mientras algo vive (luz, tinta secándose o la mente creciendo); si no, el lienzo descansa
    const [despierta, setDespierta] = useState(false)
    const dormir = useRef(0)
    const despertar = (ms: number) => { setDespierta(true); clearTimeout(dormir.current); dormir.current = window.setTimeout(() => setDespierta(false), ms) }

    const red = useMemo(() => (atlas ? construirRed(atlas) : { nodes: [], links: [] }), [atlas])
    const porId = useMemo(() => new Map(red.nodes.map((n) => [n.id, n as N])), [red])
    const rotulos = useMemo(() => new Map(red.nodes.filter((n) => n.tipo === 'tema').map((n) => [n.tema, n.terminos ?? [n.etiqueta ?? '']])), [red])
    const miembros = useMemo(() => {
      const m = new Map<number, N[]>()
      for (const n of red.nodes) if (n.tipo === 'recuerdo') { const l = m.get(n.tema) ?? []; l.push(n as N); m.set(n.tema, l) }
      return m
    }, [red])

    // El tiempo: `corte` es el día que se está mirando (null = hoy). La edad de la tinta se mide desde ese día.
    const ahora = useMemo(() => Date.now(), [red])
    const rango = useMemo(() => { const r = rangoDe(red.nodes); return r ? { desde: r.desde, hasta: Math.max(r.hasta, ahora) } : null }, [red, ahora])
    const [corte, setCorte] = useState<number | null>(null)
    // Crecer: el corte avanza del día `desde` a hoy en `ms`. Es estado y no un bucle suelto para que, si React desmonta y
    // vuelve a montar (modo estricto), el efecto se limpie y arranque solo, en vez de quedarse congelado en el primer día.
    const [crecimiento, setCrecimiento] = useState<{ desde: number; ms: number } | null>(null)
    const creciendo = crecimiento !== null
    const vis = useMemo(() => (corte === null ? null : visiblesEn(red.nodes, corte)), [red, corte])
    const hist = useMemo(() => (rango ? histograma(red.nodes, rango.desde, rango.hasta, Math.min(90, Math.max(12, Math.ceil((rango.hasta - rango.desde) / DIA)))) : []), [red, rango])
    const refT = corte ?? ahora
    const tintaEn = (fecha: number | undefined) => tintaDe(tinta, refT, fecha)

    const parar = () => setCrecimiento(null)
    const crecer = (desde: number, ms: number) => { setCorte(desde); setCrecimiento({ desde, ms }) }
    useEffect(() => {
      if (!crecimiento || !rango) return
      const t0 = performance.now(), { desde, ms } = crecimiento, hasta = rango.hasta
      let id = 0
      const paso = (t: number) => {
        const k = (t - t0) / ms
        if (k >= 1) { setCorte(null); setCrecimiento(null); return }
        setCorte(desde + (hasta - desde) * k)
        id = requestAnimationFrame(paso)
      }
      id = requestAnimationFrame(paso)
      return () => cancelAnimationFrame(id)
    }, [crecimiento, rango])
    useEffect(() => () => clearTimeout(dormir.current), [])

    // Lo que aparece (al crecer o al llegar recuerdos nuevos) cae como una gota que se abre en el papel y se seca
    const previos = useRef<Set<string> | null>(null)
    useEffect(() => {
      const ids = vis?.ids ?? new Set(porId.keys()), antes = previos.current, t = performance.now()
      let nuevas = 0
      if (antes && !quieto()) for (const id of ids) if (!antes.has(id)) { gotas.current.set(id, t); nuevas++ }
      previos.current = ids
      if (nuevas) despertar(SECADO_MS + 150)
    }, [vis, porId])

    useEffect(() => { const id = requestAnimationFrame(() => { setTinta(leerTinta()); despertar(120) }); return () => cancelAnimationFrame(id) }, [tema])
    useEffect(() => { document.fonts?.load(`italic 500 14px ${ROTULO}`).then(() => despertar(120)).catch(() => {}) }, [])
    useEffect(() => {
      const el = caja.current; if (!el) return
      const ro = new ResizeObserver(() => setTam({ w: el.clientWidth, h: el.clientHeight })); ro.observe(el)
      return () => ro.disconnect()
    }, [])
    useEffect(() => {
      const g = fg.current; if (!g || !red.nodes.length) return
      g.d3Force('charge')?.strength(-7)
      g.d3Force('link')?.distance((l: L) => (l.tipo === 'puente' ? 70 : l.tipo === 'tema' ? 22 : 9)).strength((l: L) => (l.tipo === 'vecino' ? 0.5 : 0.08))
      const t = setTimeout(() => { if (!tocado.current) g.zoomToFit(0, 56) }, 40)
      if (!introVista && rango && !quieto()) { introVista = true; crecer(rango.desde, INTRO_MS) }
      return () => clearTimeout(t)
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [red])

    useImperativeHandle(ref, () => ({
      encender(ids) {
        const g = fg.current, t = performance.now()
        for (const id of ids) encendidos.current.set(id, t)
        despertar(ENCENDIDO_MS + 150)
        if (!g) return
        const pedidos = new Set(ids)
        for (const l of red.links) if (l.tipo !== 'tema' && (pedidos.has(idDe(l.source)) || pedidos.has(idDe(l.target)))) g.emitParticle(l as L)
      },
      enfocar(id) {
        const n = porId.get(id); enfocado.current = id; despertar(700)
        if (n && n.x !== undefined) { tocado.current = true; fg.current?.centerAt(n.x, n.y, 600); fg.current?.zoom(4, 600) }
      },
    }), [red, porId])

    const vivo = (id: string) => {
      const t = encendidos.current.get(id); if (t === undefined) return 0
      const k = (performance.now() - t) / ENCENDIDO_MS
      if (k >= 1) { encendidos.current.delete(id); return 0 }
      return 1 - k
    }
    const secado = (id: string) => {
      const t = gotas.current.get(id); if (t === undefined) return 1
      const k = (performance.now() - t) / SECADO_MS
      if (k >= 1) { gotas.current.delete(id); return 1 }
      return k
    }
    const visible = (id: string) => !vis || vis.ids.has(id)
    const grafitoEnlace = (l: L) => esGrafito(porId.get(idDe(l.source))?.confianza) || esGrafito(porId.get(idDe(l.target))?.confianza)

    // Las aguadas van bajo todo (memoria/pintar.ts); su centro y su extensión salen de dónde están sus recuerdos ahora mismo.
    const pintarAguadas = (ctx: CanvasRenderingContext2D, escala: number) => {
      const pts: { tema: number; x: number; y: number; fecha?: number }[] = []
      for (const [t, ms] of miembros) for (const m of ms) if (visible(m.id)) pts.push({ tema: t, x: m.x ?? 0, y: m.y ?? 0, fecha: m.fecha })
      const aguadas = aguadasDe(pts, refT)
      pintarAguadasEn(ctx, (capa.current ??= document.createElement('canvas')), aguadas, tinta, escala)
      centros.current = aguadas
    }
    const rotular = (ctx: CanvasRenderingContext2D, escala: number) => rotularTemas(ctx, centros.current, rotulos, tinta, escala)

    // Todos los recuerdos por lotes de tono (memoria/pintar.ts); solo van uno a uno los vivos: encendidos, húmedos o enfocados.
    const pintarRecuerdos = (ctx: CanvasRenderingContext2D, escala: number) => {
      const normales: N[] = [], sueltos: N[] = []
      for (const n of red.nodes as N[]) {
        if (n.tipo === 'tema' || !visible(n.id)) continue
        if ((encendidos.current.has(n.id) && vivo(n.id) > 0) || gotas.current.has(n.id) || enfocado.current === n.id) sueltos.push(n)
        else normales.push(n)
      }
      pintarPuntos(ctx, normales, refT, tinta, escala)
      for (const n of sueltos) pintarRecuerdo(n, ctx, escala)
    }

    const pintarRecuerdo = (n: N, ctx: CanvasRenderingContext2D, escala: number) => {
      const x = n.x ?? 0, y = n.y ?? 0, v = vivo(n.id), g = secado(n.id), grafito = esGrafito(n.confianza), color = tintaEn(n.fecha)
      // al caer, la gota se abre un poco más de la cuenta y se recoge; la tinta húmeda se corre por las fibras
      const r = radioEn(n.confianza, escala) * (g < 1 ? 0.35 + 0.65 * (1 - (1 - g) ** 3) + 0.3 * Math.sin(Math.PI * g) : 1)
      if (g < 1 && !grafito) { ctx.globalAlpha = 0.26 * (1 - g); ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, r * (1.6 + g), 0, TAU); ctx.fill(); ctx.globalAlpha = 1 }
      if (v > 0) {
        const luz = aurora(n.id)
        ctx.globalAlpha = v * 0.5; ctx.strokeStyle = luz; ctx.lineWidth = 1.1 / escala
        ctx.beginPath(); ctx.arc(x, y, r + 2 + (1 - v) * 9, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1
        ctx.shadowColor = luz; ctx.shadowBlur = 18 * v
        ctx.beginPath(); ctx.arc(x, y, r * (1 + v * 0.9), 0, TAU); ctx.fillStyle = luz; ctx.fill(); ctx.shadowBlur = 0
      } else if (grafito) {
        ctx.strokeStyle = tinta.grafito; ctx.lineWidth = Math.max(0.5, 0.8 / escala)
        ctx.beginPath(); ctx.arc(x, y, r * 0.9, 0, TAU); ctx.stroke()
      } else {
        ctx.beginPath()
        if (r * escala >= 3.5) trazarMancha(ctx, x, y, r, forma(n.id, 9, 0.84, 1.1))
        else ctx.arc(x, y, r, 0, TAU)
        ctx.fillStyle = color; ctx.fill()
      }
      if (enfocado.current === n.id) { ctx.strokeStyle = tinta.tinta; ctx.lineWidth = 1.5 / escala; ctx.beginPath(); ctx.arc(x, y, r + 3 / escala + 1, 0, TAU); ctx.stroke() }
    }

    const cuenta = useMemo(() => {
      let recuerdos = 0, temas = 0, conexiones = 0
      for (const n of red.nodes) if (!vis || vis.ids.has(n.id)) n.tipo === 'tema' ? temas++ : recuerdos++
      for (const l of red.links) if (l.tipo !== 'tema' && (!vis || (vis.ids.has(idDe(l.source)) && vis.ids.has(idDe(l.target))))) conexiones++
      return { recuerdos, temas, conexiones }
    }, [red, vis])

    return (
      <div ref={caja} onWheelCapture={() => { tocado.current = true }} onPointerDownCapture={() => { tocado.current = true }}
        role="img" aria-label={`Tu memoria ${corte === null ? 'hoy' : deCuando(corte)}: ${cuenta.recuerdos} recuerdos en ${cuenta.temas} temas con ${cuenta.conexiones} conexiones.${recordados[0] ? ` Último recuerdo usado: «${recordados[0].consulta}», ${recordados[0].cuantos} recuerdos.` : ''}`}
        className="red-tinta relative h-full w-full overflow-hidden">
        {red.nodes.length > 0 && (
          <ForceGraph2D<NodoRed, EnlaceRed>
            ref={fg} width={tam.w} height={tam.h} graphData={red} backgroundColor="rgba(0,0,0,0)"
            warmupTicks={60} cooldownTicks={160} d3VelocityDecay={0.35} autoPauseRedraw={!(despierta || creciendo)} enableNodeDrag={false}
            onEngineStop={() => { if (!tocado.current) fg.current?.zoomToFit(600, 56) }}
            nodeVisibility={(n) => visible(n.id)}
            linkVisibility={(l) => l.tipo !== 'tema' && visible(idDe(l.source)) && visible(idDe(l.target))}
            linkColor={(l) => {
              if (l.tipo === 'puente') return tinta.grafitos[1]
              if (grafitoEnlace(l)) return tinta.grafitos[largo(l)]
              const a = porId.get(idDe(l.source))?.fecha, b = porId.get(idDe(l.target))?.fecha
              // la conexión se trazó cuando llegó el más nuevo de los dos: esa es la edad de su tinta
              return a === undefined || b === undefined ? `${tinta.tinta}50` : tinta.enlaces[largo(l)][nivelTinta((refT - Math.max(a, b)) / DIA)]
            }}
            linkWidth={(l) => (l.tipo === 'puente' ? 0.7 : 0.35 + 0.6 * Math.min(porId.get(idDe(l.source))?.confianza ?? 0.8, porId.get(idDe(l.target))?.confianza ?? 0.8))}
            linkLineDash={(l) => (l.tipo === 'puente' ? [3, 2.5] : grafitoEnlace(l) ? [1.2, 1.4] : null)}
            linkDirectionalParticles={0} linkDirectionalParticleWidth={2.4} linkDirectionalParticleSpeed={0.018} linkDirectionalParticleColor={(l) => aurora(idDe(l.source))}
            nodeRelSize={1} nodeVal={(n) => (n.tipo === 'tema' ? 36 : radioTrazo(n.confianza) ** 2)}
            onNodeClick={(n) => { if (n.tipo === 'recuerdo') { enfocado.current = n.id; onPick(n.id) } }}
            onBackgroundClick={() => { enfocado.current = null }}
            nodeLabel={(n) => {
              if (n.tipo === 'tema') return `<b>${escapar(n.etiqueta ?? '')}</b><br>${vis?.porTema.get(n.tema) ?? miembros.get(n.tema)?.length ?? 0} recuerdos`
              const clase = CLASES[n.clase ?? ''] ?? 'Recuerdo', cuando = n.fecha === undefined ? '' : ` ${deCuando(n.fecha)}`
              const trazo = esGrafito(n.confianza) ? 'En grafito: lo dijo una IA y aún no lo has confirmado.' : 'En tinta: viene de ti.'
              return `<b>${clase}${cuando}</b><br>${trazo}<br><span class="red-tinta-pista">Clic para abrirlo</span>`
            }}
            onRenderFramePre={pintarAguadas} onRenderFramePost={(ctx, escala) => { pintarRecuerdos(ctx, escala); rotular(ctx, escala) }}
            nodeCanvasObject={() => {}}
          />
        )}
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between px-5 pt-4 text-xs">
          <span className="text-texto-3">{corte === null ? 'Red neuronal de tu memoria' : `Tu memoria ${deCuando(corte)}`}</span>
          <span className="flex gap-3 text-texto-2 tabular-nums">
            <span><b className="font-semibold text-texto">{cuenta.recuerdos}</b> recuerdos</span>
            <span><b className="font-semibold text-texto">{cuenta.temas}</b> temas</span>
            <span><b className="font-semibold text-texto">{cuenta.conexiones}</b> conexiones</span>
          </span>
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 grid gap-3 px-5 pb-4">
          <div className="grid max-w-[60%] gap-1 font-mono text-[12px] leading-[18px]">
            {recordados.slice(0, 4).map((r) => (
              <span key={r.id} className="truncate text-texto-2"><span className="text-memoria">[recuerdo]</span> «{r.consulta}» → <span className="aurora-texto">{r.cuantos}</span></span>
            ))}
          </div>
          {rango && (
            <div className="pointer-events-auto flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-linea pt-3">
              <Tiempo desde={rango.desde} hasta={rango.hasta} corte={corte} hist={hist} creciendo={creciendo} colorDe={(t) => tintaEn(t)}
                onCorte={(c) => { parar(); setCorte(c) }}
                onCrecer={() => (creciendo ? parar() : crecer(corte === null ? rango.desde : corte, (CRECER_MS * (rango.hasta - (corte ?? rango.desde))) / (rango.hasta - rango.desde || 1)))} />
              <ul aria-label="Cómo leer la red" className="flex flex-wrap items-center gap-x-3.5 gap-y-1 text-[11.5px] text-texto-2">
                <li className="flex items-center gap-1.5"><span aria-hidden className="size-2 rounded-full bg-tinta-fresca" />Tinta: viene de ti</li>
                <li className="flex items-center gap-1.5"><span aria-hidden className="size-2 rounded-full border border-dashed border-grafito" />Grafito: lo dijo una IA</li>
                <li className="flex items-center gap-1.5"><span aria-hidden className="h-1.5 w-6 rounded-full bg-linear-to-r from-tinta-fresca to-tinta-vieja" />La tinta envejece con los días</li>
                <li className="flex items-center gap-1.5"><span aria-hidden className="size-2 rounded-full bg-luz shadow-[0_0_6px_var(--luz)]" />Luz: lo que recuerda ahora</li>
              </ul>
            </div>
          )}
        </div>
        {!red.nodes.length && <div className="absolute inset-0 grid place-items-center text-texto-3">Tu memoria está vacía. Absorbe tus notas desde el panel de la izquierda.</div>}
      </div>
    )
  },
)
