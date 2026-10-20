// La puerta: lo único que hay entre el TypeScript y el cerebro Python. Aquí se comprueba que habla como debe
// (token, reloj, errores) y que las rutas son las de la spec.
import { describe, expect, it } from 'vitest'
import { ClienteCerebro, RUTAS, configMcp, fallo, mcpDeEsme } from './cliente'

const info = { url: 'http://127.0.0.1:47321', token: 'secreto' }

const respuesta = (cuerpo: unknown, ok = true, status = 200) => ({
  ok,
  status,
  text: async () => JSON.stringify(cuerpo),
  json: async () => cuerpo,
}) as unknown as Response

describe('la puerta al cerebro', () => {
  it('siempre lleva el token y siempre un reloj', async () => {
    let vista: { url: string; init: RequestInit } | null = null
    const http = (async (url: string, init: RequestInit) => { vista = { url, init }; return respuesta({ ok: true, memories: 3 }) }) as unknown as typeof fetch
    await new ClienteCerebro(info, http).salud()
    expect(vista!.url).toBe(`http://127.0.0.1:47321${RUTAS.salud}`)
    expect((vista!.init.headers as Record<string, string>).Authorization).toBe('Bearer secreto')
    expect(vista!.init.signal).toBeTruthy()
  })

  it('pregunta a las rutas de la spec', async () => {
    const vistas: string[] = []
    const http = (async (url: string) => { vistas.push(url.replace('http://127.0.0.1:47321', '')); return respuesta([]) }) as unknown as typeof fetch
    const c = new ClienteCerebro(info, http)
    await c.recuerdos('memoria', 8)
    await c.recordar('qué sabes de la tienda')
    await c.escribir('esto es un recuerdo')
    await c.feedback(['m1'], true, 'tienda')
    await c.olvidar('m1')
    await c.ingerir(['/tmp/notas.md'])
    expect(vistas).toEqual([
      '/memories?q=memoria&limit=8',
      '/recall',
      '/remember',
      '/feedback',
      '/forget',
      '/ingest',
    ])
  })

  it('un fallo del cerebro es un fallo con la misma forma', async () => {
    const http = (async () => respuesta({ error: 'no existe' }, false, 404)) as unknown as typeof fetch
    const e = await new ClienteCerebro(info, http).salud().catch((x) => x)
    expect(fallo(e).ok).toBe(false)
    expect(fallo(e).error).toContain('404')
  })

  it('si el cerebro no contesta a tiempo, lo dice (y no se queda colgado)', async () => {
    const http = (async () => { const e = new Error('timeout'); e.name = 'TimeoutError'; throw e }) as unknown as typeof fetch
    const e = await new ClienteCerebro(info, http).salud().catch((x) => x)
    expect(fallo(e).error).toContain('no respondió a tiempo')
  })

  it('la puerta MCP es la misma mente: url y token, y solo en loopback', () => {
    expect(configMcp(info)).toEqual({ url: 'http://127.0.0.1:47321/mcp', headers: { Authorization: 'Bearer secreto' } })
    expect(mcpDeEsme(info)).toEqual({ nombre: 'esme', url: 'http://127.0.0.1:47321/mcp', token: 'secreto' })
    expect(mcpDeEsme(null)).toBeNull()
  })
})
