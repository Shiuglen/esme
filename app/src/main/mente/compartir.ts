// Tu mente para todas tus IAs («adiós a los .md»): Esme registra su memoria (el MCP del cerebro, siempre en el mismo
// puerto local y con un token fijo) en la configuración de cada agente que usas fuera de ella. Cada agente tiene su
// formato; aquí se escribe solo la entrada «esme», sin tocar lo demás, con una copia del fichero anterior.
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

type Json = Record<string, unknown>
export type Agente = { id: string; nombre: string; fichero: string; clave: 'mcpServers' | 'mcp'; subclave?: string; entrada(url: string, cabeceras: Record<string, string>): Json }

export const AGENTES: Agente[] = [
  { id: 'claude-code', nombre: 'Claude Code', fichero: '.claude.json', clave: 'mcpServers', entrada: (url, headers) => ({ type: 'http', url, headers }) },
  { id: 'gemini', nombre: 'Gemini CLI', fichero: '.gemini/settings.json', clave: 'mcpServers', entrada: (httpUrl, headers) => ({ httpUrl, headers }) },
  { id: 'qwen', nombre: 'Qwen Code', fichero: '.qwen/settings.json', clave: 'mcpServers', entrada: (httpUrl, headers) => ({ httpUrl, headers }) },
  { id: 'cursor', nombre: 'Cursor', fichero: '.cursor/mcp.json', clave: 'mcpServers', entrada: (url, headers) => ({ url, headers }) },
  // OpenCode anida los servidores en mcp.servers; la forma plana (mcp.esme) está en desuso y
  // OpenCode puede dejar de leerla: con la anidada la memoria llega al agente y no por casualidad.
  { id: 'opencode', nombre: 'OpenCode', fichero: '.config/opencode/opencode.json', clave: 'mcp', subclave: 'servers', entrada: (url, headers) => ({ type: 'remote', url, headers, enabled: true }) },
]

const objeto = (x: unknown): x is Json => !!x && typeof x === 'object' && !Array.isArray(x)
/** La sección donde viven los servidores MCP de este agente (con OpenCode, un nivel más abajo). */
function seccion(json: Json, a: Agente): Json {
  const raiz = objeto(json[a.clave]) ? (json[a.clave] as Json) : {}
  if (!a.subclave) return raiz
  return objeto(raiz[a.subclave]) ? (raiz[a.subclave] as Json) : {}
}
export function conEsme(json: Json, a: Agente, url: string, token: string): Json {
  const entrada = a.entrada(url, { Authorization: `Bearer ${token}` })
  if (!a.subclave) {
    const previos = objeto(json[a.clave]) ? (json[a.clave] as Json) : {}
    return { ...json, [a.clave]: { ...previos, esme: entrada } }
  }
  const raiz = objeto(json[a.clave]) ? (json[a.clave] as Json) : {}
  const previos = objeto(raiz[a.subclave]) ? (raiz[a.subclave] as Json) : {}
  const { esme: _plano, ...raizSinPlano } = raiz      // la forma plana en desuso se retira al conectar
  return { ...json, [a.clave]: { ...raizSinPlano, [a.subclave]: { ...previos, esme: entrada } } }
}
export function sinEsme(json: Json, a: Agente): Json {
  const raiz = objeto(json[a.clave]) ? (json[a.clave] as Json) : {}
  if (!a.subclave) {
    const { esme: _fuera, ...resto } = raiz
    if (Object.keys(resto).length) return { ...json, [a.clave]: resto }
    const { [a.clave]: _vacia, ...sinClave } = json
    return sinClave
  }
  const sub = objeto(raiz[a.subclave]) ? (raiz[a.subclave] as Json) : {}
  const { esme: _fuera, ...subResto } = sub
  const { esme: _plano, ...raizResto } = raiz          // también se quita la forma plana que quedara
  const { [a.subclave]: _vaciaSub, ...raizSinSub } = raizResto
  const nuevo = Object.keys(subResto).length ? { ...raizResto, [a.subclave]: subResto } : raizSinSub
  if (Object.keys(nuevo).length) return { ...json, [a.clave]: nuevo }
  const { [a.clave]: _vacia, ...sinClave } = json
  return sinClave
}
export const estaConectado = (json: Json, a: Agente) => {
  const raiz = objeto(json[a.clave]) ? (json[a.clave] as Json) : {}
  return 'esme' in seccion(json, a) || 'esme' in raiz
}

function leer(f: string): Json {
  if (!existsSync(f)) return {}
  try { const j = JSON.parse(readFileSync(f, 'utf8')); if (objeto(j)) return j } catch { /* abajo */ }
  throw new Error(`${f} no es JSON válido: no lo toco.`)
}
function escribir(f: string, j: Json, copia: boolean) {
  mkdirSync(dirname(f), { recursive: true })
  if (copia && existsSync(f) && !existsSync(`${f}.antes-de-esme`)) writeFileSync(`${f}.antes-de-esme`, readFileSync(f), { mode: 0o600 })
  writeFileSync(`${f}.tmp`, `${JSON.stringify(j, null, 2)}\n`, { mode: 0o600 })
  renameSync(`${f}.tmp`, f)
}

export function conectar(a: Agente, home: string, url: string, token: string) { const f = join(home, a.fichero); escribir(f, conEsme(leer(f), a, url, token), true) }
export function desconectar(a: Agente, home: string) { const f = join(home, a.fichero); if (existsSync(f)) escribir(f, sinEsme(leer(f), a), false) }

/**
 * La entrada de tu mente, en texto, para dársela a otra IA (o a otra persona).
 *
 * **El token no vuelve al renderer:** esto se compone en el proceso principal y va
 * directamente al portapapeles. La ventana sólo sabe que se copió.
 *
 * La forma es la de Claude Code (`type: "http"`), que es la que más clientes aceptan;
 * los demás cambian dos palabras (la tabla está en el propio texto).
 */
export function entradaParaCopiar(url: string, token: string): string {
  const entrada = { type: 'http', url: `${url}/mcp`, headers: { Authorization: `Bearer ${token}` } }
  return JSON.stringify({ mcpServers: { esme: entrada } }, null, 2)
}
/** Qué agentes tienes (su carpeta existe) y en cuáles ya está tu mente. */
export function estados(home: string) {
  return AGENTES.map((a) => {
    const f = join(home, a.fichero), instalado = existsSync(f) || (a.fichero.includes('/') && existsSync(dirname(f)))
    let conectado = false
    try { conectado = estaConectado(leer(f), a) } catch { /* fichero raro: no conectado */ }
    return { id: a.id, nombre: a.nombre, fichero: f, instalado, conectado }
  })
}
