// El catálogo que se publica y la colección que hay en la app son lo mismo: si se cuela un producto que no existe o
// se escapa una piel, el catálogo y la Tienda dejan de hablar del mismo tema. El que publica es el kit, con la llave de
// la Tienda (nunca la app), y lo lee de aquí: app/scripts/catalogo-productos.mjs.
import { describe, expect, it } from 'vitest'
import { PIELES_TIENDA } from '../../renderer/tinta/pieles-tienda'
import { AGENTES_TIENDA } from '../../renderer/tinta/agentes-tienda'
import productos from './productos.json'

describe('el catálogo de productos: lo que se publica es lo que hay', () => {
  it('el catálogo trae una piel por cada piel de la colección, y solo esas', () => {
    const ids = productos.productos.map((p) => p.id)
    // los ids de piel, en su orden
    const idsDePiel = productos.productos.filter((p) => p.tipo === 'piel').map((p) => p.id)
    expect(idsDePiel).toEqual(PIELES_TIENDA.map((p) => p.id))
    // y los ids de agente, también
    const idsDeAgente = productos.productos.filter((p) => p.tipo === 'agente').map((p) => p.id)
    expect(idsDeAgente).toEqual(AGENTES_TIENDA.map((a) => a.id))
    // ningún id repetido entre tipos
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('cada producto lleva su piel exacta, con su nombre, su autor y sus etiquetas', () => {
    for (const p of productos.productos.filter((x) => x.tipo === 'piel')) {
      const piel = PIELES_TIENDA.find((x) => x.id === p.id)
      expect(piel).toBeTruthy()
      expect(p.tipo).toBe('piel')
      expect(p.nombre).toBe(piel!.piel.nombre)
      expect(p.autor).toBe(piel!.autor)
      expect(p.etiquetas).toEqual(piel!.etiquetas)
      expect(p.contenido).toEqual(piel!.piel)
    }
  })

  it('cada agente lleva su forma exacta, con su nombre, su autor y sus etiquetas', () => {
    for (const p of productos.productos.filter((x) => x.tipo === 'agente')) {
      const agente = AGENTES_TIENDA.find((x) => x.id === p.id)
      expect(agente).toBeTruthy()
      expect(p.tipo).toBe('agente')
      expect(p.nombre).toBe(agente!.nombre)
      expect(p.autor).toBe(agente!.autor)
      expect(p.etiquetas).toEqual(agente!.etiquetas)
      expect(p.version).toBe(agente!.version)
      // el contenido es DATOS, nunca código: el comando es una plantilla, no algo que se ejecute tal cual
      expect(p.contenido).toEqual({ comando: agente!.comando, herramientas: agente!.herramientas ?? [], ejemplo: agente!.ejemplo ?? '' })
    }
  })

  it('el comando de un agente es una plantilla con su sitio, no un comando que se ejecute tal cual', () => {
    for (const p of productos.productos.filter((x) => x.tipo === 'agente')) {
      const comando = (p.contenido as { comando: string }).comando
      // el comando lleva {tarea} (y {carpeta} si trabaja en una copia): siempre tiene un hueco que se rellena
      expect(comando, p.id).toMatch(/\{tarea\}|\{carpeta\}/)
      // y no viene con nada ejecutado de más: ni sudo, ni pipes a un shell
      expect(comando, p.id).not.toMatch(/sudo|&&|\||;/)
    }
  })
})
