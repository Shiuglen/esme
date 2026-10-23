// La puerta, de punta a punta desde la ventana: el IPC pide, el proceso principal habla con el cerebro (Python) con el
// token, y lo que vuelve es el dato o el motivo. Aquí no hay cerebro: hay un fetch falso que hace de Python.
import { beforeEach, describe, expect, it, vi } from 'vitest'

const manejadores = vi.hoisted(() => new Map<string, (...a: unknown[]) => unknown>())
vi.mock('electron', () => ({ ipcMain: { handle: (c: string, f: (...a: unknown[]) => unknown) => manejadores.set(c, f) } }))

import { registerMente } from './ipc'

const info = { url: 'http://127.0.0.1:47321', token: 'secreto' }
const cuerpo = (d: unknown) => new Response(JSON.stringify(d), { status: 200, headers: { 'Content-Type': 'application/json' } })
const falso = (d: unknown) => (async () => cuerpo(d)) as unknown as typeof fetch

describe('la puerta de la mente (el IPC que la ventana usa)', () => {
  beforeEach(() => { manejadores.clear() })

  it('el proceso principal habla con el cerebro con el token y devuelve el dato', async () => {
    let vista: { url: string; init: RequestInit } | null = null
    const http = (async (url: string, init: RequestInit) => { vista = { url, init }; return cuerpo([{ id: 'm1', text: 'hola' }]) }) as unknown as typeof fetch
    registerMente({ brainInfo: () => info, http })
    const r = (await manejadores.get('mente:recuerdos')!('hola', 5)) as { ok: boolean; dato: unknown }
    expect(r.ok).toBe(true)
    expect(r.dato).toEqual([{ id: 'm1', text: 'hola' }])
    expect(vista!.url).toContain('/memories')
    expect((vista!.init.headers as Record<string, string>).Authorization).toBe('Bearer secreto')
  })

  it('sin mente awake, lo dice (y no se rompe)', async () => {
    registerMente({ brainInfo: () => null, http: falso([]) })
    const r = (await manejadores.get('mente:salud')!()) as { ok: boolean; error: string }
    expect(r.ok).toBe(false)
    expect(r.error).toContain('no está disponible')
  })

  it('un fallo del cerebro vuelve como fallo, no como excepción', async () => {
    const http = (async () => new Response('roto', { status: 500 })) as unknown as typeof fetch
    registerMente({ brainInfo: () => info, http })
    const r = (await manejadores.get('mente:salud')!()) as { ok: boolean; error: string }
    expect(r.ok).toBe(false)
    expect(r.error).toContain('500')
  })
})

describe('la puerta del Taller (el IPC que la cola del cerebro usa)', () => {
  beforeEach(() => { manejadores.clear() })

  it('los encargos de fuera llegan descapsulados de la mente', async () => {
    const encargo = { id: 'enc-a1', ts: 1, titulo: 't', texto: 'x', origen: 'fuera', estado: 'pendiente', respondido: null }
    registerMente({ brainInfo: () => info, http: falso({ encargos: [encargo] }) })
    const r = (await manejadores.get('mente:tallerEncargos')!()) as { ok: boolean; dato: unknown[] }
    expect(r.ok).toBe(true)
    expect(r.dato).toEqual([encargo])
  })

  it('la respuesta exige un id de la cola (enc-) y una decisión de verdad', async () => {
    registerMente({ brainInfo: () => info, http: falso({}) })
    const malo = (await manejadores.get('mente:tallerEncargoResponder')!(null, 'm1', 'aceptado')) as { ok: boolean; error: string }
    expect(malo.ok).toBe(false)
    expect(malo.error).toContain('La decisión')
    const nulo = (await manejadores.get('mente:tallerEncargoResponder')!(null, null, 'aceptado')) as { ok: boolean }
    expect(nulo.ok).toBe(false)
  })

  it('la respuesta válida se lleva a la mente con su token y su decisión', async () => {
    let vista: { url: string; init: RequestInit } | null = null
    const http = (async (url: string, init: RequestInit) => { vista = { url, init }; return cuerpo({ id: 'enc-a1', estado: 'rechazado' }) }) as unknown as typeof fetch
    registerMente({ brainInfo: () => info, http })
    const r = (await manejadores.get('mente:tallerEncargoResponder')!(null, 'enc-a1', 'rechazado')) as { ok: boolean; dato: { estado: string } }
    expect(r.ok).toBe(true)
    expect(r.dato.estado).toBe('rechazado')
    expect(vista!.url).toContain('/taller/encargo/enc-a1')
    expect(JSON.parse(String(vista!.init.body))).toEqual({ decision: 'rechazado' })
  })
})
