import { generateKeyPairSync } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { firmarCatalogo, verificaCatalogo, verificarCatalogo, type Producto } from './catalogo'

const par = () => { const { publicKey, privateKey } = generateKeyPairSync('ed25519'); return { publica: publicKey.export({ type: 'spki', format: 'pem' }).toString(), privada: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString() } }
const { publica, privada } = par()
const producto: Producto = { id: 'neon-tokio', tipo: 'piel', nombre: 'Neón Tokio', autor: 'Esme', descripcion: 'Neón y lluvia', etiquetas: ['neón'], version: 1, contenido: { nombre: 'Neón Tokio' } }

describe('el catálogo de la Tienda viene firmado: nadie cuela nada', () => {
  it('un catálogo firmado se lee con sus productos', () => {
    const r = verificarCatalogo(firmarCatalogo([producto], privada), publica)
    expect(r.ok && r.productos.map((p) => p.id)).toEqual(['neon-tokio'])
  })
  it('cambiar un producto rompe la firma', () => {
    const c = JSON.parse(firmarCatalogo([producto], privada)); c.productos[0].nombre = 'Otro'
    expect(verificarCatalogo(JSON.stringify(c), publica).ok).toBe(false)
  })
  it('un catálogo firmado con otra clave no vale', () => {
    expect(verificarCatalogo(firmarCatalogo([producto], par().privada), publica).ok).toBe(false)
  })
  it('lo que no es un catálogo, o trae productos sin forma, se rechaza sin romperse', () => {
    for (const x of ['', '{}', 'null', '{"productos":5,"firma":"x"}']) expect(verificarCatalogo(x, publica).ok).toBe(false)
    const raro = firmarCatalogo([{ ...producto, tipo: 'virus' } as never], privada)
    expect(verificarCatalogo(raro, publica).ok).toBe(false)
  })
})

// La Tienda no puede depender de que alguien edite el código de la app cada vez que rota una llave.
// Con el libro de rotaciones (el mismo que avala la Tienda de módulos), la confianza se extiende sola:
// la app acepta un catálogo firmado por la llave nueva SI la raíz llega a ella por una sucesión firmada.
describe('la Tienda se rota sola: el libro de rotaciones extends la confianza', () => {
  const vieja = par()
  const nueva = par()

  it('un catálogo firmado por la llave nueva vale si el libro la avala', () => {
    const libro = JSON.stringify({ sucesiones: [{ vieja: { huella: 'a', pub: vieja.publica }, nueva: { huella: 'b', pub: nueva.publica } }] })
    const r = verificaCatalogo(firmarCatalogo([producto], nueva.privada), [vieja.publica], libro)
    expect(r.ok).toBe(true)
    expect(r.ok && r.productos.map((p) => p.id)).toEqual(['neon-tokio'])
  })

  it('sin el libro, la llave nueva no vale (la confianza no se inventa)', () => {
    expect(verificaCatalogo(firmarCatalogo([producto], nueva.privada), [vieja.publica]).ok).toBe(false)
  })

  it('un libro roto no rompe la app: se rechaza y se sigue', () => {
    for (const libro of ['', '{', 'null', '{"sucesiones":5}', '{"sucesiones":[{}]}']) {
      expect(verificaCatalogo(firmarCatalogo([producto], nueva.privada), [vieja.publica], libro).ok).toBe(false)
    }
  })

  it('la llave directa sigue valiendo aunque haya libro (no se rompe lo que ya funciona)', () => {
    const libro = JSON.stringify({ sucesiones: [{ vieja: { huella: 'a', pub: vieja.publica }, nueva: { huella: 'b', pub: nueva.publica } }] })
    expect(verificaCatalogo(firmarCatalogo([producto], vieja.privada), [vieja.publica], libro).ok).toBe(true)
  })
})
