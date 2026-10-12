import { describe, expect, it } from 'vitest'
import { limpiarElegido, pedidoSobre } from './inspector'

describe('limpiarElegido', () => {
  it('acepta lo que manda el inspector y lo recorta', () => {
    const e = limpiarElegido({ esme: 'elegido', etiqueta: 'button', id: 'tema', clases: ['a', 'b'], texto: 'x'.repeat(500), selector: '#tema', html: '<button id="tema">🌙</button>' })
    expect(e).toMatchObject({ etiqueta: 'button', id: 'tema', clases: ['a', 'b'], selector: '#tema' })
    expect(e!.texto.length).toBeLessThanOrEqual(140)
  })
  it('rechaza mensajes que no tienen la forma esperada', () => {
    expect(limpiarElegido(null)).toBeNull()
    expect(limpiarElegido({ esme: 'otro' })).toBeNull()
    expect(limpiarElegido({ esme: 'elegido', etiqueta: 'button onclick=x', selector: 'a' })).toBeNull()
    expect(limpiarElegido({ esme: 'elegido', etiqueta: 'div', selector: 42 })).toBeNull()
  })
})

describe('pedidoSobre', () => {
  it('redacta el encargo con el elemento como contexto citado', () => {
    const e = limpiarElegido({ esme: 'elegido', etiqueta: 'button', id: 'tema', clases: [], texto: 'Modo oscuro', selector: '#tema', html: '<button id="tema">Modo oscuro</button>' })!
    const p = pedidoSobre(e, 'hazlo redondo y más grande')
    expect(p).toContain('`#tema`')
    expect(p).toContain('«Modo oscuro»')
    expect(p).toContain('```html\n<button id="tema">Modo oscuro</button>\n```')
    expect(p.trim().endsWith('Cambio que quiero: hazlo redondo y más grande')).toBe(true)
  })
})
