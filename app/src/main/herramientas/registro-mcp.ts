// El registro oficial de MCP (registry.modelcontextprotocol.io): casi 10.000 herramientas. Cada entrada se traduce a una
// ficha que Esme entiende: cómo conectarla (remota por HTTP, o local con npx/uvx) y qué claves pide. Las remotas se
// prefieren: no ejecutan nada en tu equipo. Lo que Esme aún no sabe lanzar (docker, nuget…) se descarta.
export type Variable = { nombre: string; descripcion: string; secreta: boolean; requerida: boolean; donde: 'env' | 'cabecera' }
export type Conexion = { tipo: 'remoto'; url: string } | { tipo: 'npm'; paquete: string; version?: string } | { tipo: 'pypi'; paquete: string; version?: string }
  | { tipo: 'forjada'; fichero: string }   // hecha por la Forja: se arranca con el Python de Esme
export type Ficha = { id: string; slug: string; titulo: string; descripcion: string; version: string; web?: string; conexion: Conexion; variables: Variable[] }

const GENERICO = /^(mcp|server|mcp-?server|main|default|api)$/i
const RAICES = new Set(['com', 'io', 'ai', 'app', 'dev', 'co', 'org', 'net', 'cloud', 'github', 'mcp', 'www', 'so', 'sh', 'me', 'xyz', 'tech'])
const limpio = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 24).replace(/_+$/, '')

/** El nombre corto que prefija sus acciones (figma__crear_marco): del final del nombre o, si es genérico, del dominio. */
export function slugDe(nombre: string): string {
  const [dominio = '', resto = ''] = nombre.split('/')
  // sin «mcp» ni «server», que no dicen nada; si queda algo muy corto (hf), manda el dominio (huggingface)
  const propio = limpio(resto).split('_').filter((p) => !/^(mcp|server)$/.test(p)).join('_')
  if (propio.length >= 3 && !GENERICO.test(propio)) return propio
  const parte = dominio.split('.').find((p) => !RAICES.has(p.toLowerCase()))
  return limpio(parte ?? (dominio || nombre)) || 'herramienta'
}

const texto = (x: unknown) => (typeof x === 'string' ? x : '')
const web = (u: unknown): u is string => typeof u === 'string' && /^https?:\/\//i.test(u)
const variable = (v: Record<string, unknown>, donde: Variable['donde']): Variable =>
  ({ nombre: texto(v.name), descripcion: texto(v.description), secreta: v.isSecret === true, requerida: v.isRequired === true, donde })

export function fichaDe(s: unknown): Ficha | null {
  const x = s as Record<string, unknown> | null
  if (!x || typeof x.name !== 'string') return null
  const slug = slugDe(x.name), legible = slug.replace(/_/g, ' ')
  const base = { id: x.name, slug, titulo: texto(x.title) || legible[0].toUpperCase() + legible.slice(1), descripcion: texto(x.description), version: texto(x.version), ...(web(x.websiteUrl) ? { web: x.websiteUrl } : {}) }
  const remota = (Array.isArray(x.remotes) ? x.remotes : []).find((r: Record<string, unknown>) => (r.type === 'streamable-http' || r.type === 'sse') && web(r.url)) as Record<string, unknown> | undefined
  if (remota) return { ...base, conexion: { tipo: 'remoto', url: remota.url as string }, variables: (Array.isArray(remota.headers) ? remota.headers : []).filter((h: Record<string, unknown>) => typeof h.name === 'string').map((h: Record<string, unknown>) => variable(h, 'cabecera')) }
  const paquetes = (Array.isArray(x.packages) ? x.packages : []) as Record<string, unknown>[]
  const p = paquetes.find((q) => q.registryType === 'npm' && typeof q.identifier === 'string') ?? paquetes.find((q) => q.registryType === 'pypi' && typeof q.identifier === 'string')
  if (!p) return null
  const variables = (Array.isArray(p.environmentVariables) ? p.environmentVariables : []).filter((v: Record<string, unknown>) => typeof v.name === 'string').map((v: Record<string, unknown>) => variable(v, 'env'))
  return { ...base, conexion: { tipo: p.registryType as 'npm' | 'pypi', paquete: p.identifier as string, ...(p.version ? { version: String(p.version) } : {}) }, variables }
}

const REGISTRO = 'https://registry.modelcontextprotocol.io/v0/servers'
/** Busca en el registro (reintenta: a veces responde 500). Devuelve fichas válidas, sin repetir. */
export async function buscarEnRegistro(q: string, f: typeof fetch = fetch, espera = 800): Promise<Ficha[]> {
  const url = `${REGISTRO}?version=latest&limit=40${q.trim() ? `&search=${encodeURIComponent(q.trim())}` : ''}`
  let ultimo: unknown
  for (let i = 0; i < 3; i++) {
    try {
      const r = await f(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(15_000) })
      if (!r.ok) throw new Error(`el registro respondió ${r.status}`)
      const j = (await r.json()) as { servers?: { server?: unknown }[] }
      const vistas = new Set<string>()
      return (j.servers ?? []).map((s) => fichaDe(s.server ?? s)).filter((x): x is Ficha => !!x && !vistas.has(x.id) && !!vistas.add(x.id))
    } catch (e) { ultimo = e; if (espera) await new Promise((r) => setTimeout(r, espera * (i + 1))) }
  }
  throw ultimo instanceof Error ? ultimo : new Error('El registro de herramientas no responde.')
}

/** Las oficiales de empresas conocidas: lo primero que ves en la Tienda. */
export const DESTACADAS = ['com.figma.mcp/mcp', 'com.notion/mcp', 'app.linear/linear', 'com.atlassian/atlassian-mcp-server', 'com.canva.mcp/mcp',
  'co.huggingface/hf-mcp-server', 'com.cloudflare.mcp/mcp', 'ai.exa/exa', 'ai.perplexity/mcp-server', 'com.neon/mcp', 'com.airtable/mcp', 'com.apify/apify-mcp-server', 'com.paypal.mcp/mcp']
