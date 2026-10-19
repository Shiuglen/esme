import { describe, expect, it } from 'vitest'
import { coincide, tareasQueCoinciden } from './paleta-buscar'

describe('la paleta encuentra lo tuyo sin importar acentos ni mayúsculas', () => {
  it('todas las palabras tienen que estar, en cualquier orden', () => {
    expect(coincide('web vaso', 'Hazme una WEB de un vaso')).toBe(true)
    expect(coincide('kyc que', 'dime qué es un KYC')).toBe(true)
    expect(coincide('vaso tienda', 'Hazme una web de un vaso')).toBe(false)
    expect(coincide('', 'lo que sea')).toBe(false)
  })
  it('las tareas que coinciden, las más recientes primero y como mucho n', () => {
    const t = (id: string, titulo: string, inicio: number) => ({ id, titulo, texto: titulo, inicio })
    const tareas = [t('a', 'hazme una web de un vaso', 1), t('b', 'web del taller', 3), t('c', 'tests de la agenda', 2), t('d', 'otra web', 4)]
    expect(tareasQueCoinciden('web', tareas, 2).map((x) => x.id)).toEqual(['d', 'b'])
    expect(tareasQueCoinciden('agenda', tareas, 5).map((x) => x.id)).toEqual(['c'])
  })
})
