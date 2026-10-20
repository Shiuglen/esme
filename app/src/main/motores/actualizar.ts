// Tus agentes al día (idea de MonoCode, MIT, https://github.com/hardbeat920/monocode, y de Deska; reescrita para Esme):
// qué versión tienes, si hay una nueva y cómo actualizar. Los instalados con npm se comparan con el registro de npm y se
// actualizan con `npm install -g` si la carpeta es tuya; si pide administrador, Esme te da la orden exacta en vez de fallar.
// OpenCode se actualiza con su propio `upgrade`. Después siempre se vuelve a leer la versión: el código de salida no basta.
import { execFile } from 'node:child_process'
import { access, constants, readFile, realpath } from 'node:fs/promises'
import { dirname, join } from 'node:path'

export const semverDe = (t: string) => /(\d+)\.(\d+)\.(\d+)(?:-[0-9A-Za-z.-]+)?/.exec(t)?.[0] ?? null

export function compararVersiones(a: string, b: string): -1 | 0 | 1 {
  const partes = (v: string) => { const [n, pre] = v.split('-'); return { n: n.split('.').map((x) => Number(x) || 0), pre: pre ?? null } }
  const x = partes(a), y = partes(b)
  for (let i = 0; i < 3; i++) if ((x.n[i] ?? 0) !== (y.n[i] ?? 0)) return (x.n[i] ?? 0) < (y.n[i] ?? 0) ? -1 : 1
  if (x.pre === y.pre) return 0
  if (x.pre === null) return 1
  if (y.pre === null) return -1
  return x.pre < y.pre ? -1 : 1
}

/** Si el binario real vive en un node_modules, el paquete npm y la carpeta global donde está. */
export function paqueteDeRuta(real: string): { paquete: string; raiz: string } | null {
  const m = /^(.*\/node_modules)\/((?:@[^/]+\/)?[^/]+)\//.exec(real.replace(/\\/g, '/'))
  return m ? { paquete: m[2], raiz: m[1] } : null
}

type Origen = { id: string; comando?: string; paquete?: string; raiz?: string; escribible?: boolean }
export type Orden = { tipo: 'auto'; comando: string; args: string[] } | { tipo: 'manual'; orden: string }
export function ordenDeActualizacion(o: Origen): Orden | null {
  if (o.paquete && o.raiz) {
    if (!o.escribible) return { tipo: 'manual', orden: `sudo npm install -g ${o.paquete}@latest` }
    // el npm de esa misma instalación de Node (…/lib/node_modules → …/bin/npm)
    return { tipo: 'auto', comando: join(dirname(dirname(o.raiz)), 'bin', 'npm'), args: ['install', '-g', `${o.paquete}@latest`] }
  }
  if (o.id === 'opencode' && o.comando) return { tipo: 'auto', comando: o.comando, args: ['upgrade'] }
  return null
}

// ---- lo que toca el sistema (inyectable en pruebas) ----
const ejecutarReal = (comando: string, args: string[], tope: number) => new Promise<string>((resolver) => {
  // stdin cerrado: un actualizador que pregunta falla en vez de quedarse colgado (consejo de MonoCode)
  const h = execFile(comando, args, { timeout: tope, maxBuffer: 4 * 1024 * 1024, env: { ...process.env, CI: '1', NO_COLOR: '1' } }, (e, stdout, stderr) => resolver(`${stdout}${stderr}${e && !stdout ? String(e.message) : ''}`))
  h.stdin?.end()
})

export type Version = { id: string; instalada: string | null; ultima: string | null; hayNueva: boolean; orden: Orden | null }

export async function versionDe(m: { id: string; comando: string }, o: { fetch?: typeof fetch; ejecutar?: typeof ejecutarReal } = {}): Promise<Version> {
  const ejecutar = o.ejecutar ?? ejecutarReal, pedir = o.fetch ?? fetch
  const real = await realpath(m.comando).catch(() => m.comando)
  const npm = paqueteDeRuta(real)
  // la versión: la del package.json si es de npm (exacta y sin lanzar nada); si no, lo que diga --version
  let instalada: string | null = null
  if (npm) instalada = await readFile(join(npm.raiz, npm.paquete, 'package.json'), 'utf8').then((t) => (JSON.parse(t) as { version?: string }).version ?? null).catch(() => null)
  instalada ??= semverDe(await ejecutar(m.comando, ['--version'], 8000))
  let ultima: string | null = null
  if (npm) {
    ultima = await pedir(`https://registry.npmjs.org/${npm.paquete.replace('/', '%2F')}/latest`, { headers: { 'User-Agent': 'esme' }, signal: AbortSignal.timeout(10_000) })
      .then((r) => (r.ok ? r.json() : null)).then((j) => (j as { version?: string } | null)?.version ?? null).catch(() => null)
  }
  const escribible = npm ? await access(npm.raiz, constants.W_OK).then(() => true, () => false) : undefined
  return { id: m.id, instalada, ultima, hayNueva: !!(ultima && instalada && compararVersiones(ultima, instalada) > 0),
    orden: ordenDeActualizacion({ id: m.id, comando: m.comando, ...(npm ? { ...npm, escribible } : {}) }) }
}

export async function actualizar(m: { id: string; comando: string }, o: { ejecutar?: typeof ejecutarReal } = {}): Promise<{ ok: boolean; antes: string | null; despues: string | null; detalle: string }> {
  const ejecutar = o.ejecutar ?? ejecutarReal
  const antes = await versionDe(m, { ejecutar })
  if (!antes.orden) return { ok: false, antes: antes.instalada, despues: antes.instalada, detalle: 'No sé cómo actualizar este agente.' }
  if (antes.orden.tipo === 'manual') return { ok: false, antes: antes.instalada, despues: antes.instalada, detalle: `Necesita permisos de administrador. En una terminal: ${antes.orden.orden}` }
  const salida = await ejecutar(antes.orden.comando, antes.orden.args, 300_000)
  const despues = (await versionDe(m, { ejecutar })).instalada
  const ultimaLinea = salida.trim().split('\n').filter(Boolean).pop() ?? ''
  const subio = !!(despues && antes.instalada && compararVersiones(despues, antes.instalada) > 0)
  const habiaNueva = !!(antes.ultima && antes.instalada && compararVersiones(antes.ultima, antes.instalada) > 0)
  if (subio) return { ok: true, antes: antes.instalada, despues, detalle: `${antes.instalada} → ${despues}` }
  if (habiaNueva || !despues) return { ok: false, antes: antes.instalada, despues, detalle: `No se pudo actualizar: ${ultimaLinea || 'sin explicación del agente'}` }
  return { ok: true, antes: antes.instalada, despues, detalle: 'Ya estaba al día.' }
}
