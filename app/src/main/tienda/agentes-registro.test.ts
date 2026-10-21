// Los agentes de la Tienda y los motores del registro tienen que ser lo MISMO, por id.
//
// Si un agente de la Tienda no está en el registro de ACP, «Usar en el Taller» elige un motor que no
// existe y la tarea no arranca: un botón que no hace nada, que es peor que no tenerlo. Este test lo
// avisa ANTES de que se publique el catálogo.
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { AGENTES_TIENDA } from '../../renderer/tinta/agentes-tienda'

const RAIZ = resolve(import.meta.dirname, '..', '..', '..')

describe('los agentes de la Tienda son motores que existen', () => {
  // el espejo embebido del registro: es lo que la app usa cuando no hay red
  const espejo = readFileSync(join(RAIZ, 'src', 'main', 'motores', 'catalogo-registry.ts'), 'utf8')
  const idsDelRegistro = [...espejo.matchAll(/"id": "([^"]+)"/g)].map((m) => m[1])

  it('cada agente de la Tienda está en el registro de ACP (con su id exacto)', () => {
    // el Cerebro no es un motor externo: es la memoria de Esme, que no viene del registro de ACP
    const externos = AGENTES_TIENDA.filter((a) => a.id !== 'esme-cerebro')
    const huerfanos = externos.filter((a) => !idsDelRegistro.includes(a.id)).map((a) => a.id)
    expect(huerfanos, `agentes que el Taller no podría lanzar: ${huerfanos.join(', ')}`).toEqual([])
  })

  it('el Cerebro es de Esme: no viene del registro (es la memoria, no un motor externo)', () => {
    const cerebro = AGENTES_TIENDA.find((a) => a.id === 'esme-cerebro')
    expect(cerebro).toBeTruthy()
    expect(idsDelRegistro).not.toContain('esme-cerebro')
  })

  it('ningún agente repite id (la Tienda no puede enseñar dos veces lo mismo)', () => {
    const ids = AGENTES_TIENDA.map((a) => a.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
