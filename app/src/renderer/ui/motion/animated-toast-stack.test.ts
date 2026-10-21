// La pila de avisos: lo que pasa en el equipo se apila, se va sola, y no tapa el trabajo.
// Este test no necesita navegador: mira lo que el componente decide (qué se pinta, con qué estado y qué acción).
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const raiz = resolve(import.meta.dirname, '..', '..')   // src/renderer

describe('la pila de avisos (beUI)', () => {
  const fuente = readFileSync(join(raiz, 'ui', 'motion', 'animated-toast-stack.tsx'), 'utf8')

  it('el estado «warning» existe y lleva su icono y su color de la piel', () => {
    // sin este estado, el aviso de permiso (el que más urge) no se distinguía de un error
    expect(fuente).toContain('"warning"')
    expect(fuente).toMatch(/warning:\s*TriangleAlert/)
    expect(fuente).toMatch(/warning:\s*"text-atencion bg-atencion-velo"/)
  })

  it('ningún estado lleva un color fijo de la paleta de Tailwind: el color lo decide la piel', () => {
    // el beUI de fuera traía emerald-500/10: eso rompe la regla de «una sola piel»
    const colores = [...fuente.matchAll(/(?:text|bg|border)-(?:emerald|red|blue|green|yellow|orange|indigo|violet|pink|rose|slate|gray|zinc|neutral|stone)-/g)]
    expect(colores.map((m) => m[0]), 'colores fijos de Tailwind dentro de la pila').toEqual([])
  })
})

describe('la pila se monta en la app', () => {
  const app = readFileSync(join(raiz, 'App.tsx'), 'utf8')

  it('los avisos del equipo van a la pila, no solo al historial', () => {
    expect(app).toContain('AnimatedToastStack')
    // el aviso de permiso es el que urge: se apila con su acción de «Ver»
    expect(app).toMatch(/status:\s*a\.tipo === 'error' \? 'error' : a\.tipo === 'permiso' \? 'warning' : 'success'/)
    expect(app).toMatch(/action:\s*a\.tipo === 'permiso'/)
  })

  it('la pila se va sola (nada se queda pegado en la pantalla)', () => {
    expect(app).toMatch(/setPila\(\(v\) => v\.filter\(\(x\) => x\.id !== id\)\)/)
  })

  it('la pila viste de la piel: superficie, línea y sombra del sistema', () => {
    expect(app).toMatch(/surface:.*bg-s2\/90 shadow-flotante backdrop-blur-xl/)
  })
})
