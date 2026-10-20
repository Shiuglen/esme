// El catálogo que se publica y la colección que hay en la app son lo mismo: si se cuela un producto que no existe o
// se escapa una piel, el catálogo y la Tienda dejan de hablar del mismo tema. El que publica es el kit, con la llave
// de la Tienda (nunca la app), y lo lee de aquí: app/scripts/catalogo-productos.mjs.
import { describe, expect, it } from 'vitest'
import { PIELES_TIENDA } from '../../renderer/tinta/pieles-tienda'
import productos from './productos.json'

describe('el catálogo de productos: lo que se publica es lo que hay', () => {
  it('el catálogo trae una piel por cada piel de la colección, y solo esas', () => {
    expect(productos.productos.map((p) => p.id)).toEqual(PIELES_TIENDA.map((p) => p.id))
  })

  it('cada producto lleva la piel exacta, con su nombre, su autor y sus etiquetas', () => {
    for (const p of productos.productos) {
      const piel = PIELES_TIENDA.find((x) => x.id === p.id)
      expect(piel).toBeTruthy()
      expect(p.tipo).toBe('piel')
      expect(p.nombre).toBe(piel!.piel.nombre)
      expect(p.autor).toBe(piel!.autor)
      expect(p.etiquetas).toEqual(piel!.etiquetas)
      expect(p.contenido).toEqual(piel!.piel)
    }
  })
})
