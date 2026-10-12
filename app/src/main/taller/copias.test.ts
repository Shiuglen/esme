import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdir, mkdtemp, rm, writeFile, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { cambiosCopia, crearCopia, diffCopia, gitReal, quitarCopia, raizRepo } from './copias'

let raiz = ''
let repo = ''
let dirCopias = ''
const g = (cwd: string, ...args: string[]) => gitReal(['-c', 'user.name=T', '-c', 'user.email=t@t', ...args], { cwd })

beforeEach(async () => {
  raiz = await mkdtemp(join(tmpdir(), 'esme-copias-'))
  repo = join(raiz, 'repo'); dirCopias = join(raiz, 'copias')
  await g(raiz, 'init', '-q', repo)
  await writeFile(join(repo, 'a.txt'), 'uno\ndos\ntres\n')
  await g(repo, 'add', '-A')
  await g(repo, 'commit', '-q', '-m', 'inicial')
})
afterEach(async () => { await rm(raiz, { recursive: true, force: true }) })

describe('copias', () => {
  it('crea un worktree en una rama esme/<id> desde HEAD sin tocar la carpeta original', async () => {
    await writeFile(join(repo, 'sucio.txt'), 'sin commitear')
    const antes = await g(repo, 'status', '--porcelain')
    const c = await crearCopia({ carpeta: repo, id: 'abc123', dirCopias })
    expect((await stat(join(dirCopias, 'abc123'))).isDirectory()).toBe(true)
    expect(c.rama).toBe('esme/abc123')
    expect((await g(repo, 'branch', '--list', 'esme/abc123')).trim()).not.toBe('')
    expect(c.base).toBe((await g(repo, 'rev-parse', 'HEAD')).trim())
    expect(await g(repo, 'status', '--porcelain')).toBe(antes)
    await expect(stat(join(c.ruta, 'sucio.txt'))).rejects.toThrow()
  })

  it('cuenta cambios sin commitear y ficheros nuevos sin tocar el índice de la copia', async () => {
    const c = await crearCopia({ carpeta: repo, id: 'abc123', dirCopias })
    await writeFile(join(c.ruta, 'a.txt'), 'uno\nDOS\ntres\ncuatro\n')
    await writeFile(join(c.ruta, 'nuevo.txt'), 'x\ny\n')
    const r = await cambiosCopia(c)
    expect(r.ficheros).toBe(2)
    expect(r.mas).toBe(4)
    expect(r.menos).toBe(1)
    expect(r.lista).toContainEqual({ ruta: 'a.txt', mas: 2, menos: 1, binario: false })
    expect(r.lista).toContainEqual({ ruta: 'nuevo.txt', mas: 2, menos: 0, binario: false })
    expect(await g(c.ruta, 'status', '--porcelain')).toContain('?? nuevo.txt')
  })

  it('cuenta también lo que el motor haya commiteado dentro de la copia', async () => {
    const c = await crearCopia({ carpeta: repo, id: 'abc123', dirCopias })
    await writeFile(join(c.ruta, 'b.txt'), 'hola\n')
    await g(c.ruta, 'add', '-A')
    await g(c.ruta, 'commit', '-q', '-m', 'del motor')
    const r = await cambiosCopia(c)
    expect(r).toMatchObject({ ficheros: 1, mas: 1, menos: 0 })
  })

  it('cuenta los binarios como fichero sin líneas', async () => {
    const c = await crearCopia({ carpeta: repo, id: 'abc123', dirCopias })
    await writeFile(join(c.ruta, 'img.bin'), Buffer.from([0, 1, 2, 0, 255, 0]))
    const r = await cambiosCopia(c)
    expect(r.lista).toContainEqual({ ruta: 'img.bin', mas: 0, menos: 0, binario: true })
  })

  it('el diff incluye el contenido de los ficheros nuevos', async () => {
    const c = await crearCopia({ carpeta: repo, id: 'abc123', dirCopias })
    await writeFile(join(c.ruta, 'nuevo.txt'), 'contenido-unico\n')
    const d = await diffCopia(c)
    expect(d.truncado).toBe(false)
    expect(d.texto).toContain('+contenido-unico')
  })

  it('el diff se trunca a 1.500.000 caracteres', async () => {
    const c = await crearCopia({ carpeta: repo, id: 'abc123', dirCopias })
    await writeFile(join(c.ruta, 'enorme.txt'), 'x'.repeat(1_700_000) + '\n')
    const d = await diffCopia(c)
    expect(d.truncado).toBe(true)
    expect(d.texto.length).toBe(1_500_000)
  })

  it('sin carpeta crea un repo nuevo con commit de partida', async () => {
    const c = await crearCopia({ carpeta: null, id: 'nuevo1', dirCopias })
    expect(c.rama).toBeNull(); expect(c.repo).toBeNull()
    expect(c.base).toBe((await g(c.ruta, 'rev-parse', 'HEAD')).trim())
    expect((await g(c.ruta, 'log', '--format=%s')).trim()).toBe('Esme: punto de partida')
    expect((await cambiosCopia(c)).ficheros).toBe(0)
  })

  it('rechaza una carpeta que no es repo con un mensaje claro', async () => {
    const plana = join(raiz, 'plana')
    await mkdir(plana)
    expect(await raizRepo(plana)).toBeNull()
    await expect(crearCopia({ carpeta: plana, id: 'abc123', dirCopias })).rejects.toThrow(`«${plana}» no es un repositorio git. Elige uno o empieza en una carpeta nueva.`)
  })

  it('rechaza un repo sin commits', async () => {
    const vacio = join(raiz, 'vacio'); await g(raiz, 'init', '-q', vacio)
    await expect(crearCopia({ carpeta: vacio, id: 'abc123', dirCopias })).rejects.toThrow('El repositorio aún no tiene commits.')
  })

  it('dos copias del mismo repo usan ramas y carpetas distintas', async () => {
    const a = await crearCopia({ carpeta: repo, id: 'aaa111', dirCopias })
    const b = await crearCopia({ carpeta: repo, id: 'bbb222', dirCopias })
    expect(a.ruta).not.toBe(b.ruta); expect(a.rama).not.toBe(b.rama)
  })

  it('quitar borra el worktree y la rama, y se niega a borrar fuera del Taller', async () => {
    const c = await crearCopia({ carpeta: repo, id: 'abc123', dirCopias })
    await quitarCopia(c, { dirCopias })
    await expect(stat(c.ruta)).rejects.toThrow()
    expect((await g(repo, 'branch', '--list', 'esme/abc123')).trim()).toBe('')
    expect((await g(repo, 'worktree', 'list')).trim().split('\n')).toHaveLength(1)

    const n = await crearCopia({ carpeta: null, id: 'nuevo1', dirCopias })
    await quitarCopia(n, { dirCopias })
    await expect(stat(n.ruta)).rejects.toThrow()

    await expect(quitarCopia({ id: 'x', ruta: repo, rama: null, base: 'x', repo: null }, { dirCopias })).rejects.toThrow('Ruta fuera del Taller: no se borra.')
    expect((await stat(repo)).isDirectory()).toBe(true)
  })
})
