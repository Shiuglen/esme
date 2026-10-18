// Buscar y leer en internet, para las manos de Esme (docs/superpowers/specs/2026-10-18-manos.md). Sin trucos contra
// los buscadores: Brave con la clave gratuita del usuario, un SearXNG propio (por ejemplo, en su servidor) o Wikipedia,
// que siempre responde. Cada fuente se traduce a la misma forma: { titulo, url, resumen }.
export type Resultado = { titulo: string; url: string; resumen: string }
export type ConfigBusqueda = { brave?: string; searxng?: string }

const ENTIDADES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'" }
const decodificar = (s: string) => s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+\d*);/gi, (m, e: string) =>
  e[0] === '#' ? String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : Number(e.slice(1))) : ENTIDADES[e.toLowerCase()] ?? m)
const plano = (s: unknown) => (typeof s === 'string' ? decodificar(s.replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ').trim() : '')
const web = (u: unknown): u is string => typeof u === 'string' && /^https?:\/\//i.test(u)
const lista = (x: unknown): Record<string, unknown>[] => (Array.isArray(x) ? x.filter((y) => y && typeof y === 'object') : [])

export const deBrave = (j: unknown): Resultado[] =>
  lista((j as { web?: { results?: unknown } } | null)?.web?.results).filter((r) => web(r.url)).map((r) => ({ titulo: plano(r.title), url: r.url as string, resumen: plano(r.description) }))
export const deSearx = (j: unknown): Resultado[] =>
  lista((j as { results?: unknown } | null)?.results).filter((r) => web(r.url)).map((r) => ({ titulo: plano(r.title), url: r.url as string, resumen: plano(r.content) }))
export const deWikipedia = (j: unknown, idioma: string): Resultado[] =>
  lista((j as { query?: { search?: unknown } } | null)?.query?.search).filter((r) => typeof r.title === 'string').map((r) => ({
    titulo: r.title as string, url: `https://${idioma}.wikipedia.org/wiki/${encodeURIComponent((r.title as string).replace(/ /g, '_'))}`, resumen: plano(r.snippet) }))

const UA = 'Esme/0.1 (asistente de escritorio; https://github.com/Shiuglen/esme)'
async function pedir(f: typeof fetch, url: string, headers: Record<string, string> = {}): Promise<unknown> {
  const r = await f(url, { headers: { 'User-Agent': UA, Accept: 'application/json', ...headers }, signal: AbortSignal.timeout(12_000) })
  if (!r.ok) throw new Error(`${r.status}`)
  return r.json()
}

/** Busca con la mejor fuente configurada; si falla, cae a Wikipedia. Nunca pone una clave en la URL. */
export async function buscarWeb(q: string, cfg: ConfigBusqueda, f: typeof fetch = fetch, idioma = 'es'): Promise<{ fuente: string; resultados: Resultado[] }> {
  const consulta = encodeURIComponent(q)
  if (cfg.brave) {
    try { return { fuente: 'Brave', resultados: deBrave(await pedir(f, `https://api.search.brave.com/res/v1/web/search?q=${consulta}&count=8`, { 'X-Subscription-Token': cfg.brave })) } } catch { /* cae */ }
  }
  if (cfg.searxng) {
    try { return { fuente: 'SearXNG', resultados: deSearx(await pedir(f, `${cfg.searxng.replace(/\/+$/, '')}/search?q=${consulta}&format=json`)).slice(0, 8) } } catch { /* cae */ }
  }
  // Wikipedia en tu idioma y, si no encuentra nada (el modelo suele buscar en inglés), en la inglesa
  const wiki = async (l: string) => deWikipedia(await pedir(f, `https://${l}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${consulta}&format=json&srlimit=6`), l)
  const propios = await wiki(idioma)
  return { fuente: 'Wikipedia', resultados: propios.length || idioma === 'en' ? propios : await wiki('en') }
}

/** El texto legible de una página: sin scripts, estilos ni navegación; con su título. */
export function textoDeHtml(html: string, max = 12_000): { titulo: string; texto: string } {
  const titulo = plano(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? '')
  const cuerpo = html.replace(/<head[\s\S]*?<\/head>/i, '').replace(/<(script|style|noscript|svg|nav|footer|iframe)[\s\S]*?<\/\1>/gi, '')
    .replace(/<\/(p|div|h[1-6]|li|tr|section|article|br)>|<br\s*\/?>/gi, '\n')
  const texto = decodificar(cuerpo.replace(/<[^>]*>/g, '')).split('\n').map((l) => l.replace(/[ \t ]+/g, ' ').trim()).filter(Boolean).join('\n')
  return { titulo, texto: texto.length > max ? `${texto.slice(0, max)}…` : texto }
}

/** Lee una página web (solo http/https, como mucho 2 MB) y devuelve su texto. */
export async function leerPagina(url: string, f: typeof fetch = fetch): Promise<{ titulo: string; texto: string; url: string }> {
  if (!web(url)) throw new Error('Solo se pueden leer direcciones http o https.')
  const r = await f(url, { headers: { 'User-Agent': UA, Accept: 'text/html,text/plain;q=0.9,*/*;q=0.5' }, redirect: 'follow', signal: AbortSignal.timeout(15_000) })
  if (!r.ok) throw new Error(`La página respondió ${r.status}.`)
  const tipo = r.headers.get('content-type') ?? ''
  const crudo = (await r.text()).slice(0, 2_000_000)
  return { url: r.url || url, ...(tipo.includes('html') || /^\s*</.test(crudo) ? textoDeHtml(crudo) : { titulo: '', texto: crudo.slice(0, 12_000) }) }
}
