// La mente desde el navegador: la conexión se guarda, se lee y no se compila en el bundle.
import { beforeEach, describe, expect, it } from 'vitest'
import { conexionGuardada, guardarConexion, olvidarConexion } from './mente-web'

/** Un localStorage de mentira (el entorno de pruebas es de Node). */
const almacen = new Map<string, string>()
beforeEach(() => {
  almacen.clear()
  ;(globalThis as unknown as { localStorage: Storage }).localStorage = {
    getItem: (k: string) => almacen.get(k) ?? null,
    setItem: (k: string, v: string) => void almacen.set(k, v),
    removeItem: (k: string) => void almacen.delete(k),
    clear: () => almacen.clear(),
    key: () => null,
    length: 0,
  } as unknown as Storage
  delete (globalThis as unknown as { window?: unknown }).window
})

describe('la conexión con la mente en el navegador', () => {
  it('se guarda y se vuelve a leer (con la barra final quitada)', () => {
    guardarConexion({ url: 'http://127.0.0.1:47321/', token: 'secreto' })
    expect(conexionGuardada()).toEqual({ url: 'http://127.0.0.1:47321', token: 'secreto' })
  })

  it('sin conexión no hay conexión (y no se inventa)', () => {
    expect(conexionGuardada()).toBeNull()
  })

  it('lo que se guarda no es un string: es una conexión', () => {
    guardarConexion({ url: 'http://mente', token: 't' })
    const bruto = almacen.get('esme:mente:conexion') ?? ''
    expect(bruto.startsWith('{')).toBe(true)
    expect(JSON.parse(bruto)).toMatchObject({ url: 'http://mente' })
  })

  it('olvidar la conexión borra la palabra del navegador', () => {
    guardarConexion({ url: 'http://mente', token: 't' })
    olvidarConexion()
    expect(conexionGuardada()).toBeNull()
    expect(almacen.size).toBe(0)
  })

  it('la configuración que da el servidor sirve cuando el creador no escribió nada', () => {
    ;(globalThis as unknown as { window: unknown }).window = { __ESME_MENTE__: { url: 'http://servidor:47321', token: 'del-servidor' } }
    expect(conexionGuardada()).toEqual({ url: 'http://servidor:47321', token: 'del-servidor' })
  })
})
