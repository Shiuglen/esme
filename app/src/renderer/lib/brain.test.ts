import { describe, expect, it, vi } from 'vitest'
import { BrainClient, BrainError } from './brain'

function fakeFetch(status: number, body: unknown) {
  return vi.fn(async (_url: string, _init?: RequestInit) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))
}

describe('BrainClient', () => {
  it('envía el token y devuelve el recall', async () => {
    const f = fakeFetch(200, { context: 'ctx', tokens: 10, ids: ['a'], abstained: false })
    const b = new BrainClient('http://127.0.0.1:9', 'tok', f as unknown as typeof fetch)
    const r = await b.recall('hola', 500, 'chat')
    expect(r.ids).toEqual(['a'])
    const [url, init] = f.mock.calls[0]
    expect(url).toBe('http://127.0.0.1:9/recall')
    expect((init!.headers as Record<string, string>).Authorization).toBe('Bearer tok')
    expect(JSON.parse(init!.body as string)).toEqual({ query: 'hola', budget: 500, who: 'chat' })
  })

  it('lanza BrainError con el mensaje del cerebro', async () => {
    const b = new BrainClient('http://x', 't', fakeFetch(400, { error: 'rechazado: contenido excluido' }) as unknown as typeof fetch)
    await expect(b.remember('FirmeDigital')).rejects.toThrow(BrainError)
    await expect(b.remember('FirmeDigital')).rejects.toThrow('rechazado')
  })

  it('codifica la búsqueda y la URL de eventos lleva el token', async () => {
    const f = fakeFetch(200, [])
    const b = new BrainClient('http://h:1', 'tk', f as unknown as typeof fetch)
    await b.search('qué tal', 5)
    expect(f.mock.calls[0][0]).toBe('http://h:1/memories?q=qu%C3%A9%20tal&limit=5')
    expect(b.eventsUrl()).toBe('http://h:1/events?token=tk')
  })
})
