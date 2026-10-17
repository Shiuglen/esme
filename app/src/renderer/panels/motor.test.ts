import { describe, expect, it } from 'vitest'
import { explicarFallo, ordenMotores } from './motor'

const p = (id: string, local: boolean, hasKey = false) => ({ id, label: id, local, needsKey: !local, hasKey, retainsData: false as const })
describe('qué motor usa la conversación', () => {
  it('prueba primero el último que usaste, luego los locales (privados y gratis) y luego los de API con clave', () => {
    const ps = [p('openrouter', false, true), p('ollama', true), p('anthropic', false, false), p('llamacpp', true)]
    expect(ordenMotores(ps, 'openrouter').map((x) => x.id)).toEqual(['openrouter', 'ollama', 'llamacpp'])
    expect(ordenMotores(ps, null).map((x) => x.id)).toEqual(['ollama', 'llamacpp', 'openrouter'])
  })
  it('un fallo de red se explica con palabras y con qué hacer', () => {
    expect(explicarFallo('fetch failed', 'Ollama (local)')).toBe('Ollama (local) no responde. Elige otro motor arriba o arráncalo.')
    expect(explicarFallo('connect ECONNREFUSED 127.0.0.1:11434', 'Ollama (local)')).toBe('Ollama (local) no responde. Elige otro motor arriba o arráncalo.')
    expect(explicarFallo('401 Unauthorized', 'OpenRouter')).toBe('OpenRouter rechaza la clave. Revísala en Ajustes.')
    expect(explicarFallo('algo raro', 'X')).toBe('algo raro')
  })
})

describe('el límite diario de los modelos gratis', () => {
  it('se explica como lo que es: se acabaron las de hoy, vuelven mañana, y cómo ampliarlas', () => {
    const m = explicarFallo('Failed after 3 attempts. Last error: AI_APICallError: Rate limit exceeded: free-models-per-day. Add 10 credits to unlock 1000 free model requests per day', 'OpenRouter')
    expect(m).toBe('Se acabaron por hoy las peticiones gratis de OpenRouter: vuelven mañana. Con 10 $ de saldo en OpenRouter pasan a ser 1000 al día, o elige otro motor arriba.')
  })
})
