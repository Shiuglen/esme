// La puerta de los módulos en la ventana: instalar, consentir, activar. Lo que
// no se puede hacer, se dice: la app no promete nada que la puerta no haga.
import { beforeEach, describe, expect, it, vi } from 'vitest'

const manejadores = vi.hoisted(() => new Map<string, (...a: unknown[]) => unknown>())
vi.mock('electron', () => ({
  ipcMain: { handle: (c: string, f: (...a: unknown[]) => unknown) => manejadores.set(c, f) },
  app: { getPath: () => '/tmp/esme-modulos-prueba' },
}))

const runtime = vi.hoisted(() => ({
  carga: vi.fn(async () => [] as unknown[]),
  lista: vi.fn(() => [] as unknown[]),
  instala: vi.fn(async () => { throw new Error('no deveria instalar') }),
  concede: vi.fn(() => { throw new Error('no deberia conceder') }),
  revoca: vi.fn(() => { throw new Error('no deberia revocar') }),
  activa: vi.fn(async () => { throw new Error('no deberia activar') }),
  desactiva: vi.fn(async () => { throw new Error('no deberia desactivar') }),
}))
vi.mock('./runtime', () => ({ runtimeModulos: () => runtime, ponCerebro: () => {} }))

import { registerModulos } from './ipc'

const modulo = {
  id: 'esme.nucleo.puerta',
  version: '0.1.0',
  estado: 'instalado' as const,
  permisos: { declaradas: ['mind:read'], concedidas: [], pendientes: ['mind:read'] },
  usadas: [],
}

describe('la puerta de los módulos (el IPC que la ventana usa)', () => {
  beforeEach(() => {
    manejadores.clear()
    vi.clearAllMocks()
    runtime.carga.mockResolvedValue([])
    runtime.lista.mockReturnValue([])
    registerModulos({ brainInfo: () => null })
  })

  it('la lista trae lo declarado, lo concedido y lo pendiente', async () => {
    runtime.lista.mockReturnValue([modulo])
    const r = (await manejadores.get('modulos:lista')!({})) as { ok: boolean; modulos: { id: string; declaradas: string[]; concedidas: string[]; pendientes: string[] }[] }
    expect(r.ok).toBe(true)
    expect(r.modulos[0].declaradas).toEqual(['mind:read'])
    expect(r.modulos[0].pendientes).toEqual(['mind:read'])
    expect(r.modulos[0].concedidas).toEqual([])
  })

  it('conceder es de la persona: el permiso va por su nombre', async () => {
    runtime.concede.mockReturnValue([modulo] as never)
    const r = (await manejadores.get('modulos:concede')!({}, 'esme.nucleo.puerta', ['mind:read'])) as { ok: boolean }
    expect(r.ok).toBe(true)
    expect(runtime.concede).toHaveBeenCalledWith('esme.nucleo.puerta', ['mind:read'], 'la persona')
  })

  it('sin módulo no hay nada que conceder', async () => {
    const r = (await manejadores.get('modulos:concede')!({}, '', ['mind:read'])) as { ok: boolean; error: string }
    expect(r.ok).toBe(false)
    expect(r.error).toContain('qué módulo')
    expect(runtime.concede).not.toHaveBeenCalled()
  })

  it('un fallo de la puerta vuelve como fallo, no como excepción', async () => {
    runtime.activa.mockRejectedValue(new Error('el módulo no arranca'))
    const r = (await manejadores.get('modulos:activa')!({}, 'esme.nucleo.puerta')) as { ok: boolean; error: string }
    expect(r.ok).toBe(false)
    expect(r.error).toContain('no arranca')
  })
})
