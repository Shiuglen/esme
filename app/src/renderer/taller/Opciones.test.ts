import { describe, expect, it } from 'vitest'
import { configInicial } from './Opciones'

const modelo = (actual: string) => ({ id: 'model', nombre: 'Model', actual, valores: [
  { id: 'llamacpp/ling-3.0-tiny', nombre: 'llamacpp/Ling tiny (local)' }, { id: 'opencode/big-pickle', nombre: 'opencode/Big Pickle' },
  { id: 'opencode/exo-free', nombre: 'opencode/Exo Free' }, { id: 'opencode/step-5-preview-free', nombre: 'opencode/Step 5 Free' }] })

describe('configInicial', () => {
  it('si el motor trae un modelo de pago o local, propone el primero gratis', () => {
    expect(configInicial([modelo('llamacpp/ling-3.0-tiny')], {})).toEqual({ model: 'opencode/exo-free' })
  })
  it('si ya trae uno gratis, no lo toca', () => {
    expect(configInicial([modelo('opencode/step-5-preview-free')], {})).toEqual({})
  })
  it('lo que eligió el usuario manda, si sigue existiendo', () => {
    expect(configInicial([modelo('opencode/exo-free')], { model: 'opencode/big-pickle' })).toEqual({ model: 'opencode/big-pickle' })
    expect(configInicial([modelo('llamacpp/ling-3.0-tiny')], { model: 'ya-no-existe' })).toEqual({ model: 'opencode/exo-free' })
  })
  it('otras opciones solo se fijan si el usuario las eligió', () => {
    const modo = { id: 'mode', nombre: 'Mode', actual: 'build', valores: [{ id: 'build', nombre: 'Build' }, { id: 'plan', nombre: 'Plan' }] }
    expect(configInicial([modo], {})).toEqual({})
    expect(configInicial([modo], { mode: 'plan' })).toEqual({ mode: 'plan' })
  })
})

describe('configInicial con modelos caídos', () => {
  it('no propone un modelo que ya falló', () => {
    expect(configInicial([modelo('llamacpp/ling-3.0-tiny')], {}, ['opencode/exo-free'])).toEqual({ model: 'opencode/step-5-preview-free' })
  })
  it('si el elegido falló, también lo cambia por uno gratis que funcione', () => {
    expect(configInicial([modelo('opencode/exo-free')], {}, ['opencode/exo-free'])).toEqual({ model: 'opencode/step-5-preview-free' })
  })
})
