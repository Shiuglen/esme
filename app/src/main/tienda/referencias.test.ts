// La cache de paletas: lo que se ha visto de cada referencia, y lo que falta por ver.
import { describe, expect, it } from 'vitest'
import { parseaCache, pendientes, serializaCache, vigente, type Cache } from './referencias'

const ahora = 1792474644259
const cache = (entradas: Cache['entradas']): Cache => ({ version: 1, entradas })

describe('la cache de paletas', () => {
  it('lee y escribe sin perder nada', () => {
    const c = cache({ 'https://a.dev': { url: 'https://a.dev', colores: ['#0b1020', '#e8ecf5'], titulo: 'A', vista: ahora } })
    expect(parseaCache(serializaCache(c))).toEqual(c)
  })

  it('un fichero dañado no rompe nada', () => {
    expect(parseaCache('no es json').entradas).toEqual({})
    expect(parseaCache('{"entradas": 5}').entradas).toEqual({})
    expect(parseaCache('{"entradas": {"a": {"url": 5}}}').entradas).toEqual({})
  })

  it('una entrada con un color que no es color no entra', () => {
    const c = parseaCache(JSON.stringify({ entradas: { a: { url: 'https://a.dev', colores: ['#fff', 'rojo'], titulo: '', vista: 1 } } }))
    expect(c.entradas.a).toBeUndefined()
  })

  it('lo viejo se vuelve a mirar; lo reciente, no', () => {
    const e = { url: 'https://a.dev', colores: ['#000000'], titulo: '', vista: ahora - 3 * 86_400_000 }
    expect(vigente(e, ahora)).toBe(true)
    expect(vigente({ ...e, vista: ahora - 20 * 86_400_000 }, ahora)).toBe(false)
    expect(vigente(undefined, ahora)).toBe(false)
  })

  it('lo que falta se pide a trozos (no se descargan veinte webs de golpe)', () => {
    const c = cache({ 'https://a.dev': { url: 'https://a.dev', colores: ['#000000'], titulo: '', vista: ahora } })
    const faltan = pendientes(c, ['https://a.dev', 'https://b.dev', 'https://c.dev'], ahora, 2)
    expect(faltan).toEqual(['https://b.dev', 'https://c.dev'])
  })
})
