// El PATH de tu shell de login (idea tomada de MonoCode, MIT, https://github.com/hardbeat920/monocode; reescrita para
// Esme): abierta desde el menú de aplicaciones, Esme no hereda el PATH de tu terminal (mise, nvm, ~/.local/bin…) y no
// encontraría a tus agentes. Se le pregunta a tu shell una vez, con marcadores (tu .zshrc puede imprimir de todo) y con
// tope de tiempo, y se une al PATH de Esme sin repetir nada.
import { spawn } from 'node:child_process'
import { delimiter } from 'node:path'

const MARCA = '__ESME_PATH__'

export function pathDeSalida(salida: string): string | null {
  const m = new RegExp(`${MARCA}([^\\n]*?)${MARCA}`).exec(salida)
  return m && m[1].trim() ? m[1].trim() : null
}

export function unirPath(propio: string | undefined, deLogin: string, sep = delimiter): string {
  const vistos = new Set<string>(), out: string[] = []
  for (const d of [...(propio ?? '').split(sep), ...deLogin.split(sep)]) if (d && !vistos.has(d)) { vistos.add(d); out.push(d) }
  return out.join(sep)
}

/** Lee el PATH de la shell de login (3 s como mucho). null si no hay shell, en Windows o si no responde. */
export function leerPathDeLogin(shell = process.env.SHELL, tope = 3000): Promise<string | null> {
  if (!shell || process.platform === 'win32') return Promise.resolve(null)
  return new Promise((resolver) => {
    let salida = ''
    const h = spawn(shell, ['-lic', `printf '${MARCA}%s${MARCA}' "$PATH"`], { stdio: ['ignore', 'pipe', 'ignore'] })
    const fin = (v: string | null) => { clearTimeout(reloj); resolver(v) }
    const reloj = setTimeout(() => { h.kill('SIGKILL'); fin(pathDeSalida(salida)) }, tope)
    h.stdout?.on('data', (d) => { salida += String(d) })
    h.on('error', () => fin(null))
    h.on('close', () => fin(pathDeSalida(salida)))
  })
}

let listo: Promise<void> | null = null
/** Une una sola vez el PATH de login al de Esme; quien vaya a buscar binarios lo espera antes. */
export function prepararPath(): Promise<void> {
  listo ??= leerPathDeLogin().then((p) => { if (p) process.env.PATH = unirPath(process.env.PATH, p) }).catch(() => {})
  return listo
}
