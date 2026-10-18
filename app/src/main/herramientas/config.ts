// La configuración de las manos de Esme: qué herramientas tienen «siempre» o «nunca» y dónde está tu buscador propio.
// Se escribe a un temporal y se renombra; lo que no tiene la forma esperada se descarta sin romper nada.
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import type { Politica } from './permisos'

export type ConfigManos = { politicas: Record<string, Politica>; searxng?: string }

export function leerConfig(f: string): ConfigManos {
  let x: { politicas?: unknown; searxng?: unknown } = {}
  try { x = JSON.parse(readFileSync(f, 'utf8')) ?? {} } catch { /* primera vez o roto */ }
  const politicas = Object.fromEntries(Object.entries(x.politicas && typeof x.politicas === 'object' ? x.politicas : {})
    .filter(([, v]) => v === 'siempre' || v === 'preguntar' || v === 'nunca')) as Record<string, Politica>
  return { politicas, ...(typeof x.searxng === 'string' && /^https?:\/\//.test(x.searxng) ? { searxng: x.searxng } : {}) }
}

export function guardarConfig(f: string, c: ConfigManos): void {
  mkdirSync(dirname(f), { recursive: true })
  writeFileSync(`${f}.tmp`, JSON.stringify(c), { mode: 0o600 })
  renameSync(`${f}.tmp`, f)
}
