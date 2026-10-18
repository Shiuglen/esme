// Claves de IA cifradas con el llavero del sistema (safeStorage). Nunca salen del proceso main.
import { app, safeStorage } from 'electron'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { ProviderId } from './providers'

// además de los proveedores: la clave de Brave (buscar) y las de cada herramienta conectada (mcp:<herramienta>:<variable>)
export type IdClave = ProviderId | 'brave' | 'mente' | `mcp:${string}`
const file = () => join(app.getPath('userData'), 'keys.json')
const load = (): Record<string, string> => (existsSync(file()) ? JSON.parse(readFileSync(file(), 'utf8')) : {})

export const keys = {
  backend(): string {
    try { return (safeStorage as unknown as { getSelectedStorageBackend?: () => string }).getSelectedStorageBackend?.() ?? 'desconocido' } catch { return 'desconocido' }
  },
  /** true si el cifrado es real (no el modo texto plano de Linux sin llavero) */
  secure(): boolean { return safeStorage.isEncryptionAvailable() && keys.backend() !== 'basic_text' },
  has(id: IdClave) { return id in load() },
  get(id: IdClave): string | undefined {
    const v = load()[id]
    return v ? safeStorage.decryptString(Buffer.from(v, 'base64')) : undefined
  },
  set(id: IdClave, value: string) {
    const all = load(); all[id] = safeStorage.encryptString(value).toString('base64'); writeFileSync(file(), JSON.stringify(all), { mode: 0o600 })
  },
  remove(id: IdClave) { const all = load(); delete all[id]; writeFileSync(file(), JSON.stringify(all), { mode: 0o600 }) },
}
