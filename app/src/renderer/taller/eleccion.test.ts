import { describe, expect, it } from 'vitest'
import { candidatosDe, elegibles, elegir, elegirVarios, fallosDe, historial, semillado, type Candidato, noListos } from './eleccion'

const opcionModelo = (ids: string[], actual = ids[0]) => ({ id: 'model', nombre: 'Model', actual, valores: ids.map((id) => ({ id, nombre: `opencode/${id.split('/')[1]} Nombre` })) })
const motores = [{ id: 'opencode', nombre: 'OpenCode', instalado: true }, { id: 'cline', nombre: 'Cline', instalado: true }, { id: 'gemini', nombre: 'Gemini CLI', instalado: false }]

describe('candidatosDe', () => {
  it('un candidato por modelo de cada motor instalado que respondió, sin los modelos caídos', () => {
    const cs = candidatosDe(motores, { opencode: [opcionModelo(['opencode/a-free', 'opencode/b-free', 'opencode/c-pro'])], cline: [] }, ['opencode/b-free'])
    expect(cs.map((c) => c.modelo)).toEqual(['opencode/a-free', 'opencode/c-pro'])
    expect(cs.map((c) => c.gratis)).toEqual([true, false])
    expect(cs[0]).toMatchObject({ motor: 'opencode', motorNombre: 'OpenCode', modeloNombre: 'opencode/a-free Nombre' })
  })
})

const c = (modelo: string, gratis = true): Candidato => ({ motor: 'opencode', motorNombre: 'OpenCode', modelo, modeloNombre: `${modelo} N`, gratis })

describe('elegir', () => {
  it('aprende: el modelo que aplicas gana casi siempre al que descartas', () => {
    const vs = [...Array(6)].map(() => ({ motor: 'opencode', modelo: 'bueno N', exito: true })).concat([...Array(6)].map(() => ({ motor: 'opencode', modelo: 'malo', exito: false })))
    const azar = semillado(7)
    let buenos = 0
    for (let i = 0; i < 200; i++) if (elegir([c('bueno'), c('malo')], vs, { azar })!.modelo === 'bueno') buenos++
    expect(buenos).toBeGreaterThan(185)
  })
  it('explica por qué: con historial lo cuenta; sin historial, dice que lo prueba', () => {
    const vs = [{ motor: 'opencode', modelo: 'a', exito: true }, { motor: 'opencode', modelo: 'a', exito: false }]
    expect(elegir([c('a')], vs, { azar: semillado(1) })).toMatchObject({ aciertos: 1, total: 2, motivo: 'Acertó 1 de 2 veces' })
    expect(elegir([c('nuevo')], [], { azar: semillado(1) })).toMatchObject({ total: 0, motivo: 'Aún sin historial: Esme lo prueba' })
  })
  it('a igualdad, prefiere lo gratis', () => {
    const azar = semillado(3)
    let gratis = 0
    for (let i = 0; i < 200; i++) if (elegir([c('pago', false), c('libre')], [], { azar, preferirGratis: true })!.gratis) gratis++
    expect(gratis).toBeGreaterThan(110)
  })
  it('sin candidatos, nada', () => expect(elegir([], [], {})).toBeNull())
})

describe('elegirVarios', () => {
  it('elige n distintos para la arena', () => {
    const r = elegirVarios([c('a'), c('b'), c('c'), c('d')], [], 3, { azar: semillado(5) })
    expect(r).toHaveLength(3)
    expect(new Set(r.map((x) => x.modelo)).size).toBe(3)
    expect(elegirVarios([c('a')], [], 3, {})).toHaveLength(1)
  })
})

describe('elegibles', () => {
  it('en automático: los gratis, y los demás solo si ya te sirvieron alguna vez', () => {
    const vs = [{ motor: 'opencode', modelo: 'pago-bueno', exito: true }, { motor: 'opencode', modelo: 'local-malo', exito: false }]
    const r = elegibles([c('libre-free'), c('pago-bueno', false), c('local-malo', false), c('nunca', false)], vs)
    expect(r.map((x) => x.modelo)).toEqual(['libre-free', 'pago-bueno'])
  })
})

describe('qué motores no están listos (aprendido de lo que pasó)', () => {
  const t = (motor: string, inicio: number, estado: string, error?: string) => ({ id: `${motor}${inicio}`, motor, motorNombre: motor, inicio, estado, error }) as never
  it('si su último intento falló por la sesión o porque no existe, no está listo y se dice por qué', () => {
    const r = noListos([
      t('qwen', 1, 'lista'), t('qwen', 2, 'error', 'Authentication required: please log in'),
      t('pi', 1, 'error', "data: { code: 'ENOENT' }"),
      t('opencode', 1, 'error', 'Authentication required'), t('opencode', 2, 'lista'),
      t('cline', 1, 'error', 'Rate limit exceeded'),
      t('mudo', 1, 'error', 'El motor dejó de responder (40 min sin señales).'),
    ])
    expect(r.get('qwen')).toBe('Inicia sesión en qwen')
    expect(r.get('pi')).toBe('No se encuentra en este equipo')
    expect(r.get('mudo')).toBe('Se quedó mudo la última vez')
    expect(r.has('opencode')).toBe(false) // volvió a funcionar
    expect(r.has('cline')).toBe(false)    // un límite es pasajero, no es «no listo»
  })
})

describe('el router aprende de los fallos que ya sabemos', () => {
  const tarea = (parcial: Partial<Parameters<typeof fallosDe>[0][number]>) => ({
    id: 't1', motor: 'opencode', modelo: 'opencode/Exo Free', estado: 'error', error: 'Internal error', inicio: 1, ...parcial,
  }) as Parameters<typeof fallosDe>[0][number]

  it('cada tarea que acabó en error es un fallo de su modelo, aunque nadie lo etiquete', () => {
    const f = fallosDe([tarea({}), tarea({ id: 't2', modelo: 'opencode/Buen Free', estado: 'lista' })])
    expect(f).toHaveLength(1)
    expect(f[0]).toMatchObject({ motor: 'opencode', modelo: 'opencode/Exo Free', exito: false, error: 'Internal error', tarea: 't1' })
  })

  it('los fallos que no dicen qué modelo falló son del motor, no del modelo', () => {
    expect(fallosDe([tarea({ modelo: null })])).toEqual([])
  })

  it('el modelo que falla se elige menos: el router lo relega', () => {
    const candidatos = [c('roto'), c('sano')]
    const fallos = fallosDe([...Array(4)].map((_, i) => tarea({ id: `t${i}`, modelo: 'roto N', error: 'Internal error', inicio: i })))
    const azar = semillado(11)
    let sanas = 0
    for (let i = 0; i < 300; i++) if (elegir(candidatos, historial([], fallos), { azar })!.modelo === 'sano') sanas++
    expect(sanas).toBeGreaterThan(235)
  })

  it('lo dice con palabras: por qué no lo elige', () => {
    const fallos = fallosDe([tarea({ id: 't1', modelo: 'roto N', error: 'Internal error: Model exo-free has been deprecated.' })])
    const e = elegir([c('roto')], historial([], fallos), { azar: semillado(1) })!
    expect(e.fallos).toBe(1)
    expect(e.motivo).toBe('Acertó 0 de 1 veces · 1 acabó en error: Internal error: Model exo-free has been deprecated.')
  })

  it('una tarea fallida que además descartaste cuenta una vez, no dos', () => {
    const f = fallosDe([tarea({ id: 't1', modelo: 'roto N' })])
    const v = [{ motor: 'opencode', modelo: 'roto N', exito: false, tarea: 't1' }]
    expect(historial(v, f)).toHaveLength(1)
    expect(historial([{ motor: 'opencode', modelo: 'roto N', exito: false }], f)).toHaveLength(2)
  })
})
