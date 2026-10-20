import { describe, expect, it, vi } from 'vitest'
import { BrainClient, BrainError } from './brain'

// La ventana ya no habla con el cerebro (Python): pide al proceso principal. Aquí se comprueba que pide lo que debe,
// con la forma que espera, y que los fallos llegan como BrainError (lo que la ventana sabe enseñar).
const puente = vi.hoisted(() => ({ datos: {} as Record<string, unknown>, error: null as string | null }))

vi.mock('./bridge', () => {
  const Maybe = <T>(dato: T) => async () => { if (puente.error) throw new Error(puente.error); return dato }
  return {
    bridge: {
      mente: {
        salud: Maybe({ ok: true, memories: 7 }),
        recuerdos: async (q: string, limit: number) => { if (puente.error) throw new Error(puente.error); puente.datos = { q, limit }; return [] },
        recordar: async (query: string, o: unknown) => { if (puente.error) throw new Error(puente.error); puente.datos = { query, o }; return { context: 'ctx', tokens: 10, ids: ['a'], abstained: false } },
        escribir: async (texto: string, kind: string) => { if (puente.error) throw new Error(puente.error); puente.datos = { texto, kind }; return { id: 'm1' } },
        feedback: async () => ({ result: 'ok' }),
        olvidar: async () => ({ forgotten: ['m1'] }),
        ingerir: async () => ({ added: 2, memories: 9 }),
        atlas: async () => ({ points: [], clusters: [] }),
        memoria: async () => ({ id: 'm1' }),
        oir: async () => ({ texto: 'hola' }),
        decir: async () => new ArrayBuffer(4),
        eventos: async () => ({ ok: true }),
        eventosParar: async () => ({ ok: true }),
        onEvento: () => () => {},
      },
    },
  }
})

describe('el cliente de la mente en la ventana', () => {
  it('pide al proceso principal, no al cerebro', async () => {
    const b = new BrainClient()
    const r = await b.recall('hola', 500, 'chat')
    expect(r.ids).toEqual(['a'])
    expect(puente.datos).toEqual({ query: 'hola', o: { budget: 500, who: 'chat' } })
  })

  it('la búsqueda lleva su palabra y su límite', async () => {
    await new BrainClient().search('qué tal', 5)
    expect(puente.datos).toEqual({ q: 'qué tal', limit: 5 })
  })

  it('un fallo llega como BrainError, con su mensaje', async () => {
    puente.error = 'rechazado: contenido excluido'
    const b = new BrainClient()
    await expect(b.remember('FirmeDigital')).rejects.toThrow(BrainError)
    await expect(b.remember('FirmeDigital')).rejects.toThrow('rechazado')
    puente.error = null
  })
})
