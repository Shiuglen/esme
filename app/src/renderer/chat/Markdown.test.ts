// El Prisma pinta de verdad: SSR del Markdown con tabla y con json — las gráficas y las fichas deben nacer.
import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { Markdown } from './Markdown'

const TABLA = `| Motor | Tokens | Nota |
|---|---|---|
| qwen | 1.200 | 8,5 |
| pi ACP | 840 | 9,1 |`

const hace = (t: string) => renderToStaticMarkup(createElement(Markdown, { texto: t }))

describe('el Prisma en el Markdown', () => {
  it('la tabla numérica nace, y nace con su gráfica de píldoras y su suma', () => {
    const html = hace(TABLA)
    expect(html).toContain('<table')                    // la tabla de siempre
    expect(html).toContain('<svg')                      // la gráfica del Prisma
    expect(html).toContain('Tokens')                    // la columna pintada, con nombre
    expect(html).toContain('2040')                      // la suma escrita como la escribe Intl (es-ES no agrupa 4 cifras)
    expect(html).toContain('Nota')                      // segunda serie, también pintada
  })
  it('la tabla de solo palabras se queda sana, sin gráfica', () => {
    expect(hace('| A | B |\n|---|---|\n| q | r |\n| s | t |')).not.toContain('<svg')
  })
  it('el bloque json se vuelve panel con fichas y copia', () => {
    const html = hace('antes ```json\n{ "entrada": 1200, "salida": 3,5, "medio": "x" }\n```\ndespues'.replace('3,5', '3.5').replace('antes ', '').replace(' despues', '\n\ndespues'))
    expect(html).toContain('Datos')
    expect(html).toContain('entrada')
    expect(html).toContain('Copiar')
    expect(html).toContain('3.5')                       // la ficha con su número
    expect(html).toContain('json crudo')                // el detalle doblado
  })
  it('el código que no es json sigue siendo su pre de siempre', () => {
    expect(hace('`x` y:\n```ts\nconst a = 1\n```')).toContain('&lt;pre'.replace('&lt;', '<')) // <pre existe
    expect(hace('```ts\nconst a = 1\n```')).not.toContain('Datos')
  })
})
