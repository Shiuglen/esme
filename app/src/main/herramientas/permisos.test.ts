import { describe, it, expect } from 'vitest'
import { decidir, Conocidas } from './permisos'

describe('qué pide permiso', () => {
  it('mirar no pide permiso; actuar sí', () => {
    expect(decidir('buscar_en_memoria', {})).toBe('permitir')
    expect(decidir('ver_equipo', {})).toBe('permitir')
    expect(decidir('buscar_en_internet', {})).toBe('permitir')
    expect(decidir('encargar_al_equipo', {})).toBe('preguntar')
    expect(decidir('programar_encargo', {})).toBe('preguntar')
  })
  it('cualquier herramienta conectada pregunta hasta que digas «siempre»; «nunca» la bloquea', () => {
    expect(decidir('github__crear_issue', {})).toBe('preguntar')
    expect(decidir('github__crear_issue', { github__crear_issue: 'siempre' })).toBe('permitir')
    expect(decidir('buscar_en_memoria', { buscar_en_memoria: 'nunca' })).toBe('negar')
  })
  it('leer una web es libre solo si la dirección vino de ti o de una búsqueda; si no, pregunta', () => {
    const c = new Conocidas()
    c.anotarTexto('mira https://electron.build/configuration y dime')
    c.anotarUrl('https://es.wikipedia.org/wiki/Ada_Lovelace')
    expect(decidir('leer_web', {}, { url: 'https://electron.build/nsis' }, c)).toBe('permitir')
    expect(decidir('leer_web', {}, { url: 'https://es.wikipedia.org/wiki/Ada_Lovelace' }, c)).toBe('permitir')
    expect(decidir('leer_web', {}, { url: 'https://malo.example/?datos=tu-memoria' }, c)).toBe('preguntar')
  })
  it('Wikipedia se lee sin preguntar (allí nadie recibe tus datos), en cualquier idioma', () => {
    const c = new Conocidas()
    expect(decidir('leer_web', {}, { url: 'https://en.wikipedia.org/wiki/Ada_Lovelace' }, c)).toBe('permitir')
    expect(decidir('leer_web', {}, { url: 'https://wikipedia.org.malo.example/x' }, c)).toBe('preguntar')
  })
  it('una dirección conocida con datos añadidos en la consulta también pregunta', () => {
    const c = new Conocidas(); c.anotarUrl('https://electron.build/')
    expect(decidir('leer_web', {}, { url: `https://electron.build/?q=${'x'.repeat(200)}` }, c)).toBe('preguntar')
  })
})
