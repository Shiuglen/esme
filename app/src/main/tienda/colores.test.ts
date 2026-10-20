// Los colores de una referencia: lo que una web dice de sí misma con su CSS.
import { describe, expect, it } from 'vitest'
import { coloresDe } from './colores'

const html = `<!doctype html><html><head>
<meta name="theme-color" content="#0b1020">
<style>:root{--bg:#0b1020;--fg:#e8ecf5;--brand:#7c5cff;--ok:#3ddc97;--line:#1b2135}</style>
</head><body style="background:#0b1020;color:#e8ecf5">
<a href="#" style="color:#7c5cff">hola</a><span style="color:#3ddc97">ok</span>
</body></html>`

describe('los colores de una web', () => {
  it('lee los hex del CSS, del theme-color y de los estilos en línea', () => {
    const c = coloresDe(html)
    expect(c).toContain('#0b1020')
    expect(c).toContain('#e8ecf5')
    expect(c).toContain('#7c5cff')
    expect(c).toContain('#3ddc97')
  })

  it('el color que más usa la web es el primero (es su fondo)', () => {
    // el fondo aparece muchas veces; el acento, una
    const c = coloresDe('<style>a{color:#0b1020}b{color:#0b1020}c{color:#0b1020}d{color:#ff0000}</style>')
    expect(c[0]).toBe('#0b1020')
  })

  it('los colores de tres cifras se expanden', () => {
    expect(coloresDe('<style>a{color:#fff}</style>')).toContain('#ffffff')
  })

  it('los rgb() también se leen', () => {
    expect(coloresDe('<style>a{color:rgb(11, 16, 32)}</style>')).toContain('#0b1020')
  })

  it('una web sin colores no rompe nada', () => {
    expect(coloresDe('<html><body>hola</body></html>')).toEqual([])
  })
})
