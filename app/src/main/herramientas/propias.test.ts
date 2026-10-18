import { describe, it, expect, vi } from 'vitest'
import { cuandoDeHerramienta, herramientasPropias, type Manos } from './propias'
import { Conocidas } from './permisos'

const opts = { toolCallId: 'l1', messages: [], abortSignal: new AbortController().signal }
function manos(x: Partial<Manos> = {}): Manos & { pasos: unknown[] } {
  const pasos: unknown[] = []
  return {
    pasos,
    buscarMemoria: vi.fn(async () => [{ texto: 'te gusta el navy', tema: 'gustos' }]),
    verEquipo: vi.fn(() => [{ titulo: 'tests', estado: 'trabajando', agente: 'Qwen Code' }]),
    encargar: vi.fn(async () => ({ id: 'abc123', titulo: 'haz X', agente: 'OpenCode' })),
    programar: vi.fn(() => ({ ok: true as const })),
    forjar: vi.fn(async () => ({ tarea: 't1', herramienta: 'divisas', agente: 'OpenCode', siguiente: 'revisa' })),
    buscarWeb: vi.fn(async () => ({ fuente: 'Wikipedia', resultados: [{ titulo: 'Ada', url: 'https://es.wikipedia.org/wiki/Ada', resumen: 'r' }] })),
    leerWeb: vi.fn(async () => ({ titulo: 'T', texto: 'cuerpo', url: 'https://es.wikipedia.org/wiki/Ada' })),
    preguntar: vi.fn(async () => 'una' as const),
    politicas: {}, guardarPolitica: vi.fn(),
    conocidas: new Conocidas(),
    alPaso: (p) => pasos.push(p),
    ...x,
  }
}
const ejecutar = (h: Record<string, { execute?: (a: never, o: never) => unknown }>, n: string, a: unknown) => h[n].execute!(a as never, opts as never)

describe('las herramientas propias de Esme', () => {
  it('mirar no pregunta y cuenta el paso', async () => {
    const m = manos(); const h = herramientasPropias(m)
    expect(await ejecutar(h, 'buscar_en_memoria', { consulta: 'colores' })).toEqual([{ texto: 'te gusta el navy', tema: 'gustos' }])
    expect(m.preguntar).not.toHaveBeenCalled()
    expect(m.pasos).toEqual([{ fase: 'llama', id: 'l1', nombre: 'buscar_en_memoria', args: { consulta: 'colores' } }, expect.objectContaining({ fase: 'resultado', id: 'l1' })])
  })
  it('encargar al equipo pregunta; con «no», no se hace nada y el modelo lo sabe', async () => {
    const m = manos({ preguntar: vi.fn(async () => 'no' as const) }); const h = herramientasPropias(m)
    expect(await ejecutar(h, 'encargar_al_equipo', { encargo: 'arregla los tests' })).toMatch(/no dio permiso/i)
    expect(m.encargar).not.toHaveBeenCalled()
  })
  it('con «siempre», se hace y se recuerda para la próxima', async () => {
    const m = manos({ preguntar: vi.fn(async () => 'siempre' as const) }); const h = herramientasPropias(m)
    expect(await ejecutar(h, 'encargar_al_equipo', { encargo: 'arregla los tests' })).toMatchObject({ id: 'abc123' })
    expect(m.guardarPolitica).toHaveBeenCalledWith('encargar_al_equipo', 'siempre')
  })
  it('lo que sale de una búsqueda queda como dirección conocida (leerla después no pregunta)', async () => {
    const m = manos(); const h = herramientasPropias(m)
    await ejecutar(h, 'buscar_en_internet', { consulta: 'Ada Lovelace' })
    await ejecutar(h, 'leer_web', { url: 'https://es.wikipedia.org/wiki/Ada' })
    expect(m.preguntar).not.toHaveBeenCalled()
  })
  it('si una herramienta falla, el modelo recibe el porqué en vez de romper la conversación', async () => {
    const m = manos({ buscarWeb: vi.fn(async () => { throw new Error('sin red') }) }); const h = herramientasPropias(m)
    expect(await ejecutar(h, 'buscar_en_internet', { consulta: 'x' })).toMatch(/sin red/)
    expect(m.pasos.at(-1)).toMatchObject({ fase: 'error', id: 'l1' })
  })
})

describe('la Forja desde la conversación', () => {
  it('forjar una herramienta pide permiso y encarga al equipo lo que falta', async () => {
    const m = manos(); const h = herramientasPropias(m)
    const args = { necesidad: 'convertir divisas con el cambio del BCE', nombre: 'divisas' }
    expect(await ejecutar(h, 'forjar_herramienta', args)).toMatchObject({ herramienta: 'divisas' })
    expect(m.preguntar).toHaveBeenCalledWith('forjar_herramienta', args, 'l1')
    expect(m.forjar).toHaveBeenCalledWith('convertir divisas con el cambio del BCE', { nombre: 'divisas' })
  })
})

describe('cuándo, dicho por el modelo', () => {
  const SAB_2230 = new Date(2026, 9, 17, 22, 30).getTime()
  it('esta noche, mañana, cada día y dentro de unos minutos', () => {
    expect(cuandoDeHerramienta({ momento: 'esta_noche' }, SAB_2230)).toEqual({ tipo: 'una', ms: new Date(2026, 9, 18, 3, 0).getTime() })
    expect(cuandoDeHerramienta({ momento: 'manana' }, SAB_2230)).toEqual({ tipo: 'una', ms: new Date(2026, 9, 18, 9, 0).getTime() })
    expect(cuandoDeHerramienta({ momento: 'cada_dia', hora: '07:30', laborables: true }, SAB_2230)).toEqual({ tipo: 'diaria', hora: 7, minuto: 30, dias: [1, 2, 3, 4, 5] })
    expect(cuandoDeHerramienta({ momento: 'en_minutos', minutos: 45 }, SAB_2230)).toEqual({ tipo: 'una', ms: SAB_2230 + 45 * 60_000 })
    expect(cuandoDeHerramienta({ momento: 'cada_dia', hora: '25:00' }, SAB_2230)).toBeNull()
  })
})
