import { describe, it, expect } from 'vitest'
import { aplicarPaso, fraseDePaso } from './pasos'

describe('los pasos de Esme en una respuesta', () => {
  it('cada llamada es una línea que avanza: pide → haciendo → hecho', () => {
    let p = aplicarPaso([], { fase: 'pide', id: 'a', nombre: 'encargar_al_equipo', args: { encargo: 'arregla los tests' } })
    expect(p).toEqual([{ id: 'a', nombre: 'encargar_al_equipo', estado: 'pide', args: { encargo: 'arregla los tests' } }])
    p = aplicarPaso(p, { fase: 'llama', id: 'a', nombre: 'encargar_al_equipo', args: { encargo: 'arregla los tests' } })
    p = aplicarPaso(p, { fase: 'resultado', id: 'a', nombre: 'encargar_al_equipo', resumen: '{"id":"abc"}' })
    expect(p).toHaveLength(1); expect(p[0]).toMatchObject({ estado: 'hecho', resumen: '{"id":"abc"}' })
  })
  it('varias llamadas conservan su orden; un fallo queda dicho', () => {
    let p = aplicarPaso([], { fase: 'llama', id: 'a', nombre: 'buscar_en_internet', args: { consulta: 'x' } })
    p = aplicarPaso(p, { fase: 'llama', id: 'b', nombre: 'leer_web', args: { url: 'https://a.dev/b' } })
    p = aplicarPaso(p, { fase: 'error', id: 'b', nombre: 'leer_web', error: 'La página respondió 404.' })
    expect(p.map((x) => [x.id, x.estado])).toEqual([['a', 'haciendo'], ['b', 'error']])
  })
})

describe('cada paso dicho como lo diría una persona', () => {
  it('en presente mientras pasa y en pasado cuando terminó', () => {
    expect(fraseDePaso({ id: 'a', nombre: 'buscar_en_internet', estado: 'haciendo', args: { consulta: 'Ada Lovelace' } })).toBe('Buscando en internet «Ada Lovelace»')
    expect(fraseDePaso({ id: 'a', nombre: 'buscar_en_internet', estado: 'hecho', args: { consulta: 'Ada Lovelace' } })).toBe('Buscó en internet «Ada Lovelace»')
    expect(fraseDePaso({ id: 'b', nombre: 'leer_web', estado: 'hecho', args: { url: 'https://www.electron.build/nsis' } })).toBe('Leyó electron.build')
    expect(fraseDePaso({ id: 'c', nombre: 'encargar_al_equipo', estado: 'pide', args: { encargo: 'arregla los tests' } })).toBe('Quiere encargar al equipo «arregla los tests»')
    expect(fraseDePaso({ id: 'd', nombre: 'github__crear_issue', estado: 'hecho', args: {} })).toBe('Usó github · crear issue')
  })
  it('lo que falló o negaste no se dice como hecho', () => {
    expect(fraseDePaso({ id: 'c', nombre: 'encargar_al_equipo', estado: 'error', args: { encargo: 'arregla los tests' }, error: 'No diste permiso.' })).toBe('Encargar al equipo «arregla los tests»')
    expect(fraseDePaso({ id: 'd', nombre: 'github__crear_issue', estado: 'error', args: {} })).toBe('Usar github · crear issue')
  })
})
