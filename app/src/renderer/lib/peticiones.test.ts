// El bus de peticiones entre pantallas: la Tienda pide un agente, el Taller lo recibe.
// Si esto falla, «Usar en el Taller» no hace nada y nadie se entera.
import { describe, expect, it } from 'vitest'
import { ofrece, pide, hayQuienAtiende, TIPO_AGENTE, type PeticionDeAgente } from './peticiones'

describe('el bus de peticiones', () => {
  it('quien pide encuentra a quien atiende', () => {
    const recibidos: PeticionDeAgente[] = []
    const baja = ofrece<PeticionDeAgente>(TIPO_AGENTE, (p) => recibidos.push(p))
    const ok = pide(TIPO_AGENTE, { motor: 'opencode', nombre: 'OpenCode', que: 'arregla el test' })
    expect(ok).toBe(true)
    expect(recibidos).toEqual([{ motor: 'opencode', nombre: 'OpenCode', que: 'arregla el test' }])
    baja()
  })

  it('una petición la sirve UNO solo (no todos)', () => {
    const a: string[] = [], b: string[] = []
    const bajaA = ofrece<PeticionDeAgente>(TIPO_AGENTE, () => a.push('a'))
    const bajaB = ofrece<PeticionDeAgente>(TIPO_AGENTE, () => b.push('b'))
    pide(TIPO_AGENTE, { motor: 'm', nombre: 'M', que: 'q' })
    expect(a.length + b.length).toBe(1)
    bajaA(); bajaB()
  })

  it('pedir sin nadie escuchando no rompe nada: devuelve false', () => {
    expect(pide('nadie:atiende', { x: 1 })).toBe(false)
  })

  it('se sabe si hay alguien escuchando', () => {
    expect(hayQuienAtiende('nadie:atiende')).toBe(false)
    const baja = ofrece<PeticionDeAgente>(TIPO_AGENTE, () => {})
    expect(hayQuienAtiende(TIPO_AGENTE)).toBe(true)
    baja()
    // tras darse de baja, si no queda nadie, ya no hay quien atienda
    if (!hayQuienAtiende(TIPO_AGENTE)) expect(hayQuienAtiende(TIPO_AGENTE)).toBe(false)
  })

  it('quien se da de baja ya no atiende', () => {
    const recibidos: PeticionDeAgente[] = []
    const baja = ofrece<PeticionDeAgente>(TIPO_AGENTE, (p) => recibidos.push(p))
    baja()
    expect(pide(TIPO_AGENTE, { motor: 'm', nombre: 'M', que: 'q' })).toBe(false)
    expect(recibidos).toEqual([])
  })
})
