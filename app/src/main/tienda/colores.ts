// Los colores de una referencia: lo que una web dice de sí misma con su CSS. De aquí sale una piel de Esme.
//
// La red la tiene el proceso principal (la ventana no sale a internet). Aquí se baja el HTML y se leen sus colores:
// los del <meta theme-color>, los hex del CSS y los rgb()/hsl() de los estilos en línea. Lo que sale es una lista con
// los que más se repiten: lo que una web usa de verdad, no lo que dice en un comentario.
const HEX = /#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})\b/gi
const RGB = /rgba?\(\s*([\d.]+%?)\s*[,\s]\s*([\d.]+%?)\s*[,\s]\s*([\d.]+%?)\s*(?:[,/]\s*([\d.]+%?)\s*)?\)/gi
const HSL = /hsla?\(\s*([\d.]+)(?:deg)?\s*[,\s]\s*([\d.]+)%\s*[,\s]\s*([\d.]+)%/gi

/** Expande un hex de 3 a 6, y quita la transparencia. */
function normaliza(hex: string): string {
  const h = hex.replace('#', '').toLowerCase()
  const full = h.length === 3 ? [...h].map((c) => c + c).join('') : h.slice(0, 6)
  return `#${full}`
}

/** Los colores de un HTML, del más repetido al menos. */
export function coloresDe(html: string, max = 14): string[] {
  const cuenta = new Map<string, number>()
  const suma = (c: string) => { if (!c) return; cuenta.set(c, (cuenta.get(c) ?? 0) + 1) }

  // el color que la web dice de sí misma
  for (const m of html.matchAll(/<meta[^>]+name=["']theme-color["'][^>]+content=["'](#[0-9a-f]{3,8})["']/gi)) suma(normaliza(m[1]))

  // los del CSS y de los estilos en línea
  for (const m of html.matchAll(HEX)) suma(normaliza(m[1]))
  for (const m of html.matchAll(RGB)) {
    const [r, g, b] = [m[1], m[2], m[3]].map((x) => (x.endsWith('%') ? Math.round((parseFloat(x) / 100) * 255) : Math.round(parseFloat(x))))
    if ([r, g, b].every((x) => x >= 0 && x <= 255)) suma(`#${[r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('')}`)
  }
  for (const m of html.matchAll(HSL)) {
    const h = ((parseFloat(m[1]) % 360) + 360) % 360 / 360, s = Math.min(1, Math.max(0, parseFloat(m[2]) / 100)), l = Math.min(1, Math.max(0, parseFloat(m[3]) / 100))
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s, m2 = 2 * l - q
    const canal = (n: number) => { const x = (n % 1 + 1) % 1; return x < 1 / 6 ? m2 + (q - m2) * 6 * x : x < 1 / 2 ? q : x < 2 / 3 ? m2 + (q - m2) * (2 / 3 - x) * 6 : m2 }
    suma(`#${[canal(h + 1 / 3) * 255, canal(h) * 255, canal(h - 1 / 3) * 255].map((x) => Math.round(Math.min(255, Math.max(0, x))).toString(16).padStart(2, '0')).join('')}`)
  }

  return [...cuenta.entries()].sort((a, b) => b[1] - a[1]).slice(0, max).map(([c]) => c)
}

/** Las hojas de estilo que enlaza la página: muchas webs esconden sus colores ahí, no en el HTML. */
function hojasDe(html: string, base: string): string[] {
  const out: string[] = []
  for (const m of html.matchAll(/<link[^>]+rel=["']stylesheet["'][^>]*>/gi)) {
    const href = m[0].match(/href=["']([^"']+)["']/i)?.[1]
    if (!href) continue
    try { out.push(new URL(href, base).toString()) } catch { /* href raro */ }
  }
  return out.slice(0, 3)
}

export type ResultadoColores = { ok: true; colores: string[]; titulo: string } | { ok: false; error: string }

/** Los colores de una página: se la pide al proceso principal (la ventana no sale a internet). */
export async function coloresDeUrl(url: string, f: typeof fetch = fetch): Promise<ResultadoColores> {
  try {
    const r = await f(url, { redirect: 'follow', signal: AbortSignal.timeout(12_000), headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Esme/1.0)' } })
    if (!r.ok) return { ok: false, error: `esa página respondió ${r.status}` }
    const html = await r.text()
    let colores = coloresDe(html)
    // si la página no dice sus colores, están en su CSS: se sigue el enlace
    if (colores.length < 3) {
      for (const h of hojasDe(html, url)) {
        try {
          const c = await f(h, { signal: AbortSignal.timeout(8000), headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Esme/1.0)' } })
          if (c.ok) colores = [...new Set([...colores, ...coloresDe(await c.text())])]
        } catch { /* esa hoja no se deja leer: seguimos con lo que haya */ }
      }
    }
    if (!colores.length) return { ok: false, error: 'esa página no dice qué colores usa' }
    const titulo = html.match(/<title[^>]*>([^<]{1,80})<\/title>/i)?.[1]?.trim() ?? new URL(url).hostname
    return { ok: true, colores, titulo }
  } catch (e) {
    return { ok: false, error: e instanceof Error && e.name === 'TimeoutError' ? 'esa página tardó demasiado' : 'no pude ver esa página' }
  }
}
