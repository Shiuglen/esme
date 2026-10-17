// Puente de arranque del registro ACP: un motor instalado de verdad se vuelve lanzable de verdad.
// Escalones aprendidos con acpx: nunca `npx` a secas en runtime (resuelve, descarga y cuelga);
// se resuelve el binario ya asentado por npm en el equipo y se corre con el node del propio
// Electron (ELECTRON_RUN_AS_NODE), sin depender del PATH del usuario.
import { spawn } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { MotorRegistro } from './catalogo-registry'

export type GlobalesNpm = Map<string, string>
export type LanzableRegistro = { comando: string; args: string[]; env: Record<string, string> } | { error: string }

/** Del comando del registro «npx @org/gui@1.2 args…», el paquete npm crudo (con o sin ámbito). */
export function paqueteDe(instalacion: string): string | null {
  return partesDe(instalacion)?.paquete ?? null
}

/** El paquete y los argumentos que le siguen (esos argumentos son para el motor, no para `npm install`). */
export function partesDe(instalacion: string): { paquete: string; args: string[] } | null {
  const p = instalacion.trim().split(/\s+/)
  if (p[0] !== 'npx' || !p[1]) return null
  const t = p[1] as string
  // el @ de la versión: en paquetes con ámbito, detrás de la primera barra (@org/gui@1.2)
  const cierre = t.startsWith('@') ? t.indexOf('/') : 0
  const arroba = t.lastIndexOf('@')
  const paquete = arroba > cierre && arroba > 0 ? t.slice(0, arroba) : t
  return { paquete, args: p.slice(2) as string[] }
}

/** Los paquetes npm globales ya presentes, name → carpeta (`npm ls -g --parseable`, una consulta para todo el catálogo). */
export function instaladosNpm(lanzar: typeof spawn = spawn): Promise<GlobalesNpm> {
  return new Promise((res) => {
    const p = lanzar(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['ls', '-g', '--parseable', '--depth', '0'])
    let fuera = ''
    p.stdout?.on('data', (d: unknown) => { fuera += String(d) })
    p.on('error', () => res(new Map()))
    p.on('close', () => {
      const rutas = new Map<string, string>()
      for (const tramo of fuera.split('\n')) {
        const l = tramo.trim()
        if (!l) continue
        const partes = l.split(/[\\/]+/)
        const fin = partes[partes.length - 1] ?? ''
        const previo = partes[partes.length - 2]
        rutas.set(previo?.startsWith('@') ? `${previo}/${fin}` : fin, l)
      }
      res(rutas)
    })
  })
}

/** El motor del registro, una vez instalado por npm global, convertido en binario lanzable por stdio ACP. */
export async function lanzarRegistro(
  m: MotorRegistro,
  globales: GlobalesNpm,
  leer: (ruta: string) => Promise<string> = (ruta) => readFile(ruta, 'utf8'),
): Promise<LanzableRegistro> {
  const partes = m.instalacion ? partesDe(m.instalacion) : null
  if (!partes) return { error: 'Este motor no declara una instalación automática conocida.' }
  const carpeta = globales.get(partes.paquete)
  if (!carpeta) return { error: 'Su paquete no está instalado en el equipo todavía.' }
  try {
    const pkg = JSON.parse(await leer(join(carpeta, 'package.json'))) as { bin?: string | Record<string, string> }
    const gui = typeof pkg.bin === 'string' ? pkg.bin : pkg.bin ? Object.values(pkg.bin)[0] : undefined
    if (!gui) return { error: 'Su paquete no declara binario.' }
    return { comando: process.execPath, args: [join(carpeta, gui), ...partes.args], env: { ELECTRON_RUN_AS_NODE: '1' } }
  } catch {
    return { error: 'Su instalación está dañada (package.json ilegible).' }
  }
}
