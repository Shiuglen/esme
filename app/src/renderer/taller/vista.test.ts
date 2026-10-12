import { describe, expect, it } from 'vitest'
import type { TareaTaller } from '../lib/bridge'
import { actividadAhora, duracion, explicarError, motivoFin, ordenPlanta, silencioMs, textoCambios } from './vista'

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
