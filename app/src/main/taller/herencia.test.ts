import { describe, it, expect, vi } from 'vitest'
import { bloqueEquipo, bloqueHerencia, heredar, heredarEquipo } from './herencia'

const mente = { url: 'http://127.0.0.1:7777', token: 'tok' }
const json = (x: unknown, ok = true) => ({ ok, status: ok ? 200 : 500, json: async () => x }) as Response

describe('la herencia: lo que la mente le pasa al motor', () => {
  it('pregunta a la mente por el encargo y devuelve lo que sabe', async () => {
    const f = vi.fn(async () => json({ context: 'el proyecto usa vitest', tokens: 812, ids: ['a', 'b', 'c'] }))
    const h = await heredar(mente, 'arregla el examen', { fetch: f as unknown as typeof fetch })
    expect(h).toEqual({ texto: 'el proyecto usa vitest', tokens: 812, ids: ['a', 'b', 'c'] })
    const [url, o] = (f.mock.calls[0] as unknown as [string, RequestInit])
    expect(url).toBe('http://127.0.0.1:7777/recall')
    expect(o.headers).toMatchObject({ Authorization: 'Bearer tok' })
    expect(JSON.parse(o.body as string)).toMatchObject({ query: 'arregla el examen', who: 'taller' })
  })
  it('sin mente, sin contexto o con la mente caída: no hay herencia, pero no hay error', async () => {
    expect(await heredar(null, 'algo')).toBeNull()
    expect(await heredar(mente, '   ')).toBeNull()
    const caida = vi.fn(async () => { throw new Error('conexión rechazada') })
    expect(await heredar(mente, 'algo', { fetch: caida as unknown as typeof fetch })).toBeNull()
    const error = vi.fn(async () => json({}, false))
    expect(await heredar(mente, 'algo', { fetch: error as unknown as typeof fetch })).toBeNull()
  })
  it('el bloque dice qué es y que no se repita', () => {
    const b = bloqueHerencia({ texto: 'el proyecto usa vitest', tokens: 812, ids: ['a'] })
    expect(b).toContain('1 recuerdo, 812 tokens')
    expect(b).toContain('el proyecto usa vitest')
    expect(b).toContain('no lo repitas')
    expect(bloqueHerencia(null)).toBe('')
  })
})

describe('lo que la mente aprendió del equipo', () => {
  it('la herencia del equipo pregunta por los motores y trae la lección', async () => {
    const llamadas: string[] = []
    const f = vi.fn(async (url: string, o?: { body?: string }) => {
      llamadas.push(url)
      expect(JSON.parse(o?.body ?? '{}').query).toContain('equipo')
      expect(JSON.parse(o?.body ?? '{}').budget).toBeLessThanOrEqual(400)
      return { ok: true, json: async () => ({ context: 'Del equipo: con opencode te quedaste 2 de 3 tareas.', tokens: 20, ids: ['a1'] }) } as Response
    })
    const r = await heredarEquipo({ url: 'http://mente', token: 't' }, { fetch: f as unknown as typeof fetch })
    expect(r?.texto).toContain('opencode')
    expect(llamadas[0]).toBe('http://mente/recall')
  })

  it('sin mente no hay lección, pero la tarea sigue', async () => {
    expect(await heredarEquipo(null)).toBeNull()
    expect(bloqueEquipo(null)).toBe('')
  })

  it('el bloque del equipo se le pasa al motor como contexto', () => {
    const b = bloqueEquipo({ texto: 'Del equipo: con opencode te quedaste 2 de 3 tareas.', tokens: 20, ids: ['a1'] })
    expect(b).toContain('Del equipo')
    expect(b).toContain('---')
  })
})
