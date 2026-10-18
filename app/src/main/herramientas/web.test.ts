import { describe, it, expect, vi } from 'vitest'
import { buscarWeb, deBrave, deSearx, deWikipedia, textoDeHtml } from './web'

describe('resultados de cada buscador, siempre con la misma forma', () => {
  it('Brave', () => {
    expect(deBrave({ web: { results: [{ title: 'Electron <strong>Builder</strong>', url: 'https://electron.build', description: 'Empaqueta <b>apps</b>' }] } }))
      .toEqual([{ titulo: 'Electron Builder', url: 'https://electron.build', resumen: 'Empaqueta apps' }])
  })
  it('SearXNG', () => {
    expect(deSearx({ results: [{ title: 'A', url: 'https://a.dev', content: 'uno' }, { title: 'B', url: 'javascript:alert(1)', content: 'malo' }] }))
      .toEqual([{ titulo: 'A', url: 'https://a.dev', resumen: 'uno' }])
  })
  it('Wikipedia', () => {
    expect(deWikipedia({ query: { search: [{ title: 'Ada Lovelace', snippet: 'Matemática <span class="searchmatch">inglesa</span>' }] } }, 'es'))
      .toEqual([{ titulo: 'Ada Lovelace', url: 'https://es.wikipedia.org/wiki/Ada_Lovelace', resumen: 'Matemática inglesa' }])
  })
  it('lo que no tiene la forma esperada da una lista vacía, sin romperse', () => {
    expect(deBrave(null)).toEqual([]); expect(deSearx({ results: 'x' })).toEqual([]); expect(deWikipedia({}, 'es')).toEqual([])
  })
})

describe('qué buscador se usa', () => {
  const json = (x: unknown) => ({ ok: true, json: async () => x }) as Response
  it('con clave de Brave, Brave (con la clave en su cabecera, nunca en la URL)', async () => {
    const f = vi.fn(async () => json({ web: { results: [{ title: 'R', url: 'https://r.dev', description: 'd' }] } }))
    const r = await buscarWeb('hola mundo', { brave: 'CLAVE' }, f as unknown as typeof fetch)
    expect(r.fuente).toBe('Brave'); expect(r.resultados).toHaveLength(1)
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).not.toContain('CLAVE'); expect((init.headers as Record<string, string>)['X-Subscription-Token']).toBe('CLAVE')
  })
  it('con un SearXNG propio, ese', async () => {
    const f = vi.fn(async () => json({ results: [{ title: 'S', url: 'https://s.dev', content: 'c' }] }))
    const r = await buscarWeb('hola', { searxng: 'http://172.20.1.101:8888/' }, f as unknown as typeof fetch)
    expect(r.fuente).toBe('SearXNG'); expect((f.mock.calls[0] as unknown as [string])[0]).toBe('http://172.20.1.101:8888/search?q=hola&format=json')
  })
  it('si la Wikipedia en español no encuentra nada, busca en la inglesa', async () => {
    const f = vi.fn(async (u: string) => json(u.includes('es.wikipedia') ? { query: { search: [] } } : { query: { search: [{ title: 'Ada Lovelace', snippet: 's' }] } }))
    const r = await buscarWeb('Ada Lovelace birth year', {}, f as unknown as typeof fetch)
    expect(r.resultados[0].url).toBe('https://en.wikipedia.org/wiki/Ada_Lovelace')
  })
  it('sin nada configurado, o si el elegido falla, Wikipedia', async () => {
    const f = vi.fn(async (u: string) => (u.includes('wikipedia') ? json({ query: { search: [{ title: 'W', snippet: 's' }] } }) : ({ ok: false, status: 500 }) as Response))
    expect((await buscarWeb('x', {}, f as unknown as typeof fetch)).fuente).toBe('Wikipedia')
    expect((await buscarWeb('x', { brave: 'K' }, f as unknown as typeof fetch)).fuente).toBe('Wikipedia')
  })
})

describe('el texto de una página', () => {
  it('quita scripts, estilos y etiquetas, decodifica y se queda con el título', () => {
    const html = '<html><head><title>Mi &amp; página</title><style>p{}</style><script>alert(1)</script></head><body><nav>menú</nav><h1>Hola</h1><p>Uno&nbsp;dos &lt;tres&gt;</p></body></html>'
    expect(textoDeHtml(html)).toEqual({ titulo: 'Mi & página', texto: 'Hola\nUno dos <tres>' })
  })
  it('recorta lo muy largo', () => {
    expect(textoDeHtml(`<p>${'a'.repeat(50)}</p>`, 20).texto).toBe(`${'a'.repeat(20)}…`)
  })
})
