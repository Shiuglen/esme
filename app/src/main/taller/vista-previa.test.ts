import { afterEach, describe, expect, it } from 'vitest'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { servirCopia, type Servidor } from './vista-previa'

let dir = '', s: Servidor | null = null
afterEach(async () => { s?.cerrar(); s = null; if (dir) await rm(dir, { recursive: true, force: true }) })

async function copia() {
  dir = await mkdtemp(join(tmpdir(), 'esme-vista-'))
  await mkdir(join(dir, 'web', 'css'), { recursive: true })
  await writeFile(join(dir, 'web', 'index.html'), '<!doctype html><html><body><h1>Hola</h1></body></html>')
  await writeFile(join(dir, 'web', 'css', 'a.css'), 'h1{color:red}')
  await writeFile(join(dir, 'secreto.txt'), 'no')
  return join(dir, 'web')
}

describe('servirCopia', () => {
  it('sirve el index con el inspector inyectado, solo en 127.0.0.1', async () => {
    s = await servirCopia(await copia())
    expect(s.url).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/$/)
    const r = await fetch(s.url)
    expect(r.headers.get('content-type')).toContain('text/html')
    const html = await r.text()
    expect(html).toContain('<h1>Hola</h1>')
    expect(html).toContain('<script src="/__esme/inspector.js"></script></body>')
  })
  it('sirve el resto con su tipo y no inyecta nada', async () => {
    s = await servirCopia(await copia())
    const r = await fetch(`${s.url}css/a.css`)
    expect(r.headers.get('content-type')).toContain('text/css')
    expect(await r.text()).toBe('h1{color:red}')
  })
  it('sirve el script del inspector', async () => {
    s = await servirCopia(await copia())
    const r = await fetch(`${s.url}__esme/inspector.js`)
    expect(r.headers.get('content-type')).toContain('javascript')
    expect(await r.text()).toContain('postMessage')
  })
  it('no sale nunca de la carpeta de la copia', async () => {
    s = await servirCopia(await copia())
    const fuera = await fetch(`${s.url}..%2Fsecreto.txt`)
    expect(fuera.status).toBe(404)
    const fuera2 = await fetch(`${s.url}css/..%2F..%2Fsecreto.txt`)
    expect(fuera2.status).toBe(404)
  })
  it('lo que no existe es 404 y solo admite GET y HEAD', async () => {
    s = await servirCopia(await copia())
    expect((await fetch(`${s.url}no-existe.html`)).status).toBe(404)
    expect((await fetch(s.url, { method: 'POST' })).status).toBe(405)
  })
})

describe('servirCopia: ficheros ocultos', () => {
  it('nunca sirve ficheros o carpetas que empiezan por punto (.git, .env…)', async () => {
    const raiz = await copia()
    await mkdir(join(raiz, '.git'), { recursive: true })
    await writeFile(join(raiz, '.git', 'config'), '[core]')
    await writeFile(join(raiz, '.env'), 'CLAVE=x')
    s = await servirCopia(raiz)
    expect((await fetch(`${s.url}.git/config`)).status).toBe(404)
    expect((await fetch(`${s.url}.env`)).status).toBe(404)
  })
})
