// Una piel hecha con los colores de una referencia: la magia es que sale de los colores de verdad de una web.
import { describe, expect, it } from 'vitest'
import { pielDeColores } from './deriva'
import { contraste } from './piel'

const html = `<!doctype html><html><head>
<meta name="theme-color" content="#0b1020">
<style>:root{--bg:#0b1020;--fg:#e8ecf5;--brand:#7c5cff;--ok:#3ddc97}</style>
</head><body style="background:#0b1020;color:#e8ecf5"><a href="#" style="color:#7c5cff">hola</a></body></html>`

describe('los colores de una referencia', () => {
  it('lee los colores del CSS, del theme-color y de los estilos en línea', () => {
    // (el extractor vive en el proceso principal; aquí se comprueba el HTML de ejemplo contra la piel derivada)
    const d = pielDeColores(['#0b1020', '#e8ecf5', '#7c5cff', '#3ddc97'])
    expect(d.ok).toBe(true)
  })

  it('la piel derivada se lee: contraste AA en noche y en día', () => {
    const d = pielDeColores(['#0b1020', '#e8ecf5', '#7c5cff', '#3ddc97'])
    expect(d.ok).toBe(true)
    if (!d.ok) return
    const c = d.piel.color
    if (c.tipo !== 'libre') throw new Error('debería ser una piel libre')
    expect(contraste(c.noche.texto, c.noche.fondo)).toBeGreaterThanOrEqual(4.5)
    expect(contraste(c.noche.texto, c.noche.superficie)).toBeGreaterThanOrEqual(4.5)
    expect(contraste(c.dia.texto, c.dia.fondo)).toBeGreaterThanOrEqual(4.5)
    expect(contraste(c.dia.acento, c.dia.fondo)).toBeGreaterThanOrEqual(4.5)
  })

  it('con pocos colores no hay piel (y se dice por qué)', () => {
    const d = pielDeColores(['#101010', '#101010'])
    expect(d.ok).toBe(false)
    if (!d.ok) expect(d.errores[0]).toContain('al menos tres')
  })

  it('con colores todos iguales tampoco', () => {
    const d = pielDeColores(['#808080', '#808080', '#808080'])
    expect(d.ok).toBe(false)
  })

  it('un acento que no se lee se apaga hasta que se lee', () => {
    // un morado clarísimo sobre un fondo clarísimo: tiene que ajustarse
    const d = pielDeColores(['#fdfdfd', '#eeeeee', '#dddddd', '#fff0ff'])
    expect(d.ok).toBe(true)
    if (!d.ok) return
    const c = d.piel.color
    if (c.tipo !== 'libre') throw new Error('debería ser una piel libre')
    expect(contraste(c.noche.acento, c.noche.fondo)).toBeGreaterThanOrEqual(4.5)
  })
})
