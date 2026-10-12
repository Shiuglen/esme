// Copias aisladas del Taller: worktrees de git, y cambios medidos con un índice temporal (nunca el real).
import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { isAbsolute, join, relative, resolve } from 'node:path'

export type Copia = { id: string; ruta: string; rama: string | null; base: string; repo: string | null }   // repo null: carpeta nueva de Esme
export type FicheroCambiado = { ruta: string; mas: number; menos: number; binario: boolean }
export type Cambios = { ficheros: number; mas: number; menos: number; lista: FicheroCambiado[] }
export type Git = (args: string[], o: { cwd: string; env?: NodeJS.ProcessEnv }) => Promise<string>

const MAX_DIFF = 1_500_000

export const gitReal: Git = (args, o) => new Promise((ok, no) => {
  execFile('git', args, { cwd: o.cwd, env: { ...process.env, ...o.env }, maxBuffer: 64 * 1024 * 1024 }, (err, salida, stderr) => {
    if (err) no(new Error((String(stderr).trim() || err.message).slice(0, 500)))
    else ok(salida)
  })
})

export async function raizRepo(carpeta: string, git: Git = gitReal): Promise<string | null> {
  try { return (await git(['rev-parse', '--show-toplevel'], { cwd: carpeta })).trim() || null } catch { return null }
}

export async function crearCopia(o: { carpeta: string | null; id: string; dirCopias: string; git?: Git }): Promise<Copia> {
  const git = o.git ?? gitReal
  const ruta = join(o.dirCopias, o.id)
  await mkdir(o.dirCopias, { recursive: true })
  if (o.carpeta === null) {
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
  await git(['-C', repo, 'worktree', 'add', '-b', rama, ruta, base], { cwd: repo })
  return { id: o.id, ruta, rama, base, repo }
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
