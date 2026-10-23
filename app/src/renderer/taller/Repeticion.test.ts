// Lo que el creador repite: lo que dice la tarjeta y qué puede hacer con ella.
import { describe, expect, it, vi } from 'vitest'
import type { Necesidad, Repeticion } from '../lib/bridge'
import { encargoNecesidad, fraseNecesidad, fraseRepeticion, haceDe, nombreValido, sePuedeUsar } from './Repeticion'

// El editor habla con la app por el puente; en esta prueba el puente no hace nada.
vi.mock('../lib/bridge', () => ({ bridge: { skills: { catalogo: async () => ({ skills: [], agentes: [] }) }, mente: { repeticiones: async () => ({ repeticiones: [] }), necesidad: async () => ({ necesidades: [] }) } } }))

const r: Repeticion = {
  titulo: 'readme, proyecto, instalación',
  veces: 3,
  terminos: ['readme', 'proyecto', 'instalación'],
  ejemplo: 'actualiza el README del proyecto con la instalación nueva',
  desde: '2026-10-01',
  hasta: '2026-10-14',
  motores: ['opencode'],
  encargos: ['actualiza el README del proyecto con la instalación nueva'],
}

describe('la tarea repetida', () => {
  it('dice cuántas veces se repitió y desde cuándo', () => {
    const f = fraseRepeticion(r)
    expect(f).toContain('3 veces')
    expect(f).toContain('2026-10-01')
    expect(f).toContain('2026-10-14')
  })

  it('con una sola vez habla en singular', () => {
    expect(fraseRepeticion({ ...r, veces: 1 })).toContain('1 vez,')
  })

  it('se ofrece el encargo sólo si hay algo que lanzar', () => {
    expect(sePuedeUsar(r)).toBe(true)
    expect(sePuedeUsar({ ...r, ejemplo: '' })).toBe(false)
    expect(sePuedeUsar({ ...r, ejemplo: '   ' })).toBe(false)
  })
})

describe('la herramienta que falta', () => {
  const n: Necesidad = {
    titulo: 'pdftotext',
    fallo: "command not found: pdftotext",
    veces: 3,
    motores: ['opencode'],
    herramienta: 'pdftotext',
    encargos: ['extrae el texto del PDF que te paso'],
  }

  it('dice cuántas veces falló y quién', () => {
    const f = fraseNecesidad(n)
    expect(f).toContain('3 veces')
    expect(f).toContain('opencode')
  })

  it('el encargo de la Forja nombra la herramienta que falta', () => {
    const e = encargoNecesidad(n)
    expect(e).toContain('pdftotext')
    expect(e).toContain('extrae el texto del PDF')
  })

  it('si no se sabe el nombre, el encargo lleva el fallo entero', () => {
    const e = encargoNecesidad({ ...n, herramienta: '', titulo: 'algo' })
    expect(e).toContain('command not found: pdftotext')
  })
})

describe('la receta: el nombre tiene que poder ser una carpeta', () => {
  it('acepta lo que la mente propone (guiones, números y letras)', () => {
    expect(nombreValido('readme-instalacion')).toBe(true)
    expect(nombreValido('tarea-2')).toBe(true)
  })
  it('rechaza lo que rompería la carpeta', () => {
    expect(nombreValido('con espacio')).toBe(false)
    expect(nombreValido('acentuado-ñ')).toBe(false)
    expect(nombreValido('-empieza-mal')).toBe(false)
    expect(nombreValido('')).toBe(false)
    expect(nombreValido('a'.repeat(65))).toBe(false)
  })
})

describe('el editor de la receta (pintado de verdad)', () => {
  it('enseña el borrador de la mente: nombre, descripción y receta, y el botón de instalar', async () => {
    const { renderToStaticMarkup } = await import('react-dom/server')
    const { EditorSkill } = await import('./Repeticion')
    const r: Repeticion = {
      titulo: 'readme, instalación', veces: 3, terminos: ['readme', 'instalación'],
      ejemplo: 'actualiza el readme con la instalación nueva', desde: '2026-10-18', hasta: '2026-10-20',
      motores: ['opencode'], encargos: [],
      borrador: { nombre: 'readme-instalacion', descripcion: 'Actualiza el readme con la instalación nueva.', cuerpo: '# Hola\n- [ ] Qué hay que mirar primero.' },
    }
    const React = await import('react')
    const html = renderToStaticMarkup(React.createElement(EditorSkill, { r, onCerrar: () => {} }))
    expect(html).toContain('readme-instalacion')
    expect(html).toContain('Actualiza el readme con la instalación nueva.')
    expect(html).toContain('Qué hay que mirar primero.')
    expect(html).toContain('Instalar la receta')
    // y avisa si el nombre no puede ser una carpeta
    const malo = renderToStaticMarkup(React.createElement(EditorSkill, { r: { ...r, borrador: { ...r.borrador!, nombre: 'con espacio' } }, onCerrar: () => {} }))
    expect(malo).toContain('Sólo letras, números, guiones y puntos')
  })
})

describe('la puerta del Taller (encargos de fuera)', () => {
  it('haceDe lo dice en palabras cortas: s, min, h, días (segundos, como los da la mente)', () => {
    const ahora = 1_700_000_000
    expect(haceDe(ahora - 20, ahora)).toBe('hace 20 s')
    expect(haceDe(ahora - 5 * 60, ahora)).toBe('hace 5 min')
    expect(haceDe(ahora - 4 * 3_600, ahora)).toBe('hace 4 h')
    expect(haceDe(ahora - 2 * 86_400, ahora)).toBe('hace 2 días')
    expect(haceDe(ahora + 1, ahora)).toBe('hace 0 s')   // el reloj del otro lado nunca se fió
  })
})
