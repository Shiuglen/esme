// El nacimiento de las hojas y sus frases: prosa honesta, no jerga de sistema.
import { describe, expect, it } from 'vitest'
import type { TareaTaller } from '../lib/bridge'
import { fraseServicio, nacidos, encargoDe } from './hoja'

const tarea = (sobre: Partial<TareaTaller>): TareaTaller => ({
  id: 't1', titulo: 'Escribe un fichero', texto: 'Escribe un fichero II', motor: 'qwen-code', motorNombre: 'Qwen Code',
  carpeta: null, estado: 'lista', copia: null, inicio: 0, turnos: 1, herramientas: 1, cambios: null,
  uso: { entrada: 0, salida: 0, pensamiento: 0, contextos: 0 } as TareaTaller['uso'],
  permiso: null, actividad: [], opciones: [], modelo: null, actividadMs: 0, ...sobre,
})

describe('nacidos', () => {
  it('nacen solo las que llegan a lista o error ahora, no las que ya estaban', () => {
    const prev = { a: 'lista', b: 'trabajando' }
    const tareas = [tarea({ id: 'a' }), tarea({ id: 'b', estado: 'lista' as TareaTaller['estado'] })]
    const r = nacidos(prev, tareas)
    expect(r.ids).toEqual(['b'])
    expect(r.mapa).toEqual({ a: 'lista', b: 'lista' })
    // sin previo (arranque): nada nace — la casa no celebra lo viejo
    expect(nacidos({}, tareas).ids).toEqual([])
  })
})

describe('fraseServicio', () => {
  it('la lista cuenta lo que tocó, con sus deltas y su tiempo', () => {
    const t = tarea({ fin: 41_000, cambios: { ficheros: 1, mas: 2, menos: 0, lista: [{ ruta: 'poema.txt' } as never] } })
    const f = fraseServicio(t, 42_000)
    expect(f).toContain('Tocó 1 fichero (+2 −0)')
    expect(f).toContain('0:41 · 1 turno')
  })
  it('una tarea sin cambios lo dice con dignidad, y el error explica por qué se cayó', () => {
    expect(fraseServicio(tarea({ fin: 8000 }), 9000)).toContain('Terminó sin tocar ficheros')
    const f = fraseServicio(tarea({ estado: 'error' as TareaTaller['estado'], error: 'Internal error', fin: 9000 }), 9500)
    expect(f).toContain('Se cayó: Internal error')
  })
})

describe('encargoDe', () => {
  it('prefiere el título y acota la frase', () => {
    expect(encargoDe(tarea({}))).toBe('Escribe un fichero')
    expect(encargoDe(tarea({ titulo: '' }))).toBe('Escribe un fichero II')
  })
})
