// Lo que guardaste: tus marcadores de X (y lo que sea) convertidos en lista de deseos de la Tienda.
import { describe, expect, it } from 'vitest'
import { deseosDe, dominioDe, nombreDeHerramienta, reparaUrls } from './deseos'

const post = (autor: string, texto: string, url: string) => `${autor}: ${texto} (${url})`

describe('lo que guardaste', () => {
  it('saca el autor, el texto y la herramienta de un marcador', () => {
    const d = deseosDe([post('Ramzi B. | @SDDFounder | · | 10 oct.', '¡Prueba esto! https://github.com/segfault42/heliosgen', 'https://x.com/SDDFounder/status/2108842356493693268')])
    expect(d).toHaveLength(1)
    expect(d[0].autor).toBe('Ramzi B.')
    expect(d[0].herramienta).toBe('heliosgen')
    expect(d[0].dominio).toBe('github.com')
    expect(d[0].post).toContain('x.com/SDDFounder')
    expect(d[0].texto).toContain('¡Prueba esto!')
  })

  it('un post que no guarda ninguna herramienta no inventa una', () => {
    const d = deseosDe([post('Alguien | @x | · | 1 oct.', 'Mira qué interesante esto', 'https://x.com/x/status/1')])
    expect(d).toHaveLength(1)
    expect(d[0].herramienta).toBe('')
    expect(d[0].destino).toContain('x.com')
  })

  it('no repite la misma herramienta guardada dos veces', () => {
    const d = deseosDe([
      post('A | @a | · | 1 oct.', 'mira https://github.com/segfault42/heliosgen', 'https://x.com/a/status/1'),
      post('B | @b | · | 2 oct.', 'otra vez https://github.com/segfault42/heliosgen', 'https://x.com/b/status/2'),
    ])
    expect(d).toHaveLength(1)
  })

  it('el nombre de la herramienta sale del camino, sin extensión ni parámetros', () => {
    expect(nombreDeHerramienta('https://github.com/segfault42/heliosgen')).toBe('heliosgen')
    expect(nombreDeHerramienta('https://github.com/a/b/tree/main')).toBe('main')
    expect(nombreDeHerramienta('https://akou.ai/download?x=1')).toBe('download')
    expect(dominioDe('https://www.HuggingFace.co/x')).toBe('huggingface.co')
  })

  it('las urls partidas por el harvest se vuelven a pegar', () => {
    expect(reparaUrls('mira\nhttps://\ngithub.com/a/b\n')).toContain('https://github.com/a/b')
    // el host ya entero: lo que sigue es prosa, no url
    expect(reparaUrls('https://\n60fps.design\ndiseño de sistemas')).toContain('https://60fps.design\ndiseño')
    expect(reparaUrls('https://\n60fps.design\ndiseño de sistemas')).not.toContain('60fps.designdiseño')
    // y un texto normal no se toca
    expect(reparaUrls('una línea\notra línea')).toBe('una línea\notra línea')
  })

  it('un texto vacío o sin nada no rompe nada', () => {
    expect(deseosDe(['', '   ', 'sin nada que ver'])).toEqual([])
  })
})
