import { describe, it, expect } from 'vitest'
import { crearWhich, extsPlataforma } from './which'

describe('crearWhich', () => {
  const existen = new Set(['/usr/bin/gemini', '/opt/x/codex-acp'])
  const existe = async (r: string) => existen.has(r)
  it('encuentra en el primer directorio de PATH que lo tenga', async () => {
    const w = crearWhich('/bin:/usr/bin:/opt/x', existe, { sep: ':' })
    expect(await w('gemini')).toBe('/usr/bin/gemini')
    expect(await w('codex-acp')).toBe('/opt/x/codex-acp')
    expect(await w('nada')).toBeNull()
  })
  it('PATH vacío o binario con ruta → null', async () => {
    expect(await crearWhich(undefined, existe)('gemini')).toBeNull()
    expect(await crearWhich('/usr/bin', existe, { sep: ':' })('../bin/gemini')).toBeNull()
  })
  it('prueba extensiones (Windows)', async () => {
    const w = crearWhich('C:\\bin', async (r) => r.endsWith('gemini.cmd'), { sep: ';', exts: extsPlataforma('win32') })
    expect(await w('gemini')).toMatch(/gemini\.cmd$/)
    expect(extsPlataforma('linux')).toEqual([''])
  })
})
