// El Prisma parsea de verdad: tablas separadas, números con sus formatos humanos y json de verdad.
import { describe, expect, it } from 'vitest'
import { datosVivos, fichasDe, numeroDe, tablasVivas } from './prisma'

const tabla = `| Motor | Tokens | Nota |
|---|---|---|
| qwen | 1.200 | 8,5 |
| pi ACP | 840 | 9,1 |`

describe('numeroDe', () => {
  it('los números de los humanos los entiende igual', () => {
    expect(numeroDe('1.5')).toBe(1.5)
    expect(numeroDe('1,5')).toBe(1.5)
    expect(numeroDe('12%')).toBe(12)
    expect(numeroDe('—')).toBe(null)
    expect(numeroDe('qwen')).toBe(null)
  })
})

describe('tablasVivas', () => {
  it('πήra la serie numérica con su suma y deja fuera las columnas de palabras', () => {
    const ts = tablasVivas(tabla)
    expect(ts).toHaveLength(1)
    expect(ts[0].series.map((s) => s.col)).toEqual(['Tokens', 'Nota'])
    expect(ts[0].series[0].serie).toEqual([1200, 840])
    expect(ts[0].series[0].suma).toBe(2040)
    expect(ts[0].series[1].serie).toEqual([8.5, 9.1])
  })
  it('sin columnas numéricas no hay prisma, y sin separador tampoco', () => {
    expect(tablasVivas(`| A | B |\n|---|---|\n| q | r |\n| s | t |`)).toEqual([])
    expect(tablasVivas(`| A | B |\n| q | r |`)).toEqual([])
  })
})

describe('datosVivos', () => {
  it('el json de verdad se vuelve datos; el resto no', () => {
    expect(datosVivos('[3, 1, 4]')?.datos).toEqual([3, 1, 4])
    expect(datosVivos('{ "a": 2 }')?.datos).toEqual({ a: 2 })
    expect(datosVivos('hola')).toBe(null)
    expect(datosVivos('[broken')).toBe(null)
  })
  it('las fichas salen del objeto plano con sus números', () => {
    expect(fichasDe({ a: 3, b: 'x', c: 2.5 })).toEqual([['a', 3], ['c', 2.5]])
    expect(fichasDe([1, 2])).toEqual([])
  })
})

it('los miles humanos: grupos de 3 son miles; el decimal manda en el último separador', () => {
  expect(numeroDe('1.200')).toBe(1200)
  expect(numeroDe('1.234.567')).toBe(1234567)
  expect(numeroDe('1,234,567.25')).toBe(1234567.25)
  expect(numeroDe('1.234,5')).toBe(1234.5)
  expect(numeroDe('2.5')).toBe(2.5)
})

import { caminoLinea, leerPrisma } from './prisma'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { Markdown } from './Markdown'

describe('leerPrisma — el spec del motor, estricto', () => {
  it('acepta línea con números finitos, barras con series y fichas de números', () => {
    const linea = leerPrisma('{"tipo":"linea","titulo":"Tokens","valores":[1,2,3],"etiquetas":["t1","t2","t3"]}')
    expect(linea?.tipo).toBe('linea')
    if (linea?.tipo === 'linea') expect(linea.titulo).toBe('Tokens')
    const barras = leerPrisma('{"tipo":"barras","series":[{"nombre":"qwen","valores":[1,2]},{"nombre":"pi","valores":[3,4]}]}')
    expect(barras?.tipo).toBe('barras')
    const fichas = leerPrisma('{"tipo":"fichas","fichas":{"entrada":1200,"salida":800.5}}')
    expect(fichas?.tipo).toBe('fichas')
  })
  it('lo podrido no nace: NaN, vacíos, bloques rotos', () => {
    expect(leerPrisma('{"tipo":"linea","valores":[1,"x"]}')).toBe(null)
    expect(leerPrisma('{"tipo":"linea","valores":[]}')).toBe(null)
    expect(leerPrisma('{"tipo":"barras","series":[]}')).toBe(null)
    expect(leerPrisma('{"tipo":"fichas","fichas":{}}')).toBe(null)
    expect(leerPrisma('{"tipo":"zeta"}')).toBe(null)
    expect(leerPrisma('no es json')).toBe(null)
  })
})

describe('caminoLinea — el dibujo del prisma', () => {
  it('todo dentro del cuadro, sin NaN, y el cero marcado cuando los datos lo cruzan', () => {
    const { linea, area, puntos, yCero } = caminoLinea([3, -1, 2, 5])
    expect(yCero).toBeGreaterThan(8)      // la línea del cero vive entre los bordes
    expect(yCero).toBeLessThan(78)
    expect(linea.startsWith('M')).toBe(true)
    expect(linea).not.toContain('NaN')
    expect(area.endsWith('Z')).toBe(true)
    for (const [x, y] of puntos) { expect(x).toBeGreaterThanOrEqual(8); expect(x).toBeLessThanOrEqual(252); expect(y).toBeGreaterThanOrEqual(8); expect(y).toBeLessThanOrEqual(78) }
    const plano = caminoLinea([2, 2, 2])  // rango cero no puede reventar
    expect(plano.linea).not.toContain('NaN')
  })
})

describe('el panel del motor nace de un bloque ```prisma```', () => {
  const bloque = '```prisma\n{"tipo":"linea","titulo":"Tokens por turno","unidades":"tokens","valores":[1200,800,2200],"etiquetas":["t1","t2","t3"]}\n```'
  it('la casa dibuja: svg con área, título y las fichas de max/min/total', () => {
    const html = renderToStaticMarkup(createElement(Markdown, { texto: bloque }))
    expect(html).toContain('prisma')
    expect(html).toContain('<svg')
    expect(html).toContain('Tokens por turno')
    expect(html).toContain('total')
    expect(html).toContain('2200')
  })
  it('un prisma podrido vuelve a ser pre de siempre', () => {
    const html = renderToStaticMarkup(createElement(Markdown, { texto: '```prisma\n{"tipo":"linea","valores":[1,"x"]}\n```' }))
    expect(html).toContain('<pre')
    expect(html).not.toContain('prisma-panel')
  })
})

describe('el spec manda, no la etiqueta', () => {
  it('un json cercado con forma de prisma también nace pintado (laguna usa ```json)', () => {
    const html = renderToStaticMarkup(createElement(Markdown, { texto: '```json\n{"tipo":"barras","titulo":"Tareas por motor","unidades":"tareas","series":[{"nombre":"qwen","valores":[8,5,12]}],"etiquetas":["lun","mar","mie"]}\n```' }))
    expect(html).toContain('<svg')
    expect(html).toContain('Tareas por motor')
  })
  it('un fence prisma podrido queda crudo, sin tarjeta de datos', () => {
    const html = renderToStaticMarkup(createElement(Markdown, { texto: '```prisma\n{"tipo":"barras","series":"se me cayó"}\n```' }))
    expect(html).toContain('<pre')
    expect(html).not.toContain('Ver el json crudo')
  })
})
