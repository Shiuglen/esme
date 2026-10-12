import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdtemp, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Taller, type AbrirSesion, type MotorElegido, type OperacionesCopia, type SesionMotor, type Tarea } from './taller'
import type { EventoMotor } from '../motores/sesion-acp'
import type { Cambios } from './copias'

const FALSO = fileURLToPath(new URL('../motores/fixtures/agente-falso.mjs', import.meta.url))
const motor: MotorElegido = { id: 'falso', nombre: 'Falso', comando: 'falso', args: ['acp'] }
const CAMBIOS: Cambios = { ficheros: 1, mas: 3, menos: 1, lista: [{ ruta: 'a.txt', mas: 3, menos: 1, binario: false }] }

let dir = ''
let emisiones: { canal: string; dato: any }[] = []
let t: Taller | null = null
let reloj = 1000

const copiasFalsas = () => {
  const quitar = vi.fn(async () => {})
  const ops: OperacionesCopia = {
    crear: vi.fn(async (o: { id: string; dirCopias: string }) => ({ id: o.id, ruta: join(o.dirCopias, o.id), rama: `esme/${o.id}`, base: 'b', repo: '/r' })) as any,
    cambios: vi.fn(async () => CAMBIOS), diff: vi.fn(async () => ({ texto: 'diff', truncado: false })), quitar,
  }
  return { ops, quitar }
}
type Guion = (o: Parameters<AbrirSesion>[0], texto: string, n: number) => Promise<string>
const sesiones = (guion: Guion) => {
  const cancelar = vi.fn(async () => {})
  const cerrar = vi.fn()
  let n = 0
  const abrir = vi.fn<AbrirSesion>(async (o) => ({ preguntar: (texto) => guion(o, texto, n++), cancelar, cerrar } satisfies SesionMotor))
  return { abrir, cancelar, cerrar }
}
const crear = (abrirSesion: AbrirSesion, ops = copiasFalsas().ops, extra: object = {}) => {
  t = new Taller({ dir, emitir: (canal, dato) => { emisiones.push({ canal, dato }) }, abrirSesion, copias: ops, ahora: () => reloj,
    mcp: () => ({ nombre: 'esme', url: 'http://x/mcp', token: 'tok' }), ...extra })
  return t
}
const estados = () => emisiones.filter((e) => e.canal === 'cambio').map((e) => (e.dato as Tarea).estado)
const esperar = (id: string, estado: string) => vi.waitFor(() => expect(t!.lista().find((x) => x.id === id)?.estado).toBe(estado), { timeout: 3000 })

beforeEach(async () => { dir = await mkdtemp(join(tmpdir(), 'esme-taller-')); emisiones = []; reloj = 1000 })
afterEach(async () => { t?.cerrarTodo(); t = null; await rm(dir, { recursive: true, force: true }) })

describe('Taller', () => {
  it('una tarea pasa de preparando a trabajando y a lista, con turnos, fin y cambios', async () => {
    const { ops } = copiasFalsas()
    const s = sesiones(async (o) => { o.alEvento({ tipo: 'texto', texto: 'hola' }); return 'end_turn' })
    const tarea = crear(s.abrir, ops).crear({ motor, carpeta: '/proyecto', texto: '  \nArregla el bug\nmás detalle' })
    expect(tarea.estado).toBe('preparando')
    expect(tarea.id).toMatch(/^[a-z0-9]{8}$/)
    expect(tarea.titulo).toBe('Arregla el bug')
    await esperar(tarea.id, 'lista')
    const f = t!.lista()[0]
    expect(f).toMatchObject({ turnos: 1, cambios: CAMBIOS, motor: 'falso', motorNombre: 'Falso' })
    expect(f.fin).toBeDefined()
    const seq = estados()
    expect(seq.indexOf('preparando')).toBeLessThan(seq.indexOf('trabajando'))
    expect(seq.indexOf('trabajando')).toBeLessThan(seq.indexOf('lista'))
    expect(ops.crear).toHaveBeenCalledWith(expect.objectContaining({ carpeta: '/proyecto', id: tarea.id, dirCopias: join(dir, 'copias') }))
    expect(s.abrir).toHaveBeenCalledWith(expect.objectContaining({ comando: 'falso', args: ['acp'], cwd: join(dir, 'copias', tarea.id), mcp: { nombre: 'esme', url: 'http://x/mcp', token: 'tok' } }))
    const ev = await t!.eventos(tarea.id)
    expect(ev[0]).toEqual({ tipo: 'usuario', texto: '  \nArregla el bug\nmás detalle' })
    expect(ev[1]).toEqual({ tipo: 'texto', texto: 'hola' })
    expect(ev.at(-1)).toMatchObject({ tipo: 'fin', motivo: 'end_turn' })
    expect(emisiones.filter((e) => e.canal === 'evento').map((e) => e.dato.evento.tipo)).toEqual(['usuario', 'texto', 'fin'])
    expect(emisiones.filter((e) => e.canal === 'evento').map((e) => e.dato.n)).toEqual([0, 1, 2])
    expect(emisiones.filter((e) => e.canal === 'evento').every((e) => e.dato.id === tarea.id)).toBe(true)
  })

  it('cuenta herramientas distintas, primera respuesta y uso acumulado', async () => {
    const s = sesiones(async (o) => {
      reloj = 1250
      const e = (x: EventoMotor) => o.alEvento(x)
      e({ tipo: 'texto', texto: 'a' })
      e({ tipo: 'herramienta', id: 't1', titulo: 'x' }); e({ tipo: 'herramienta', id: 't1', estado: 'completed' }); e({ tipo: 'herramienta', id: 't2' })
      e({ tipo: 'uso', entrada: 10, salida: 5, pensamiento: 2 }); e({ tipo: 'uso', entrada: 4, salida: 1 })
      e({ tipo: 'contexto', usado: 100, total: 1000, coste: { cantidad: 0.5, moneda: 'USD' } })
      e({ tipo: 'contexto', usado: 200, total: 1000 })
      return 'end_turn'
    })
    const tarea = crear(s.abrir).crear({ motor, carpeta: null, texto: 'x' })
    await esperar(tarea.id, 'lista')
    const f = t!.lista()[0]
    expect(f.herramientas).toBe(2)
    expect(f.primeraRespuestaMs).toBe(250)
    expect(f.uso).toEqual({ entrada: 14, salida: 6, pensamiento: 2, contextoUsado: 200, contextoTotal: 1000, coste: { cantidad: 0.5, moneda: 'USD' } })
    expect(f.actividad).toHaveLength(40)
    expect(f.actividad[39]).toBe(8)   // los eventos de motor; usuario y fin no cuentan
  })

  it('un permiso pone la tarea en esperando y responder la devuelve a trabajando', async () => {
    let elegido = ''
    const s = sesiones(async (o) => { elegido = await o.alPedirPermiso({ titulo: 'Editar', opciones: [{ id: 'si', nombre: 'Sí', tipo: 'allow_once' }] }); return 'end_turn' })
    const tarea = crear(s.abrir).crear({ motor, carpeta: null, texto: 'x' })
    await esperar(tarea.id, 'esperando')
    expect(t!.lista()[0].permiso?.titulo).toBe('Editar')
    t!.responder(tarea.id, 'si')
    expect(t!.lista()[0]).toMatchObject({ estado: 'trabajando', permiso: null })
    await esperar(tarea.id, 'lista')
    expect(elegido).toBe('si')
  })

  it('parar con un permiso pendiente cancela el permiso y deja la tarea parada', async () => {
    let elegido = ''
    const s = sesiones(async (o) => { elegido = await o.alPedirPermiso({ titulo: 'Borrar', opciones: [] }); return elegido === 'cancelar' ? 'cancelled' : 'end_turn' })
    const tarea = crear(s.abrir).crear({ motor, carpeta: null, texto: 'x' })
    await esperar(tarea.id, 'esperando')
    await t!.parar(tarea.id)
    await esperar(tarea.id, 'parada')
    expect(elegido).toBe('cancelar')
    expect(s.cancelar).toHaveBeenCalled()
    expect(t!.lista()[0].permiso).toBeNull()
  })

  it('si el motor no arranca, la tarea queda en error con el mensaje', async () => {
    const tarea = crear(async () => { throw new Error('No se pudo lanzar el motor «falso»: ENOENT') }).crear({ motor, carpeta: null, texto: 'x' })
    await esperar(tarea.id, 'error')
    expect(t!.lista()[0]).toMatchObject({ error: 'No se pudo lanzar el motor «falso»: ENOENT' })
    expect(t!.lista()[0].fin).toBeDefined()
    expect((await t!.eventos(tarea.id)).at(-1)).toEqual({ tipo: 'fallo', mensaje: 'No se pudo lanzar el motor «falso»: ENOENT' })
  })

  it('si el motor muere a mitad, la tarea pasa a error y nunca se queda trabajando', async () => {
    const s = sesiones(async () => { throw new Error('El motor terminó inesperadamente (código 3).') })
    const tarea = crear(s.abrir).crear({ motor, carpeta: null, texto: 'x' })
    await esperar(tarea.id, 'error')
    expect(s.cerrar).toHaveBeenCalled()
  })

  it('seguir suma un turno y no se permite mientras trabaja', async () => {
    let soltar!: () => void
    const s = sesiones(async (_o, _x, n) => { if (n === 1) await new Promise<void>((r) => { soltar = r }); return 'end_turn' })
    const tarea = crear(s.abrir).crear({ motor, carpeta: null, texto: 'uno' })
    await esperar(tarea.id, 'lista')
    await t!.seguir(tarea.id, 'dos')
    await esperar(tarea.id, 'trabajando')
    expect(t!.lista()[0].fin).toBeUndefined()
    await expect(t!.seguir(tarea.id, 'tres')).rejects.toThrow('La tarea sigue trabajando.')
    soltar()
    await esperar(tarea.id, 'lista')
    expect(t!.lista()[0].turnos).toBe(2)
    expect(t!.lista()[0].fin).toBeDefined()
    expect(s.abrir).toHaveBeenCalledTimes(1)
    const usuarios = (await t!.eventos(tarea.id)).filter((e) => e.tipo === 'usuario')
    expect(usuarios).toEqual([{ tipo: 'usuario', texto: 'uno' }, { tipo: 'usuario', texto: 'dos' }])
  })

  it('seguir tras un error reabre la sesión en la misma copia con resolverMotor', async () => {
    let fallar = true
    const s = sesiones(async () => { if (fallar) { fallar = false; throw new Error('cayó') } return 'end_turn' })
    const resolverMotor = vi.fn(async () => motor)
    const tarea = crear(s.abrir, undefined, { resolverMotor }).crear({ motor, carpeta: null, texto: 'x' })
    await esperar(tarea.id, 'error')
    await t!.seguir(tarea.id, 'otra vez')
    await esperar(tarea.id, 'lista')
    expect(s.abrir).toHaveBeenCalledTimes(2)
    expect(t!.lista()[0].error).toBeUndefined()
  })

  it('descartar quita la copia, borra los eventos y avisa con quitada', async () => {
    const { ops, quitar } = copiasFalsas()
    const s = sesiones(async (o) => { o.alEvento({ tipo: 'texto', texto: 'x' }); return 'end_turn' })
    const tarea = crear(s.abrir, ops).crear({ motor, carpeta: null, texto: 'x' })
    await esperar(tarea.id, 'lista')
    await stat(join(dir, `${tarea.id}.jsonl`))
    await t!.descartar(tarea.id)
    expect(quitar).toHaveBeenCalledWith(expect.objectContaining({ id: tarea.id }), { dirCopias: join(dir, 'copias') })
    await expect(stat(join(dir, `${tarea.id}.jsonl`))).rejects.toThrow()
    expect(t!.lista()).toHaveLength(0)
    expect(emisiones).toContainEqual({ canal: 'quitada', dato: tarea.id })
  })

  it('si quitar la copia falla, descartar lanza y la tarea se queda', async () => {
    const { ops } = copiasFalsas()
    ops.quitar = vi.fn(async () => { throw new Error('no se pudo') })
    const s = sesiones(async () => 'end_turn')
    const tarea = crear(s.abrir, ops).crear({ motor, carpeta: null, texto: 'x' })
    await esperar(tarea.id, 'lista')
    await expect(t!.descartar(tarea.id)).rejects.toThrow('no se pudo')
    expect(t!.lista()).toHaveLength(1)
  })

  it('al recargar, lo que estaba en marcha queda parado y los eventos se leen del disco', async () => {
    const s = sesiones(async (o) => { o.alEvento({ tipo: 'texto', texto: 'medio' }); await o.alPedirPermiso({ titulo: 'P', opciones: [] }); return 'end_turn' })
    const a = crear(s.abrir)
    const tarea = a.crear({ motor, carpeta: null, texto: 'x' })
    await esperar(tarea.id, 'esperando')
    a.cerrarTodo()
    emisiones = []
    const b = new Taller({ dir, emitir: () => {}, copias: copiasFalsas().ops })
    t = b
    await b.cargar()
    expect(b.lista()[0]).toMatchObject({ id: tarea.id, estado: 'parada', permiso: null })
    expect(b.lista()[0].copia).not.toBeNull()
    const ev = await b.eventos(tarea.id)
    expect(ev).toEqual([{ tipo: 'usuario', texto: 'x' }, { tipo: 'texto', texto: 'medio' }])
  })

  it('integración: el agente falso trabaja de verdad en una carpeta nueva', async () => {
    const taller = new Taller({ dir, emitir: (canal, dato) => {
      emisiones.push({ canal, dato })
      const d = dato as Tarea
      if (canal === 'cambio' && d.estado === 'esperando') taller.responder(d.id, 'si')
    } })
    t = taller
    const tarea = taller.crear({ motor: { id: 'falso', nombre: 'Falso', comando: process.execPath, args: [FALSO] }, carpeta: null, texto: 'hola' })
    await esperar(tarea.id, 'lista')
    const f = taller.lista()[0]
    expect(f.turnos).toBe(1)
    expect(f.copia?.repo).toBeNull()
    expect(f.cambios).toMatchObject({ ficheros: 0 })
    const ev = await taller.eventos(tarea.id)
    expect(ev.filter((e) => e.tipo === 'texto').map((e) => (e as { texto: string }).texto).join('')).toBe('hola permiso:si')
    expect(ev.at(-1)).toMatchObject({ tipo: 'fin', motivo: 'end_turn' })
    await taller.descartar(tarea.id)
    await expect(stat(f.copia!.ruta)).rejects.toThrow()
  })
})

describe('Taller: hallazgos de la revisión', () => {
  it('parar mientras se prepara la copia no deja que el motor empiece', async () => {
    let soltar!: () => void
    const listo = new Promise<void>((r) => { soltar = r })
    const guion = vi.fn(async () => 'end_turn')
    const s = sesiones(guion)
    const abrir = vi.fn<AbrirSesion>(async (o) => { await listo; return s.abrir(o) })
    const tarea = crear(abrir).crear({ motor, carpeta: null, texto: 'x' })
    await t!.parar(tarea.id)
    soltar()
    await esperar(tarea.id, 'parada')
    expect(guion).not.toHaveBeenCalled()
    expect(t!.lista()[0].fin).toBeDefined()
  })

  it('descartar una tarea en marcha no la hace pasar por error', async () => {
    let romper!: (e: Error) => void
    const s = sesiones(() => new Promise<string>((_, rej) => { romper = rej }))
    s.cerrar.mockImplementation(() => romper(new Error('La sesión del motor está cerrada.')))
    const tarea = crear(s.abrir).crear({ motor, carpeta: null, texto: 'x' })
    await esperar(tarea.id, 'trabajando')
    await t!.descartar(tarea.id)
    await new Promise((r) => setTimeout(r, 20))
    expect(estados()).not.toContain('error')
    expect(emisiones.some((e) => e.canal === 'evento' && e.dato.evento.tipo === 'fallo')).toBe(false)
    expect(emisiones.at(-1)).toEqual({ canal: 'quitada', dato: tarea.id })
  })

  it('la actividad dice hasta cuándo llega, para que la interfaz la desplace aunque no haya eventos', async () => {
    reloj = 10_000
    const s = sesiones(async (o) => { o.alEvento({ tipo: 'texto', texto: 'a' }); reloj = 13_100; o.alEvento({ tipo: 'texto', texto: 'b' }); return 'end_turn' })
    const tarea = crear(s.abrir).crear({ motor, carpeta: null, texto: 'x' })
    expect(tarea.actividadMs).toBe(10_500)
    await esperar(tarea.id, 'lista')
    const f = t!.lista()[0]
    expect(f.actividadMs).toBe(13_500)
    expect(f.actividad.slice(-3)).toEqual([1, 0, 1])
  })
})
