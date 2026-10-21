// La puerta del navegador: una HTTP diminuta en 127.0.0.1, con token, para que el cerebro de Esme
// (y sus herramientas MCP) puedan usar el navegador de la app. Así, **cualquier agente que hable con
// la mente de Esme** puede abrir la web de verdad: los del Taller, el de la conversación y los de
// fuera de la máquina.
//
// El token es el mismo que el de la mente: el mismo nivel de confianza (quien puede leer tu memoria
// puede abrir tu navegador) y las mismas guardas: sólo 127.0.0.1, sólo http/https y nada de ficheros.
import { createServer, type Server } from 'node:http'
import { accionesDe } from './estado'
import type { Navegador } from './navegador'

export type ServidorNavegador = { url: string; token: string; cerrar(): void }

const json = (res: { writeHead: (n: number, h: Record<string, string>) => any; end: (b?: any) => void }, codigo: number, cuerpo: unknown) => {
  res.writeHead(codigo, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
  res.end(JSON.stringify(cuerpo))
}

async function cuerpoDe(req: AsyncIterable<Buffer>): Promise<Record<string, unknown>> {
  const trozos: string[] = []
  for await (const t of req) trozos.push(t.toString('utf8'))
  const texto = trozos.join('').trim()
  if (!texto) return {}
  try { return JSON.parse(texto) as Record<string, unknown> } catch { return {} }
}

/** Sirve el navegador de la app. Devuelve la dirección y el token para dárselos al cerebro. */
export async function servirNavegador(nav: Navegador, token: string): Promise<ServidorNavegador> {
  const srv: Server = createServer(async (req, res) => {
    if (req.method !== 'POST') { json(res, 405, { error: 'Sólo POST.' }); return }
    const cab = req.headers.authorization ?? ''
    if (cab !== `Bearer ${token}`) { json(res, 401, { error: 'Sin permiso.' }); return }
    const ruta = (req.url ?? '').split('?')[0]
    const datos = await cuerpoDe(req)
    const url = typeof datos.url === 'string' ? datos.url : ''
    const objetivo = typeof datos.objetivo === 'string' ? datos.objetivo : ''
    const valor = typeof datos.valor === 'string' ? datos.valor : ''
    try {
      if (ruta === '/abrir') {
        const e = await nav.abrir(url)
        return json(res, 200, { url: e.url, titulo: e.titulo, texto: e.texto, acciones: accionesDe(e) })
      }
      if (ruta === '/estado') {
        const e = await nav.estado()
        return json(res, 200, { url: e.url, titulo: e.titulo, texto: e.texto, acciones: accionesDe(e) })
      }
      if (ruta === '/clic') {
        const r = await nav.clic(objetivo)
        return json(res, 200, { ok: r.ok, donde: r.donde, url: r.estado.url, titulo: r.estado.titulo, texto: r.estado.texto, acciones: accionesDe(r.estado) })
      }
      if (ruta === '/escribir') {
        const r = await nav.escribir(objetivo, valor)
        return json(res, 200, { ok: r.ok, donde: r.donde, url: r.estado.url, titulo: r.estado.titulo, texto: r.estado.texto, acciones: accionesDe(r.estado) })
      }
      if (ruta === '/scroll') {
        const e = await nav.scroll(datos.abajo !== false)
        return json(res, 200, { url: e.url, titulo: e.titulo, texto: e.texto, acciones: accionesDe(e) })
      }
      json(res, 404, { error: 'No sé hacer eso.' })
    } catch (e) {
      json(res, 400, { error: e instanceof Error ? e.message : String(e) })
    }
  })
  await new Promise<void>((ok, mal) => { srv.once('error', mal); srv.listen(0, '127.0.0.1', () => ok()) })
  const puerto = (srv.address() as { port: number }).port
  return { url: `http://127.0.0.1:${puerto}`, token, cerrar: () => { srv.close() } }
}
