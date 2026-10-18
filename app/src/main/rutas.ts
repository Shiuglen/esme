// Dónde vive cada cosa de Esme. En desarrollo, todo como siempre (~/Daimon, su .venv y su mente). Instalada, el cerebro
// viaja dentro de la app (resources/cerebro: un Python autónomo y sus paquetes aparte) y la memoria vive en la carpeta de
// datos del sistema. DAIMON_ROOT y DAIMON_HOME mandan si los pones. Ver docs/superpowers/specs/2026-10-18-versiones.md.
import { join, resolve } from 'node:path'

export type Rutas = { python: string; extraPython: string | null; mente: string; cwdTerminal: string }

export function rutasDe(o: { empaquetada: boolean; plataforma: NodeJS.Platform; home: string; userData: string; resources: string; env: Record<string, string | undefined> }): Rutas {
  const win = o.plataforma === 'win32'
  if (!o.empaquetada || o.env.DAIMON_ROOT) {
    const raiz = resolve(o.env.DAIMON_ROOT ?? join(o.home, 'Daimon'))
    return {
      python: win ? join(raiz, '.venv', 'Scripts', 'python.exe') : join(raiz, '.venv', 'bin', 'python3'),
      extraPython: null,
      mente: resolve(o.env.DAIMON_HOME ?? join(raiz, 'data', 'mente_v2')),
      cwdTerminal: raiz,
    }
  }
  const cerebro = join(o.resources, 'cerebro')
  return {
    python: win ? join(cerebro, 'python', 'python.exe') : join(cerebro, 'python', 'bin', 'python3'),
    extraPython: join(cerebro, 'paquetes'),
    mente: o.env.DAIMON_HOME ? resolve(o.env.DAIMON_HOME) : join(o.userData, 'mente'),
    cwdTerminal: o.home,
  }
}
