import { describe, expect, it } from 'vitest'
import { contraste, derivarPaleta, PIEL_BASE, revisarContraste, validarPiel, variablesDePiel, type Base } from './piel'

const noche: Base = { fondo: '#0b0d14', superficie: '#12151f', texto: '#eceef4', acento: '#7c9cff' }
const dia: Base = { fondo: '#f6f7fb', superficie: '#ffffff', texto: '#11131a', acento: '#3a55c8' }

describe('una piel es solo datos', () => {
  it('la piel base es válida tal cual', () => {
    expect(validarPiel(PIEL_BASE)).toEqual({ ok: true, piel: PIEL_BASE })
  })
  it('lo que falta se toma de la base (una IA puede mandar solo una parte)', () => {
    const r = validarPiel({ nombre: 'Amplia', densidad: 'amplia' })
    expect(r.ok && r.piel.densidad).toBe('amplia')
    expect(r.ok && r.piel.letra).toEqual(PIEL_BASE.letra)
  })
  it('un color que no es un color (url, var, expresiones) se rechaza: una piel nunca trae código', () => {
    const r = validarPiel({ color: { tipo: 'libre', noche: { ...noche, fondo: 'url(https://x.y/a.png)' }, dia } })
    expect(r.ok).toBe(false)
    expect(validarPiel({ color: { tipo: 'libre', noche: { ...noche, acento: 'var(--x)' }, dia } }).ok).toBe(false)
  })
  it('una letra o una opción que no existe se rechaza', () => {
    expect(validarPiel({ letra: { titulos: 'comic-sans', texto: 'inter', escala: 1 } }).ok).toBe(false)
    expect(validarPiel({ fondo: 'video' }).ok).toBe(false)
  })
  it('los números se quedan en su rango', () => {
    const r = validarPiel({ letra: { titulos: 'inter', texto: 'inter', escala: 5 }, forma: { radio: -3, sombra: 'suave' } })
    expect(r.ok && r.piel.letra.escala).toBe(1.2)
    expect(r.ok && r.piel.forma.radio).toBe(0)
  })
})

describe('el color libre: cuatro colores bastan', () => {
  it('de fondo, superficie, texto y acento nace la paleta entera, legible', () => {
    for (const [b, t] of [[noche, 'noche'], [dia, 'dia']] as const) {
      const p = derivarPaleta(b, t)
      for (const k of ['--fondo', '--superficie-1', '--superficie-2', '--superficie-3', '--linea', '--linea-fuerte', '--texto', '--texto-2', '--texto-3', '--acento', '--sobre-acento', '--acento-velo', '--peligro', '--atencion', '--exito', '--luz'])
        expect(p[k], `${t} ${k}`).toBeTruthy()
      expect(revisarContraste(p), t).toEqual([])
    }
  })
  it('el contraste se mide como WCAG', () => {
    expect(contraste('#000000', '#ffffff')).toBeCloseTo(21, 0)
    expect(contraste('#777777', '#777777')).toBeCloseTo(1, 5)
  })
  it('si algo no se lee, se dice qué', () => {
    const p = derivarPaleta({ ...noche, texto: '#2a2c33' }, 'noche')
    expect(revisarContraste(p).some((x) => x.startsWith('texto sobre fondo'))).toBe(true)
  })
})

describe('cada capa se vuelve variables en vivo', () => {
  it('forma, densidad y letra', () => {
    const v = variablesDePiel({ ...PIEL_BASE, forma: { radio: 0, sombra: 'plana' }, densidad: 'compacta', letra: { titulos: 'fraunces', texto: 'geist', escala: 1 } }, 'noche')
    expect(v['--forma-r2']).toBe('0px')
    expect(v['--espaciado']).toBe('0.21rem')
    expect(v['--letra-texto']).toContain('Geist Variable')
    expect(v['--letra-titulos']).toContain('Fraunces Variable')
    expect(variablesDePiel(PIEL_BASE, 'noche')['--forma-r2']).toBe('10px')   // Tinta y Luz: radio 0,6
  })

  it('la densidad cambia el espaciado de verdad (antes no cambiaba nada)', () => {
    const d = (densidad: 'compacta' | 'comoda' | 'amplia') =>
      variablesDePiel({ ...PIEL_BASE, densidad }, 'noche')['--espaciado']
    expect(d('compacta')).not.toBe(d('comoda'))
    expect(d('comoda')).not.toBe(d('amplia'))
    expect(parseFloat(d('amplia'))).toBeGreaterThan(parseFloat(d('compacta')))
  })
  it('el color libre y el propio traen su paleta; un estilo de casa la deja al CSS', () => {
    expect(variablesDePiel({ ...PIEL_BASE, color: { tipo: 'libre', noche, dia } }, 'dia')['--fondo']).toBe('#f6f7fb')
    expect(variablesDePiel({ ...PIEL_BASE, color: { tipo: 'gustos', gustos: { tono: 200, papel: 20, fuerza: 60 } } }, 'noche')['--acento']).toBeTruthy()
    expect(variablesDePiel({ ...PIEL_BASE, color: { tipo: 'estilo', estilo: 'esmeralda' } }, 'noche')['--fondo']).toBeUndefined()
  })
})

describe('nada se queda sin color', () => {
  it('la ecuación propia da fondo, superficie y texto (antes salían vacíos)', async () => {
    const { paletaPropia } = await import('./estilo-propio')
    for (const tema of ['noche', 'dia'] as const) {
      const v = paletaPropia({ tono: 280, papel: 10, fuerza: 85 }, tema)
      for (const k of ['--fondo', '--superficie-1', '--texto', '--papel', '--hoja', '--tinta']) expect(v[k], `${tema} ${k}`).toBeTruthy()
    }
  })
  it('un color que falta es un fallo de legibilidad, no un aprobado', () => {
    expect(revisarContraste({ '--texto': '#ffffff' }).length).toBeGreaterThan(0)
  })
})

describe('la navegación también es de la piel', () => {
  it('leyenda por defecto; riel y muelle son válidos; lo desconocido se rechaza', () => {
    expect(PIEL_BASE.navegacion).toBe('leyenda')
    const r = validarPiel({ navegacion: 'muelle' })
    expect(r.ok && r.piel.navegacion).toBe('muelle')
    expect(validarPiel({ navegacion: 'riel' }).ok).toBe(true)
    expect(validarPiel({ navegacion: 'menu-hamburguesa' }).ok).toBe(false)
  })
})

describe('la piel de la casa: Tinta y Luz (18-oct)', () => {
  it('materia impresa: Bodoni para los títulos, Geist para el texto, superficie de tinta (líneas de 1 px, sin cristal)', async () => {
    const { PIEL_BASE: p } = await import('./piel')
    expect(p.nombre).toBe('Tinta y Luz')
    expect(p.letra.titulos).toBe('bodoni'); expect(p.letra.texto).toBe('geist')
    expect(p.piezas.superficie).toBe('tinta')
  })
  it('tinta azul profunda con luz bioluminiscente, válida y legible de día y de noche', async () => {
    const { PIEL_BASE: p, validarPiel: v, revisarContraste: c, variablesDePiel: vars } = await import('./piel')
    expect(v(p)).toEqual({ ok: true, piel: p })
    expect(p.color.tipo).toBe('libre')
    for (const t of ['noche', 'dia'] as const) expect(c(vars(p, t)), t).toEqual([])
  })
})
