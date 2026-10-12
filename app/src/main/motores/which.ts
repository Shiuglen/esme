// «which» real basado en PATH, sin ejecutar nada: función pura con el sistema de ficheros inyectado.
import { delimiter, join } from 'node:path'

export function crearWhich(pathEnv: string | undefined, existe: (ruta: string) => Promise<boolean>, o: { sep?: string; exts?: string[] } = {}) {
  const dirs = (pathEnv ?? '').split(o.sep ?? delimiter).filter(Boolean)
  const exts = o.exts ?? ['']
  return async (bin: string): Promise<string | null> => {
    if (!bin || /[\\/]/.test(bin)) return null
    for (const d of dirs) for (const e of exts) { const ruta = join(d, bin + e); if (await existe(ruta)) return ruta }
    return null
  }
}

export const extsPlataforma = (plataforma: string, pathext?: string): string[] =>
  plataforma === 'win32' ? ['', ...(pathext ?? '.EXE;.CMD;.BAT;.COM').toLowerCase().split(';').filter(Boolean)] : ['']
