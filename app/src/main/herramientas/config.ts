// La configuración de las manos de Esme: qué herramientas tienen «siempre» o «nunca», dónde está tu buscador propio y
// qué herramientas MCP tienes conectadas (con sus valores no secretos; los secretos van al llavero).
// Se escribe a un temporal y se renombra; lo que no tiene la forma esperada se descarta sin romper nada.
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import type { Conectada } from './lanzar-mcp'
import type { Politica } from './permisos'

export type ConfigManos = { politicas: Record<string, Politica>; searxng?: string; conectadas?: Conectada[]; valores?: Record<string, Record<string, string>> }

const objeto = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x)
const conectadaValida = (c: unknown): c is Conectada => {
  if (!objeto(c) || typeof c.activa !== 'boolean' || !objeto(c.ficha)) return false
  const f = c.ficha, k = f.conexion
  return typeof f.id === 'string' && typeof f.slug === 'string' && /^[a-z0-9_]{1,24}$/.test(f.slug) && typeof f.titulo === 'string' && Array.isArray(f.variables)
    && objeto(k) && ((k.tipo === 'remoto' && typeof k.url === 'string' && /^https?:\/\//.test(k.url)) || ((k.tipo === 'npm' || k.tipo === 'pypi') && typeof k.paquete === 'string') || (k.tipo === 'forjada' && typeof k.fichero === 'string' && k.fichero.endsWith('.py')))
}

export function leerConfig(f: string): ConfigManos {
  let x: Record<string, unknown> = {}
  try { const j = JSON.parse(readFileSync(f, 'utf8')); if (objeto(j)) x = j } catch { /* primera vez o roto */ }
  const politicas = Object.fromEntries(Object.entries(objeto(x.politicas) ? x.politicas : {})
    .filter(([, v]) => v === 'siempre' || v === 'preguntar' || v === 'nunca')) as Record<string, Politica>
  const conectadas = Array.isArray(x.conectadas) ? x.conectadas.filter(conectadaValida) : []
  const valores = Object.fromEntries(Object.entries(objeto(x.valores) ? x.valores : {})
    .filter(([, v]) => objeto(v) && Object.values(v).every((y) => typeof y === 'string'))) as Record<string, Record<string, string>>
  return {
    politicas,
    ...(typeof x.searxng === 'string' && /^https?:\/\//.test(x.searxng) ? { searxng: x.searxng } : {}),
    ...(conectadas.length ? { conectadas } : {}),
    ...(Object.keys(valores).length ? { valores } : {}),
  }
}

export function guardarConfig(f: string, c: ConfigManos): void {
  mkdirSync(dirname(f), { recursive: true })
  writeFileSync(`${f}.tmp`, JSON.stringify(c), { mode: 0o600 })
  renameSync(`${f}.tmp`, f)
}
