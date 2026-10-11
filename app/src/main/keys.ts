// Claves de IA cifradas con el llavero del sistema (safeStorage). Nunca salen del proceso main.
import { app, safeStorage } from 'electron'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { ProviderId } from './providers'

const file = () => join(app.getPath('userData'), 'keys.json')
const load = (): Record<string, string> => (existsSync(file()) ? JSON.parse(readFileSync(file(), 'utf8')) : {})

export const keys = {
  backend(): string {
    try { return (safeStorage as unknown as { getSelectedStorageBackend?: () => string }).getSelectedStorageBackend?.() ?? 'desconocido' } catch { return 'desconocido' }
  },
  /** true si el cifrado es real (no el modo texto plano de Linux sin llavero) */
  secure(): boolean { return safeStorage.isEncryptionAvailable() && keys.backend() !== 'basic_text' },
  has(id: ProviderId) { return id in load() },
  get(id: ProviderId): string | undefined {
    const v = load()[id]
    return v ? safeStorage.decryptString(Buffer.from(v, 'base64')) : undefined
  },
  set(id: ProviderId, value: string) {
    const all = load(); all[id] = safeStorage.encryptString(value).toString('base64'); writeFileSync(file(), JSON.stringify(all), { mode: 0o600 })
  },
  remove(id: ProviderId) { const all = load(); delete all[id]; writeFileSync(file(), JSON.stringify(all), { mode: 0o600 }) },
}
