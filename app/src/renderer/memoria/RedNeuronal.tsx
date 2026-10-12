// Red neuronal de la memoria: recuerdos (nodos), temas (centros) y conexiones por significado.
// Cuando Esme recuerda, sus nodos se encienden y viajan impulsos de luz por las conexiones.
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import ForceGraph2D, { type ForceGraphMethods, type LinkObject, type NodeObject } from 'react-force-graph-2d'
import type { Atlas } from '../lib/brain'
import { construirRed, type EnlaceRed, type NodoRed } from './red'

export type RedHandle = { encender(ids: string[]): void; enfocar(id: string): void }
export type Recordado = { id: number; consulta: string; cuantos: number }
type N = NodeObject<NodoRed>
type L = LinkObject<NodoRed, EnlaceRed>

const leer = (v: string) => getComputedStyle(document.documentElement).getPropertyValue(v).trim()
const ENCENDIDO_MS = 3500

export const RedNeuronal = forwardRef<RedHandle, { atlas: Atlas | null; tema: string; recordados: Recordado[]; onPick(id: string): void }>(
  function RedNeuronal({ atlas, tema, recordados, onPick }, ref) {
    const caja = useRef<HTMLDivElement>(null)
    const fg = useRef<ForceGraphMethods<N, L> | undefined>(undefined)
    const [tam, setTam] = useState({ w: 800, h: 600 })
    const encendidos = useRef(new Map<string, number>())
    const red = useMemo(() => (atlas ? construirRed(atlas) : { nodes: [], links: [] }), [atlas])
    const colores = useMemo(() => ({ memoria: leer('--memoria'), acento: leer('--acento'), texto: leer('--texto'), texto3: leer('--texto-3'), linea: leer('--linea'), fondo: leer('--fondo') }), [tema])
    const porId = useMemo(() => new Map(red.nodes.map((n) => [n.id, n])), [red])

    useEffect(() => {
      const el = caja.current; if (!el) return
      const ro = new ResizeObserver(() => setTam({ w: el.clientWidth, h: el.clientHeight })); ro.observe(el)
      return () => ro.disconnect()
    }, [])
    useEffect(() => {
      const g = fg.current; if (!g || !red.nodes.length) return
      g.d3Force('charge')?.strength(-7)
      g.d3Force('link')?.distance((l: L) => (l.tipo === 'puente' ? 70 : l.tipo === 'tema' ? 22 : 9)).strength((l: L) => (l.tipo === 'vecino' ? 0.5 : 0.08))
      const t = setTimeout(() => g.zoomToFit(700, 48), 900)
      return () => clearTimeout(t)
    }, [red])

    useImperativeHandle(ref, () => ({
      encender(ids) {
        const g = fg.current, ahora = performance.now()
        for (const id of ids) encendidos.current.set(id, ahora)
        if (!g) return
        for (const l of red.links) {
          const s = typeof l.source === 'object' ? (l.source as N).id : l.source, t = typeof l.target === 'object' ? (l.target as N).id : l.target
          if (ids.includes(s as string) || ids.includes(t as string)) g.emitParticle(l as L)
        }
      },
      enfocar(id) { const n = porId.get(id) as N | undefined; if (n && n.x !== undefined) { fg.current?.centerAt(n.x, n.y, 600); fg.current?.zoom(4, 600) } },
    }), [red, porId])

    const vivo = (id: string) => { const t = encendidos.current.get(id); return t !== undefined && performance.now() - t < ENCENDIDO_MS ? 1 - (performance.now() - t) / ENCENDIDO_MS : 0 }
    const temas = red.nodes.filter((n) => n.tipo === 'tema').length

    return (
      <div ref={caja} role="img" aria-label={`Red neuronal de tu memoria: ${red.nodes.length - temas} recuerdos en ${temas} temas con ${red.links.length} conexiones.${recordados[0] ? ` Último recuerdo usado: «${recordados[0].consulta}», ${recordados[0].cuantos} recuerdos.` : ''}`} className="relative h-full w-full overflow-hidden bg-fondo" style={{ backgroundImage: `radial-gradient(${colores.linea} 1px, transparent 1px)`, backgroundSize: '22px 22px' }}>
        {red.nodes.length > 0 && (
          <ForceGraph2D<NodoRed, EnlaceRed>
            ref={fg} width={tam.w} height={tam.h} graphData={red} backgroundColor="rgba(0,0,0,0)"
            warmupTicks={60} cooldownTicks={160} d3VelocityDecay={0.35} autoPauseRedraw={false} enableNodeDrag={false}
            linkColor={(l) => (l.tipo === 'puente' ? `${colores.texto3}70` : l.tipo === 'tema' ? `${colores.texto3}1c` : `${colores.memoria}40`)}
            linkWidth={(l) => (l.tipo === 'puente' ? 1 : 0.6)}
            linkDirectionalParticles={0} linkDirectionalParticleWidth={2.4} linkDirectionalParticleSpeed={0.018} linkDirectionalParticleColor={() => colores.acento}
            nodeRelSize={1} nodeVal={(n) => (n.tipo === 'tema' ? 8 + Math.min(40, n.tam / 6) : 1.6)}
            onNodeClick={(n) => { if (n.tipo === 'recuerdo') onPick(n.id) }}
            nodeLabel={(n) => (n.tipo === 'tema' ? `${n.etiqueta}: ${n.tam} recuerdos` : 'Abrir este recuerdo')}
            nodeCanvasObject={(n, ctx, escala) => {
              const x = n.x ?? 0, y = n.y ?? 0, v = vivo(n.id)
              if (n.tipo === 'tema') {
                const r = 3 + Math.min(6, Math.sqrt(n.tam) / 2)
                ctx.shadowColor = colores.memoria; ctx.shadowBlur = 12; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = colores.texto; ctx.fill(); ctx.shadowBlur = 0
                const fs = Math.max(10 / escala, 2.2), t = n.etiqueta ?? ''
                ctx.font = `600 ${fs}px "Funnel Sans Variable", sans-serif`
                const w = ctx.measureText(t).width + fs * 1.2, h = fs * 1.7, ty = y + r + fs * 0.6
                ctx.fillStyle = colores.fondo; ctx.strokeStyle = colores.linea; ctx.lineWidth = 1 / escala
                ctx.beginPath(); ctx.roundRect(x - w / 2, ty, w, h, h / 2); ctx.fill(); ctx.stroke()
                ctx.fillStyle = colores.texto; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(t, x, ty + h / 2)
              } else {
                const r = 2 + v * 4.5
                if (v > 0) {
                  ctx.beginPath(); ctx.arc(x, y, r + 3 + (1 - v) * 10, 0, Math.PI * 2)
                  ctx.strokeStyle = colores.acento; ctx.globalAlpha = v * 0.6; ctx.lineWidth = 1.2; ctx.stroke(); ctx.globalAlpha = 1
                  ctx.shadowColor = colores.acento; ctx.shadowBlur = 26 * v
                }
                ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2)
                ctx.fillStyle = v > 0 ? colores.acento : `${colores.memoria}e6`; ctx.fill(); ctx.shadowBlur = 0
              }
            }}
          />
        )}
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between px-5 pt-4 text-xs">
          <span className="text-texto-3">Red neuronal de tu memoria</span>
          <span className="flex gap-3 text-texto-2 tabular-nums">
            <span><b className="font-semibold text-acento">{red.nodes.length - temas}</b> recuerdos</span>
            <span><b className="font-semibold text-texto">{temas}</b> temas</span>
            <span><b className="font-semibold text-texto">{red.links.length}</b> conexiones</span>
          </span>
        </div>
        <div className="pointer-events-none absolute bottom-4 left-5 grid max-w-[60%] gap-1 font-mono text-[12px] leading-[18px]">
          {recordados.slice(0, 4).map((r) => (
            <span key={r.id} className="truncate text-texto-2"><span className="text-memoria">[recuerdo]</span> «{r.consulta}» → <span className="text-acento">{r.cuantos}</span></span>
          ))}
          <span className="text-atencion">recuerda&gt;<span className="ml-1 inline-block h-3 w-1.5 translate-y-0.5 animate-late bg-atencion" /></span>
        </div>
        {!red.nodes.length && <div className="absolute inset-0 grid place-items-center text-texto-3">Tu memoria está vacía. Absorbe tus notas desde el panel de la izquierda.</div>}
      </div>
    )
  },
)
