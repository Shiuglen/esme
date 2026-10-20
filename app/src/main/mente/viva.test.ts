// La mente de la app traducida al contrato del kit: lo que el módulo recibe
// por la puerta tiene que ser lo que el Tálamo de verdad devolvió (nada
// inventado, nada más).
import { describe, expect, it } from 'vitest'
import { menteViva } from './viva'
import type { ClienteCerebro } from './cliente'

const cliente = (parte: Partial<ClienteCerebro>): ClienteCerebro => parte as ClienteCerebro

describe('la mente viva (la traducción de la app al contrato del kit)', () => {
  it('el recall devuelve los ids que el Tálamo eligió, con su texto', async () => {
    const m = menteViva(
      cliente({
        recordar: async () => ({ context: 'hola mundo', tokens: 12, ids: ['m1', 'm2'], abstained: false }),
        recuerdos: async () => [{ id: 'm1', text: 'hola', source: 'x', score: 1 }],
      } as Partial<ClienteCerebro>),
    )
    const r = await m.recall('hola')
    expect(r.map((x) => x.id)).toEqual(['m1', 'm2'])
    expect(r[0].texto).toBe('hola')
    // lo que el Tálamo no tiene a mano, se queda con el contexto compuesto
    expect(r[1].texto).toBe('hola mundo')
    expect(r[0].tokens).toBe(12)
  })

  it('si el Tálamo no elige nada, no hay recuerdos (ni inventados)', async () => {
    const m = menteViva(
      cliente({
        recordar: async () => ({ context: '', tokens: 0, ids: [], abstained: true }),
        recuerdos: async () => [],
      } as Partial<ClienteCerebro>),
    )
    expect(await m.recall('nada')).toEqual([])
  })

  it('el presupuesto se lo pasa al Tálamo tal cual', async () => {
    let recibido: unknown = null
    const m = menteViva(
      cliente({
        recordar: async (_q: string, o: unknown) => {
          recibido = o
          return { context: '', tokens: 0, ids: [], abstained: true }
        },
        recuerdos: async () => [],
      } as Partial<ClienteCerebro>),
    )
    await m.recall('hola', 40)
    expect(recibido).toEqual({ budget: 40 })
  })

  it('recordar y rumbo van al Tálamo de verdad', async () => {
    let escrito: unknown = null
    const m = menteViva(
      cliente({
        escribir: async (texto: string, kind?: string) => {
          escrito = { texto, kind }
          return { id: 'n1' }
        },
        rumbo: async () => ({ version: 1, pilares: [], objetivos: [] }),
      } as Partial<ClienteCerebro>),
    )
    expect(await m.remember?.('una idea', 'decision')).toEqual({ id: 'n1' })
    expect(escrito).toEqual({ texto: 'una idea', kind: 'decision' })
    expect((await m.rumbo?.())?.version).toBe(1)
  })
})
