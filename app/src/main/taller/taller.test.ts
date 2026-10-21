import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Taller, type AbrirSesion, type Anoto, type MotorElegido, type OperacionesCopia, type SesionMotor, type Tarea } from './taller'
import { actaValida, leeActas, parDeFirma } from './acta'
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
    puntos: vi.fn(async () => [{ sha: 'abc1234', mensaje: 'Esme: turno 1', turno: 1 }]), volver: vi.fn(async () => {}),
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

  it('una negativa del motor no es un éxito: la tarea acaba en error, la lección queda y la sesión se cierra', async () => {
    const s = sesiones(async (o) => { o.alEvento({ tipo: 'texto', texto: 'prefiero no hacerlo' }); return 'refusal' })
    const tarea = crear(s.abrir).crear({ motor, carpeta: '/proyecto', texto: 'Algo que el motor no quiso hacer' })
    await esperar(tarea.id, 'error')
    const muerta = t!.lista()[0]
    expect(muerta.estado).toBe('error')
    expect(muerta.error).toBe('Falso se negó a hacer el encargo')
    expect(muerta.turnos).toBe(1)
    const ev = await t!.eventos(tarea.id)
    expect(ev).toContainEqual(expect.objectContaining({ tipo: 'fin', motivo: 'refusal' }))
    expect(ev).toContainEqual(expect.objectContaining({ tipo: 'fallo', mensaje: 'Falso se negó a hacer el encargo' }))
    expect(s.cerrar).toHaveBeenCalled()   // la sesión de un motor que se negó no queda abierta
  })

  it('una negativa por palabras (el motor lo dice y el turno acaba end_turn) tampoco es un éxito', async () => {
    const s = sesiones(async (o) => { o.alEvento({ tipo: 'texto', texto: 'No puedo hacer eso.' }); return 'end_turn' })
    const tarea = crear(s.abrir).crear({ motor, carpeta: '/proyecto', texto: 'La tarea que el motor desprecia' })
    await esperar(tarea.id, 'error')
    const muerta = t!.lista()[0]
    expect(muerta.estado).toBe('error')
    expect(muerta.error).toBe('Falso se negó a hacerlo')
    expect(s.cerrar).toHaveBeenCalled()
  })

  describe('el parlamento — los relevos encadenados', () => {
    const rr = [{ rol: 'constructor', motor: 'falso-a' }, { rol: 'revisor', motor: 'falso-b' }, { rol: 'probador', motor: 'falso-c' }]
    const mm = (id: string, nombre: string): MotorElegido => ({ id, nombre, comando: 'x', args: [] })
    const resolverBien = async (id: string) => (id === 'falso-a' ? mm('falso-a', 'Falso A') : id === 'falso-b' ? mm('falso-b', 'Falso B') : mm('falso-c', 'Falso C'))

    it('tres relevos: tres tareas reales, la segunda hereda la evidencia de la primera y el veredicto lo firma la última', async () => {
      const s = sesiones(async (o, _texto, n) => {
        // sin consola no hay promesa que valga: el probador corrió de verdad (así se lo sella)
        if (n === 2) o.alEvento({ tipo: 'herramienta', id: 'p1', clase: 'execute', detalle: 'npm test', estado: 'completed' })
        o.alEvento({ tipo: 'texto', texto: ['Cambié el reloj del taller.', 'Vi que el orden está bien.', 'Las 3 pruebas pasan.'][n] ?? '' })
        return 'end_turn'
      })
      const taller = crear(s.abrir, copiasFalsas().ops, { resolverMotor: resolverBien })
      const fin = await taller.parlamentar({ texto: 'Arregla el reloj', carpeta: '/proyecto', relevos: rr })
      expect(fin.ids.length).toBe(3)
      expect(fin.estado).toBe('probado')
      expect(fin.frase).toContain('Las 3 pruebas pasan.')
      // la segunda tarea empieza con el oficio del revisor y trae la evidencia del constructor
      const segundo = taller.lista().find((x) => x.id === fin.ids[1])
      expect(segundo?.texto).toContain('quien revisa')
      expect(segundo?.texto).toContain('Evidencia del relevo anterior')
      expect(segundo?.texto).toContain('Cambié el reloj del taller.')
      expect(segundo?.texto).toContain('a.txt (+3/−1)')
      expect(segundo?.arena).toBe('parlamento')
    })

    it('un relevo que se niega tumba el parlamento y el comité no rellena el hueco', async () => {
      let llamada = 0
      const s = sesiones(async (o) => { if (++llamada === 2) o.alEvento({ tipo: 'texto', texto: 'No puedo hacer eso.' }); return 'end_turn' })
      const taller = crear(s.abrir, copiasFalsas().ops, { resolverMotor: async () => mm('falso', 'Falso') })
      const fin = await taller.parlamentar({ texto: 'Arregla el reloj', carpeta: '/proyecto', relevos: rr })
      expect(fin.ids).toHaveLength(2)   // el tercer relevo jamás se creó
      expect(fin.estado).toBe('tumbado')
      expect(fin.frase).toContain('relevo 2 de 3')
      expect(fin.frase).toContain('se negó')
    })

    it('un motor que no está tumba el parlamento ANTES de crear tarea de ese relevo', async () => {
      const s = sesiones(async () => 'end_turn')
      const taller = crear(s.abrir, copiasFalsas().ops, { resolverMotor: async (id: string) => (id === 'falso-a' ? mm('falso-a', 'Falso A') : null) })
      const fin = await taller.parlamentar({ texto: 'Arregla el reloj', carpeta: '/proyecto', relevos: rr })
      expect(fin.estado).toBe('tumbado')
      expect(fin.frase).toContain('falta el motor del relevo 2')
      expect(fin.ids).toHaveLength(1)
    })

    it('el veredicto queda en el acta firmada del taller, verificable línea a línea', async () => {
      const s = sesiones(async (o, _texto, n) => {
        // el probador (tercer relevo) no vale con la frase: tiene que haber corrido de verdad
        if (n === 2) o.alEvento({ tipo: 'herramienta', id: 'p1', clase: 'execute', detalle: 'npm test', estado: 'completed' })
        o.alEvento({ tipo: 'texto', texto: ['Cambié el reloj del taller.', 'Vi que el orden está bien.', 'Las 3 pruebas pasan.'][n] ?? '' })
        return 'end_turn'
      })
      const taller = crear(s.abrir, copiasFalsas().ops, { resolverMotor: resolverBien })
      const fin = await taller.parlamentar({ texto: 'Arregla el reloj', carpeta: '/proyecto', relevos: rr })
      expect(fin.acta).toBe(true)
      expect(fin.actaFirmada?.valida).toBe(true)
      expect(fin.actaFirmada?.estado).toBe('probado')
      const { publica } = parDeFirma(dir)
      const diario = leeActas(dir)
      expect(diario).toHaveLength(1)
      expect(actaValida(diario[0], publica)).toBe(true)
      expect(diario[0].estado).toBe('probado')
      expect(diario[0].firma.signed_by).toBe('taller')
      expect(diario[0].relevos.map((r) => r.estado)).toEqual(['lista', 'lista', 'lista'])
    })

    it('un probador que jura que pasan pero NO corrió nada: el juez le niega el probado (dudoso, firmado igual)', async () => {
      const s = sesiones(async (o) => { o.alEvento({ tipo: 'texto', texto: 'Las 3 pruebas pasan, todo verificado.' }); return 'end_turn' })
      const taller = crear(s.abrir, copiasFalsas().ops, { resolverMotor: resolverBien })
      const fin = await taller.parlamentar({ texto: 'Arregla el reloj', carpeta: '/proyecto', relevos: rr })
      expect(fin.estado).toBe('dudoso')
      expect(fin.frase).toContain('sin haber corrido nada')
      // el acta sale igual: el dudoso es un veredicto legítimo, lo que no cabe es el probado regalado
      expect(fin.actaFirmada?.estado).toBe('dudoso')
      expect(fin.actaFirmada?.frase).toContain('sin haber corrido nada')
    })

    it('un probador que jura que pasan pero su consola acabó en fallo: el juez lo tumba', async () => {
      const s = sesiones(async (o, _texto, n) => {
        if (n === 2) o.alEvento({ tipo: 'herramienta', id: 'p1', clase: 'execute', detalle: 'npm test', estado: 'failed' })
        o.alEvento({ tipo: 'texto', texto: ['Cambié el reloj del taller.', 'Vi que el orden está bien.', 'Las 3 pruebas pasan, todo correcto.'][n] ?? '' })
        return 'end_turn'
      })
      const taller = crear(s.abrir, copiasFalsas().ops, { resolverMotor: resolverBien })
      const fin = await taller.parlamentar({ texto: 'Arregla el reloj', carpeta: '/proyecto', relevos: rr })
      expect(fin.estado).toBe('tumbado')
      expect(fin.frase).toContain('su última prueba acabó en fallo')
      expect(fin.frase).toContain('npm test')
      // el acta lo firmó también: la prueba muerta queda en el diario donde cualquiera lo compra
      expect(fin.actaFirmada?.estado).toBe('tumbado')
      const { publica } = parDeFirma(dir)
      const diario = leeActas(dir)
      expect(actaValida(diario[0], publica)).toBe(true)
    })

    it('un parlamento tumbado también firma su acta, hasta donde llegó', async () => {
      let llamada = 0
      const s = sesiones(async (o) => { if (++llamada === 2) o.alEvento({ tipo: 'texto', texto: 'No puedo hacer eso.' }); return 'end_turn' })
      const taller = crear(s.abrir, copiasFalsas().ops, { resolverMotor: async () => mm('falso', 'Falso') })
      const fin = await taller.parlamentar({ texto: 'Arregla el reloj', carpeta: '/proyecto', relevos: rr })
      expect(fin.acta).toBe(true)
      const { publica } = parDeFirma(dir)
      const diario = leeActas(dir)
      expect(actaValida(diario[0], publica)).toBe(true)
      expect(diario[0].estado).toBe('tumbado')
      expect(diario[0].relevos).toEqual([
        { orden: 1, rol: 'constructor', motor: 'falso-a', estado: 'lista' },
        { orden: 2, rol: 'revisor', motor: 'falso-b', estado: 'error' },
      ])
    })
  })

  it('dos tareas trabajan a la vez: cada una con su copia, su motor y sus eventos', async () => {
    // La promesa del contrato: dos tareas pueden estar «trabajando» al mismo tiempo. Aquí se
    // comprueba que de verdad conviven (ninguna espera a la otra) y que no se pisan: cada una
    // con su copia, su sesión y sus eventos.
    const dentro: string[] = []
    let soltar!: () => void
    const puerta = new Promise<void>((r) => { soltar = r })
    const cwds: string[] = []
    const s = sesiones(async (o, texto) => {
      cwds.push(o.cwd)
      dentro.push(texto)
      if (dentro.length >= 2) soltar()
      await puerta          // ninguna termina hasta que las dos están dentro del motor
      return 'end_turn'
    })
    const { ops } = copiasFalsas()
    const taller = crear(s.abrir, ops)
    const a = taller.crear({ motor, carpeta: '/proyecto', texto: 'Arregla el examen' })
    const b = taller.crear({ motor, carpeta: '/proyecto', texto: 'Revisa la Tienda' })
    await vi.waitFor(() => expect(dentro.length).toBe(2), { timeout: 3000 })
    await esperar(a.id, 'lista')
    await esperar(b.id, 'lista')
    // cada tarea con su copia y su motor
    expect(new Set(cwds).size).toBe(2)
    expect(cwds).toContain(join(dir, 'copias', a.id))
    expect(cwds).toContain(join(dir, 'copias', b.id))
    // y los eventos no se mezclan: cada uno lleva su id
    const eventos = emisiones.filter((e) => e.canal === 'evento')
    expect(eventos.every((e) => [a.id, b.id].includes(e.dato.id))).toBe(true)
    expect(eventos.filter((e) => e.dato.id === a.id).length).toBeGreaterThan(0)
    expect(eventos.filter((e) => e.dato.id === b.id).length).toBeGreaterThan(0)
    const evA = await taller.eventos(a.id)
    const evB = await taller.eventos(b.id)
    expect(evA.map((e) => (e as any).texto).filter(Boolean)).toContain('Arregla el examen')
    expect(evB.map((e) => (e as any).texto).filter(Boolean)).toContain('Revisa la Tienda')
    expect(evA.map((e) => (e as any).texto).filter(Boolean)).not.toContain('Revisa la Tienda')
  })

  it('el primer turno hereda lo que la mente sabe del encargo; los siguientes ya lo tienen', async () => {
    const vistos: string[] = []
    const s = sesiones(async (_o, texto) => { vistos.push(texto); return 'end_turn' })
    const f = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ context: 'el proyecto usa vitest', tokens: 812, ids: ['a', 'b'] }) }) as Response)
    vi.stubGlobal('fetch', f)
    try {
      const tarea = crear(s.abrir, copiasFalsas().ops, { mente: () => ({ url: 'http://mente', token: 'tok' }) })
        .crear({ motor, carpeta: '/proyecto', texto: 'Arregla el examen' })
      await esperar(tarea.id, 'lista')
      expect(vistos[0]).toContain('el proyecto usa vitest')
      expect(vistos[0]).toContain('Arregla el examen')
      const ev = await t!.eventos(tarea.id)
      expect(ev.find((e) => e.tipo === 'herencia')).toEqual({ tipo: 'herencia', tokens: 812, recuerdos: 2 })
      await t!.seguir(tarea.id, 'otra cosa')
      await esperar(tarea.id, 'lista')
      expect(vistos[1]).toBe('otra cosa')   // el segundo turno no repite la herencia
    } finally { vi.unstubAllGlobals() }
  })

  it('sin mente (o con la mente caída) la tarea arranca igual', async () => {
    const vistos: string[] = []
    const s = sesiones(async (_o, texto) => { vistos.push(texto); return 'end_turn' })
    const tarea = crear(s.abrir, copiasFalsas().ops).crear({ motor, carpeta: '/proyecto', texto: 'Arregla el examen' })
    await esperar(tarea.id, 'lista')
    expect(vistos[0]).toBe('Arregla el examen')
    expect((await t!.eventos(tarea.id)).some((e) => e.tipo === 'herencia')).toBe(false)
  })

  it('cuando una tarea se rompe, la mente se lo apunta (no sólo cuando hay veredicto)', async () => {
    const s = sesiones(async () => { throw new Error('se rompió el motor') })   // no se reintenta: no es temporal
    const pedidos: { url: string; cuerpo: any }[] = []
    const f = vi.fn(async (url: string, o?: { body?: string }) => {
      pedidos.push({ url, cuerpo: JSON.parse(o?.body ?? '{}') })
      return { ok: true, status: 200, json: async () => ({ lecciones: 1, ids: [], texto: [] }) } as Response
    })
    vi.stubGlobal('fetch', f)
    try {
      const tarea = crear(s.abrir, copiasFalsas().ops, { mente: () => ({ url: 'http://mente', token: 'tok' }) })
        .crear({ motor, carpeta: '/proyecto', texto: 'Arregla el examen' })
      await esperar(tarea.id, 'error')
      await vi.waitFor(() => expect(pedidos.some((p) => p.url.endsWith('/equipo'))).toBe(true), { timeout: 3000 })
      const equipo = pedidos.find((p) => p.url.endsWith('/equipo'))!
      expect(equipo.cuerpo.tareas).toEqual([expect.objectContaining({ estado: 'error', error: 'se rompió el motor' })])
      expect(equipo.cuerpo.tareas[0].actividad).toBeUndefined()   // sólo lo que la mente necesita
    } finally { vi.unstubAllGlobals() }
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

  it('con «ediciones», editar en la copia se aprueba solo y queda anotado; ejecutar sigue preguntando', async () => {
    const elegidos: string[] = []
    const op = [{ id: 'si', nombre: 'Sí', tipo: 'allow_once' }]
    const s = sesiones(async (o) => {
      elegidos.push(await o.alPedirPermiso({ titulo: 'Editar a.ts', clase: 'edit', opciones: op }))
      elegidos.push(await o.alPedirPermiso({ titulo: 'npm test', clase: 'execute', opciones: op }))
      return 'end_turn'
    })
    const tarea = crear(s.abrir).crear({ motor, carpeta: null, texto: 'x', acceso: 'ediciones' })
    await esperar(tarea.id, 'esperando')
    expect(elegidos).toEqual(['si'])
    expect(t!.lista()[0].permiso?.titulo).toBe('npm test')
    t!.responder(tarea.id, 'si')
    await esperar(tarea.id, 'lista')
    expect((await t!.eventos(tarea.id)).some((e) => e.tipo === 'aprobado' && e.titulo === 'Editar a.ts')).toBe(true)
  })

  it('con «preguntar», hasta editar pregunta', async () => {
    const s = sesiones(async (o) => { await o.alPedirPermiso({ titulo: 'Editar a.ts', clase: 'edit', opciones: [{ id: 'si', nombre: 'Sí', tipo: 'allow_once' }] }); return 'end_turn' })
    const tarea = crear(s.abrir).crear({ motor, carpeta: null, texto: 'x', acceso: 'preguntar' })
    await esperar(tarea.id, 'esperando')
    t!.responder(tarea.id, 'si')
    await esperar(tarea.id, 'lista')
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
      expect(await t!.veredictos()).toEqual([{ ts: reloj, motor: 'falso', modelo: null, exito: true, tarea: tarea.id }])
      expect(await t!.aplicar(tarea.id)).toEqual({ ok: false, error: 'Ya está aplicada.' })
    })

    it('cada turno deja un punto: se puede volver al anterior sin perder el trabajo', async () => {
      // La práctica que tiene MonoCode (MIT) y que Esme no: deshacer **un turno**, no la tarea.
      const { ops, tarea } = await lista()
      expect(ops.commit).toHaveBeenCalledWith(expect.objectContaining({ id: tarea.id }), 'Esme: turno 1')
      const puntos = await t!.puntos(tarea.id)
      expect(puntos.ok).toBe(true)
      expect((puntos as any).puntos).toEqual([{ sha: 'abc1234', mensaje: 'Esme: turno 1', turno: 1 }])
      expect(await t!.deshacerTurno(tarea.id, 'abc1234')).toEqual({ ok: true })
      expect(ops.volver).toHaveBeenCalledWith(expect.objectContaining({ id: tarea.id }), 'abc1234')
    })

    it('deshacer el último turno vuelve al punto del turno anterior, y sólo a la copia', async () => {
      const { ops, tarea } = await lista()
      ;(ops.puntos as any).mockResolvedValue([
        { sha: 'aaa1111', mensaje: 'Esme: turno 1', turno: 1 },
        { sha: 'bbb2222', mensaje: 'Esme: turno 2', turno: 2 },
      ])
      expect(await t!.deshacerUltimoTurno(tarea.id)).toEqual({ ok: true, turno: 1 })
      expect(ops.volver).toHaveBeenCalledWith(expect.objectContaining({ id: tarea.id }), 'aaa1111')
    })

    it('deshacer el último turno se niega si no hay un turno anterior, y no toca nada', async () => {
      const { ops, tarea } = await lista()
      ;(ops.puntos as any).mockResolvedValue([{ sha: 'aaa1111', mensaje: 'Esme: turno 1', turno: 1 }])
      expect(await t!.deshacerUltimoTurno(tarea.id)).toEqual({ ok: false, error: 'No hay ningún turno que deshacer.' })
      expect(ops.volver).not.toHaveBeenCalled()
    })

    it('deshacer un turno sin copia o sin sha se niega, y no toca nada', async () => {
      const { tarea } = await lista()
      expect(await t!.deshacerTurno(tarea.id, '')).toEqual({ ok: false, error: 'No hay punto al que volver.' })
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
      expect(await t!.veredictos()).toEqual([{ ts: reloj, motor: 'falso', modelo: null, exito: false, tarea: a.tarea.id }])
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

  it('cada motor de la arena trabaja con su oficio, y el encargo lo lleva delante', async () => {
    const s = sesiones(async () => 'end_turn')
    const rol = { id: 'revisor', nombre: 'Revisor', instruccion: 'Míralo con ojo crítico.' }
    const a = crear(s.abrir).crear({ motor, carpeta: null, texto: 'Arregla el arranque', arena: 'arena002', rol })
    expect(a.rol).toBe('Revisor')
    expect(a.texto.startsWith('Míralo con ojo crítico.')).toBe(true)
    expect(a.texto).toContain('Arregla el arranque')
    await esperar(a.id, 'lista')
  })

  it('los oficios vienen de los de casa si el creador no pone los suyos', async () => {
    const s = sesiones(async () => 'end_turn')
    crear(s.abrir)
    const roles = t!.roles()
    expect(roles.map((r) => r.id)).toContain('constructor')
    expect(roles.map((r) => r.id)).toContain('revisor')
  })
})

describe('Taller: el vigilante', () => {
  it('una tarea cuyo motor no da señales se marca como error, no se queda colgada', async () => {
    // el motor contesta una vez y luego se muere en silencio (así se quedó una tarea tres días)
    // el motor se muere en silencio: la pregunta nunca vuelve (así se quedó una tarea tres días)
    const s = sesiones(async () => await new Promise<string>(() => {}))
    const tarea = crear(s.abrir, undefined, { vigilarMs: 5, silencioMs: 60_000 }).crear({ motor, carpeta: null, texto: 'x' })
    await vi.waitFor(() => expect(t!.lista()[0].estado).toBe('trabajando'), { timeout: 3000 })
    reloj += 40 * 60_000   // cuarenta minutos sin una sola señal
    await vi.waitFor(() => expect(t!.lista()[0].estado).toBe('error'), { timeout: 3000 })
    expect(t!.lista()[0].error).toContain('dejó de responder')
  })

  it('una tarea que está esperando a su creator no se toca: eso es 정상', async () => {
    // el motor pide permiso y se queda esperando a que su creador conteste: eso no es un motor muerto
    const s = sesiones(async (o) => { await o.alPedirPermiso({ titulo: 'editar un fichero', opciones: [{ id: 'si', nombre: 'Sí', tipo: 'opción' }] }); return 'end_turn' })
    const tarea = crear(s.abrir, undefined, { vigilarMs: 5, silencioMs: 60_000 }).crear({ motor, carpeta: null, texto: 'x' })
    await vi.waitFor(() => expect(t!.lista()[0].estado).toBe('esperando'), { timeout: 3000 })
    reloj += 40 * 60_000
    await new Promise((r) => setTimeout(r, 120))
    expect(t!.lista()[0].estado).toBe('esperando')
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
  it('si el modelo gratis llega a su límite, pasa a otro gratis del mismo motor sin esperar (nunca a uno de pago)', async () => {
    const opciones = [{ id: 'model', nombre: 'Model', actual: 'opencode/glm-free', valores: [{ id: 'pago/opus', nombre: 'Opus' }, { id: 'opencode/glm-free', nombre: 'GLM' }, { id: 'opencode/nemotron-free', nombre: 'Nemotron' }] }]
    let intentos = 0
    const s = sesiones(async (o) => { o.alEvento({ tipo: 'opciones', opciones }); if (++intentos === 1) throw new Error('Rate limit exceeded'); return 'end_turn' })
    const tarea = crear(s.abrir, undefined, { esperasReintento: [60_000] }).crear({ motor, carpeta: null, texto: 'x' })
    await esperar(tarea.id, 'lista')
    expect(s.configurar).toHaveBeenCalledWith('model', 'opencode/nemotron-free')
    const ev = await t!.eventos(tarea.id)
    expect(ev.find((e) => e.tipo === 'reintento')).toMatchObject({ ms: 0, motivo: expect.stringMatching(/nemotron-free/) })
  })
  it('otros errores no se reintentan', async () => {
    let intentos = 0
    const s = sesiones(async () => { intentos++; throw new Error('Model is unavailable') })
    const tarea = crear(s.abrir, undefined, { esperasReintento: [5, 5] }).crear({ motor, carpeta: null, texto: 'x' })
    await esperar(tarea.id, 'error')
    expect(intentos).toBe(1)
  })
  it('lo que necesita tu sesión no se reintenta: reintentar no entra por ti', async () => {
    let intentos = 0
    const s = sesiones(async () => { intentos++; throw new Error('Authentication required: provider authentication required') })
    const tarea = crear(s.abrir, undefined, { esperasReintento: [5, 5] }).crear({ motor, carpeta: null, texto: 'x' })
    await esperar(tarea.id, 'error')
    expect(intentos).toBe(1)
  })
  it('un fallo de red se reintenta solo y la tarea termina bien', async () => {
    let intentos = 0
    const s = sesiones(async () => { if (++intentos < 3) throw new Error('getaddrinfo ETIMEOUT opencode.ai'); return 'end_turn' })
    const tarea = crear(s.abrir, undefined, { esperasReintento: [5, 5, 5] }).crear({ motor, carpeta: null, texto: 'x' })
    await esperar(tarea.id, 'lista')
    expect(intentos).toBe(3)
    const ev = await t!.eventos(tarea.id)
    expect(ev.filter((e) => e.tipo === 'reintento')).toHaveLength(2)
    expect(ev.some((e) => e.tipo === 'fallo')).toBe(false)
  })
  it('el «Internal error» del proveedor se reintenta una vez, no más', async () => {
    let intentos = 0
    const s = sesiones(async () => { intentos++; throw new Error('Internal error') })
    const tarea = crear(s.abrir, undefined, { esperasReintento: [5, 5, 5] }).crear({ motor, carpeta: null, texto: 'x' })
    await esperar(tarea.id, 'error')
    expect(intentos).toBe(2)
  })
  it('si la sesión del motor se cierra, se abre otra y se sigue', async () => {
    let intentos = 0
    const s = sesiones(async () => { if (++intentos === 1) throw new Error('La sesión del motor está cerrada.'); return 'end_turn' })
    const tarea = crear(s.abrir, undefined, { esperasReintento: [5] }).crear({ motor, carpeta: null, texto: 'x' })
    await esperar(tarea.id, 'lista')
    expect(s.abrir).toHaveBeenCalledTimes(2)
    const ev = await t!.eventos(tarea.id)
    expect(ev.find((e) => e.tipo === 'reintento')).toMatchObject({ motivo: expect.stringMatching(/sesión nueva/) })
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
