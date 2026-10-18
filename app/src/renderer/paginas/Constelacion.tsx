// La constelación de tu mente: los recuerdos reales del atlas como puntos de luz. Cada tema tiene su matiz (derivado del
// acento de tu piel), lo reciente brilla (bioluminiscencia: solo lo vivo da luz), de vez en cuando una onda recorre un
// recuerdo y los temas grandes llevan su nombre. Nada inventado: si hay un cúmulo, de verdad sabes mucho de eso.
// Canvas 2D por lotes (Path2D por color): miles de puntos a 30 fps; quieto si pides menos movimiento o no se ve.
import { useEffect, useRef } from 'react'
import type { Atlas } from '../lib/brain'
import { brilloDe, temasVisibles } from './mando-vivo'

type Rgb = [number, number, number]
const aRgb = (hex: string): Rgb => { const h = hex.replace('#', ''); const n = parseInt(h.length === 3 ? h.replace(/./g, '$&$&') : h.slice(0, 6), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255] }
function rotar([r, g, b]: Rgb, grados: number, luz = 0): string {
  // un giro de matiz sencillo en YIQ: suficiente para que cada tema tenga su color y todos sean de la misma familia
  const a = (grados * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a)
  const y = 0.299 * r + 0.587 * g + 0.114 * b, i = 0.596 * r - 0.274 * g - 0.322 * b, q = 0.211 * r - 0.523 * g + 0.312 * b
  const i2 = i * c - q * s, q2 = i * s + q * c
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v + luz)))
  return `rgb(${f(y + 0.956 * i2 + 0.621 * q2)},${f(y - 0.272 * i2 - 0.647 * q2)},${f(y - 1.106 * i2 + 1.703 * q2)})`
}
const hash = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return (h >>> 0) / 4294967295 }

export function Constelacion({ atlas, color, activa, className }: { atlas: Atlas | null; color: string; activa: boolean; className?: string }) {
  const lienzo = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const cv = lienzo.current
    if (!cv || !atlas?.points.length) return
    const ctx = cv.getContext('2d')!
    const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.movimiento === 'nada'
    const ahora = Date.now(), base = aRgb(color.startsWith('#') ? color : '#3ee6c8')
    const ids = [...new Set(atlas.points.map((p) => p.cluster))].sort((a, b) => a - b)
    const colorDe = new Map(ids.map((id, k) => [id, rotar(base, ((k / Math.max(1, ids.length)) - 0.5) * 110, 10)]))
    const puntos = atlas.points.map((p) => ({ x: p.x, y: p.y, c: p.cluster, b: brilloDe(p.ts, ahora), f: hash(p.id) * Math.PI * 2, r: 0.7 + (p.trust ?? 0.6) * 1.1 }))
    const recientes = puntos.filter((p) => p.b > 0.15)
    const temas = temasVisibles(atlas.clusters, 7)
    const titulos = getComputedStyle(document.documentElement).getPropertyValue('--letra-titulos').trim() || '"Bodoni Moda Variable", Georgia, serif'
    let w = 0, h = 0, dpr = 1, raf = 0, ultimo = 0
    const ondas: { x: number; y: number; t0: number }[] = []
    const medir = () => {
      dpr = Math.min(2, devicePixelRatio || 1); const r = cv.getBoundingClientRect(); w = r.width; h = r.height
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    // se encuadra por los límites reales de tus recuerdos (no por el rango teórico del atlas): la mente llena su sitio
    // y Esme queda en su centro
    // con percentiles (2 y 98): unos pocos recuerdos sueltos no deben descentrar la mente
    const pct = (v: number[], q: number) => { const o = [...v].sort((a, b) => a - b); return o[Math.min(o.length - 1, Math.max(0, Math.round(q * (o.length - 1))))] }
    const xs = atlas.points.map((p) => p.x), ys = atlas.points.map((p) => p.y)
    const minX = pct(xs, 0.02), maxX = pct(xs, 0.98), minY = pct(ys, 0.02), maxY = pct(ys, 0.98)
    const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2, ancho = Math.max(0.1, maxX - minX), alto = Math.max(0.1, maxY - minY)
    const escala = () => Math.min((w * 0.86) / ancho, (h * 0.86) / alto)
    const pos = (x: number, y: number, t: number, f: number) => {
      const s = escala(), d = quieto ? 0 : 0.006
      return [w / 2 + (x - cx + Math.sin(t * 0.00035 + f) * d) * s, h / 2 + (y - cy + Math.cos(t * 0.0003 + f) * d) * s] as const
    }
    const pintar = (t: number) => {
      ctx.clearRect(0, 0, w, h)
      // puntos por lotes, un color por tema
      const lotes = new Map<number, Path2D>()
      for (const p of puntos) {
        const [x, y] = pos(p.x, p.y, t, p.f)
        let l = lotes.get(p.c); if (!l) { l = new Path2D(); lotes.set(p.c, l) }
        l.moveTo(x + p.r, y); l.arc(x, y, p.r, 0, Math.PI * 2)
      }
      ctx.globalAlpha = 0.55
      for (const [c, l] of lotes) { ctx.fillStyle = colorDe.get(c)!; ctx.fill(l) }
      // lo reciente da luz: un halo que respira
      ctx.globalCompositeOperation = 'lighter'
      for (const p of recientes) {
        const [x, y] = pos(p.x, p.y, t, p.f), resp = quieto ? 1 : 0.75 + 0.25 * Math.sin(t * 0.002 + p.f * 3)
        const g = ctx.createRadialGradient(x, y, 0, x, y, 7 + 5 * p.b)
        g.addColorStop(0, colorDe.get(p.c)!); g.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.globalAlpha = 0.5 * p.b * resp; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 7 + 5 * p.b, 0, Math.PI * 2); ctx.fill()
      }
      // ondas: un recuerdo se enciende y su luz se expande (Esme pensando)
      for (let i = ondas.length - 1; i >= 0; i--) {
        const o = ondas[i], e = (t - o.t0) / 1800
        if (e >= 1) { ondas.splice(i, 1); continue }
        ctx.globalAlpha = 0.6 * (1 - e); ctx.strokeStyle = color; ctx.lineWidth = 1.2
        ctx.beginPath(); ctx.arc(o.x, o.y, 4 + e * 46, 0, Math.PI * 2); ctx.stroke()
      }
      ctx.globalCompositeOperation = 'source-over'
      // los temas grandes, rotulados como un atlas grabado
      ctx.globalAlpha = 0.82; ctx.textAlign = 'center'; ctx.fillStyle = getComputedStyle(cv).color
      ctx.font = `italic 400 ${Math.round(Math.max(13, Math.min(18, w / 34)))}px ${titulos}`
      for (const tm of temas) { const [x, y] = pos(tm.x, tm.y, t, 0); ctx.fillText(tm.nombre, x, y - 10) }
      ctx.globalAlpha = 1
    }
    const bucle = (t: number) => {
      raf = requestAnimationFrame(bucle)
      if (t - ultimo < 33 || document.hidden) return   // ~30 fps
      ultimo = t
      if (recientes.length && Math.random() < 0.02) { const p = recientes[Math.floor(Math.random() * recientes.length)]; const [x, y] = pos(p.x, p.y, t, p.f); ondas.push({ x, y, t0: t }) }
      pintar(t)
    }
    medir()
    const ro = new ResizeObserver(() => { medir(); pintar(performance.now()) })
    ro.observe(cv)
    if (quieto || !activa) pintar(0); else raf = requestAnimationFrame(bucle)
    return () => { cancelAnimationFrame(raf); ro.disconnect() }
  }, [atlas, color, activa])
  return <canvas ref={lienzo} aria-hidden className={className} />
}
