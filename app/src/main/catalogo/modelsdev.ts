// Catálogo de proveedores y modelos desde models.dev (precios en USD por 1M de tokens), con caché y semilla.
import { readFileSync, writeFileSync, statSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import semillaEmpaquetada from './fixtures/modelsdev-muestra.json'

export type ModeloCatalogo = { id: string; nombre: string; proveedor: string; contexto: number; salida: number
  coste: { entrada: number; salida: number; cacheLectura?: number; cacheEscritura?: number }
  herramientas: boolean; razonamiento: boolean; modalidades: string[]; pesosAbiertos: boolean; gratis: boolean }
export type ProveedorCatalogo = { id: string; nombre: string; env: string[]; npm?: string; api?: string; doc?: string; modelos: ModeloCatalogo[] }

const obj = (x: unknown): Record<string, unknown> | null => (x && typeof x === 'object' && !Array.isArray(x) ? (x as Record<string, unknown>) : null)
const num = (x: unknown): number => (typeof x === 'number' && Number.isFinite(x) && x >= 0 ? x : 0)
const numOpt = (x: unknown): number | undefined => (typeof x === 'number' && Number.isFinite(x) && x >= 0 ? x : undefined)
const str = (x: unknown): string | undefined => (typeof x === 'string' && x ? x : undefined)

function parseModelo(proveedor: string, clave: string, raw: unknown): ModeloCatalogo | null {
  const m = obj(raw); if (!m) return null
  const id = str(m.id) ?? clave
  const c = obj(m.cost), lim = obj(m.limit), mod = obj(m.modalities)
  const coste: ModeloCatalogo['coste'] = { entrada: num(c?.input), salida: num(c?.output) }
  const cl = numOpt(c?.cache_read), ce = numOpt(c?.cache_write)
  if (cl !== undefined) coste.cacheLectura = cl
  if (ce !== undefined) coste.cacheEscritura = ce
  const entrada = Array.isArray(mod?.input) ? (mod!.input as unknown[]).filter((x): x is string => typeof x === 'string') : []
  // Sin objeto de coste el precio es desconocido: no se considera gratis.
  const gratis = id.endsWith(':free') || (!!c && coste.entrada === 0 && coste.salida === 0)
  return { id, nombre: str(m.name) ?? id, proveedor, contexto: num(lim?.context), salida: num(lim?.output), coste,
    herramientas: m.tool_call === true, razonamiento: m.reasoning === true, modalidades: entrada, pesosAbiertos: m.open_weights === true, gratis }
}

export function parseModelsDev(json: unknown): ProveedorCatalogo[] {
  const raiz = obj(json); if (!raiz) return []
  const out: ProveedorCatalogo[] = []
  for (const [clave, rawP] of Object.entries(raiz)) {
    const p = obj(rawP), ms = obj(p?.models); if (!p || !ms) continue
    const id = str(p.id) ?? clave
    const modelos = Object.entries(ms).map(([k, v]) => parseModelo(id, k, v)).filter((x): x is ModeloCatalogo => !!x)
    if (!modelos.length) continue
    out.push({ id, nombre: str(p.name) ?? id, env: Array.isArray(p.env) ? p.env.filter((x): x is string => typeof x === 'string') : [],
      npm: str(p.npm), api: str(p.api), doc: str(p.doc), modelos })
  }
  return out
}

const URL_API = 'https://models.dev/api.json'

export async function cargarCatalogo(o: { dirCache: string; f?: typeof fetch; ahora?: () => number; maxEdadMs?: number; semilla?: unknown }):
  Promise<{ proveedores: ProveedorCatalogo[]; origen: 'red' | 'cache' | 'semilla'; fecha: number }> {
  const ahora = o.ahora ?? Date.now, f = o.f ?? fetch, max = o.maxEdadMs ?? 24 * 3600e3
  const archivo = join(o.dirCache, 'catalogo-modelsdev.json')
  const leerCache = () => { try { const ps = parseModelsDev(JSON.parse(readFileSync(archivo, 'utf8'))); return ps.length ? { ps, fecha: statSync(archivo).mtimeMs } : null } catch { return null } }
  const cache = leerCache()
  if (cache && ahora() - cache.fecha < max) return { proveedores: cache.ps, origen: 'cache', fecha: cache.fecha }
  try {
    const r = await f(URL_API, { signal: AbortSignal.timeout(8000) })
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    const crudo = await r.json(), ps = parseModelsDev(crudo)
    if (!ps.length) throw new Error('catálogo vacío')
    try { mkdirSync(o.dirCache, { recursive: true }); writeFileSync(archivo, JSON.stringify(crudo)) } catch { /* caché opcional */ }
    return { proveedores: ps, origen: 'red', fecha: ahora() }
  } catch {
    if (cache) return { proveedores: cache.ps, origen: 'cache', fecha: cache.fecha }
    const semilla = parseModelsDev(o.semilla ?? semillaEmpaquetada)
    return { proveedores: semilla, origen: 'semilla', fecha: ahora() }
  }
}
