import { describe, expect, it } from 'vitest'
import { candidatosDe, elegibles, elegir, elegirVarios, semillado, type Candidato } from './eleccion'

const opcionModelo = (ids: string[], actual = ids[0]) => ({ id: 'model', nombre: 'Model', actual, valores: ids.map((id) => ({ id, nombre: `opencode/${id.split('/')[1]} Nombre` })) })
const motores = [{ id: 'opencode', nombre: 'OpenCode', instalado: true }, { id: 'cline', nombre: 'Cline', instalado: true }, { id: 'gemini', nombre: 'Gemini CLI', instalado: false }]

describe('candidatosDe', () => {
  it('un candidato por modelo de cada motor instalado que respondió, sin los modelos caídos', () => {
    const cs = candidatosDe(motores, { opencode: [opcionModelo(['opencode/a-free', 'opencode/b-free', 'opencode/c-pro'])], cline: [] }, ['opencode/b-free'])
    expect(cs.map((c) => c.modelo)).toEqual(['opencode/a-free', 'opencode/c-pro'])
    expect(cs.map((c) => c.gratis)).toEqual([true, false])
    expect(cs[0]).toMatchObject({ motor: 'opencode', motorNombre: 'OpenCode', modeloNombre: 'opencode/a-free Nombre' })
  })
})

const c = (modelo: string, gratis = true): Candidato => ({ motor: 'opencode', motorNombre: 'OpenCode', modelo, modeloNombre: `${modelo} N`, gratis })

describe('elegir', () => {
  it('aprende: el modelo que aplicas gana casi siempre al que descartas', () => {
    const vs = [...Array(6)].map(() => ({ motor: 'opencode', modelo: 'bueno N', exito: true })).concat([...Array(6)].map(() => ({ motor: 'opencode', modelo: 'malo', exito: false })))
    const azar = semillado(7)
    let buenos = 0
    for (let i = 0; i < 200; i++) if (elegir([c('bueno'), c('malo')], vs, { azar })!.modelo === 'bueno') buenos++
    expect(buenos).toBeGreaterThan(185)
  })
  it('explica por qué: con historial lo cuenta; sin historial, dice que lo prueba', () => {
    const vs = [{ motor: 'opencode', modelo: 'a', exito: true }, { motor: 'opencode', modelo: 'a', exito: false }]
    expect(elegir([c('a')], vs, { azar: semillado(1) })).toMatchObject({ aciertos: 1, total: 2, motivo: '1 de 2 tareas aplicadas con este modelo' })
    expect(elegir([c('nuevo')], [], { azar: semillado(1) })).toMatchObject({ total: 0, motivo: 'Aún sin historial: Esme lo prueba' })
  })
  it('a igualdad, prefiere lo gratis', () => {
    const azar = semillado(3)
    let gratis = 0
    for (let i = 0; i < 200; i++) if (elegir([c('pago', false), c('libre')], [], { azar, preferirGratis: true })!.gratis) gratis++
    expect(gratis).toBeGreaterThan(110)
  })
  it('sin candidatos, nada', () => expect(elegir([], [], {})).toBeNull())
})

describe('elegirVarios', () => {
  it('elige n distintos para la arena', () => {
    const r = elegirVarios([c('a'), c('b'), c('c'), c('d')], [], 3, { azar: semillado(5) })
    expect(r).toHaveLength(3)
    expect(new Set(r.map((x) => x.modelo)).size).toBe(3)
    expect(elegirVarios([c('a')], [], 3, {})).toHaveLength(1)
  })
})

describe('elegibles', () => {
  it('en automático: los gratis, y los demás solo si ya te sirvieron alguna vez', () => {
    const vs = [{ motor: 'opencode', modelo: 'pago-bueno', exito: true }, { motor: 'opencode', modelo: 'local-malo', exito: false }]
    const r = elegibles([c('libre-free'), c('pago-bueno', false), c('local-malo', false), c('nunca', false)], vs)
    expect(r.map((x) => x.modelo)).toEqual(['libre-free', 'pago-bueno'])
  })
})
