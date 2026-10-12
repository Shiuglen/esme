// La mente en tinta («Tinta y Luz», paso 4b; spec: docs/superpowers/specs/2026-10-12-tinta-y-luz.md).
// Cada recuerdo es un punto de tinta: su color es su edad (tinta fresca → vieja) y su tamaño, su confianza.
// Lo que nadie ha verificado sigue en grafito, un anillo de lápiz. Cada tema es una aguada con su nombre rotulado
// como en un atlas grabado. Al recordar, la luz recorre los trazos. Y el tiempo se puede deslizar: la mente tal
// como era cualquier día, con la tinta fresca de entonces. La primera vez en cada sesión, la mente se dibuja sola.
import '@fontsource-variable/bodoni-moda/wght-italic.css'
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import ForceGraph2D, { type ForceGraphMethods, type LinkObject, type NodeObject } from 'react-force-graph-2d'
import type { Atlas } from '../lib/brain'
import { luzViva, mezclar } from '../tinta/luz'
import { forma, trazarMancha } from '../tinta/mancha'
import { esGrafito, nivelTinta, paletaTinta, radioTrazo } from '../tinta/trazo'
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
const ROTULO = '"Bodoni Moda Variable", Georgia, serif'
const CLASES: Record<string, string> = { user_msg: 'Mensaje tuyo', ai_msg: 'Respuesta de una IA', doc: 'Documento', note: 'Nota' }
const quieto = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
let introVista = false // la mente se dibuja sola solo la primera vez que se abre en cada sesión

// La luz de un recuerdo encendido es bioluminiscente (tinta/luz.ts): cada nodo tiene su fase
const matiz = (id: string) => { let h = 0; for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360; return h }
const aurora = (id = '') => luzViva(performance.now() / 1000, matiz(id) / 360)
const idDe = (e: L['source']) => (typeof e === 'object' ? String((e as N).id) : String(e))
const escapar = (t: string) => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)
const deCuando = (ms: number) => { const e = etiquetaFecha(ms); return e === 'Hoy' || e === 'Ayer' ? `de ${e.toLowerCase()}` : `del ${e}` }

// enlaces[k][nivel]: k es lo largo del trazo (0 corto, 1 medio, 2 largo): lo lejano se dibuja a lápiz suave, lo cercano con firmeza
type Tinta = { papel: string; tinta: string; grafito: string; trazos: string[]; enlaces: string[][]; grafitos: string[]; aguadas: string[]; noche: boolean }
function leerTinta(): Tinta {
  const css = getComputedStyle(document.documentElement), v = (k: string) => css.getPropertyValue(k).trim()
  const trazos = paletaTinta({ fresca: v('--tinta-fresca') || '#15233d', vieja: v('--tinta-vieja') || '#6e5235' })
  const alfa = (a: number) => trazos.map((c) => c.replace(')', ` / ${a})`))
  const noche = document.documentElement.dataset.theme !== 'dia'
  const grafito = v('--grafito')
  return { papel: v('--papel'), tinta: v('--tinta'), grafito, trazos, noche,
    enlaces: (noche ? [0.42, 0.2, 0.07] : [0.5, 0.24, 0.08]).map(alfa), grafitos: ['80', '48', '1c'].map((a) => grafito + a),
    aguadas: trazos.map((c) => mezclar(c, v('--papel') || '#08090d', 0.55)) }
}

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
    const tintaEn = (fecha: number | undefined) => (fecha === undefined ? tinta.tinta : tinta.trazos[nivelTinta((refT - fecha) / DIA)])

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

    // Las aguadas de los temas van bajo todo. Cubren el 80 % de sus recuerdos (los sueltos quedan como islas) y se pintan
    // opacas, con su línea de marea (el pigmento se acumula en el borde al secarse), en una capa aparte que se posa sobre
    // el papel con una sola transparencia. Las grandes primero: cada aguada tapa los bordes de las de debajo, como recortes
    // de papel, y el centro denso no se convierte en un diagrama de Venn.
    const pintarAguadas = (ctx: CanvasRenderingContext2D, escala: number) => {
      const lienzo = ctx.canvas, c = (capa.current ??= document.createElement('canvas'))
      if (c.width !== lienzo.width || c.height !== lienzo.height) { c.width = lienzo.width; c.height = lienzo.height }
      const g = c.getContext('2d')!
      g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, c.width, c.height); g.setTransform(ctx.getTransform())
      const lista: (typeof centros.current[number] & { r: number; nivel: number })[] = []
      for (const [t, ms] of miembros) {
        let sx = 0, sy = 0, k = 0, edad = 0, fechados = 0
        for (const m of ms) { if (!visible(m.id)) continue; sx += m.x ?? 0; sy += m.y ?? 0; k++; if (m.fecha !== undefined) { edad += refT - m.fecha; fechados++ } }
        if (!k) continue
        const cx = sx / k, cy = sy / k, d: number[] = []
        for (const m of ms) if (visible(m.id)) d.push(Math.hypot((m.x ?? 0) - cx, (m.y ?? 0) - cy))
        d.sort((p, q) => p - q)
        lista.push({ tema: t, x: cx, y: cy, n: k, r: d[Math.min(d.length - 1, Math.floor(d.length * 0.8))] * 1.08 + 4, nivel: fechados ? nivelTinta(edad / fechados / DIA) : 0 })
      }
      g.lineWidth = 1.6 / escala
      for (const a of [...lista].sort((p, q) => q.r - p.r)) {
        g.beginPath(); trazarMancha(g, a.x, a.y, a.r, forma(`tema:${a.tema}`, 14, 0.82, 1.1))
        g.fillStyle = tinta.aguadas[a.nivel]; g.fill(); g.strokeStyle = tinta.trazos[a.nivel]; g.stroke()
      }
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = tinta.noche ? 0.1 : 0.13; ctx.drawImage(c, 0, 0); ctx.restore()
      centros.current = lista
    }

    // Los nombres de los temas, rotulados encima de todo como las regiones de un atlas grabado: el término principal en
    // cursiva grande y el segundo, más pequeño y tenue, debajo. Los temas grandes primero, y ningún nombre pisa a otro.
    const rotular = (ctx: CanvasRenderingContext2D, escala: number) => {
      const puestos: number[][] = []
      ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round'
      for (const c of [...centros.current].sort((a, b) => b.n - a.n)) {
        const [uno, dos] = rotulos.get(c.tema) ?? []; if (!uno) continue
        const px = (11.5 + Math.min(6.5, Math.sqrt(c.n) / 2.6)) / escala, px2 = px * 0.74
        ctx.font = `italic 500 ${px}px ${ROTULO}`; const w1 = ctx.measureText(uno).width
        ctx.font = `italic 400 ${px2}px ${ROTULO}`; const w2 = dos ? ctx.measureText(dos).width : 0
        const w = Math.max(w1, w2) / 2, y1 = dos ? c.y - px2 * 0.55 : c.y, y2 = c.y + px * 0.55
        const r = [c.x - w, y1 - px * 0.6, c.x + w, dos ? y2 + px2 * 0.6 : y1 + px * 0.6]
        if (puestos.some((p) => p[0] < r[2] && r[0] < p[2] && p[1] < r[3] && r[1] < p[3])) continue
        puestos.push(r)
        ctx.strokeStyle = tinta.papel; ctx.lineWidth = 3.5 / escala; ctx.fillStyle = tinta.tinta
        ctx.font = `italic 500 ${px}px ${ROTULO}`
        ctx.globalAlpha = 0.88; ctx.strokeText(uno, c.x, y1); ctx.globalAlpha = 1; ctx.fillText(uno, c.x, y1)
        if (dos) {
          ctx.font = `italic 400 ${px2}px ${ROTULO}`
          ctx.globalAlpha = 0.8; ctx.strokeText(dos, c.x, y2); ctx.globalAlpha = 0.72; ctx.fillText(dos, c.x, y2)
        }
      }
      ctx.restore()
    }

    // Un punto nunca baja de ~1,5 px en pantalla: la trama de puntos se lee aunque la vista esté lejos
    const radioEn = (n: N, escala: number) => Math.max(radioTrazo(n.confianza), (0.75 + 0.55 * (n.confianza ?? 0.8)) / escala)

    // Todos los recuerdos de una vez, agrupados por tono de tinta: 24 rellenos en vez de uno por punto (el lienzo cobra
    // por llamada, no por píxel). Solo van uno a uno los que están vivos: encendidos, aún húmedos o enfocados.
    const pintarRecuerdos = (ctx: CanvasRenderingContext2D, escala: number) => {
      const lotes = new Map<string, Path2D>(), anillos = new Path2D(), sueltos: N[] = []
      let hayAnillos = false
      for (const n of red.nodes as N[]) {
        if (n.tipo === 'tema' || !visible(n.id)) continue
        if ((encendidos.current.has(n.id) && vivo(n.id) > 0) || gotas.current.has(n.id) || enfocado.current === n.id) { sueltos.push(n); continue }
        const x = n.x ?? 0, y = n.y ?? 0, r = radioEn(n, escala)
        if (esGrafito(n.confianza)) { anillos.moveTo(x + r * 0.9, y); anillos.arc(x, y, r * 0.9, 0, TAU); hayAnillos = true; continue }
        const color = tintaEn(n.fecha)
        let p = lotes.get(color); if (!p) { p = new Path2D(); lotes.set(color, p) }
        if (r * escala >= 3.5) trazarMancha(p, x, y, r, forma(n.id, 9, 0.84, 1.1))
        else { p.moveTo(x + r, y); p.arc(x, y, r, 0, TAU) }
      }
      for (const [color, p] of lotes) { ctx.fillStyle = color; ctx.fill(p) }
      if (hayAnillos) { ctx.strokeStyle = tinta.grafito; ctx.lineWidth = Math.max(0.5, 0.8 / escala); ctx.stroke(anillos) }
      for (const n of sueltos) pintarRecuerdo(n, ctx, escala)
    }

    const pintarRecuerdo = (n: N, ctx: CanvasRenderingContext2D, escala: number) => {
      const x = n.x ?? 0, y = n.y ?? 0, v = vivo(n.id), g = secado(n.id), grafito = esGrafito(n.confianza), color = tintaEn(n.fecha)
      // al caer, la gota se abre un poco más de la cuenta y se recoge; la tinta húmeda se corre por las fibras
      const r = radioEn(n, escala) * (g < 1 ? 0.35 + 0.65 * (1 - (1 - g) ** 3) + 0.3 * Math.sin(Math.PI * g) : 1)
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
