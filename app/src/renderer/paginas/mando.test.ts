import { describe, expect, it } from 'vitest'
import type { TareaTaller } from '../lib/bridge'
import { PIEL_BASE, validarPiel } from '../tinta/piel'
import { islaDe, pasosDe } from './mando'

const AHORA = 1_800_000_000_000
const tarea = (p: Partial<TareaTaller>): TareaTaller => ({
  id: 't', titulo: 'tests de la portada', texto: '', motor: 'qwen', motorNombre: 'Qwen Code', carpeta: null, estado: 'trabajando', copia: null,
  inicio: AHORA - 60_000, turnos: 1, herramientas: 3, cambios: null, uso: { entrada: 0, salida: 0, pensamiento: 0 },
  permiso: null, actividad: [], opciones: [], modelo: null, actividadMs: 0, ...p,
})

describe('la portada también es de la piel', () => {
  it('«mando» por defecto; «mente» es la red de siempre; lo demás se rechaza', () => {
    expect(PIEL_BASE.portada).toBe('mando')
    expect(validarPiel({ portada: 'mente' }).ok).toBe(true)
    expect(validarPiel({ portada: 'revista' }).ok).toBe(false)
  })
})

describe('la isla cuenta lo que hacen tus agentes', () => {
  it('lo que trabaja va con su motor; lo terminado hace poco, como hecho; lo viejo no sale', () => {
    const isla = islaDe([
      tarea({ id: 'a' }),
      tarea({ id: 'b', estado: 'lista', fin: AHORA - 30_000 }),
      tarea({ id: 'c', estado: 'lista', fin: AHORA - 3_600_000 }),
      tarea({ id: 'd', estado: 'error', fin: AHORA - 10_000, error: 'la sesión caducó' }),
    ], AHORA)
    expect(isla.map((t) => [t.id, t.status])).toEqual([['b', 'done'], ['d', 'error'], ['a', 'running']])
    expect(isla[2]).toMatchObject({ label: 'Qwen Code', detail: 'tests de la portada' })
  })
})

describe('los pasos de un agente', () => {
  it('preparando → la copia está en marcha; trabajando → copia hecha y el trabajo en curso con sus herramientas', () => {
    expect(pasosDe(tarea({ estado: 'preparando' })).map((p) => p.status)).toEqual(['running', 'pending', 'pending'])
    const t = pasosDe(tarea({}))
    expect(t.map((p) => p.status)).toEqual(['done', 'running', 'pending'])
    expect(t[1].detail).toEqual(['3 herramientas usadas', '1 turno'])
  })
  it('esperando tu permiso lo dice en el paso en curso', () => {
    const t = pasosDe(tarea({ estado: 'esperando', permiso: { titulo: 'Escribir en src', opciones: [] } }))
    expect(t[1].label).toBe('Esperando tu permiso: Escribir en src')
  })
})
