import { describe, expect, it, vi } from 'vitest'
import { GUION_CLIC, GUION_ESCRIBIR, GUION_ESTADO, GUION_SCROLL, GUION_VOLVER, accionesDe, normaliza, resumen, urlValida } from './estado'
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

  it('el espacio de acciones: lo que se puede hacer ahora mismo, POR NÚMEROS', () => {
    const e = normaliza({ url: 'https://x.com', botones: ['Publicar'], campos: [{ nombre: 'q', marcador: 'Buscar' }],
      enlaces: [{ texto: 'Perfil', url: 'https://x.com/p' }],
      elementos: [
        { n: 1, rol: 'boton', etiqueta: 'Publicar' },
        { n: 2, rol: 'campo', etiqueta: 'Buscar', tipo: 'text', marcador: 'q' },
        { n: 3, rol: 'enlace', etiqueta: 'Perfil', url: 'https://x.com/p' },
        { n: 4, rol: 'campo', etiqueta: 'Faena', tipo: 'select', opciones: ['comer', 'dormir'] },
        { n: 5, rol: 'campo', tipo: 'checkbox', marcado: false },
      ] })
    expect(accionesDe(e)).toEqual([
      'n1 [botón] Publicar',
      'n2 [campo] Buscar (text)',
      'n3 [enlace] Perfil',
      'n4 [campo] Faena (select · comer / dormir)',
      'n5 [campo] (sin etiqueta) (checkbox · sin marcar)',
    ])
  })

  it('el mapa del resumen: números y estados, sin enlaces mudos ni desbordes', () => {
    const r = resumen(normaliza({
      titulo: 'X', url: 'https://x.com', texto: 'cuerpo',
      vista: { y: 1200, alto: 3400, v: 700 },
      elementos: [
        { n: 1, rol: 'enlace', etiqueta: '', url: 'https://x.com/solo' },
        { n: 2, rol: 'campo', tipo: 'checkbox', marcado: true, marcador: 'acepto' },
        { n: 3, rol: 'campo', tipo: 'select', etiqueta: 'Faena', marcador: 'faena', opciones: ['comer', 'dormir', 'criar'] },
      ],
    }))
    expect(r).toContain('Vista: 56 % de la página')
    expect(r).toContain('n1 [enlace] https://x.com/solo')
    expect(r).toContain('n2 [campo] acepto (checkbox · marcado)')
    expect(r).toContain('n3 [campo] Faena (select · comer / dormir / criar)')
    expect(r).toContain('Lo que se puede tocar, por números')
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

  it('la moneda nueva: los números corren por la misma lista el mapa, el clic y la escritura', () => {
    // la MISMA enumeración (VIVOS, visibles, en orden) garantiza que n7 sea el mismo elemento
    // arriba en el mapa y abajo cuando se pulsa — y quien pone texto sigue funcionando igual
    expect(GUION_ESTADO).toContain('for (const e of VIVOS)')
    expect(GUION_CLIC('n7')).toContain('numeroDe(objetivo)')
    expect(GUION_CLIC('n7')).toContain('VIVOS[porNumero - 1]')
    expect(GUION_CLIC('n7')).toContain("e.click()")
    expect(GUION_ESCRIBIR('n3', 'hola')).toContain('VIVOS[porNumero - 1]')
    // un número que señala un botón no se deja escribir: se niega, no adivina
    expect(GUION_ESCRIBIR('n2', 'texto')).toContain("['INPUT', 'TEXTAREA', 'SELECT'].indexOf(fila.tagName) >= 0")
  })

  it('localizadores profundos: lo que DICE la página manda, y ojo con el objetivo vacío', () => {
    // de fuera hacia dentro: exacto > contiene; y los atributos de rescate (aria-label, id, name)
    const orden = GUION_CLIC('Enviar')
    expect(orden).toContain("dice(x) === o) ||")
    expect(orden).toContain("dice(x).includes(o)")
    expect(orden).toContain("x.getAttribute('aria-label')")
    expect(orden).toContain('placeholder, x.title, x.id, x.name')
    expect(orden.indexOf("dice(x) === o")).toBeLessThan(orden.indexOf("atributos(x) === o"))
    // y nadie loco: un objetivo vacío no pulsa al primero de la fila
    expect(GUION_CLIC('')).toContain("if (!o) return { ok: false, donde: '' }")
    expect(GUION_ESCRIBIR('', 'hola')).toContain("if (!o) return { ok: false, donde: '' }")
    expect(GUION_ESCRIBIR('Buscar', 'hola')).toContain("dice(x) === o")
  })

  it('el guion de la mirada: baja o sube casi una pantalla, y el estado cuenta dónde quedó', () => {
    expect(GUION_SCROLL(true)).toContain('window.innerHeight * 0.85) * (1)')
    expect(GUION_SCROLL(false)).toContain('window.innerHeight * 0.85) * (-1)')
    expect(GUION_ESTADO).toContain('window.scrollY')
    expect(GUION_ESTADO).toContain('scrollHeight')
  })

  it('la historia: el guion no espera nada dentro de la página (muere al navegar); el que espera es el navegador', () => {
    expect(GUION_VOLVER).toBe('history.back()')
    expect(GUION_VOLVER).not.toContain('Promise')
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

  it('la mirada: baja la página y el estado que vuelve es el nuevo', async () => {
    const v = ventanaFalsa({ url: 'https://x.com', titulo: 'X', texto: 'lo de más abajo',
      vista: { y: 1200, alto: 3400, v: 700 }, elementos: [{ n: 4, rol: 'boton', etiqueta: 'Leer más' }] })
    const n = new Navegador(() => v)
    await n.abrir('https://x.com')
    const e = await n.scroll(true)
    expect(v.llamadas.some((c) => c.includes('window.innerHeight * 0.85'))).toBe(true)
    expect(e.vista?.y).toBe(1200)
    expect(e.elementos.map((x) => x.etiqueta)).toEqual(['Leer más'])
  })

  it('la historia: vuelve atrás y el estado que trae es el de la página viva (no cuelga la puerta)', async () => {
    // aquí la ventana falsa SÍ cambia de dirección al pedir volver: primo de lo que hace Chromium.
    // El guion de volver no espera nada dentro de la página (moriría al navegar); el estado viene
    // de la lectura que el navegador hace DESPUÉS de la espera.
    const estado = { url: 'https://x.com/vieja', titulo: 'Vieja', texto: 'la página de antes',
      elementos: [{ n: 1, rol: 'enlace', etiqueta: 'Adelante' }] }
    const llamadas: string[] = []
    let direccion = 'https://x.com/'
    const v: Ventana & { llamada: (c: string) => Promise<unknown> } = {
      loadURL: async () => {},
      llamada: async (c) => { llamadas.push(c); if (c === 'history.back()') direccion = 'https://x.com/vieja'; return llamadas.length > 1 ? estado : undefined },
      executeJavaScript: (c) => v.llamada(c),
      isDestroyed: () => false,
      close: () => {},
      url: () => direccion,
    }
    const n = new Navegador(() => v)
    await n.abrir('https://x.com')
    const e = await n.volver()
    expect(llamadas).toContain('history.back()')
    expect(e.titulo).toBe('Vieja')
    expect(e.texto).toBe('la página de antes')
    expect(e.elementos.map((x) => x.etiqueta)).toEqual(['Adelante'])
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
