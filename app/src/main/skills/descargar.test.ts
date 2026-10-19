import { describe, expect, it } from 'vitest'
import { arbolSha256, descargarSkill } from './descargar'

const SHA = 'a'.repeat(40)
const respuesta = (cuerpo: unknown, ok = true) => ({ ok, status: ok ? 200 : 404, json: async () => cuerpo, arrayBuffer: async () => new TextEncoder().encode(String(cuerpo)).buffer }) as unknown as Response
function falso(arbol: { path: string; mode?: string; type?: string; size?: number }[], textos: Record<string, string>) {
  const pedidas: string[] = []
  const f = (async (u: string) => {
    pedidas.push(u)
    if (u.includes('/git/trees/')) return respuesta({ tree: arbol.map((x) => ({ mode: '100644', type: 'blob', size: 10, ...x })), truncated: false })
    const ruta = decodeURIComponent(u.split(`/${SHA}/`)[1])
    return ruta in textos ? respuesta(textos[ruta]) : respuesta('', false)
  }) as unknown as typeof fetch
  return { f, pedidas }
}

describe('descargar una skill del repositorio de su autor, fijada a un commit', () => {
  it('trae solo los ficheros de su carpeta, con rutas relativas y el bit de ejecución', async () => {
    const { f } = falso([{ path: 'skills/tdd/SKILL.md' }, { path: 'skills/tdd/scripts/run.sh', mode: '100755' }, { path: 'skills/otra/SKILL.md' }, { path: 'skills/tdd', type: 'tree' }],
      { 'skills/tdd/SKILL.md': '---\nname: tdd\n---', 'skills/tdd/scripts/run.sh': 'echo hola' })
    const r = await descargarSkill({ repo: 'mattpocock/skills', ruta: 'skills/tdd', commit: SHA }, { fetch: f })
    expect(r.map((x) => [x.ruta, x.ejecutable])).toEqual([['SKILL.md', false], ['scripts/run.sh', true]])
    expect(r[0].datos.toString()).toBe('---\nname: tdd\n---')
  })
  it('rechaza enlaces simbólicos, rutas con «..», repos o commits raros y lo que pasa de los límites', async () => {
    await expect(descargarSkill({ repo: 'a/b', ruta: 's/x', commit: SHA }, { fetch: falso([{ path: 's/x/l', mode: '120000' }], {}).f })).rejects.toThrow(/enlaces/)
    await expect(descargarSkill({ repo: 'a/b', ruta: '../x', commit: SHA }, { fetch: falso([], {}).f })).rejects.toThrow(/ruta/)
    await expect(descargarSkill({ repo: 'a b/c', ruta: 'x', commit: SHA }, { fetch: falso([], {}).f })).rejects.toThrow(/repositorio/)
    await expect(descargarSkill({ repo: 'a/b', ruta: 'x', commit: 'main' }, { fetch: falso([], {}).f })).rejects.toThrow(/commit/)
    const muchos = Array.from({ length: 5 }, (_, i) => ({ path: `x/f${i}` }))
    await expect(descargarSkill({ repo: 'a/b', ruta: 'x', commit: SHA }, { fetch: falso(muchos, {}).f, limites: { ficheros: 3, bytes: 1e6 } })).rejects.toThrow(/ficheros/)
    await expect(descargarSkill({ repo: 'a/b', ruta: 'x', commit: SHA }, { fetch: falso([{ path: 'x/g', size: 2e6 }], {}).f, limites: { ficheros: 10, bytes: 1e6 } })).rejects.toThrow(/pesa/)
  })
  it('sin ficheros en esa carpeta, lo dice', async () => {
    await expect(descargarSkill({ repo: 'a/b', ruta: 'nada', commit: SHA }, { fetch: falso([{ path: 'otra/SKILL.md' }], {}).f })).rejects.toThrow(/no hay/i)
  })
})

describe('la huella del árbol (si alguien cambia lo revisado, no se instala)', () => {
  it('no depende del orden y cambia si cambia un byte o una ruta', () => {
    const a = [{ ruta: 'SKILL.md', datos: Buffer.from('hola') }, { ruta: 'b.md', datos: Buffer.from('x') }]
    const h = arbolSha256(a)
    expect(h).toMatch(/^[0-9a-f]{64}$/)
    expect(arbolSha256([...a].reverse())).toBe(h)
    expect(arbolSha256([{ ruta: 'SKILL.md', datos: Buffer.from('hola!') }, a[1]])).not.toBe(h)
    expect(arbolSha256([{ ruta: 'SKILL2.md', datos: Buffer.from('hola') }, a[1]])).not.toBe(h)
  })
  it('vector fijo (el script del catálogo calcula exactamente lo mismo)', () => {
    expect(arbolSha256([{ ruta: 'SKILL.md', datos: Buffer.from('hola') }])).toBe('dcfdf15be51ef20066d44d8bd13f461843b3a4b3463a14f57419fa524f79c481')
  })
})
