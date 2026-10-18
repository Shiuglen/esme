// Windows y macOS no distinguen mayúsculas en los nombres de fichero: `Tiempo.tsx` junto a `tiempo.ts` hace que
// `import './Tiempo'` cargue `tiempo.ts` y la versión de esos sistemas no compile (pasó el 18-oct). Esto lo impide.
import { describe, it, expect } from 'vitest'
import { readdirSync, statSync } from 'node:fs'
import { join, parse } from 'node:path'
import { fileURLToPath } from 'node:url'

function choques(dir: string, fuera: string[] = []): string[] {
  const nombres = new Map<string, string>()
  for (const f of readdirSync(dir)) {
    const ruta = join(dir, f)
    if (statSync(ruta).isDirectory()) { choques(ruta, fuera); continue }
    const base = parse(f).name.replace(/\.(test|spec)$/, '')
    const previo = nombres.get(base.toLowerCase())
    if (previo !== undefined && previo !== base) fuera.push(`${join(dir, previo)} ↔ ${ruta}`)
    else nombres.set(base.toLowerCase(), base)
  }
  return fuera
}

describe('nombres de fichero válidos en Windows y macOS', () => {
  it('ningún par de ficheros de una carpeta se llama igual salvo por las mayúsculas', () => {
    expect(choques(fileURLToPath(new URL('.', import.meta.url)))).toEqual([])
  })
})
