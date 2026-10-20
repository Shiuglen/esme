// «Que Esme elija»: el clasificador de tareas y la decisión del motor. Esto es lo que hace que la app no dependa de
// que sepas qué motor usar: se lo dices y Esme elige, y te explica por qué.
import { describe, expect, it } from 'vitest'
import { candidatosDe, decidir, tipoDe } from './auto'
import type { ProveedorCatalogo } from '../catalogo/modelsdev'

const modelo = (id: string, salida: number, gratis = false, herramientas = true) => ({
  id, nombre: id, proveedor: 'x', contexto: 128_000, salida: 8192, coste: { entrada: salida / 2, salida }, herramientas, razonamiento: false, modalidades: ['text'], pesosAbiertos: false, gratis,
})

const catalogo: ProveedorCatalogo[] = [
  { id: 'anthropic', nombre: 'Anthropic', env: [], modelos: [modelo('claude-opus-5', 30), modelo('claude-haiku-4', 0.2)] },
  { id: 'openai', nombre: 'OpenAI', env: [], modelos: [modelo('gpt-5-mini', 0.6), modelo('gpt-5', 12)] },
]

describe('de qué tarea se trata', () => {
  it('reconoce el tipo de paso por lo que se pide', () => {
    expect(tipoDe('haz un plan para migrar la base de datos')).toBe('planificar')
    expect(tipoDe('revisa este código y dime si está bien')).toBe('juzgar')
    expect(tipoDe('programa una función que ordene una lista')).toBe('construir')
    expect(tipoDe('escribe un correo al cliente')).toBe('escribir')
    expect(tipoDe('resume este texto en tres líneas')).toBe('condensar')
    expect(tipoDe('¿qué hay en este archivo?')).toBe('leer')
    expect(tipoDe('ordena estas tareas por urgencia')).toBe('ordenar')
  })
  it('si no pide nada concreto, es conversación', () => {
    expect(tipoDe('buenas noches')).toBe('conversar')
    expect(tipoDe('¿me echas una mano?')).toBe('conversar')
  })
})

describe('qué motor usa Esme', () => {
  const motores = [
    { id: 'anthropic', local: false, hasKey: true },
    { id: 'openai', local: false, hasKey: false },
  ]

  it('el motor que tú fijas gana siempre', () => {
    const d = decidir({ mensaje: 'programa algo', motores, catalogo, fijado: { proveedor: 'anthropic', modelo: 'claude-opus-5' } })
    expect(d?.proveedor).toBe('anthropic')
    expect(d?.modelo).toBe('claude-opus-5')
    expect(d?.motivo).toContain('fijado')
  })

  it('si no hay motor fijado, elige el del nivel que la tarea pide y explica por qué', () => {
    const d = decidir({ mensaje: 'programa una función que ordene una lista', motores, catalogo })
    expect(d).toBeTruthy()
    expect(d!.tipo).toBe('construir')
    expect(d!.nivel).toBe('alto')   // no hay modelos de nivel medio en el catálogo: sube y lo dice
    expect(d!.motivo).toContain('sin modelos de nivel medio')
  })

  it('con un modelo de nivel medio, ese gana', () => {
    const conMedio: ProveedorCatalogo[] = [{ id: 'anthropic', nombre: 'Anthropic', env: [], modelos: [modelo('claude-sonnet-5', 5)] }]
    const d = decidir({ mensaje: 'programa una función que ordene una lista', motores: [{ id: 'anthropic', local: false, hasKey: true }], catalogo: conMedio })
    expect(d!.nivel).toBe('medio')
    expect(d!.motivo).toContain('medio')
  })

  it('nunca elige un motor sin clave', () => {
    const d = decidir({ mensaje: 'hola', motores: [{ id: 'openai', local: false, hasKey: false }], catalogo })
    expect(d).toBeNull()
  })

  it('sin motores utilizables, no decide (y la app lo dirá)', () => {
    expect(decidir({ mensaje: 'hola', motores: [], catalogo })).toBeNull()
  })

  it('los candidatos son los modelos de los motores que tienes', () => {
    const cs = candidatosDe({ motores, catalogo })
    expect(cs.map((c) => `${c.proveedor}/${c.modelo}`).sort()).toEqual(['anthropic/claude-haiku-4', 'anthropic/claude-opus-5'])
  })
})
