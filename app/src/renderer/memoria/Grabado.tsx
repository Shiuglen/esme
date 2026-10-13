// Grabado de tu mente: tu atlas real dibujado en tinta como una lámina, quieto (en reposo no gasta nada: no hay bucle).
// La primera vez en cada sesión la mente despierta: se dibuja sola, del recuerdo más viejo al más nuevo, y al final se
// posan las aguadas y los nombres. Lleva tu sello en la esquina, como la firma de un grabado. Pulsarla abre Memoria.
import { useEffect, useMemo, useRef, useState } from 'react'
import type { Atlas } from '../lib/brain'
import { Sello } from '../marca/Sello'
import { aguadasDe } from './aguadas'
import { leerTinta, pintarAguadas, pintarPuntos, rotular, ROTULO } from './pintar'

const DESPERTAR_MS = 2600
const quieto = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
let despierta = false // la mente se dibuja sola una vez por sesión

export function Grabado({ atlas, tema, onAbrir }: { atlas: Atlas | null; tema: string; onAbrir(): void }) {
  const lienzo = useRef<HTMLCanvasElement>(null)
  const capa = useRef<HTMLCanvasElement | null>(null)
  const [tam, setTam] = useState({ w: 0, h: 0 })
  const [listo, setListo] = useState(0) // sube al cargar la tipografía o cambiar el tema: redibuja una vez

  // Los recuerdos por orden de llegada (para despertar) y los nombres de los temas
  const puntos = useMemo(() => (atlas?.points ?? []).map((p) => ({ id: p.id, ux: p.x, uy: p.y, tema: p.cluster, fecha: p.ts ? Date.parse(p.ts) || undefined : undefined, confianza: p.trust }))
    .sort((a, b) => (a.fecha ?? 0) - (b.fecha ?? 0)), [atlas])
  const rotulos = useMemo(() => new Map((atlas?.clusters ?? []).map((c) => [c.id, c.terms?.length ? c.terms : [c.label]])), [atlas])

  useEffect(() => {
    const el = lienzo.current?.parentElement; if (!el) return
    const ro = new ResizeObserver(() => setTam({ w: el.clientWidth, h: el.clientHeight })); ro.observe(el)
    return () => ro.disconnect()
  }, [])
  useEffect(() => { void document.fonts?.load(`italic 500 14px ${ROTULO}`).then(() => setListo((n) => n + 1)) }, [])
  useEffect(() => { const id = requestAnimationFrame(() => setListo((n) => n + 1)); return () => cancelAnimationFrame(id) }, [tema])

  useEffect(() => {
    const c = lienzo.current; if (!c || !tam.w || !puntos.length) return
    const dpr = Math.min(2, devicePixelRatio || 1)
    c.width = Math.round(tam.w * dpr); c.height = Math.round(tam.h * dpr)
    const ctx = c.getContext('2d')!, tinta = leerTinta(), ahora = Date.now()
    // Encuadre: donde de verdad están tus recuerdos (percentiles 1 y 99: un recuerdo suelto no descentra la lámina)
    const pct = (v: number[], q: number) => v[Math.min(v.length - 1, Math.max(0, Math.floor(v.length * q)))]
    const xs = puntos.map((p) => p.ux).sort((a, b) => a - b), ys = puntos.map((p) => p.uy).sort((a, b) => a - b)
    const x0 = pct(xs, 0.01), x1 = pct(xs, 0.99), y0 = pct(ys, 0.01), y1 = pct(ys, 0.99)
    const marco = 34, s = Math.min((tam.w - 2 * marco) / Math.max(1e-6, x1 - x0), (tam.h - 2 * marco) / Math.max(1e-6, y1 - y0))
    // Se dibuja en «unidades de lámina» con zoom z: puntos de ~1,2 px, una trama fina y no manchas que se funden
    const z = 0.6, ox = tam.w / 2 - ((x0 + x1) / 2) * s, oy = tam.h / 2 - ((y0 + y1) / 2) * s
    const pts = puntos.map((p) => ({ ...p, x: (ox + p.ux * s) / z, y: (oy + p.uy * s) / z }))
    const aguadas = aguadasDe(pts, ahora, 4 / z)
    const pintar = (k: number) => {
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, c.width, c.height); ctx.setTransform(dpr * z, 0, 0, dpr * z, 0, 0)
      const fondo = Math.max(0, (k - 0.55) / 0.45) // las aguadas y los nombres se posan al final
      if (fondo > 0) pintarAguadas(ctx, (capa.current ??= document.createElement('canvas')), aguadas, tinta, z, fondo)
      pintarPuntos(ctx, k >= 1 ? pts : pts.slice(0, Math.ceil(pts.length * Math.min(1, k / 0.85))), ahora, tinta, z)
      if (fondo > 0) rotular(ctx, aguadas, rotulos, tinta, z, { maximo: 8, cuerpo: 10.5, opacidad: fondo })
    }
    if (despierta || quieto()) { pintar(1); return }
    despierta = true
    let raf = 0; const t0 = performance.now()
    const paso = (t: number) => { const k = Math.min(1, (t - t0) / DESPERTAR_MS); pintar(k); if (k < 1) raf = requestAnimationFrame(paso) }
    raf = requestAnimationFrame(paso)
    return () => { cancelAnimationFrame(raf); pintar(1) }
  }, [tam, puntos, rotulos, listo])

  const temas = atlas?.clusters.length ?? 0
  return (
    <button type="button" onClick={onAbrir} aria-label={`Tu mente: ${puntos.length} recuerdos en ${temas} temas. Abrir Memoria`}
      className="group relative block size-full cursor-pointer rounded-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-texto/60">
      <canvas ref={lienzo} aria-hidden className="absolute inset-0 size-full" style={{ width: tam.w, height: tam.h }} />
      {!puntos.length && <span className="absolute inset-0 grid place-items-center text-sm text-texto-3">Tu mente aún está en blanco.</span>}
      <span className="pointer-events-none absolute right-3 bottom-3 flex items-center gap-2 text-[11.5px] text-texto-3">
        <span className="opacity-0 transition-opacity duration-300 group-hover:opacity-100">Abrir tu mente</span>
        <Sello lado={34} giro={-3} titulo="Tu sello: nace de tu mente" />
      </span>
    </button>
  )
}
