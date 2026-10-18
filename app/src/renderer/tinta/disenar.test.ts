import { describe, expect, it } from 'vitest'
import { leerPielDeRespuesta, mensajesDisenador, modelosParaDisenar } from './disenar'
import { PIEL_BASE } from './piel'

describe('Esme diseña pieles', () => {
  it('la petición lleva la receta exacta y tu piel actual (para entender «más cálida»)', () => {
    const m = mensajesDisenador('más cálida', PIEL_BASE)
    const todo = m.map((x) => x.content).join('\n')
    expect(todo).toContain('geist'); expect(todo).toContain('newsreader')   // las letras que existen
    expect(todo).toContain('4.5')                                          // el contraste es obligatorio
    expect(todo).toContain('más cálida')
    expect(todo).toContain('"nombre":"Tinta y Luz"')                       // la piel de ahora
  })
  it('lee el JSON aunque venga entre texto o en un bloque de código', () => {
    const j = '{"nombre":"Arena","densidad":"amplia"}'
    expect(leerPielDeRespuesta(j)).toEqual({ nombre: 'Arena', densidad: 'amplia' })
    expect(leerPielDeRespuesta('Claro, aquí la tienes:\n```json\n' + j + '\n```\nEspero que te guste')).toEqual({ nombre: 'Arena', densidad: 'amplia' })
    expect(leerPielDeRespuesta('Te propongo {"nombre":"X","forma":{"radio":2,"sombra":"suave"}} y listo')).toEqual({ nombre: 'X', forma: { radio: 2, sombra: 'suave' } })
  })
  it('si no hay JSON, lo dice', () => {
    expect(leerPielDeRespuesta('Lo siento, no puedo')).toBeNull()
    expect(leerPielDeRespuesta('{roto')).toBeNull()
  })
})

describe('con qué modelo diseña (nunca uno de pago sin que lo elijas)', () => {
  const ms = ['anthropic/claude-x', 'openai/gpt-y', 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free', 'cohere/north-mini-code:free', 'google/gemma-4-31b-it:free', 'text-embed:free', 'poolside/laguna-s-2.1:free']
  it('sin elección tuya: solo gratis, los que obedecen el formato primero, y nada de razonadores ni incrustaciones', () => {
    const r = modelosParaDisenar(ms, undefined, null)
    expect(r[0]).toBe('cohere/north-mini-code:free')
    expect(r.every((m) => m.endsWith(':free'))).toBe(true)
    expect(r.some((m) => /reasoning|embed/.test(m))).toBe(false)
    expect(r.length).toBeLessThanOrEqual(3)
  })
  it('si elegiste un modelo en la conversación, va primero aunque sea de pago (lo elegiste tú)', () => {
    expect(modelosParaDisenar(ms, undefined, 'openai/gpt-y')[0]).toBe('openai/gpt-y')
  })
  it('un motor local sin gratis ni recomendados usa su modelo por defecto o el primero', () => {
    expect(modelosParaDisenar(['llama3:8b', 'nomic-embed'], 'llama3:8b', null, true)).toEqual(['llama3:8b'])
    expect(modelosParaDisenar(['qwen2.5', 'nomic-embed'], undefined, null, true)).toEqual(['qwen2.5'])
    expect(modelosParaDisenar(['openai/gpt-y'], undefined, null, false)).toEqual([])   // de API y sin gratis: mejor decirlo que pagar
  })
})
