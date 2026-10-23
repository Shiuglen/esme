// Copias aisladas del Taller: worktrees de git, y cambios medidos con un índice temporal (nunca el real).
import { execFile } from 'node:child_process'
import { cp, mkdir, mkdtemp, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { isAbsolute, join, relative, resolve } from 'node:path'
import { numeroTurno } from './turnos'

export type Copia = { id: string; ruta: string; rama: string | null; base: string; repo: string | null }   // repo null: carpeta nueva de Esme
/** Un punto de la copia: el commit que dejó un turno. `turno` es su número, o null si el commit no es un turno. */
export type Punto = { sha: string; mensaje: string; turno: number | null }
export type FicheroCambiado = { ruta: string; mas: number; menos: number; binario: boolean }
export type Cambios = { ficheros: number; mas: number; menos: number; lista: FicheroCambiado[] }
export type Git = (args: string[], o: { cwd: string; env?: NodeJS.ProcessEnv }) => Promise<string>

const MAX_DIFF = 1_500_000

export const gitReal: Git = (args, o) => new Promise((ok, no) => {
  execFile('git', args, { cwd: o.cwd, env: { ...process.env, ...o.env }, maxBuffer: 64 * 1024 * 1024 }, (err, salida, stderr) => {
    if (err) no(new Error((String(stderr).trim() || err.message).slice(0, 4000)))
    else ok(salida)
  })
})

export async function raizRepo(carpeta: string, git: Git = gitReal): Promise<string | null> {
  try { return (await git(['rev-parse', '--show-toplevel'], { cwd: carpeta })).trim() || null } catch { return null }
}

/** Los worktrees de un repo, con la rama que lleva cada uno: así se sabe quién tiene qué terreno. (La práctica
 *  de Deska 1.32: `worktreeInUse` / `worktreeUsedByAnotherTask`; aquí la rama `esme/<id>` ya dice el dueño.) */
export async function worktreesDe(repo: string, git: Git = gitReal): Promise<{ ruta: string; rama: string | null }[]> {
  let salida = ''
  try { salida = await git(['worktree', 'list', '--porcelain'], { cwd: repo }) } catch { return [] }
  const out: { ruta: string; rama: string | null }[] = []
  let actual: { ruta: string; rama: string | null } | null = null
  for (const l of salida.split('\n')) {
    if (l.startsWith('worktree ')) { actual = { ruta: l.slice('worktree '.length).trim(), rama: null }; out.push(actual) }
    else if (l.startsWith('branch ') && actual) actual.rama = l.slice('branch '.length).trim().replace(/^refs\/heads\//, '')
  }
  return out
}

const existe = (ruta: string) => stat(ruta).then(() => true, () => false)

export async function crearCopia(o: { carpeta: string | null; id: string; dirCopias: string; git?: Git }): Promise<Copia> {
  const git = o.git ?? gitReal
  const ruta = join(o.dirCopias, o.id)
  await mkdir(o.dirCopias, { recursive: true })
  if (o.carpeta === null) {
    // La copia de esta tarea ya está: se sigue con ella, no se rehace (la app se reinició y no se perdió el trabajo).
    // Si lo que quedó ahí no es un repo, era residuo de un intento a medias: se limpia y se empieza en su sitio.
    if (await existe(ruta)) {
      let base: string | null = null
      try { base = (await git(['rev-parse', 'HEAD'], { cwd: ruta })).trim() || null } catch { /* no es un repo: residuo */ }
      if (base) return { id: o.id, ruta, rama: null, base, repo: null }
      await rm(ruta, { recursive: true, force: true })
    }
    await mkdir(ruta, { recursive: true })
    await git(['init', '-q'], { cwd: ruta })
    await git(['-c', 'user.name=Esme', '-c', 'user.email=esme@localhost', 'commit', '--allow-empty', '-q', '-m', 'Esme: punto de partida'], { cwd: ruta })
    const base = (await git(['rev-parse', 'HEAD'], { cwd: ruta })).trim()
    return { id: o.id, ruta, rama: null, base, repo: null }
  }
  const repo = await raizRepo(o.carpeta, git)
  if (!repo) throw new Error(`«${o.carpeta}» no es un repositorio git. Elige uno o empieza en una carpeta nueva.`)
  let base: string
  try { base = (await git(['rev-parse', 'HEAD'], { cwd: repo })).trim() } catch { throw new Error('El repositorio aún no tiene commits.') }
  const rama = `esme/${o.id}`
  // La copia de esta tarea ya vive en este repo (la app se reinició y su registro la perdió): se adopte, con
  // su historia incluida. La verdadera base de la tarea es donde su rama se apartó de la casa.
  const wts = await worktreesDe(repo, git)
  let propia = wts.find((w) => w.rama === rama)
  if (propia && !(await existe(propia.ruta))) { await git(['worktree', 'prune'], { cwd: repo }); propia = undefined }
  if (propia) return { id: o.id, ruta: propia.ruta, rama, base: await baseDeArranque(repo, rama, git, base), repo }
  // Residuo sin git en el camino del Taller (un intento que se quedó a medias): era suyo, se limpia.
  if (await existe(ruta) && !(await stat(join(ruta, '.git')).then(() => true, () => false))) await rm(ruta, { recursive: true, force: true })
  try {
    await git(['-C', repo, 'worktree', 'add', '-b', rama, ruta, base], { cwd: repo })
  } catch (e) {
    // La rama quedó huérfana: el worktree se fue (y la carpeta se limpió) sin quitar la rama. Se vuelve a criar
    // sobre ella — el trabajo que el motor ya commiteó entra con la copia, no se pierde.
    const huérfana = ((await git(['branch', '--list', rama], { cwd: repo })).trim() || '').length > 0
    if (!huérfana) throw e
    const baseAntes = await baseDeArranque(repo, rama, git, base)
    // el registro del worktree que se fue caducó con él: se depura antes de criar sobre la rama
    await git(['worktree', 'prune'], { cwd: repo }).catch(() => undefined)
    await git(['-C', repo, 'worktree', 'add', ruta, rama], { cwd: repo })
    return { id: o.id, ruta, rama, base: baseAntes, repo }
  }
  return { id: o.id, ruta, rama, base, repo }
}

/** Donde la rama de la tarea se apartó de la casa: en una copia nueva es el HEAD del repo; en una que se
 *  adopta, el punto común entre su rama y la casa — así los puntos de la tarea siguen siendo suyos, y si
 *  su trabajo ya se llevó a casa (la rama quedó dentro de HEAD), la copia arranca de nuevo limpia. */
async function baseDeArranque(repo: string, rama: string, git: Git, base: string): Promise<string> {
  try { return (await git(['merge-base', rama, 'HEAD'], { cwd: repo })).trim() || base } catch { return base }
}

// Ejecuta `pedir` con un índice temporal que parte de HEAD y ya incluye todo (también lo no seguido); siempre lo borra.
async function conIndiceTemporal(c: Copia, git: Git, pedir: string[]): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'esme-idx-'))
  const env = { GIT_INDEX_FILE: join(dir, 'indice') }
  try {
    await git(['read-tree', 'HEAD'], { cwd: c.ruta, env })
    await git(['add', '-A'], { cwd: c.ruta, env })
    return await git(pedir, { cwd: c.ruta, env })
  } finally { await rm(dir, { recursive: true, force: true }) }
}

export async function cambiosCopia(c: Copia, git: Git = gitReal): Promise<Cambios> {
  const salida = await conIndiceTemporal(c, git, ['diff', '--cached', '--no-renames', '--numstat', '-z', c.base])
  const lista: FicheroCambiado[] = salida.split('\0').filter(Boolean).map((l) => {
    const [mas, menos, ...ruta] = l.split('\t')
    const binario = mas === '-' && menos === '-'
    return { ruta: ruta.join('\t'), mas: binario ? 0 : Number(mas), menos: binario ? 0 : Number(menos), binario }
  })
  return { ficheros: lista.length, mas: lista.reduce((s, f) => s + f.mas, 0), menos: lista.reduce((s, f) => s + f.menos, 0), lista }
}

export async function diffCopia(c: Copia, git: Git = gitReal): Promise<{ texto: string; truncado: boolean }> {
  const texto = await conIndiceTemporal(c, git, ['diff', '--cached', '--no-renames', '--no-color', c.base])
  return texto.length > MAX_DIFF ? { texto: texto.slice(0, MAX_DIFF), truncado: true } : { texto, truncado: false }
}

function dentroDe(dir: string, ruta: string): boolean {
  const r = relative(resolve(dir), resolve(ruta))
  return r !== '' && !r.startsWith('..') && !isAbsolute(r)
}

export async function quitarCopia(c: Copia, o: { dirCopias: string; git?: Git }): Promise<void> {
  const git = o.git ?? gitReal
  if (!dentroDe(o.dirCopias, c.ruta)) throw new Error('Ruta fuera del Taller: no se borra.')
  if (!c.repo) { await rm(c.ruta, { recursive: true, force: true }); return }
  try { await git(['worktree', 'remove', '--force', c.ruta], { cwd: c.repo }) }
  catch {
    await rm(c.ruta, { recursive: true, force: true })
    await git(['worktree', 'prune'], { cwd: c.repo })
  }
  if (c.rama) await git(['branch', '-D', c.rama], { cwd: c.repo }).catch(() => undefined)
}

// Diff binario completo frente a base (con índice temporal), sin truncar: es lo que se aplica de verdad.
export function parcheCopia(c: Copia, git: Git = gitReal): Promise<string> {
  return conIndiceTemporal(c, git, ['diff', '--cached', '--binary', '--no-renames', c.base])
}

const PATRONES_CHOQUE = [/^error: patch failed: (.+):\d+$/, /^error: (.+): does not match index$/, /^error: (.+): already exists in working directory$/,
  /^error: (.+): No such file or directory$/, /^error: (.+): patch does not apply$/]

// Aplica (o revierte) un parche en el árbol de trabajo de la carpeta real. Nunca --3way ni --index: primero --check y, si falla, no toca nada.
export async function aplicarParche(repo: string, parche: string, o: { inverso?: boolean; git?: Git } = {}): Promise<{ ok: true } | { ok: false; ficheros: string[]; mensaje: string }> {
  const git = o.git ?? gitReal
  const dir = await mkdtemp(join(tmpdir(), 'esme-parche-'))
  const fichero = join(dir, 'cambios.patch')
  const inv = o.inverso ? ['-R'] : []
  const env = { LC_ALL: 'C', LANGUAGE: 'C' }   // los mensajes de git se leen para saber qué ficheros chocan: sin traducir
  try {
    await writeFile(fichero, parche)
    try { await git(['apply', '--check', ...inv, fichero], { cwd: repo, env }) } catch (e) {
      const mensaje = e instanceof Error ? e.message : String(e)
      const ficheros = new Set<string>()
      for (const l of mensaje.split('\n')) for (const p of PATRONES_CHOQUE) { const m = p.exec(l.trim()); if (m) { ficheros.add(m[1]); break } }
      return { ok: false, ficheros: [...ficheros], mensaje: mensaje.slice(0, 500) }
    }
    await git(['apply', ...inv, fichero], { cwd: repo, env })
    return { ok: true }
  } finally { await rm(dir, { recursive: true, force: true }) }
}

const IDENTIDAD = ['-c', 'user.name=Esme', '-c', 'user.email=esme@localhost']

// Commit de todo lo que haya en la copia; null si no había nada. Si git no tiene identidad, usa la de Esme.
export async function commitCopia(c: Copia, mensaje: string, git: Git = gitReal): Promise<string | null> {
  await git(['add', '-A'], { cwd: c.ruta })
  if (!(await git(['status', '--porcelain'], { cwd: c.ruta })).trim()) return null
  try { await git(['commit', '-q', '-m', mensaje], { cwd: c.ruta }) }
  catch { await git([...IDENTIDAD, 'commit', '-q', '-m', mensaje], { cwd: c.ruta }) }
  return (await git(['rev-parse', 'HEAD'], { cwd: c.ruta })).trim()
}

/** Los puntos de una copia: el commit que dejó cada turno, del primero al último.
 *
 * No hay estado nuevo que guardar: **los puntos son los commits de la rama de la tarea**. Eso es
 * lo que permite deshacer *un turno* y no la tarea entera (la práctica que tiene MonoCode, MIT).
 * Cada punto lleva su número de turno; los commits que no son turnos (guardar en la rama) no lo llevan.
 */
export async function puntosCopia(c: Copia, git: Git = gitReal): Promise<Punto[]> {
  let salida = ''
  try { salida = await git(['log', '--format=%H%x09%s', '--reverse', `${c.base}..HEAD`], { cwd: c.ruta }) }
  catch { return [] }
  return salida.split('\n').filter(Boolean).map((linea) => {
    const [sha, ...resto] = linea.split('\t')
    const mensaje = resto.join('\t')
    return { sha, mensaje, turno: numeroTurno(mensaje) }
  })
}

/** Vuelve la copia a un punto: deshace un turno (o los que haya detrás).
 *
 * Sólo toca la **copia** (el worktree de la tarea): la carpeta del usuario no se toca nunca.
 *
 * Lo que hay que saber: `reset --hard` rebobina la rama de la tarea, así que los commits posteriores
 * dejan de estar en ella (quedan en su reflog, recuperables con `git reflog`). Y los ficheros que el
 * motor creó y nunca se commitearon no se borran: `reset --hard` no toca lo que no está en git.
 */
export async function volverAlPunto(c: Copia, sha: string, git: Git = gitReal): Promise<void> {
  await git(['reset', '--hard', sha], { cwd: c.ruta })
}

export async function exportarCopia(c: Copia, destino: string): Promise<void> {
  if (c.repo !== null) throw new Error('Solo se exporta una tarea hecha en una carpeta nueva.')
  if (await stat(destino).then(() => true, () => false)) throw new Error(`«${destino}» ya existe: elige otro nombre.`)
  await cp(c.ruta, destino, { recursive: true, errorOnExist: true, force: false })
}
