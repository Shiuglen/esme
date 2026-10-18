import { generateKeyPairSync } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { firmarCatalogo, verificarCatalogo, type Producto } from './catalogo'

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
