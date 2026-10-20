import { describe, expect, it } from 'vitest'
import { vistaCurva } from './uso-curva'
import { CURVA_VACIA, type Curva } from '../../main/taller/curva'

const curva = (parcial: Partial<Curva>): Curva => ({ ...CURVA_VACIA, ...parcial })

describe('la curva del Taller, contada', () => {
  it('sin tareas no hay curva que enseñar', () => {
    const v = vistaCurva(CURVA_VACIA)
    expect(v.hayCurva).toBe(false)
    expect(v.barras).toEqual([])
  })

  it('cada día es una barra cuya altura es la proporción de tareas que te quedaste', () => {
    const v = vistaCurva(curva({
      tareas: 6,
      porDia: [{ dia: '2026-10-19', positivos: 3, negativos: 1, aciertos: 0.75 }, { dia: '2026-10-20', positivos: 0, negativos: 2, aciertos: 0 }],
    }))
    expect(v.hayCurva).toBe(true)
    expect(v.barras[0]).toEqual({ dia: '2026-10-19', titulo: '2026-10-19 · 3 aplicadas · 1 descartadas', altura: 75, acierto: true })
    expect(v.barras[1].altura).toBe(6)          // sin aciertos, la barra se ve igual de baja
    expect(v.barras[1].acierto).toBe(false)
  })

  it('el subtítulo cuenta lo que importa: cuántas te quedaste y cuántas fallaron', () => {
    const v = vistaCurva(curva({
      tareas: 6, estados: { error: 2, lista: 4 },
      veredictos: { total: 4, positivos: 3, negativos: 1 },
    }))
    expect(v.subtitulo).toBe('6 tareas · te quedaste 3 de 4 · 2 con error')
  })

  it('sin veredictos aún, lo dice sin inventar aciertos', () => {
    const v = vistaCurva(curva({ tareas: 3, estados: { error: 1, lista: 2 }, veredictos: { total: 0, positivos: 0, negativos: 0 } }))
    expect(v.subtitulo).toBe('3 tareas · 1 con error · aún no te has quedado ninguna')
    expect(v.motores.every((m) => m.acierto === null)).toBe(true)
  })

  it('cuenta cómo acabaron las tareas: eso es lo que se mide día a día', () => {
    const v = vistaCurva(curva({ tareas: 46, estados: { lista: 19, error: 16, parada: 9, trabajando: 2 } }))
    expect(v.estados).toEqual([
      { texto: 'terminadas', valor: 19, tono: 'bien' },
      { texto: 'con error', valor: 16, tono: 'mal' },
      { texto: 'paradas', valor: 9, tono: 'normal' },
      { texto: 'trabajando', valor: 2, tono: 'normal' },
    ])
  })

  it('sin un solo «sí» la línea no miente: lo dice con palabras', () => {
    const v = vistaCurva(curva({ tareas: 46, veredictos: { total: 11, positivos: 0, negativos: 11 },
      porDia: [{ dia: '2026-10-18', positivos: 0, negativos: 2, aciertos: 0 }] }))
    expect(v.sinAciertos).toBe(true)
    const con = vistaCurva(curva({ tareas: 46, veredictos: { total: 11, positivos: 1, negativos: 10 },
      porDia: [{ dia: '2026-10-18', positivos: 1, negativos: 1, aciertos: 0.5 }] }))
    expect(con.sinAciertos).toBe(false)
  })

  it('el coste del acierto sólo se cuenta si hubo alguna tarea que te quedaste', () => {
    const con = vistaCurva(curva({ tareas: 2, veredictos: { total: 1, positivos: 1, negativos: 0 }, costeDelAcierto: { tareas: 1, tokens: 1234, coste: 0 } }))
    expect(con.costeDelAcierto).toContain('1,2 mil tokens')
    const sin = vistaCurva(curva({ tareas: 2 }))
    expect(sin.costeDelAcierto).toBeNull()
  })
})
