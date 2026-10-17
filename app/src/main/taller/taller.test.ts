import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Taller, type AbrirSesion, type Anoto, type MotorElegido, type OperacionesCopia, type SesionMotor, type Tarea } from './taller'
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
    crear: vi.fn(async (o: { id: string; dirCopias: string; carpeta: string | null }) => ({ id: o.id, ruta: join(o.dirCopias, o.id), rama: o.carpeta === null ? null : `esme/${o.id}`, base: 'b', repo: o.carpeta === null ? null : '/r' })) as any,
    cambios: vi.fn(async () => CAMBIOS), diff: vi.fn(async () => ({ texto: 'diff', truncado: false })), quitar,
    parche: vi.fn(async () => 'PARCHE'), aplicar: vi.fn(async () => ({ ok: true as const })), commit: vi.fn(async () => 'abc1234'), exportar: vi.fn(async () => {}),
  }
  return { ops, quitar }
}
type Guion = (o: Parameters<AbrirSesion>[0], texto: string, n: number) => Promise<string>
const sesiones = (guion: Guion) => {
  const cancelar = vi.fn(async () => {})
  const cerrar = vi.fn()
  let n = 0
  const configurar = vi.fn(async (_id: string, _valor: string) => {})
  const abrir = vi.fn<AbrirSesion>(async (o) => ({ preguntar: (texto) => guion(o, texto, n++), cancelar, cerrar, configurar } satisfies SesionMotor))
  return { abrir, cancelar, cerrar, configurar }
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

  it('la tarea refleja opciones y modelo', async () => {
    const opcion = { id: 'model', nombre: 'Modelo', actual: 'b', valores: [{ id: 'a', nombre: 'Lento' }, { id: 'b', nombre: 'Rápido' }] }
    const s = sesiones(async (o) => { o.alEvento({ tipo: 'opciones', opciones: [opcion] }); return 'end_turn' })
    const tarea = crear(s.abrir).crear({ motor, carpeta: null, texto: 'x', config: { model: 'b' } })
    expect(tarea.opciones).toEqual([]); expect(tarea.modelo).toBeNull()
    await esperar(tarea.id, 'lista')
    expect(t!.lista()[0]).toMatchObject({ opciones: [opcion], modelo: 'Rápido' })
    expect(s.abrir).toHaveBeenCalledWith(expect.objectContaining({ config: { model: 'b' } }))
    expect(t!.lista()[0].actividad[39]).toBe(0)   // las opciones no son actividad del motor
  })

  it('configurar guarda la config de la tarea y la aplica a la sesión viva', async () => {
    let fallar = true
    const s = sesiones(async () => { if (fallar) { fallar = false; throw new Error('cayó') } return 'end_turn' })
    const resolverMotor = vi.fn(async () => motor)
    const tarea = crear(s.abrir, undefined, { resolverMotor }).crear({ motor, carpeta: null, texto: 'x' })
    await esperar(tarea.id, 'error')   // sin sesión viva: solo se guarda
    await t!.configurar(tarea.id, 'model', 'a')
    expect(s.configurar).not.toHaveBeenCalled()
    await t!.seguir(tarea.id, 'otra')
    await esperar(tarea.id, 'lista')
    expect(s.abrir).toHaveBeenLastCalledWith(expect.objectContaining({ config: { model: 'a' } }))
    await t!.configurar(tarea.id, 'model', 'b')   // ahora hay sesión viva
    expect(s.configurar).toHaveBeenCalledWith('model', 'b')
    await expect(t!.configurar('noexiste', 'model', 'b')).rejects.toThrow()
  })

  describe('llevar los cambios a casa', () => {
    let ctx: ReturnType<typeof copiasFalsas> & { s: ReturnType<typeof sesiones> }
    beforeEach(() => { ctx = { ...copiasFalsas(), s: sesiones(async (_o, texto) => { if (texto === 'fallo') throw new Error('x'); return 'end_turn' }) } })
    const lista = async (carpeta: string | null = '/proyecto', texto = 'Mi tarea') => {
      if (!t) crear(ctx.s.abrir, ctx.ops)
      const tarea = t!.crear({ motor, carpeta, texto })
      await esperar(tarea.id, texto === 'fallo' ? 'error' : 'lista')
      return { ops: ctx.ops, tarea }
    }

    it('aplicar guarda el parche, marca la tarea y anota un veredicto', async () => {
      const { ops, tarea } = await lista()
      expect(await t!.aplicar(tarea.id)).toEqual({ ok: true, ficheros: 1 })
      expect(ops.aplicar).toHaveBeenCalledWith('/r', 'PARCHE')
      expect(await readFile(join(dir, `${tarea.id}.aplicado.patch`), 'utf8')).toBe('PARCHE')
      expect(t!.lista()[0].aplicada).toEqual({ cuando: reloj, modo: 'carpeta', ficheros: 1 })
      expect(emisiones.filter((e) => e.canal === 'cambio').at(-1)!.dato.aplicada?.modo).toBe('carpeta')
      expect(await t!.veredictos()).toEqual([{ ts: reloj, motor: 'falso', modelo: null, exito: true }])
      expect(await t!.aplicar(tarea.id)).toEqual({ ok: false, error: 'Ya está aplicada.' })
    })

    it('aplicar se niega si la tarea está en marcha o en una carpeta nueva', async () => {
      const s = sesiones(() => new Promise<string>(() => {}))
      const enMarcha = crear(s.abrir, ctx.ops).crear({ motor, carpeta: '/p', texto: 'x' })
      await esperar(enMarcha.id, 'trabajando')
      expect(await t!.aplicar(enMarcha.id)).toEqual({ ok: false, error: 'Espera a que termine.' })
      t!.cerrarTodo(); t = null

      const nueva = await lista(null)
      expect(await t!.aplicar(nueva.tarea.id)).toEqual({ ok: false, error: 'Esta tarea está en una carpeta nueva: guárdala donde quieras.' })

      const vacia = await lista()
      ;(vacia.ops.parche as any).mockResolvedValueOnce('')
      expect(await t!.aplicar(vacia.tarea.id)).toEqual({ ok: false, error: 'No hay cambios que aplicar.' })

      const choca = await lista()
      ;(choca.ops.aplicar as any).mockResolvedValueOnce({ ok: false, ficheros: ['a.txt'], mensaje: 'x' })
      expect(await t!.aplicar(choca.tarea.id)).toEqual({ ok: false, error: 'Tu carpeta ha cambiado en esos ficheros: no se aplicó nada.', ficheros: ['a.txt'] })
      expect(t!.lista().find((x) => x.id === choca.tarea.id)!.aplicada).toBeUndefined()
      expect(await t!.veredictos()).toEqual([])
    })

    it('deshacer revierte y quita la marca', async () => {
      const { ops, tarea } = await lista()
      expect(await t!.deshacer(tarea.id)).toEqual({ ok: false, error: 'No hay nada que deshacer.' })
      await t!.aplicar(tarea.id)
      expect(await t!.deshacer(tarea.id)).toEqual({ ok: true })
      expect(ops.aplicar).toHaveBeenLastCalledWith('/r', 'PARCHE', { inverso: true })
      await expect(stat(join(dir, `${tarea.id}.aplicado.patch`))).rejects.toThrow()
      expect(t!.lista()[0].aplicada).toBeUndefined()
      expect(await t!.veredictos()).toHaveLength(1)   // el veredicto no se borra

      await t!.aplicar(tarea.id)
      ;(ops.aplicar as any).mockResolvedValueOnce({ ok: false, ficheros: ['a.txt'], mensaje: 'x' })
      const r = await t!.deshacer(tarea.id)
      expect(r).toMatchObject({ ok: false, ficheros: ['a.txt'] })
      expect(t!.lista()[0].aplicada?.modo).toBe('carpeta')
    })

    it('descartar sin aplicar anota un veredicto negativo', async () => {
      const a = await lista()
      await t!.descartar(a.tarea.id)
      expect(await t!.veredictos()).toEqual([{ ts: reloj, motor: 'falso', modelo: null, exito: false }])
      const b = await lista()
      await t!.aplicar(b.tarea.id)
      await t!.descartar(b.tarea.id)
      expect(await t!.veredictos()).toHaveLength(2)   // la aplicada solo suma su positivo
      expect((await t!.veredictos()).map((v) => v.exito)).toEqual([false, true])
      await expect(stat(join(dir, `${b.tarea.id}.aplicado.patch`))).rejects.toThrow()
      const fallida = await lista('/proyecto', 'fallo')
      await t!.descartar(fallida.tarea.id)
      expect(await t!.veredictos()).toHaveLength(2)   // sin turnos no hay veredicto
    })

    it('guardarEnRama y exportar marcan la tarea', async () => {
      const a = await lista()
      expect(await t!.exportar(a.tarea.id, '/x')).toEqual({ ok: false, error: 'Solo se exporta una tarea hecha en una carpeta nueva.' })
      expect(await t!.guardarEnRama(a.tarea.id)).toEqual({ ok: true, commit: 'abc1234' })
      expect(a.ops.commit).toHaveBeenCalledWith(expect.objectContaining({ id: a.tarea.id }), 'Esme: Mi tarea')
      expect(t!.lista()[0].aplicada).toMatchObject({ modo: 'rama', commit: 'abc1234', ficheros: 1 })
      ;(a.ops.commit as any).mockResolvedValueOnce(null)
      expect(await t!.guardarEnRama(a.tarea.id, 'otro')).toEqual({ ok: false, error: 'No hay cambios que guardar.' })

      const b = await lista(null)
      expect(await t!.guardarEnRama(b.tarea.id)).toEqual({ ok: false, error: 'Esta tarea está en una carpeta nueva: guárdala donde quieras.' })
      expect(await t!.exportar(b.tarea.id, '/destino')).toEqual({ ok: true })
      expect(b.ops.exportar).toHaveBeenCalledWith(expect.objectContaining({ id: b.tarea.id }), '/destino')
      expect(t!.lista().find((x) => x.id === b.tarea.id)!.aplicada).toMatchObject({ modo: 'exportada', destino: '/destino' })
      expect((await t!.veredictos()).every((v) => v.exito)).toBe(true)
      expect(await t!.veredictos()).toHaveLength(2)
    })
  })
})

describe('Taller: arena', () => {
  it('las tareas de una arena comparten su id y lo conservan al recargar', async () => {
    const s = sesiones(async () => 'end_turn')
    const a = crear(s.abrir).crear({ motor, carpeta: null, texto: 'x', arena: 'arena001' })
    const b = t!.crear({ motor, carpeta: null, texto: 'x', arena: 'arena001' })
    expect(a.arena).toBe('arena001'); expect(b.arena).toBe('arena001')
    await esperar(a.id, 'lista'); await esperar(b.id, 'lista')
    t!.cerrarTodo()
    const otro = new Taller({ dir, emitir: () => {} }); await otro.cargar()
    expect(otro.lista().map((x) => x.arena)).toEqual(['arena001', 'arena001'])
    otro.cerrarTodo()
  })
})

describe('Taller: límites de peticiones', () => {
  it('ante un límite del proveedor reintenta con espera, lo cuenta en la línea de tiempo y termina bien', async () => {
    let intentos = 0
    const s = sesiones(async () => { if (++intentos < 3) throw new Error('Internal error: Rate limit exceeded. Please try again later.'); return 'end_turn' })
    const tarea = crear(s.abrir, undefined, { esperasReintento: [5, 5, 5] }).crear({ motor, carpeta: null, texto: 'x' })
    await esperar(tarea.id, 'lista')
    expect(intentos).toBe(3)
    const ev = await t!.eventos(tarea.id)
    expect(ev.filter((e) => e.tipo === 'reintento')).toHaveLength(2)
    expect(ev.some((e) => e.tipo === 'fallo')).toBe(false)
  })
  it('si el límite sigue después de los reintentos, falla con el mensaje del proveedor', async () => {
    const s = sesiones(async () => { throw new Error('429 Too Many Requests') })
    const tarea = crear(s.abrir, undefined, { esperasReintento: [5] }).crear({ motor, carpeta: null, texto: 'x' })
    await esperar(tarea.id, 'error')
    expect(t!.lista()[0].error).toContain('429')
  })
  it('otros errores no se reintentan', async () => {
    let intentos = 0
    const s = sesiones(async () => { intentos++; throw new Error('Model is unavailable') })
    const tarea = crear(s.abrir, undefined, { esperasReintento: [5, 5] }).crear({ motor, carpeta: null, texto: 'x' })
    await esperar(tarea.id, 'error')
    expect(intentos).toBe(1)
  })
})

describe('Taller: seguir tras reiniciar', () => {
  it('la sesión reabierta pide el modelo y el modo que la tarea usaba (no los de la config del motor)', async () => {
    const opciones = [
      { id: 'model', nombre: 'Model', actual: 'opencode/ling-3.1-flash-free', valores: [{ id: 'opencode/ling-3.1-flash-free', nombre: 'Ling' }, { id: 'llamacpp/lento', nombre: 'Lento' }] },
      { id: 'mode', nombre: 'Mode', actual: 'build', valores: [{ id: 'build', nombre: 'Build' }, { id: 'plan', nombre: 'Plan' }] },
    ]
    const s = sesiones(async (o) => { o.alEvento({ tipo: 'opciones', opciones }); return 'end_turn' })
    const tarea = crear(s.abrir).crear({ motor, carpeta: null, texto: 'x' })
    await esperar(tarea.id, 'lista')
    t!.cerrarTodo()
    const s2 = sesiones(async () => 'end_turn')
    t = new Taller({ dir, emitir: () => {}, abrirSesion: s2.abrir, copias: copiasFalsas().ops, resolverMotor: async () => motor })
    await t.cargar()
    await t.seguir(tarea.id, 'otra cosa')
    await esperar(tarea.id, 'lista')
    expect(s2.abrir.mock.calls[0][0].config).toEqual({ model: 'opencode/ling-3.1-flash-free', mode: 'build' })
  })
})

describe('Taller: el grifo del Uso', () => {
  it('cada turno anota su delta (motor, modelo, origen, titulo y coste directo que solo cambia cuando cambia)', async () => {
    const anotaciones: Anoto[] = []
    const s = sesiones(async (o, _texto, n) => {
      if (n === 0) {
        o.alEvento({ tipo: 'uso', entrada: 200, salida: 30, pensamiento: 1 })
        o.alEvento({ tipo: 'contexto', usado: 16_000, total: 200_000, coste: { cantidad: 0.02, moneda: 'USD' } })
      } else o.alEvento({ tipo: 'uso', entrada: 50, salida: 3, pensamiento: 0 })
      return 'end_turn'
    })
    const tarea = crear(s.abrir, copiasFalsas().ops, { alAnotar: (a: Anoto) => anotaciones.push(a) }).crear({ motor, carpeta: null, texto: 'haces la historia' })
    await esperar(tarea.id, 'lista')
    expect(anotaciones).toHaveLength(1)
    expect(anotaciones[0]).toMatchObject({ motorId: 'falso', motorNombre: 'Falso', origen: 'taller', tareaId: tarea.id, titulo: 'haces la historia',
      delta: { entrada: 200, salida: 30, pensamiento: 1 }, coste: { cantidad: 0.02, moneda: 'USD' } })
    // segunda vuelta: solo el delta nuevo; el coste acumulado no se repite
    await t!.seguir(tarea.id, 'otra ronda')
    await esperar(tarea.id, 'lista')
    expect(anotaciones).toHaveLength(2)
    expect(anotaciones[1].delta).toEqual({ entrada: 50, salida: 3, pensamiento: 0 })
    expect(anotaciones[1].coste).toBeUndefined()
  })

  it('el motor que solo cuenta contexto anota los tokens leídos; la arena marca su origen; sin eventos no hay anotación', async () => {
    const anotaciones: Anoto[] = []
    const s = sesiones(async (o, _texto, n) => { if (n === 0) o.alEvento({ tipo: 'contexto', usado: 16_000, total: 200_000 }); return 'end_turn' })
    const arena = crear(s.abrir, copiasFalsas().ops, { alAnotar: (a: Anoto) => anotaciones.push(a) })
      .crear({ motor, carpeta: null, texto: 'duelo de motores', arena: 'duelo' })
    await esperar(arena.id, 'lista')
    expect(anotaciones).toHaveLength(1)
    expect(anotaciones[0]).toMatchObject({ origen: 'arena', titulo: 'duelo de motores', delta: { entrada: 16_000, salida: 0 } })
    // una tarea sin uso ni contexto no anota nada
    const s2 = sesiones(async () => 'end_turn')
    t = new Taller({ dir, emitir: () => {}, abrirSesion: s2.abrir, copias: copiasFalsas().ops, alAnotar: (a) => anotaciones.push(a) })
    const callada = t.crear({ motor, carpeta: null, texto: 'sin cuento' })
    await esperar(callada.id, 'lista')
    expect(anotaciones).toHaveLength(1)
  })
})
