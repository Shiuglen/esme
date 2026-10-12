import { describe, it, expect } from 'vitest'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { abrirSesionACP, type EventoMotor } from './sesion-acp'

const FALSO = fileURLToPath(new URL('./fixtures/agente-falso.mjs', import.meta.url))
const base = (extra: Record<string, unknown> = {}) => {
  const eventos: EventoMotor[] = []
  const permisos: unknown[] = []
  return { eventos, permisos, o: { comando: process.execPath, args: [FALSO], cwd: process.cwd(), alEvento: (e: EventoMotor) => { eventos.push(e) },
    alPedirPermiso: async (p: unknown) => { permisos.push(p); return 'si' }, ...extra } }
}

describe('abrirSesionACP', () => {
  it('traduce texto, pensamiento, plan, herramienta con diff y devuelve la respuesta del permiso al agente', async () => {
    const { eventos, permisos, o } = base()
    const s = await abrirSesionACP(o)
    expect(await s.preguntar('hola')).toBe('end_turn')
    s.cerrar()
    expect(eventos).toContainEqual({ tipo: 'pensamiento', texto: 'pienso' })
    expect(eventos).toContainEqual({ tipo: 'plan', pasos: [{ texto: 'paso uno', estado: 'pending' }] })
    expect(eventos).toContainEqual({ tipo: 'herramienta', id: 't1', titulo: 'Editar a.txt', estado: 'in_progress', diff: [{ ruta: '/a.txt', antes: 'viejo', despues: 'nuevo' }] })
    expect(eventos.some((e) => e.tipo === 'herramienta' && e.id === 't1' && e.estado === 'completed')).toBe(true)
    const texto = eventos.filter((e) => e.tipo === 'texto').map((e) => (e as { texto: string }).texto).join('')
    expect(texto).toBe('hola permiso:si')
    expect(permisos).toEqual([{ titulo: 'Editar a.txt', opciones: [{ id: 'si', nombre: 'Permitir', tipo: 'allow_once' }, { id: 'no', nombre: 'Rechazar', tipo: 'reject_once' }] }])
  })
  it('si el usuario cancela el permiso, el agente recibe cancelled', async () => {
    const { eventos, o } = base({ alPedirPermiso: async () => 'cancelar' })
    const s = await abrirSesionACP(o)
    await s.preguntar('hola')
    s.cerrar()
    expect(eventos.filter((e) => e.tipo === 'texto').map((e) => (e as { texto: string }).texto).join('')).toContain('permiso:cancelado')
  })
  it('pasa la mente de Esme por HTTP solo si el agente la acepta', async () => {
    const mcp = { nombre: 'esme', url: 'http://127.0.0.1:9/mcp', token: 'tok' }
    const a = base({ mcp }); const sa = await abrirSesionACP(a.o)
    await sa.preguntar('mcp'); sa.cerrar()
    const recibido = JSON.parse((a.eventos.find((e) => e.tipo === 'texto') as { texto: string }).texto)
    expect(recibido).toEqual([{ type: 'http', name: 'esme', url: mcp.url, headers: [{ name: 'Authorization', value: 'Bearer tok' }] }])
    const b = base({ mcp, env: { FALSO_SIN_HTTP: '1' } }); const sb = await abrirSesionACP(b.o)
    await sb.preguntar('mcp'); sb.cerrar()
    expect(JSON.parse((b.eventos.find((e) => e.tipo === 'texto') as { texto: string }).texto)).toEqual([])
  })
  it('si el agente muere a mitad, preguntar rechaza con error claro y no deja procesos colgados', async () => {
    let pid = 0
    const lanzar = ((...a: Parameters<typeof spawn>) => { const c = spawn(...a); pid = c.pid!; return c }) as typeof spawn
    const { o } = base({ lanzar })
    const s = await abrirSesionACP(o)
    await expect(s.preguntar('morir')).rejects.toThrow(/motor.*(terminó|murió|cerró)/i)
    await expect(s.preguntar('hola')).rejects.toThrow(/motor/i)
    await new Promise((r) => setTimeout(r, 50))
    expect(() => process.kill(pid, 0)).toThrow()
  })
  it('cerrar mata el proceso', async () => {
    let pid = 0
    const lanzar = ((...a: Parameters<typeof spawn>) => { const c = spawn(...a); pid = c.pid!; return c }) as typeof spawn
    const { o } = base({ lanzar })
    const s = await abrirSesionACP(o)
    s.cerrar()
    await new Promise((r) => setTimeout(r, 200))
    expect(() => process.kill(pid, 0)).toThrow()
  })
  it('falla con mensaje claro si el binario no existe', async () => {
    const { o } = base({ comando: '/no/existe/motor' })
    await expect(abrirSesionACP(o)).rejects.toThrow(/motor/i)
  })
  it('traduce usage_update a contexto y la usage del prompt a uso', async () => {
    const { eventos, o } = base()
    const s = await abrirSesionACP(o)
    expect(await s.preguntar('uso')).toBe('end_turn')
    s.cerrar()
    expect(eventos).toContainEqual({ tipo: 'herramienta', id: 't2', titulo: 'Ejecutar ls', estado: 'pending', clase: 'execute' })
    expect(eventos).toContainEqual({ tipo: 'contexto', usado: 1200, total: 200000, coste: { cantidad: 0.0123, moneda: 'USD' } })
    expect(eventos).toContainEqual({ tipo: 'uso', entrada: 100, salida: 50, pensamiento: 7, cacheLectura: 30, cacheEscritura: 5 })
    const sinOpciones = eventos.filter((e) => e.tipo !== 'opciones')
    expect(sinOpciones.findIndex((e) => e.tipo === 'uso')).toBe(sinOpciones.length - 1)
  })
  it('un tool_call_update solo con estado no trae título', async () => {
    const { eventos, o } = base()
    const s = await abrirSesionACP(o)
    await s.preguntar('hola')
    s.cerrar()
    const act = eventos.find((e) => e.tipo === 'herramienta' && e.id === 't1' && e.estado === 'completed')!
    expect(act).toEqual({ tipo: 'herramienta', id: 't1', estado: 'completed' })
    expect('titulo' in act).toBe(false)
  })
  it('traduce configOptions y config_option_update a opciones', async () => {
    const { eventos, o } = base()
    const s = await abrirSesionACP(o)
    await new Promise((r) => setTimeout(r, 150))
    s.cerrar()
    const op = { id: 'model', nombre: 'Modelo', actual: 'lento', valores: [{ id: 'lento', nombre: 'Lento' }, { id: 'rapido', nombre: 'Rápido', descripcion: 'Responde antes' }] }
    expect(eventos.filter((e) => e.tipo === 'opciones')).toEqual([{ tipo: 'opciones', opciones: [op] }, { tipo: 'opciones', opciones: [op] }])
  })
  it('la config deseada se aplica antes de preguntar aunque el motor la cambie al abrir', async () => {
    const { eventos, o } = base({ config: { model: 'rapido' } })
    const s = await abrirSesionACP(o)
    await new Promise((r) => setTimeout(r, 150))   // el motor ya ha pisado el modelo
    await s.preguntar('modelo')
    s.cerrar()
    expect(eventos.filter((e) => e.tipo === 'texto').map((e) => (e as { texto: string }).texto).join('')).toBe('rapido')
  })
  it('preguntando nada más abrir, el modelo elegido gana al que el motor pone después', async () => {
    const { eventos, o } = base({ config: { model: 'rapido' } })
    const s = await abrirSesionACP(o)
    await s.preguntar('modelo-tarde')
    s.cerrar()
    expect(eventos.filter((e) => e.tipo === 'texto').map((e) => (e as { texto: string }).texto).join('')).toBe('rapido')
  })
  it('una opción desconocida o con valor inválido se ignora sin fallar', async () => {
    const { eventos, o } = base({ config: { model: 'inexistente', otra: 'x' } })
    const s = await abrirSesionACP(o)
    await s.preguntar('modelo')
    s.cerrar()
    expect(eventos.filter((e) => e.tipo === 'fallo')).toEqual([])
    expect(eventos.filter((e) => e.tipo === 'texto').map((e) => (e as { texto: string }).texto).join('')).toBe('lento')
  })
  it('configurar cambia el modelo de una sesión viva', async () => {
    const { eventos, o } = base()
    const s = await abrirSesionACP(o)
    await new Promise((r) => setTimeout(r, 150))
    await s.configurar('model', 'rapido')
    expect(eventos.filter((e) => e.tipo === 'opciones').at(-1)).toMatchObject({ opciones: [{ id: 'model', actual: 'rapido' }] })
    await s.preguntar('modelo')
    s.cerrar()
    expect(eventos.filter((e) => e.tipo === 'texto').map((e) => (e as { texto: string }).texto).join('')).toBe('rapido')
  })
})
