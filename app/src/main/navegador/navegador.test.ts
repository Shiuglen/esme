import { describe, expect, it, vi } from 'vitest'
import { GUION_CLIC, GUION_ESCRIBIR, GUION_ESTADO, accionesDe, normaliza, urlValida } from './estado'
import { Navegador, type Ventana } from './navegador'

describe('lo que el agente ve de una página', () => {
  it('limpia y acota: ninguna página desborda el contexto', () => {
    const e = normaliza({ url: 'https://x.com', titulo: '  Hola   mundo ', texto: 'a'.repeat(30_000),
      enlaces: [{ texto: 'Ir', url: 'https://x.com/ir' }, { texto: 'nada' }], botones: ['Enviar', '', 'Aceptar'],
      campos: [{ nombre: 'q', tipo: 'text', valor: 'hola', marcador: 'Buscar' }, { nombre: '' }] })
    expect(e.titulo).toBe('Hola mundo')
    expect(e.texto.length).toBe(12_000)
    expect(e.enlaces).toHaveLength(1)          // el que no tiene url no cuenta
    expect(e.botones).toEqual(['Enviar', 'Aceptar'])
    expect(e.campos).toHaveLength(1)
  })

  it('lo que no viene de la página no rompe nada', () => {
    const e = normaliza(null)
    expect(e.url).toBe('')
    expect(e.texto).toBe('')
    expect(e.enlaces).toEqual([])
  })

  it('el espacio de acciones: lo que se puede hacer ahora mismo', () => {
    const e = normaliza({ url: 'https://x.com', botones: ['Publicar'], campos: [{ nombre: 'q', marcador: 'Buscar' }],
      enlaces: [{ texto: 'Perfil', url: 'https://x.com/p' }] })
    expect(accionesDe(e)).toEqual(['clic en «Publicar»', 'escribir en «Buscar»', 'abrir https://x.com/p'])
  })

  it('sólo direcciones de la web: ni ficheros ni javascript:', () => {
    expect(urlValida('https://x.com')).toBe('https://x.com/')
    expect(urlValida('http://localhost:5173/laboratorio.html')).toContain('localhost:5173')
    expect(urlValida('file:///etc/passwd')).toBeNull()
    expect(urlValida('javascript:alert(1)')).toBeNull()
    expect(urlValida('no es una url')).toBeNull()
  })

  it('los guiones llevan el objetivo bien escapado (nada de inyección)', () => {
    expect(GUION_CLIC('Cerrar"; alert(1); "')).toContain('Cerrar\\"; alert(1); \\"')
    expect(GUION_ESCRIBIR('hola', 'a"b')).toContain('a\\"b')
    expect(GUION_ESTADO).toContain('location.href')
  })
})

describe('el navegador', () => {
  const ventanaFalsa = (estado: unknown) => {
    const v: Ventana & { llamadas: string[]; cerrada: boolean } = {
      llamadas: [], cerrada: false,
      loadURL: async (url) => { v.llamadas.push(url) },
      executeJavaScript: async (codigo) => { v.llamadas.push(codigo); return estado },
      isDestroyed: () => v.cerrada,
      close: () => { v.cerrada = true },
      url: () => 'https://x.com/',
    }
    return v
  }

  it('abre una página y devuelve lo que hay', async () => {
    const v = ventanaFalsa({ url: 'https://x.com', titulo: 'X', texto: 'hola', botones: ['Ir'] })
    const n = new Navegador(() => v)
    const e = await n.abrir('https://x.com')
    expect(v.llamadas[0]).toBe('https://x.com/')
    expect(e.titulo).toBe('X')
    expect(n.abierto).toBe(true)
  })

  it('no abre direcciones que no son de la web', async () => {
    const v = ventanaFalsa({})
    const n = new Navegador(() => v)
    await expect(n.abrir('file:///etc/passwd')).rejects.toThrow(/http/)
    expect(v.llamadas).toHaveLength(0)
  })

  it('pulsa y rellena, y devuelve la página nueva', async () => {
    const v = ventanaFalsa({ ok: true, donde: 'Enviar', url: 'https://x.com', titulo: 'X' })
    const n = new Navegador(() => v)
    await n.abrir('https://x.com')
    const r = await n.clic('Enviar')
    expect(r.ok).toBe(true)
    expect(r.donde).toBe('Enviar')
    const w = await n.escribir('Buscar', 'hola')
    expect(w.ok).toBe(true)
    expect(v.llamadas.some((c) => c.includes('Buscar'))).toBe(true)
  })

  it('se cierra sola si nadie la usa: en reposo no hay navegador abierto', async () => {
    vi.useFakeTimers()
    try {
      const v = ventanaFalsa({ url: 'https://x.com' })
      const n = new Navegador(() => v, 1000)
      await n.abrir('https://x.com')
      expect(n.abierto).toBe(true)
      vi.advanceTimersByTime(1500)
      expect(n.abierto).toBe(false)
      expect(v.cerrada).toBe(true)
    } finally { vi.useRealTimers() }
  })
})
