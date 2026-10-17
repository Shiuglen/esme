// La luz de Esme: la vida no es un arcoíris, es bioluminiscencia. Tres tonos por tema (--luz, --luz-2, --luz-3):
// profundos sobre el papel de día, brillantes sobre el papel de tinta de noche. Sirve para SVG y para canvas.
let li: CanvasRenderingContext2D | null = null
const lienzoDe = () => (li ??= document.createElement('canvas').getContext('2d'))!
const rgb = (c: string) => {
  const t = c.trim()
  const mh = /^#([0-9a-f]{6})$/i.exec(t)
  if (mh) return [parseInt(mh[1].slice(0, 2), 16), parseInt(mh[1].slice(2, 4), 16), parseInt(mh[1].slice(4, 6), 16)]
  const m3 = /^(?:rgba?|hsla?)\(([^)]+)\)$/.exec(t)
  if (m3) {
    const p = m3[1].replace(/,/g, ' /').replace(/\//g, ' /').trim().split(/\s+/).filter(Boolean)
    const num = (s: string) => parseFloat(s)
    if (/^rgb/i.test(t)) {
      const v = [...p].map((s) => num(s) * (s.endsWith('%') ? 2.55 : 1))
      return [Math.round(v[0] ?? 0), Math.round(v[1] ?? 0), Math.round(v[2] ?? 0)]
    }
    // hsl → rgb a mano: los porcentajes son su escala, el tono en grados (31.6 formula clásica)
    const h = ((num(p[0] ?? 0) % 360) + 360) % 360 / 360, s = Math.min(1, Math.max(0, (num(p[1] ?? 0)) / 100)), l = Math.min(1, Math.max(0, (num(p[2] ?? 0)) / 100))
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s, m = 2 * l - q
    const canal = (n: number) => { const x = (n % 1 + 1) % 1; return x < 1 / 6 ? m + (q - m) * 6 * x : x < 1 / 2 ? q : x < 2 / 3 ? m + (q - m) * (2 / 3 - x) * 6 : m }
    return [Math.round(canal(h + 1 / 3) * 255), Math.round(canal(h) * 255), Math.round(canal(h - 1 / 3) * 255)]
  }
  // último recurso: el lienzo normaliza cualquier color válido; si ni eso, gris — nunca NaN
  const l = lienzoDe(); l.fillStyle = t; const s = String(l.fillStyle).match(/\d+\s*,\s*\d+\s*,\s*\d+/)?.[0]?.split(',').map((x) => +x.trim())
  if (s && s.length >= 3 && s.every((n) => !Number.isNaN(n))) return [s[0], s[1], s[2]]
  return [128, 128, 128]
}

export function mezclar(a: string, b: string, t: number): string {
  const x = rgb(a), y = rgb(b)
  return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * t)).join(' ')})`
}

/** Un ciclo de ida y vuelta por los tres tonos: 0 → el primero, 0,25 → el segundo, 0,5 → el tercero, 1 → el primero. */
export function cicloLuz(tonos: [string, string, string], fase: number): string {
  const f = ((fase % 1) + 1) % 1, g = f <= 0.5 ? f : 1 - f, p = g * 4
  return p <= 1 ? mezclar(tonos[0], tonos[1], p) : mezclar(tonos[1], tonos[2], p - 1)
}

let cache: { tema: string; tonos: [string, string, string] } | null = null
/** Los tres tonos de luz del tema activo (leídos del CSS una vez por tema). */
export function tonosLuz(): [string, string, string] {
  const raiz = document.documentElement, tema = raiz.dataset.theme ?? 'noche'
  if (cache?.tema === tema) return cache.tonos
  const css = getComputedStyle(raiz), v = (k: string, d: string) => css.getPropertyValue(k).trim() || d
  cache = { tema, tonos: [v('--luz', '#5ef0d4'), v('--luz-2', '#6cc6ff'), v('--luz-3', '#a68cff')] }
  return cache.tonos
}

/** La luz viva en el segundo `s`: recorre los tonos despacio (14 s por vuelta); `fase` desfasa cada elemento. */
export const luzViva = (s: number, fase = 0) => cicloLuz(tonosLuz(), s / 14 + fase)
