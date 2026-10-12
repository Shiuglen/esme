// Uso de IA fuera de Esme: lee SOLO los contadores de tokens de los registros locales de Claude Code y Codex.
// Nunca guarda ni expone el contenido de las conversaciones: de cada línea se extraen marca de tiempo, modelo y números.
import { createReadStream } from 'node:fs'
import { readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'
import type { ModeloCatalogo } from '../catalogo/modelsdev'

export type Herramienta = 'claude-code' | 'codex'
export type ConsumoExterno = { herramienta: Herramienta; ts: number; modelo: string; entrada: number; salida: number; cacheLectura: number; cacheEscritura: number }
type Precio = Pick<ModeloCatalogo, 'coste'>
type Ventana = { tokens: number; costeUSD?: number }
export type VentanasHerramienta = { h5: Ventana; d7: Ventana; ritmoPorHora: number; porDia: { dia: string; tokens: number }[] }

const H = 3600e3, D = 24 * H
const num = (x: unknown): number => (typeof x === 'number' && Number.isFinite(x) && x > 0 ? x : 0)
const obj = (x: unknown): Record<string, unknown> | undefined => (x && typeof x === 'object' && !Array.isArray(x) ? (x as Record<string, unknown>) : undefined)
const tokensDe = (c: ConsumoExterno) => c.entrada + c.salida + c.cacheLectura + c.cacheEscritura

// --- Caché incremental por fichero ------------------------------------------------------------
type EstadoFichero = { mtimeMs: number; size: number; offset: number; claude: Map<string, ConsumoExterno>; codex: ConsumoExterno[]; modelo: string; ultimoTotal: number }
const cache = new Map<string, EstadoFichero>()
export function vaciarCacheExterno(): void { cache.clear() }

async function ficheros(dir: string, desde: number): Promise<{ ruta: string; mtimeMs: number; size: number }[]> {
  const out: { ruta: string; mtimeMs: number; size: number }[] = []
  const rec = async (d: string): Promise<void> => {
    let ents
    try { ents = await readdir(d, { withFileTypes: true }) } catch { return }
    for (const e of ents) {
      const ruta = join(d, e.name)
      if (e.isDirectory()) await rec(ruta)
      else if (e.isFile() && e.name.endsWith('.jsonl')) {
        try { const s = await stat(ruta); if (s.mtimeMs >= desde) out.push({ ruta, mtimeMs: s.mtimeMs, size: s.size }) } catch { /* desapareció */ }
      }
    }
  }
  await rec(dir)
  return out
}

// Lee desde `offset` línea a línea (en streaming) y devuelve el offset tras la última línea completa.
async function lineasNuevas(ruta: string, offset: number, alLinea: (l: string) => void): Promise<number> {
  let resto = Buffer.alloc(0), consumido = offset
  try {
    for await (const chunk of createReadStream(ruta, { start: offset })) {
      resto = Buffer.concat([resto, chunk as Buffer])
      let i: number
      while ((i = resto.indexOf(10)) >= 0) {
        alLinea(resto.subarray(0, i).toString('utf8'))
        consumido += i + 1
        resto = resto.subarray(i + 1)
      }
    }
  } catch { /* fichero ilegible: se queda lo leído */ }
  return consumido
}

const parsear = (l: string): Record<string, unknown> | undefined => { if (!l.trim()) return undefined; try { return obj(JSON.parse(l)) } catch { return undefined } }
const marca = (v: unknown): number => { const t = typeof v === 'string' ? Date.parse(v) : NaN; return Number.isFinite(t) ? t : 0 }

async function actualizar(f: { ruta: string; mtimeMs: number; size: number }, alLinea: (e: EstadoFichero, l: string) => void): Promise<EstadoFichero> {
  let e = cache.get(f.ruta)
  if (e && e.mtimeMs === f.mtimeMs && e.size === f.size) return e
  if (!e || f.size < e.offset) { e = { mtimeMs: 0, size: 0, offset: 0, claude: new Map(), codex: [], modelo: 'desconocido', ultimoTotal: -1 }; cache.set(f.ruta, e) }
  const est = e
  est.offset = await lineasNuevas(f.ruta, est.offset, (l) => alLinea(est, l))
  est.mtimeMs = f.mtimeMs; est.size = f.size
  return est
}

// --- Claude Code: message.usage; cada mensaje se repite (una línea por bloque) con output_tokens creciente ---
function lineaClaude(e: EstadoFichero, l: string): void {
  const o = parsear(l); if (!o || o.type !== 'assistant') return
  const m = obj(o.message), u = obj(m?.usage), modelo = m?.model
  if (!m || !u || typeof modelo !== 'string' || modelo.startsWith('<')) return
  const ts = marca(o.timestamp); if (!ts) return
  const c: ConsumoExterno = { herramienta: 'claude-code', ts, modelo, entrada: num(u.input_tokens), salida: num(u.output_tokens), cacheLectura: num(u.cache_read_input_tokens), cacheEscritura: num(u.cache_creation_input_tokens) }
  if (!tokensDe(c)) return
  const id = typeof m.id === 'string' ? m.id : typeof o.uuid === 'string' ? o.uuid : undefined
  if (!id) return
  fusionar(e.claude, `${id}|${typeof o.requestId === 'string' ? o.requestId : ''}`, c)
}
function fusionar(mapa: Map<string, ConsumoExterno>, clave: string, c: ConsumoExterno): void {
  const p = mapa.get(clave)
  if (!p) { mapa.set(clave, c); return }
  mapa.set(clave, { ...p, ts: Math.min(p.ts, c.ts), entrada: Math.max(p.entrada, c.entrada), salida: Math.max(p.salida, c.salida), cacheLectura: Math.max(p.cacheLectura, c.cacheLectura), cacheEscritura: Math.max(p.cacheEscritura, c.cacheEscritura) })
}

export async function leerUsoClaudeCode(dir: string, desde: number): Promise<ConsumoExterno[]> {
  const global = new Map<string, ConsumoExterno>()   // mismo mensaje copiado en varios ficheros (subagentes, reanudaciones)
  for (const f of await ficheros(dir, desde)) {
    const e = await actualizar(f, lineaClaude)
    for (const [k, c] of e.claude) fusionar(global, k, c)
  }
  return [...global.values()].filter((c) => c.ts >= desde)
}

// --- Codex: turn_context.model y event_msg/token_count con last_token_usage (input incluye lo cacheado) ---
function lineaCodex(e: EstadoFichero, l: string): void {
  const o = parsear(l); const p = obj(o?.payload); if (!o || !p) return
  if (o.type === 'turn_context') { if (typeof p.model === 'string') e.modelo = p.model; return }
  if (o.type !== 'event_msg' || p.type !== 'token_count') return
  const info = obj(p.info), ultimo = obj(info?.last_token_usage); if (!ultimo) return
  const total = num(obj(info?.total_token_usage)?.total_tokens)
  if (total && total === e.ultimoTotal) return        // Codex repite el mismo evento
  if (total) e.ultimoTotal = total
  const ts = marca(o.timestamp); if (!ts) return
  const cache = num(ultimo.cached_input_tokens)
  const c: ConsumoExterno = { herramienta: 'codex', ts, modelo: e.modelo, entrada: Math.max(0, num(ultimo.input_tokens) - cache), salida: num(ultimo.output_tokens), cacheLectura: cache, cacheEscritura: 0 }
  if (tokensDe(c)) e.codex.push(c)
}

export async function leerUsoCodex(dir: string, desde: number): Promise<ConsumoExterno[]> {
  const out: ConsumoExterno[] = []
  for (const f of await ficheros(dir, desde)) out.push(...(await actualizar(f, lineaCodex)).codex)
  return out.filter((c) => c.ts >= desde)
}

// --- Ventanas ---------------------------------------------------------------------------------
const diaLocal = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export function ventanas(cs: ConsumoExterno[], ahora: number, precio?: (modelo: string) => Precio | undefined): Record<Herramienta, VentanasHerramienta> {
  const coste = (c: ConsumoExterno): number | undefined => {
    const k = precio?.(c.modelo)?.coste; if (!k) return undefined
    return (c.entrada * k.entrada + c.salida * k.salida + c.cacheLectura * (k.cacheLectura ?? k.entrada) + c.cacheEscritura * (k.cacheEscritura ?? k.entrada)) / 1e6
  }
  const una = (h: Herramienta): VentanasHerramienta => {
    const mias = cs.filter((c) => c.herramienta === h && c.ts <= ahora)
    const sumar = (min: number): Ventana => {
      const w = mias.filter((c) => c.ts > min)
      const v: Ventana = { tokens: w.reduce((s, c) => s + tokensDe(c), 0) }
      const costes = w.map(coste).filter((x): x is number => x !== undefined)
      if (costes.length) v.costeUSD = costes.reduce((s, x) => s + x, 0)
      return v
    }
    const h5 = sumar(ahora - 5 * H)
    const hoy = new Date(ahora)
    const dias = new Map<string, number>()
    for (let i = 29; i >= 0; i--) dias.set(diaLocal(new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - i)), 0)
    for (const c of mias) { const k = diaLocal(new Date(c.ts)); if (dias.has(k)) dias.set(k, dias.get(k)! + tokensDe(c)) }
    return { h5, d7: sumar(ahora - 7 * D), ritmoPorHora: h5.tokens / 5, porDia: [...dias].map(([dia, tokens]) => ({ dia, tokens })) }
  }
  return { 'claude-code': una('claude-code'), codex: una('codex') }
}

export type UsoExterno = { disponible: { claudeCode: boolean; codex: boolean }; ventanas: Record<Herramienta, VentanasHerramienta> }

// Lo que ve la interfaz: qué herramientas existen en el equipo y sus ventanas de los últimos 30 días.
export async function usoExterno(dirs: { claudeCode: string; codex: string }, ahora: number, precio?: (modelo: string) => Precio | undefined): Promise<UsoExterno> {
  const existe = (d: string) => stat(d).then((s) => s.isDirectory(), () => false)
  const desde = ahora - 30 * D
  const [cc, cx, dcc, dcx] = await Promise.all([leerUsoClaudeCode(dirs.claudeCode, desde), leerUsoCodex(dirs.codex, desde), existe(dirs.claudeCode), existe(dirs.codex)])
  return { disponible: { claudeCode: dcc, codex: dcx }, ventanas: ventanas([...cc, ...cx], ahora, precio) }
}
