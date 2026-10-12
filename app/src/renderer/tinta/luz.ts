// La luz de Esme: la vida no es un arcoíris, es bioluminiscencia. Tres tonos por tema (--luz, --luz-2, --luz-3):
// profundos sobre el papel de día, brillantes sobre el papel de tinta de noche. Sirve para SVG y para canvas.
const rgb = (c: string) => {
  const m = c.match(/^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/)
  if (m) return [Number(m[1]), Number(m[2]), Number(m[3])]
  const n = parseInt(c.replace('#', '').slice(0, 6), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
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
