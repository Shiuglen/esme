import { describe, it, expect, vi } from 'vitest'
import { esperarCodigo, ProveedorOAuth, SinSesion } from './oauth'

const almacen = () => { const m = new Map<string, string>(); return { m, get: (k: string) => m.get(k), set: (k: string, v: string) => void m.set(k, v), remove: (k: string) => void m.delete(k) } }

describe('el proveedor de OAuth de cada herramienta', () => {
  it('guarda cliente y tokens en el llavero (cifrado) y los recupera', async () => {
    const a = almacen(); const p = new ProveedorOAuth('figma', a, { interactivo: true, abrir: vi.fn(), puerto: 1 })
    expect(await p.tokens()).toBeUndefined()
    await p.saveClientInformation({ client_id: 'c1' })
    await p.saveTokens({ access_token: 't', token_type: 'Bearer' })
    const otro = new ProveedorOAuth('figma', a, { interactivo: false, abrir: vi.fn(), puerto: 1 })
    expect(await otro.clientInformation()).toEqual({ client_id: 'c1' })
    expect(await otro.tokens()).toEqual({ access_token: 't', token_type: 'Bearer' })
    expect([...a.m.keys()]).toEqual(['mcp:figma:__oauth'])
  })
  it('se registra como Esme con la dirección local de vuelta, sin secreto de cliente', () => {
    const p = new ProveedorOAuth('figma', almacen(), { interactivo: true, abrir: vi.fn(), puerto: 33418 })
    expect(String(p.redirectUrl)).toBe('http://127.0.0.1:33418/callback')
    expect(p.clientMetadata).toMatchObject({ client_name: 'Esme', redirect_uris: ['http://127.0.0.1:33418/callback'], token_endpoint_auth_method: 'none' })
  })
  it('solo abre el navegador cuando lo pides tú (al conectar); en medio de una conversación avisa de que falta la sesión', async () => {
    const abrir = vi.fn()
    await new ProveedorOAuth('figma', almacen(), { interactivo: true, abrir, puerto: 1 }).redirectToAuthorization(new URL('https://figma.com/oauth?x=1'))
    expect(abrir).toHaveBeenCalledWith('https://figma.com/oauth?x=1')
    await expect(new ProveedorOAuth('figma', almacen(), { interactivo: false, abrir, puerto: 1 }).redirectToAuthorization(new URL('https://figma.com/oauth'))).rejects.toBeInstanceOf(SinSesion)
    expect(abrir).toHaveBeenCalledTimes(1)
  })
  it('olvidar las credenciales que el servidor rechaza', async () => {
    const a = almacen(); const p = new ProveedorOAuth('figma', a, { interactivo: true, abrir: vi.fn(), puerto: 1 })
    await p.saveTokens({ access_token: 't', token_type: 'Bearer' }); await p.saveClientInformation({ client_id: 'c' })
    await p.invalidateCredentials('tokens')
    expect(await p.tokens()).toBeUndefined(); expect(await p.clientInformation()).toEqual({ client_id: 'c' })
  })
})

describe('esperar la vuelta del navegador', () => {
  it('recibe el código en la dirección local y contesta con una página amable', async () => {
    const espera = esperarCodigo(33499, 5000)
    await new Promise((r) => setTimeout(r, 50))
    const r = await fetch('http://127.0.0.1:33499/callback?code=abc&state=s1')
    expect(r.status).toBe(200); expect(await r.text()).toMatch(/Esme/)
    expect(await espera).toEqual({ code: 'abc', state: 's1' })
  })
  it('si el servicio devuelve un error o nadie vuelve a tiempo, se dice', async () => {
    const espera = esperarCodigo(33498, 5000)
    await new Promise((r) => setTimeout(r, 50))
    void fetch('http://127.0.0.1:33498/callback?error=access_denied').catch(() => {})
    await expect(espera).rejects.toThrow(/access_denied/)
    await expect(esperarCodigo(33497, 50)).rejects.toThrow(/tiempo/)
  })
})
