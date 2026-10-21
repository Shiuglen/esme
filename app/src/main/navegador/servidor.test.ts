import { describe, expect, it } from 'vitest'
import { servirNavegador } from './servidor'
import { Navegador, type Ventana } from './navegador'

const ventanaFalsa = (estado: unknown) => {
  const v: Ventana = {
    loadURL: async () => {},
    executeJavaScript: async () => estado,
    isDestroyed: () => false,
    close: () => {},
    url: () => 'https://x.com/',
  }
  return v
}

/** La ventana falsa devuelve lo mismo para el estado y para las acciones: así el guion de clic
 *  (que pregunta por `ok`) y el de estado (que pregunta por la página) ven algo coherente. */
const ventanaCompleta = () => ventanaFalsa({ ok: true, donde: 'Ir', url: 'https://x.com', titulo: 'X', texto: 'hola', botones: ['Ir'],
  elementos: [{ n: 1, rol: 'boton', etiqueta: 'Ir' }] })

describe('la puerta del navegador', () => {
  it('abre, lee, pulsa y escribe: con el token y sólo desde el token', async () => {
    const v = ventanaCompleta()
    const nav = new Navegador(() => v)
    const puerta = await servirNavegador(nav, 'tok')
    try {
      const llamar = async (ruta: string, cuerpo: unknown, token = 'tok') => {
        const r = await fetch(`${puerta.url}${ruta}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(cuerpo) })
        return { codigo: r.status, cuerpo: await r.json() as Record<string, unknown> }
      }
      const abrir = await llamar('/abrir', { url: 'https://x.com' })
      expect(abrir.codigo).toBe(200)
      expect(abrir.cuerpo.titulo).toBe('X')
      expect(abrir.cuerpo.acciones).toEqual(['n1 [botón] Ir'])

      const estado = await llamar('/estado', {})
      expect(estado.codigo).toBe(200)

      const clic = await llamar('/clic', { objetivo: 'Ir' })
      expect(clic.cuerpo.ok).toBe(true)

      const escribir = await llamar('/escribir', { objetivo: 'Buscar', valor: 'hola' })
      expect(escribir.codigo).toBe(200)

      // sin token no se entra
      const sinToken = await llamar('/estado', {}, 'otro')
      expect(sinToken.codigo).toBe(401)
      // ni con GET
      const get = await fetch(`${puerta.url}/estado`)
      expect(get.status).toBe(405)
    } finally { puerta.cerrar() }
  })

  it('si la página falla, lo dice con su mensaje y no revienta', async () => {
    const nav = new Navegador(() => ventanaFalsa({}))
    const puerta = await servirNavegador(nav, 'tok')
    try {
      const r = await fetch(`${puerta.url}/abrir`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer tok' }, body: JSON.stringify({ url: 'file:///etc/passwd' }) })
      const j = await r.json() as { error?: string }
      expect(r.status).toBe(400)
      expect(j.error).toMatch(/http/)
    } finally { puerta.cerrar() }
  })
})
