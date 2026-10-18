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
  it('sin saldo para un modelo de pago lo dice en español y ofrece los gratis', () => {
    const m = explicarFallo('Insufficient credits. This account never purchased credits. Make sure your key is on the correct account or org, and if so, purchase more at https://openrouter.ai/settings/credits', 'OpenRouter')
    expect(m).toMatch(/de pago/); expect(m).toMatch(/:free|gratis/); expect(m).not.toMatch(/Insufficient/)
  })
})

describe('el modelo con el que empieza la conversación', () => {
  it('sin elección tuya, nunca uno de pago: primero uno gratis que obedece', async () => {
    const { modeloInicial } = await import('./motor')
    const ms = ['anthropic/claude-opus-5.5', 'openai/gpt-6', 'google/gemma-4-31b-it:free', 'x/otro:free']
    expect(modeloInicial(ms, undefined, null)).toBe('google/gemma-4-31b-it:free')
  })
  it('lo que elegiste se respeta, aunque sea de pago', async () => {
    const { modeloInicial } = await import('./motor')
    expect(modeloInicial(['openai/gpt-6', 'x/otro:free'], undefined, 'openai/gpt-6')).toBe('openai/gpt-6')
  })
  it('un motor sin modelos gratis (o local) usa su primero que no sea de embeddings', async () => {
    const { modeloInicial } = await import('./motor')
    expect(modeloInicial(['text-embed-3', 'llama-local'], undefined, null)).toBe('llama-local')
  })
})
