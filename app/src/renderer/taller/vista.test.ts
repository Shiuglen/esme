import { describe, expect, it } from 'vitest'
import type { TareaTaller } from '../lib/bridge'
import { actividadAhora, archivable, barrasDe, duracion, explicarError, listosPara, motivoFin, ordenPlanta, silencioMs, textoCambios } from './vista'

const tarea = (p: Partial<TareaTaller>): TareaTaller => ({
  id: 'aaaaaaaa', titulo: 't', texto: 't', motor: 'opencode', motorNombre: 'OpenCode', carpeta: null, estado: 'lista', copia: null,
  inicio: 0, turnos: 1, herramientas: 0, cambios: null, uso: { entrada: 0, salida: 0, pensamiento: 0 }, permiso: null,
  actividad: new Array(40).fill(0), actividadMs: 1500, ...p,
} as TareaTaller)

describe('duracion', () => {
  it('minutos y segundos, y horas cuando hacen falta', () => {
    expect(duracion(42_000)).toBe('0:42')
    expect(duracion(725_000)).toBe('12:05')
    expect(duracion(3_725_000)).toBe('1:02:05')
    expect(duracion(-5)).toBe('0:00')
  })
})

describe('ordenPlanta', () => {
  it('primero lo que está en marcha, luego lo más reciente; ocho como mucho', () => {
    const ts = [
      tarea({ id: 'vieja000', inicio: 1, estado: 'lista' }),
      tarea({ id: 'activa00', inicio: 2, estado: 'trabajando' }),
      tarea({ id: 'nueva000', inicio: 3, estado: 'lista' }),
      tarea({ id: 'espera00', inicio: 0, estado: 'esperando' }),
    ]
    expect(ordenPlanta(ts)).toEqual(['activa00', 'espera00', 'nueva000', 'vieja000'])
    expect(ordenPlanta(Array.from({ length: 12 }, (_, i) => tarea({ id: `t${i}aaaaaa`, inicio: i })))).toHaveLength(8)
  })
})

describe('actividadAhora', () => {
  it('desplaza la micrográfica de una tarea en marcha aunque no lleguen eventos', () => {
    const a = new Array(40).fill(0); a[39] = 5
    const t = tarea({ estado: 'trabajando', actividad: a, actividadMs: 15_000 })
    expect(actividadAhora(t, 14_000)).toEqual(a)
    const desplazada = actividadAhora(t, 18_100)            // 3,1 s después: tres cubos más (15,0 · 16,5 · 18,0 s)
    expect(desplazada.slice(-4)).toEqual([5, 0, 0, 0])
    expect(desplazada).toHaveLength(40)
  })
  it('una tarea terminada conserva la forma de su trabajo', () => {
    const a = new Array(40).fill(1)
    expect(actividadAhora(tarea({ estado: 'lista', actividad: a, actividadMs: 1500 }), 999_999)).toEqual(a)
  })
})

describe('silencioMs', () => {
  it('cuánto lleva un motor en marcha sin dar señales', () => {
    expect(silencioMs(tarea({ estado: 'trabajando', actividadMs: 15_000 }), 50_000)).toBe(36_500)
    expect(silencioMs(tarea({ estado: 'lista', actividadMs: 15_000 }), 50_000)).toBeNull()
    expect(silencioMs(tarea({ estado: 'esperando', actividadMs: 15_000 }), 50_000)).toBeNull()
    expect(silencioMs(tarea({ estado: 'trabajando', actividadMs: 15_000 }), 50_000, 45_000)).toBe(5_000)   // turno nuevo: cuenta desde que empezó
  })
})

describe('textos', () => {
  it('cambios y motivo de fin en palabras', () => {
    expect(textoCambios({ ficheros: 3, mas: 120, menos: 8, lista: [] })).toBe('+120 −8')
    expect(textoCambios({ ficheros: 0, mas: 0, menos: 0, lista: [] })).toBe('Sin cambios')
    expect(textoCambios(null)).toBeNull()
    expect(motivoFin('end_turn')).toBe('Terminó')
    expect(motivoFin('cancelled')).toBe('La paraste')
    expect(motivoFin('rarisimo')).toBe('Terminó (rarisimo)')
  })
})

describe('explicarError', () => {
  it('falta de sesión: dice qué hacer, con la orden del motor', () => {
    const e = explicarError('Authentication required: provider authentication required', 'OpenCode', 'Ejecuta `opencode auth login` y elige tu proveedor o suscripción.')
    expect(e).toEqual({ tipo: 'sesion', titulo: 'OpenCode necesita que inicies sesión', consejo: 'Ejecuta `opencode auth login` y elige tu proveedor o suscripción.' })
  })
  it('modelo retirado o caído: propone elegir otro', () => {
    expect(explicarError('Internal error: Model exo-free has been deprecated.', 'OpenCode', '')?.tipo).toBe('modelo')
    expect(explicarError('Upstream request failed: Model is unavailable.', 'OpenCode', '')).toMatchObject({ tipo: 'modelo', titulo: 'Ese modelo no está disponible' })
  })
  it('otro error: sin explicación especial', () => expect(explicarError('ENOENT', 'OpenCode', '')).toBeNull())
})

describe('explicarError: límites', () => {
  it('el límite de peticiones se explica aparte (no es culpa del modelo)', () => {
    expect(explicarError('Internal error: Rate limit exceeded. Please try again later.', 'OpenCode', '')).toMatchObject({ tipo: 'limite', titulo: 'El proveedor ha limitado las peticiones' })
  })
})

describe('barrasDe — el código de barras del turno', () => {
  it('conserva los picos al muestrear: sigue habiendo una píldora alta donde la ráfaga vivió', () => {
    const cubos = new Array(40).fill(0)
    cubos[12] = 9; cubos[13] = 3; cubos[30] = 5
    const barras = barrasDe(cubos, 14)
    expect(barras).toHaveLength(14)
    expect(Math.max(...barras)).toBe(9)   // el pico no se difumina
    expect(barras.some((v) => v === 5)).toBe(true)
    expect(barras.filter((v) => v === 0).length).toBeGreaterThan(6)
  })
})

describe('explicarError — los muertos hablan humano', () => {
  it('el Internal error del ACP se traduce y enseña el camino de la reencarnación', () => {
    const x = explicarError('Internal error', 'Qwen Code', '')
    expect(x?.tipo).toBe('motor')
    expect(x?.titulo).toContain('se cayó')
    expect(x?.consejo).toContain('reencarna')
  })
  it('red rota y tiempos muertos: familia motor con consejo propio', () => {
    expect(explicarError('connect ECONNREFUSED 127.0.0.1:8019', '', '')?.tipo).toBe('motor')
    expect(explicarError('Operation timed out after 30000 ms', '', '')?.titulo).toContain('sin tiempo')
    expect(explicarError('TypeError: undefined is not a function', '', 'x')).toBe(null)
  })

  it('un motor que se quedó mudo se explica: se le dio por muerto y el trabajo quedó en la copia', () => {
    const e = explicarError('El motor dejó de responder (40 min sin señales).', 'OpenCode', '')
    expect(e?.tipo).toBe('motor')
    expect(e?.titulo).toContain('mudo')
    expect(e?.consejo).toContain('copia')
  })
  it('la negativa no es un fallo técnico: conduce a los que sí pueden, no a reintentar', () => {
    const x = explicarError('OpenCode se negó a hacer el encargo', 'OpenCode', '')
    expect(x?.tipo).toBe('negativa')
    expect(x?.titulo).toBe('OpenCode se negó')
    expect(x?.consejo).toContain('los que sí pueden')
    expect(x?.consejo).not.toContain('reintentar')
  })
})

describe('archivar lo viejo', () => {
  const DIA = 864e5, ahora = 10 * DIA
  const t = (estado: string, fin: number, extra = {}) => ({ id: 'x', estado, inicio: fin - 1000, fin, ...extra }) as never
  it('un error o una parada de hace más de un día se archiva; lo reciente y lo vivo no', () => {
    expect(archivable(t('error', ahora - 2 * DIA), ahora)).toBe(true)
    expect(archivable(t('parada', ahora - 2 * DIA), ahora)).toBe(true)
    expect(archivable(t('error', ahora - 3600_000), ahora)).toBe(false)
    expect(archivable(t('trabajando', ahora - 5 * DIA), ahora)).toBe(false)
    expect(archivable(t('lista', ahora - 2 * DIA), ahora)).toBe(false)
  })
  it('una tarea lista de hace más de tres días también se archiva (no se borra: sigue en «archivadas»)', () => {
    expect(archivable(t('lista', ahora - 4 * DIA), ahora)).toBe(true)
    expect(archivable(t('lista', ahora - 4 * DIA, { aplicada: { cuando: ahora - 4 * DIA } }), ahora)).toBe(true)
    expect(archivable(t('esperando', ahora - 9 * DIA), ahora)).toBe(false)
  })
})

describe('la sesión pedida con otras palabras', () => {
  it('«authMethods» (el motor ofrece formas de entrar) también es pedir que inicies sesión', () => {
    expect(explicarError('La sesión del motor está cerrada. Su última palabra: «data: { authMethods: [ [Object] ] }»', 'Qwen Code', '')?.tipo).toBe('sesion')
  })
})

describe('el radar del error — listosPara', () => {
  const motores = [
    { id: 'opencode', instalado: true },
    { id: 'gemini', instalado: true },
    { id: 'claude', instalado: true },
    { id: 'qwen', instalado: false },
  ] as { id: string; instalado: boolean }[]
  const noListos = new Map([['claude', 'no ha entrado nadie']])
  it('cuenta los motores instalados, distintos al caído y listos', () => {
    expect(listosPara('opencode', motores, noListos)).toBe(1)   // gemini sí; claude no está listo; qwen sin instalar
    expect(listosPara('claude', motores, noListos)).toBe(2)     // opencode y gemini
  })
  it('nadie instalado y listo: 0 (la fila dirá «Ninguno»)', () => {
    expect(listosPara('opencode', motores, new Map([['gemini', 'x'], ['claude', 'y']]))).toBe(0)
    expect(listosPara('opencode', [], new Map())).toBe(0)
  })
})
