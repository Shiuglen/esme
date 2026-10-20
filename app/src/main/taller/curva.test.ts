import { describe, expect, it } from 'vitest'
import { curvaDe, diaDe } from './curva'
import type { Tarea, Veredicto } from './taller'

const tarea = (parcial: Partial<Tarea>): Tarea => ({
  id: 't1', titulo: '', texto: '', motor: 'opencode', motorNombre: 'OpenCode', carpeta: null,
  estado: 'lista', copia: null, inicio: 1_700_000_000_000, turnos: 2, herramientas: 10,
  cambios: { ficheros: 3, mas: 40, menos: 2, lista: [] }, uso: { entrada: 100, salida: 20, pensamiento: 5 },
  permiso: null, actividad: [], opciones: [], modelo: 'm1', actividadMs: 0,
  ...parcial,
})

describe('la curva del Taller', () => {
  it('el día es el del creador, no el de UTC', () => {
    const ts = new Date(2026, 0, 31, 23, 30).getTime()
    expect(diaDe(ts)).toBe('2026-01-31')
  })

  it('cuenta los aciertos por día con la etiqueta del creador', () => {
    const dia = new Date(2026, 4, 10, 12).getTime()
    const veredictos: Veredicto[] = [
      { ts: dia, motor: 'opencode', modelo: 'm1', exito: true, tarea: 't1' },
      { ts: dia + 1000, motor: 'opencode', modelo: 'm1', exito: false, tarea: 't2' },
      { ts: dia + 2000, motor: 'qwen-code', modelo: 'm2', exito: true, tarea: 't3' },
    ]
    const c = curvaDe({ tareas: [], veredictos, fallos: [] })
    expect(c.veredictos).toEqual({ total: 3, positivos: 2, negativos: 1 })
    expect(c.porDia).toHaveLength(1)
    expect(c.porDia[0].positivos).toBe(2)
    expect(c.porDia[0].aciertos).toBe(0.667)
  })

  it('cada motor con lo suyo: tareas, errores, aciertos y coste', () => {
    const dia = new Date(2026, 4, 10, 12).getTime()
    const tareas = [
      tarea({ id: 't1', motor: 'opencode', inicio: dia - 1000, fin: dia + 1000, estado: 'error', herramientas: 20 }),
      tarea({ id: 't2', motor: 'opencode', inicio: dia - 1000, fin: dia + 1000, estado: 'lista', herramientas: 40 }),
      tarea({ id: 't3', motor: 'qwen-code', inicio: dia - 1000, fin: dia + 1000, estado: 'lista' }),
    ]
    const veredictos: Veredicto[] = [{ ts: dia, motor: 'opencode', modelo: 'm1', exito: true, tarea: 't2' }]
    const c = curvaDe({ tareas, veredictos, fallos: ['se cayó', 'se cayó', 'otra cosa'] })
    const oc = c.porMotor.find((m) => m.motor === 'opencode')!
    expect(oc.tareas).toBe(2)
    expect(oc.error).toBe(1)
    expect(oc.terminadas).toBe(1)
    expect(oc.aciertos).toBe(1)
    expect(oc.herramientasPorTarea).toBe(30)
    expect(c.porMotor.find((m) => m.motor === 'qwen-code')!.veredictos).toBe(0)
    expect(c.fallos[0]).toEqual({ mensaje: 'se cayó', veces: 2 })
  })

  it('el coste del acierto sólo cuenta las tareas que el creador se quedó', () => {
    const dia = new Date(2026, 4, 10, 12).getTime()
    const tareas = [
      tarea({ id: 't1', inicio: dia - 1000, fin: dia + 1000, uso: { entrada: 1000, salida: 100, pensamiento: 0 } }),
      tarea({ id: 't2', inicio: dia - 1000, fin: dia + 1000, uso: { entrada: 9000, salida: 900, pensamiento: 0 } }),
    ]
    const veredictos: Veredicto[] = [
      { ts: dia, motor: 'opencode', modelo: 'm1', exito: true, tarea: 't1' },
      { ts: dia, motor: 'opencode', modelo: 'm1', exito: false, tarea: 't2' },
    ]
    const c = curvaDe({ tareas, veredictos, fallos: [] })
    expect(c.costeDelAcierto).toEqual({ tareas: 1, tokens: 1100, coste: 0 })
  })

  it('sin datos no hay curva: todo a cero y sin reventar', () => {
    const c = curvaDe({ tareas: [], veredictos: [], fallos: [] })
    expect(c.tareas).toBe(0)
    expect(c.porDia).toEqual([])
    expect(c.costeDelAcierto).toBeNull()
  })
})
