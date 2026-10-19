import { describe, expect, it } from 'vitest'
import { nombreDeMetodo } from './entrar-nombres'

describe('los métodos de entrada se dicen en español', () => {
  it('los que traen los agentes en inglés', () => {
    expect(nombreDeMetodo('Sign in with ChatGPT Subscription')).toBe('Entrar con tu suscripción de ChatGPT')
    expect(nombreDeMetodo('Sign in with Cline')).toBe('Entrar con Cline')
    expect(nombreDeMetodo('Login with opencode')).toBe('Entrar con opencode')
    expect(nombreDeMetodo('Use OpenAI API key')).toBe('Con tu clave de OpenAI')
  })
  it('lo que no reconoce se queda igual', () => {
    expect(nombreDeMetodo('Entrar con Gemini')).toBe('Entrar con Gemini')
  })
})
