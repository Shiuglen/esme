import { describe, expect, it } from 'vitest'
import { bombear } from './chat'

async function* corriente(partes: object[]) { for (const p of partes) yield p }
describe('el chat no se traga los errores del proveedor', () => {
  it('el texto y el pensado viajan, y un error del flujo se dice (antes terminaba mudo, como si todo fuera bien)', async () => {
    const enviado: [string, string][] = []
    const r = await bombear(corriente([{ type: 'text-delta', text: 'Ho' }, { type: 'reasoning-delta', text: 'pienso' }, { type: 'error', error: new Error('401 Unauthorized') }]),
      (canal, x) => enviado.push([canal, x]))
    expect(enviado).toEqual([['chunk', 'Ho'], ['pensamiento', 'pienso']])
    expect(r.error).toBe('401 Unauthorized')
  })
  it('sin errores, no hay error', async () => {
    expect((await bombear(corriente([{ type: 'text-delta', text: 'ok' }]), () => {})).error).toBeUndefined()
  })
  it('un error que no es Error también se explica', async () => {
    expect((await bombear(corriente([{ type: 'error', error: { message: 'Rate limit exceeded' } }]), () => {})).error).toBe('Rate limit exceeded')
  })
})
