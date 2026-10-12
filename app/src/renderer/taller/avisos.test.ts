import { describe, expect, it } from 'vitest'
import type { TareaTaller } from '../lib/bridge'
import { avisosDe } from './avisos'

const t = (p: Partial<TareaTaller>): TareaTaller => ({
  id: 'aaaaaaaa', titulo: 'Arregla el login', texto: '', motor: 'opencode', motorNombre: 'OpenCode', carpeta: null, estado: 'trabajando', copia: null,
  inicio: 0, turnos: 0, herramientas: 0, cambios: null, uso: { entrada: 0, salida: 0, pensamiento: 0 }, permiso: null, actividad: [], actividadMs: 0,
  opciones: [], modelo: null, ...p,
} as TareaTaller)

describe('avisosDe', () => {
  it('avisa cuando una tarea termina, con sus cambios', () => {
    expect(avisosDe(t({}), t({ estado: 'lista', cambios: { ficheros: 2, mas: 10, menos: 3, lista: [] } })))
      .toEqual([{ tipo: 'lista', id: 'aaaaaaaa', texto: 'OpenCode terminó «Arregla el login»', detalle: '2 ficheros, +10 −3' }])
  })
  it('avisa cuando pide permiso, una sola vez por permiso', () => {
    const p = { titulo: 'Ejecutar npm test', opciones: [] }
    expect(avisosDe(t({}), t({ estado: 'esperando', permiso: p }))).toEqual([{ tipo: 'permiso', id: 'aaaaaaaa', texto: 'OpenCode te pide permiso', detalle: 'Ejecutar npm test' }])
    expect(avisosDe(t({ estado: 'esperando', permiso: p }), t({ estado: 'esperando', permiso: p }))).toEqual([])
  })
  it('avisa de un error con su explicación', () => {
    expect(avisosDe(t({}), t({ estado: 'error', error: 'Authentication required' }))[0]).toMatchObject({ tipo: 'error', texto: 'OpenCode no pudo con «Arregla el login»', detalle: 'OpenCode necesita que inicies sesión' })
  })
  it('sin cambio de estado, o parada por ti, no avisa', () => {
    expect(avisosDe(t({}), t({ herramientas: 3 }))).toEqual([])
    expect(avisosDe(t({}), t({ estado: 'parada' }))).toEqual([])
    expect(avisosDe(undefined, t({ estado: 'lista' }))).toEqual([])   // lo que ya estaba al abrir la app no se anuncia
  })
})
