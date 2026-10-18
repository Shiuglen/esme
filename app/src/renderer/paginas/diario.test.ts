import { describe, expect, it } from 'vitest'
import type { TareaTaller } from '../lib/bridge'
import type { Atlas } from '../lib/brain'
import { diarioDe } from './diario'

const AHORA = new Date(2026, 9, 17, 22, 0).getTime()
const min = 60_000, hora = 60 * min, dia = 24 * hora
const tarea = (p: Partial<TareaTaller>): TareaTaller => ({
  id: 't', titulo: 'tests de la portada', texto: '', motor: 'qwen', motorNombre: 'Qwen Code', carpeta: null, estado: 'lista', copia: null,
  inicio: AHORA - 20 * min, fin: AHORA - 5 * min, turnos: 1, herramientas: 0, cambios: { ficheros: 3, mas: 40, menos: 2 } as never, uso: { entrada: 0, salida: 0, pensamiento: 0 },
  permiso: null, actividad: [], opciones: [], modelo: null, actividadMs: 0, ...p,
})
const atlas = (fechas: [number, number][]): Atlas => ({
  clusters: [{ id: 0, label: 'pruebas', x: 0, y: 0, size: 1 }, { id: 1, label: 'git', x: 0, y: 0, size: 1 }],
  points: fechas.map(([c, ms], i) => ({ id: `p${i}`, x: 0, y: 0, h: 0, cluster: c, kind: 'note', source: 'x', ts: new Date(ms).toISOString() })),
})

describe('ponerte al día en un minuto: lo que pasó, dicho en frases', () => {
  it('una tarea lista se cuenta como una frase con quién, qué y cuándo', () => {
    const [e] = diarioDe({ tareas: [tarea({})], atlas: null, desde: AHORA - dia, ahora: AHORA })
    expect(e.frase).toBe('Qwen Code terminó «tests de la portada»: 3 ficheros cambiados, listos para revisar.')
    expect(e.cuando).toBe('hace 5 min')
    expect(e.ir).toEqual({ lugar: 'taller', id: 't' })
  })
  it('un fallo dice por qué, y lo aplicado se distingue de lo que espera', () => {
    const d = diarioDe({ tareas: [
      tarea({ id: 'a', estado: 'error', error: 'la sesión caducó', fin: AHORA - 2 * hora }),
      tarea({ id: 'b', titulo: 'modo oscuro', aplicada: { cuando: AHORA - hora, modo: 'carpeta', ficheros: 2 } }),
    ], atlas: null, desde: AHORA - dia, ahora: AHORA })
    expect(d.map((x) => x.frase)).toEqual([
      'Aplicaste «modo oscuro» a tu carpeta (2 ficheros).',
      'Qwen Code falló en «tests de la portada»: la sesión caducó.',
    ])
    expect(d[1].tono).toBe('peligro')
  })
  it('una tarea que necesita tu permiso va primero, aunque sea más antigua', () => {
    const d = diarioDe({ tareas: [tarea({ id: 'a' }), tarea({ id: 'b', estado: 'esperando', fin: undefined, inicio: AHORA - 3 * hora, permiso: { titulo: 'Escribir en src', opciones: [] } })],
      atlas: null, desde: AHORA - dia, ahora: AHORA })
    expect(d[0].frase).toBe('Qwen Code te espera en «tests de la portada»: pide permiso para «Escribir en src».')
    expect(d[0].tono).toBe('atencion')
  })
  it('los recuerdos nuevos se resumen por tema, no uno a uno', () => {
    const d = diarioDe({ tareas: [], atlas: atlas([[0, AHORA - hora], [0, AHORA - 2 * hora], [1, AHORA - 3 * hora], [0, AHORA - 3 * dia]]), desde: AHORA - dia, ahora: AHORA })
    expect(d).toHaveLength(1)
    expect(d[0].frase).toBe('Tu mente guardó 3 recuerdos nuevos, sobre todo de «pruebas» y «git».')
    expect(d[0].ir).toEqual({ lugar: 'memoria' })
  })
  it('un título largo (un prompt entero) se recorta para leerse de un vistazo', () => {
    const [e] = diarioDe({ tareas: [tarea({ titulo: 'Responde con un único bloque de código cercado cuyo language sea prisma y cuyo contenido sea este' })], atlas: null, desde: AHORA - dia, ahora: AHORA })
    expect(e.frase).toMatch(/^Qwen Code terminó «Responde con un único bloque de código cercado cuyo…»: 3 ficheros/)
  })
  it('lo que se repite se cuenta una vez, con cuántas veces', () => {
    const d = diarioDe({ tareas: [1, 2, 3, 4].map((i) => tarea({ id: `t${i}`, fin: AHORA - i * hora, cambios: null })), atlas: null, desde: AHORA - dia, ahora: AHORA })
    expect(d).toHaveLength(1)
    expect(d[0].frase).toBe('Qwen Code terminó «tests de la portada» sin cambios (4 veces).')
    expect(d[0].cuando).toBe('hace 1 h')
  })
  it('lo de antes del corte no aparece; sin nada que contar, el diario está vacío', () => {
    expect(diarioDe({ tareas: [tarea({ fin: AHORA - 2 * dia })], atlas: null, desde: AHORA - dia, ahora: AHORA })).toEqual([])
  })
})
