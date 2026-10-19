// Descargar una skill del repositorio de su autor, fijada a un commit revisado (docs/investigacion/2026-10-19-skills.md
// §5.1): el árbol de GitHub dice qué ficheros hay en su carpeta y cada uno se baja en crudo. Sin token, sin npx, sin
// telemetría. Se rechazan los enlaces simbólicos y las rutas con «..», y se respetan los límites de `npx skills`
// (1000 ficheros, 25 MiB). La huella del árbol permite comprobar que es exactamente lo que se revisó.
import { createHash } from 'node:crypto'

export type FuenteSkill = { repo: string; ruta: string; commit: string }
export type ArchivoSkill = { ruta: string; datos: Buffer; ejecutable: boolean }
type Limites = { ficheros: number; bytes: number }
const LIMITES: Limites = { ficheros: 1000, bytes: 25 * 1024 * 1024 }

const REPO = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/
const COMMIT = /^[0-9a-f]{40}$/
const rutaSegura = (r: string) => !!r && !r.startsWith('/') && !r.split('/').some((p) => p === '..' || p === '.')

export async function descargarSkill(f: FuenteSkill, o: { fetch?: typeof fetch; limites?: Limites } = {}): Promise<ArchivoSkill[]> {
  const pedir = o.fetch ?? fetch, lim = o.limites ?? LIMITES
  if (!REPO.test(f.repo)) throw new Error(`El repositorio «${f.repo}» no es válido.`)
  if (!COMMIT.test(f.commit)) throw new Error('La skill tiene que ir fijada a un commit completo.')
  const base = f.ruta.replace(/\/+$/, '')
  if (!rutaSegura(base)) throw new Error(`La ruta «${f.ruta}» no es válida.`)
  const r = await pedir(`https://api.github.com/repos/${f.repo}/git/trees/${f.commit}?recursive=1`,
    { headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'esme' }, signal: AbortSignal.timeout(20_000) })
  if (!r.ok) throw new Error(`GitHub respondió ${r.status} al pedir el árbol de ${f.repo}.`)
  const arbol = (await r.json()) as { tree?: { path: string; mode: string; type: string; size?: number }[]; truncated?: boolean }
  const dentro = (arbol.tree ?? []).filter((x) => x.path.startsWith(`${base}/`) && x.type !== 'tree')
  if (dentro.some((x) => x.mode === '120000' || x.type === 'commit')) throw new Error('La skill trae enlaces simbólicos o submódulos: no se instala.')
  const blobs = dentro.filter((x) => x.type === 'blob')
  if (!blobs.length) throw new Error(`No hay ficheros en ${f.repo}/${base} en ese commit.`)
  if (blobs.length > lim.ficheros) throw new Error(`La skill tiene demasiados ficheros (${blobs.length}).`)
  if (blobs.reduce((s, x) => s + (x.size ?? 0), 0) > lim.bytes) throw new Error('La skill pesa demasiado.')
  const out: ArchivoSkill[] = []
  let total = 0
  for (const b of blobs) {
    const ruta = b.path.slice(base.length + 1)
    if (!rutaSegura(ruta)) throw new Error(`Ruta no válida dentro de la skill: ${ruta}`)
    const c = await pedir(`https://raw.githubusercontent.com/${f.repo}/${f.commit}/${b.path.split('/').map(encodeURIComponent).join('/')}`,
      { headers: { 'User-Agent': 'esme' }, signal: AbortSignal.timeout(20_000) })
    if (!c.ok) throw new Error(`No se pudo bajar ${ruta} (${c.status}).`)
    const datos = Buffer.from(await c.arrayBuffer())
    total += datos.length
    if (total > lim.bytes) throw new Error('La skill pesa demasiado.')
    out.push({ ruta, datos, ejecutable: b.mode === '100755' })
  }
  return out.sort((a, b) => (a.ruta < b.ruta ? -1 : a.ruta > b.ruta ? 1 : 0))
}

/** La huella de una skill: sha256 de «ruta\0sha256(contenido)\n» por fichero, en orden de ruta. No depende del orden de
 *  llegada y cambia si cambia un byte o un nombre. (app/scripts/catalogo-skills.mjs calcula lo mismo.) */
export function arbolSha256(ficheros: { ruta: string; datos: Buffer }[]): string {
  const h = createHash('sha256')
  for (const f of [...ficheros].sort((a, b) => (a.ruta < b.ruta ? -1 : a.ruta > b.ruta ? 1 : 0)))
    h.update(`${f.ruta}\0${createHash('sha256').update(f.datos).digest('hex')}\n`)
  return h.digest('hex')
}

/** ¿Es texto legible? (para mostrarlo y analizarlo); los binarios (imágenes, fuentes) solo se cuentan. */
export const esTexto = (d: Buffer) => !d.subarray(0, 8000).includes(0)
