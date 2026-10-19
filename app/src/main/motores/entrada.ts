// Con qué método entra Esme en cada agente (su `authMethods` de ACP): lo eliges una vez y desde entonces el Taller y la
// conversación lo usan al abrir cada sesión. Solo guarda el nombre del método; las credenciales las guarda el propio agente.
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

export function leerEntradas(fichero: string): Record<string, string> {
  try {
    const x = JSON.parse(readFileSync(fichero, 'utf8')) as Record<string, unknown>
    return Object.fromEntries(Object.entries(x).filter((e): e is [string, string] => typeof e[1] === 'string'))
  } catch { return {} }
}

export function guardarEntrada(fichero: string, motor: string, metodo: string | null): void {
  const actual = leerEntradas(fichero)
  if (metodo) actual[motor] = metodo; else delete actual[motor]
  mkdirSync(dirname(fichero), { recursive: true })
  writeFileSync(`${fichero}.tmp`, JSON.stringify(actual), { mode: 0o600 })
  renameSync(`${fichero}.tmp`, fichero)
}
