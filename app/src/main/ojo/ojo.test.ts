import { describe, expect, it, vi } from 'vitest'
import { Ojo } from './ojo'

const captura = (base64 = 'AAA') => async () => ({ base64, mime: 'image/png' })

describe('el Ojo', () => {
  it('mira ahora y recuerda lo recién mirado', async () => {
    const o = new Ojo(captura())
    const r = await o.ver()
    expect(r.ahora.base64).toBe('AAA')
    expect(r.ahora.mime).toBe('image/png')
    expect(o.recientes()).toHaveLength(1)
  })

  it('olvida lo viejo: la memoria de pantalla caduca sola', async () => {
    vi.useFakeTimers()
    try {
      vi.setSystemTime(1_000_000)
      const o = new Ojo(captura(), 60_000, 8)
      await o.ver()
      vi.setSystemTime(1_030_000)
      await o.ver()
      expect(o.recientes()).toHaveLength(2)
      vi.setSystemTime(1_200_000)   // pasado elttl: lo viejo se va
      expect(o.recientes()).toHaveLength(0)
    } finally { vi.useRealTimers() }
  })

  it('no crece sin límite: se guarda lo último y nada más', async () => {
    const o = new Ojo(captura(), 60 * 60_000, 3)
    for (let i = 0; i < 10; i++) await o.ver()
    expect(o.recientes()).toHaveLength(3)
  })

  it('se puede olvidar del todo', async () => {
    const o = new Ojo(captura())
    await o.ver()
    o.forget()
    expect(o.recientes()).toHaveLength(0)
  })
})
