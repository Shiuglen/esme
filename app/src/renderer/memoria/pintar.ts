// Cómo se dibuja la mente en tinta sobre un lienzo. Lo comparten la red viva de Memoria y el grabado quieto de Inicio,
// así los dos dicen lo mismo con el mismo trazo: el color es la edad, el tamaño la confianza, el grafito lo no verificado.
import '@fontsource-variable/bodoni-moda/wght-italic.css'
import { mezclar } from '../tinta/luz'
import { forma, trazarMancha } from '../tinta/mancha'
import { esGrafito, nivelTinta, paletaTinta, radioTrazo } from '../tinta/trazo'
import type { Aguada } from './aguadas'

export const ROTULO = '"Bodoni Moda Variable", Georgia, serif'
const DIA = 864e5, TAU = Math.PI * 2

// enlaces[k][nivel]: k es lo largo del trazo (0 corto, 1 medio, 2 largo): lo lejano se dibuja a lápiz suave, lo cercano con firmeza
export type Tinta = { papel: string; tinta: string; grafito: string; trazos: string[]; enlaces: string[][]; grafitos: string[]; aguadas: string[]; noche: boolean }

/** La tinta del tema activo, leída del CSS (léela cuando el tema ya esté aplicado: un fotograma después de cambiarlo). */
export function leerTinta(): Tinta {
  const css = getComputedStyle(document.documentElement), v = (k: string) => css.getPropertyValue(k).trim()
  const trazos = paletaTinta({ fresca: v('--tinta-fresca') || '#15233d', vieja: v('--tinta-vieja') || '#6e5235' })
  const alfa = (a: number) => trazos.map((c) => c.replace(')', ` / ${a})`))
  const noche = document.documentElement.dataset.theme !== 'dia'
  const grafito = v('--grafito')
  return { papel: v('--papel'), tinta: v('--tinta'), grafito, trazos, noche,
    enlaces: (noche ? [0.42, 0.2, 0.07] : [0.5, 0.24, 0.08]).map(alfa), grafitos: ['80', '48', '1c'].map((a) => grafito + a),
    aguadas: trazos.map((c) => mezclar(c, v('--papel') || '#08090d', 0.55)) }
}

export const tintaDe = (tinta: Tinta, ref: number, fecha: number | undefined) => (fecha === undefined ? tinta.tinta : tinta.trazos[nivelTinta((ref - fecha) / DIA)])

/** Un punto nunca baja de ~1,5 px en pantalla: la trama de puntos se lee aunque la vista esté lejos. */
export const radioEn = (confianza: number | undefined, escala: number) => Math.max(radioTrazo(confianza), (0.75 + 0.55 * (confianza ?? 0.8)) / escala)

/** Las aguadas, opacas y con su línea de marea, en una capa aparte que se posa sobre el papel con una sola transparencia.
 *  Las grandes primero: cada una tapa los bordes de las de debajo, como recortes, y el centro denso no hace niebla. */
export function pintarAguadas(ctx: CanvasRenderingContext2D, capa: HTMLCanvasElement, aguadas: Aguada[], tinta: Tinta, escala: number, opacidad = 1) {
  const lienzo = ctx.canvas
  if (capa.width !== lienzo.width || capa.height !== lienzo.height) { capa.width = lienzo.width; capa.height = lienzo.height }
  const g = capa.getContext('2d')!
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, capa.width, capa.height); g.setTransform(ctx.getTransform())
  g.lineWidth = 1.6 / escala
  for (const a of [...aguadas].sort((p, q) => q.r - p.r)) {
    const nivel = a.dias === undefined ? 0 : nivelTinta(a.dias)
    g.beginPath(); trazarMancha(g, a.x, a.y, a.r, forma(`tema:${a.tema}`, 14, 0.82, 1.1))
    g.fillStyle = tinta.aguadas[nivel]; g.fill(); g.strokeStyle = tinta.trazos[nivel]; g.stroke()
  }
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = (tinta.noche ? 0.1 : 0.13) * opacidad; ctx.drawImage(capa, 0, 0); ctx.restore()
}

/** Los nombres de los temas como las regiones de un atlas grabado: el término principal en cursiva y el segundo, más
 *  pequeño y tenue, debajo. Los temas grandes primero (como mucho `maximo`), y ningún nombre pisa a otro. */
export function rotular(ctx: CanvasRenderingContext2D, centros: { tema: number; x: number; y: number; n: number }[], rotulos: Map<number, string[]>,
  tinta: Tinta, escala: number, { maximo = Infinity, cuerpo = 11.5, opacidad = 1 } = {}) {
  const puestos: number[][] = []
  ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round'
  for (const c of [...centros].sort((a, b) => b.n - a.n)) {
    if (puestos.length >= maximo) break
    const [uno, dos] = rotulos.get(c.tema) ?? []; if (!uno) continue
    const px = (cuerpo + Math.min(6.5, Math.sqrt(c.n) / 2.6)) / escala, px2 = px * 0.74
    ctx.font = `italic 500 ${px}px ${ROTULO}`; const w1 = ctx.measureText(uno).width
    ctx.font = `italic 400 ${px2}px ${ROTULO}`; const w2 = dos ? ctx.measureText(dos).width : 0
    const w = Math.max(w1, w2) / 2, y1 = dos ? c.y - px2 * 0.55 : c.y, y2 = c.y + px * 0.55
    const r = [c.x - w, y1 - px * 0.6, c.x + w, dos ? y2 + px2 * 0.6 : y1 + px * 0.6]
    if (puestos.some((p) => p[0] < r[2] && r[0] < p[2] && p[1] < r[3] && r[1] < p[3])) continue
    puestos.push(r)
    ctx.strokeStyle = tinta.papel; ctx.lineWidth = 3.5 / escala; ctx.fillStyle = tinta.tinta
    ctx.font = `italic 500 ${px}px ${ROTULO}`
    ctx.globalAlpha = 0.88 * opacidad; ctx.strokeText(uno, c.x, y1); ctx.globalAlpha = opacidad; ctx.fillText(uno, c.x, y1)
    if (dos) {
      ctx.font = `italic 400 ${px2}px ${ROTULO}`
      ctx.globalAlpha = 0.8 * opacidad; ctx.strokeText(dos, c.x, y2); ctx.globalAlpha = 0.72 * opacidad; ctx.fillText(dos, c.x, y2)
    }
  }
  ctx.restore()
}

/** Los recuerdos, todos de una vez y agrupados por tono de tinta: unos 24 rellenos en vez de uno por punto (el lienzo
 *  cobra por llamada, no por píxel). Los no verificados van juntos como anillos de grafito. */
export function pintarPuntos(ctx: CanvasRenderingContext2D, puntos: Iterable<{ id: string; x?: number; y?: number; fecha?: number; confianza?: number }>,
  ref: number, tinta: Tinta, escala: number) {
  const lotes = new Map<string, Path2D>(), anillos = new Path2D()
  let hayAnillos = false
  for (const n of puntos) {
    const x = n.x ?? 0, y = n.y ?? 0, r = radioEn(n.confianza, escala)
    if (esGrafito(n.confianza)) { anillos.moveTo(x + r * 0.9, y); anillos.arc(x, y, r * 0.9, 0, TAU); hayAnillos = true; continue }
    const color = tintaDe(tinta, ref, n.fecha)
    let p = lotes.get(color); if (!p) { p = new Path2D(); lotes.set(color, p) }
    if (r * escala >= 3.5) trazarMancha(p, x, y, r, forma(n.id, 9, 0.84, 1.1))
    else { p.moveTo(x + r, y); p.arc(x, y, r, 0, TAU) }
  }
  for (const [color, p] of lotes) { ctx.fillStyle = color; ctx.fill(p) }
  if (hayAnillos) { ctx.strokeStyle = tinta.grafito; ctx.lineWidth = Math.max(0.5, 0.8 / escala); ctx.stroke(anillos) }
}
