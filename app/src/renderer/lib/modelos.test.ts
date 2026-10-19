import { describe, expect, it } from 'vitest'
import { esGratis, nombreDeModelo } from './modelos'

describe('el nombre legible de un modelo (nunca un id crudo ni un paréntesis huérfano)', () => {
  it('saca el modelo de dentro del envoltorio del proveedor', () => {
    expect(nombreDeModelo('Qwen3 Coder (OpenRouter · poolside/laguna-s-2.1:free)')).toBe('Laguna S 2.1')
  })
  it('quita el proveedor, el «:free» y el «-free», y pone mayúsculas y versiones con punto', () => {
    expect(nombreDeModelo('nvidia/nemotron-3.5-lightning:free')).toBe('Nemotron 3.5 Lightning')
    expect(nombreDeModelo('opencode/glm-5.3-flash-free')).toBe('GLM 5.3 Flash')
    expect(nombreDeModelo('claude-sonnet-5-5')).toBe('Claude Sonnet 5.5')
    expect(nombreDeModelo('qwen3-coder')).toBe('Qwen3 Coder')
  })
  it('sin modelo, nada; un nombre ya legible se queda', () => {
    expect(nombreDeModelo(null)).toBe('')
    expect(nombreDeModelo('opus')).toBe('Opus')
    expect(nombreDeModelo('el de tu sesión')).toBe('el de tu sesión')
  })
  it('sabe si es gratis', () => {
    expect(esGratis('nvidia/nemotron-3.5-lightning:free')).toBe(true)
    expect(esGratis('opencode/glm-5.3-flash-free')).toBe(true)
    expect(esGratis('claude-sonnet-5-5')).toBe(false)
  })
})
