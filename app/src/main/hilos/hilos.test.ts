import { mkdtempSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { borrarHilo, buscarHilos, guardarHilo, leerHilo, listarHilos, nuevoId, tituloDe, type Hilo } from './hilos'

const dir = () => mkdtempSync(join(tmpdir(), 'hilos-'))
const hilo = (p: Partial<Hilo> = {}): Hilo => ({ id: nuevoId(), titulo: 'Plan de la portada', creado: 1, actualizado: 1, motor: 'openrouter', modelo: 'x:free',
  turnos: [{ role: 'user', content: '¿Cómo hago la portada?' }, { role: 'assistant', content: 'Con una esfera de luz viva.' }], ...p })

describe('las conversaciones se guardan y se retoman', () => {
  it('guardar y leer devuelve lo mismo', () => {
    const d = dir(), h = hilo()
    guardarHilo(d, h)
    expect(leerHilo(d, h.id)).toEqual(h)
  })
  it('la lista va de la más reciente a la más antigua, con lo justo para pintarla', () => {
    const d = dir()
    guardarHilo(d, hilo({ id: 'aaaaaaa1', titulo: 'vieja', actualizado: 10 }))
    guardarHilo(d, hilo({ id: 'bbbbbbb2', titulo: 'nueva', actualizado: 20 }))
    expect(listarHilos(d).map((h) => [h.id, h.titulo, h.mensajes])).toEqual([['bbbbbbb2', 'nueva', 2], ['aaaaaaa1', 'vieja', 2]])
  })
  it('se busca dentro de lo hablado, con un trozo alrededor', () => {
    const d = dir(); guardarHilo(d, hilo({ id: 'ccccccc3' }))
    const r = buscarHilos(d, 'esfera')
    expect(r).toHaveLength(1); expect(r[0].id).toBe('ccccccc3'); expect(r[0].trozo).toMatch(/esfera de luz/)
  })
  it('borrar quita el fichero; leer lo que no existe da null', () => {
    const d = dir(), h = hilo(); guardarHilo(d, h); borrarHilo(d, h.id)
    expect(leerHilo(d, h.id)).toBeNull(); expect(readdirSync(d)).toEqual([])
  })
  it('un id con ruta («../») o raro se rechaza: nadie escribe fuera de su carpeta', () => {
    const d = dir()
    for (const malo of ['../fuera', 'a/b', '..', '', 'x'.repeat(80), 'con espacio']) {
      expect(() => guardarHilo(d, hilo({ id: malo }))).toThrow()
      expect(leerHilo(d, malo)).toBeNull()
    }
  })
  it('el título sale de la primera pregunta, corto', () => {
    expect(tituloDe([{ role: 'user', content: '  ¿Cómo diseño una portada que impresione a cualquiera que abra la app por primera vez?' }]))
      .toBe('¿Cómo diseño una portada que impresione a cualquiera…')
    expect(tituloDe([])).toBe('Conversación nueva')
  })
})
