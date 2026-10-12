import { describe, expect, it } from 'vitest'
import { lenguajeDe, resaltar } from './resaltado'

describe('lenguajeDe', () => {
  it('reconoce el lenguaje por la extensión o el nombre del fichero', () => {
    expect(lenguajeDe('src/App.tsx')).toBe('tsx')
    expect(lenguajeDe('a/b/main.py')).toBe('python')
    expect(lenguajeDe('Dockerfile')).toBe('docker')
    expect(lenguajeDe('README.MD')).toBe('markdown')
    expect(lenguajeDe('script.zsh')).toBe('shellscript')
    expect(lenguajeDe('notas.txt')).toBeNull()
    expect(lenguajeDe('sin-extension')).toBeNull()
  })
})

describe('resaltar', () => {
  it('colorea con variables CSS y conserva el estado entre líneas (un comentario de varias líneas)', async () => {
    const t = await resaltar(['/* uno', 'dos */ const a = 1'], 'typescript')
    expect(t).toHaveLength(2)
    expect(t[0].map((x) => x.contenido).join('')).toBe('/* uno')
    expect(t[1][0]).toMatchObject({ contenido: expect.stringContaining('dos'), color: 'var(--shiki-token-comment)' })
    expect(t[1].some((x) => x.contenido === 'const' && x.color === 'var(--shiki-token-keyword)')).toBe(true)
  })
  it('sin lenguaje conocido devuelve las líneas tal cual', async () => {
    expect(await resaltar(['hola'], null)).toEqual([[{ contenido: 'hola' }]])
  })
})
