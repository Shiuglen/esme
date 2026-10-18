// Tu mente para todas tus IAs («adiós a los .md»): Esme registra su memoria (el MCP del cerebro, siempre en el mismo
// puerto local y con un token fijo) en la configuración de cada agente que usas fuera de ella. Cada agente tiene su
// formato; aquí se escribe solo la entrada «esme», sin tocar lo demás, con una copia del fichero anterior.
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

type Json = Record<string, unknown>
export type Agente = { id: string; nombre: string; fichero: string; clave: 'mcpServers' | 'mcp'; entrada(url: string, cabeceras: Record<string, string>): Json }

export const AGENTES: Agente[] = [
  { id: 'claude-code', nombre: 'Claude Code', fichero: '.claude.json', clave: 'mcpServers', entrada: (url, headers) => ({ type: 'http', url, headers }) },
  { id: 'gemini', nombre: 'Gemini CLI', fichero: '.gemini/settings.json', clave: 'mcpServers', entrada: (httpUrl, headers) => ({ httpUrl, headers }) },
  { id: 'qwen', nombre: 'Qwen Code', fichero: '.qwen/settings.json', clave: 'mcpServers', entrada: (httpUrl, headers) => ({ httpUrl, headers }) },
  { id: 'cursor', nombre: 'Cursor', fichero: '.cursor/mcp.json', clave: 'mcpServers', entrada: (url, headers) => ({ url, headers }) },
  { id: 'opencode', nombre: 'OpenCode', fichero: '.config/opencode/opencode.json', clave: 'mcp', entrada: (url, headers) => ({ type: 'remote', url, headers, enabled: true }) },
]

const objeto = (x: unknown): x is Json => !!x && typeof x === 'object' && !Array.isArray(x)
export function conEsme(json: Json, a: Agente, url: string, token: string): Json {
  const previos = objeto(json[a.clave]) ? (json[a.clave] as Json) : {}
  return { ...json, [a.clave]: { ...previos, esme: a.entrada(url, { Authorization: `Bearer ${token}` }) } }
}
export function sinEsme(json: Json, a: Agente): Json {
  if (!objeto(json[a.clave])) return json
  const { esme: _fuera, ...resto } = json[a.clave] as Json
  if (Object.keys(resto).length) return { ...json, [a.clave]: resto }
  const { [a.clave]: _vacia, ...sinClave } = json
  return sinClave
}
export const estaConectado = (json: Json, a: Agente) => objeto(json[a.clave]) && 'esme' in (json[a.clave] as Json)

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
/** Qué agentes tienes (su carpeta existe) y en cuáles ya está tu mente. */
export function estados(home: string) {
  return AGENTES.map((a) => {
    const f = join(home, a.fichero), instalado = existsSync(f) || (a.fichero.includes('/') && existsSync(dirname(f)))
    let conectado = false
    try { conectado = estaConectado(leer(f), a) } catch { /* fichero raro: no conectado */ }
    return { id: a.id, nombre: a.nombre, fichero: f, instalado, conectado }
  })
}
