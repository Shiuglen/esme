// Runtime del Taller: tareas con motores ACP, cada una en su copia aislada, con permisos, uso, cambios y persistencia.
import { randomBytes } from 'node:crypto'
import { appendFileSync, mkdirSync, renameSync, writeFileSync } from 'node:fs'
import { readFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { abrirSesionACP, type EventoMotor } from '../motores/sesion-acp'
import { cambiosCopia, crearCopia, diffCopia, quitarCopia, type Cambios, type Copia } from './copias'

export type EstadoTarea = 'preparando' | 'trabajando' | 'esperando' | 'lista' | 'parada' | 'error'
export type Permiso = { titulo: string; opciones: { id: string; nombre: string; tipo: string }[] }
export type UsoTarea = { entrada: number; salida: number; pensamiento: number; contextoUsado?: number; contextoTotal?: number; coste?: { cantidad: number; moneda: string } }
export type Tarea = {
  id: string; titulo: string; texto: string; motor: string; motorNombre: string; carpeta: string | null
  estado: EstadoTarea; copia: Copia | null; inicio: number; fin?: number; turnos: number
  primeraRespuestaMs?: number; herramientas: number; cambios: Cambios | null; uso: UsoTarea
  permiso: Permiso | null; error?: string
  actividad: number[]   // 40 cubos de 1,5 s con el número de eventos; el último es el cubo actual
}
export type MotorElegido = { id: string; nombre: string; comando: string; args: string[] }
export type SesionMotor = { preguntar(texto: string): Promise<string>; cancelar(): Promise<void>; cerrar(): void }
export type AbrirSesion = (o: { comando: string; args: string[]; cwd: string; mcp?: { nombre: string; url: string; token: string }
  alEvento(e: EventoMotor): void; alPedirPermiso(p: Permiso): Promise<string | 'cancelar'> }) => Promise<SesionMotor>
export type OperacionesCopia = { crear: typeof crearCopia; cambios: typeof cambiosCopia; diff: typeof diffCopia; quitar: typeof quitarCopia }
type Mcp = { nombre: string; url: string; token: string }

const CUBOS = 40
const MS_CUBO = 1500
const MAX_EVENTOS = 4000
const MS_CAMBIO = 250
const MS_GUARDADO = 500
const ACTIVAS: EstadoTarea[] = ['preparando', 'trabajando', 'esperando']

// Estado interno de una tarea; solo `tarea` sale hacia fuera.
type Registro = {
  tarea: Tarea; motor?: MotorElegido; sesion?: SesionMotor; resolverPermiso?: (r: string | 'cancelar') => void
  eventos: EventoMotor[]; parcial: boolean   // parcial: la memoria no tiene todos los eventos, hay que leer el disco
  ids: Set<string>; cubo: number; inicioTurno: number; cancelado: boolean; descartada: boolean
  ultimoEmitido: number; temporizador?: NodeJS.Timeout
}

const nuevoId = () => Array.from(randomBytes(8), (b) => 'abcdefghijklmnopqrstuvwxyz0123456789'[b % 36]).join('')
const instantanea = (t: Tarea): Tarea => ({ ...t, uso: { ...t.uso }, actividad: [...t.actividad] })

export class Taller {
  private readonly registros = new Map<string, Registro>()
  private readonly dir: string
  private readonly dirCopias: string
  private readonly emitir: (canal: 'cambio' | 'evento' | 'quitada', dato: unknown) => void
  private readonly abrirSesion: AbrirSesion
  private readonly copias: OperacionesCopia
  private readonly mcp: () => Mcp | null
  private readonly resolverMotor?: (id: string) => Promise<MotorElegido | null>
  private readonly ahora: () => number
  private guardado?: NodeJS.Timeout
  private cerrado = false

  constructor(o: { dir: string; emitir(canal: 'cambio' | 'evento' | 'quitada', dato: unknown): void
    abrirSesion?: AbrirSesion; copias?: OperacionesCopia; mcp?: () => Mcp | null
    resolverMotor?: (id: string) => Promise<MotorElegido | null>; ahora?: () => number }) {
    this.dir = o.dir
    this.dirCopias = join(o.dir, 'copias')
    this.emitir = o.emitir
    this.abrirSesion = o.abrirSesion ?? ((x) => abrirSesionACP(x))
    this.copias = o.copias ?? { crear: crearCopia, cambios: cambiosCopia, diff: diffCopia, quitar: quitarCopia }
    this.mcp = o.mcp ?? (() => null)
    this.resolverMotor = o.resolverMotor
    this.ahora = o.ahora ?? Date.now
  }

  async cargar(): Promise<void> {
    let guardadas: Tarea[] = []
    try { guardadas = JSON.parse(await readFile(join(this.dir, 'tareas.json'), 'utf8')) } catch { /* sin datos o ilegible: se empieza vacío */ }
    if (!Array.isArray(guardadas)) return
    for (const t of guardadas) {
      if (!t || typeof t.id !== 'string') continue
      if (ACTIVAS.includes(t.estado)) { t.estado = 'parada'; t.fin = t.fin ?? this.ahora() }
      t.permiso = null
      this.registros.set(t.id, this.registroNuevo(t, true))
    }
  }

  crear(p: { motor: MotorElegido; carpeta: string | null; texto: string }): Tarea {
    let id = nuevoId()
    while (this.registros.has(id)) id = nuevoId()
    const titulo = (p.texto.split('\n').find((l) => l.trim()) ?? '').trim().slice(0, 120)
    const tarea: Tarea = { id, titulo, texto: p.texto, motor: p.motor.id, motorNombre: p.motor.nombre, carpeta: p.carpeta,
      estado: 'preparando', copia: null, inicio: this.ahora(), turnos: 0, herramientas: 0, cambios: null,
      uso: { entrada: 0, salida: 0, pensamiento: 0 }, permiso: null, actividad: new Array(CUBOS).fill(0) }
    const r = this.registroNuevo(tarea, false)
    r.motor = p.motor
    this.registros.set(id, r)
    this.cambio(r, true)
    void this.ejecutar(r, p.texto)
    return instantanea(tarea)
  }

  async seguir(id: string, texto: string): Promise<void> {
    const r = this.registro(id)
    if (ACTIVAS.includes(r.tarea.estado)) throw new Error('La tarea sigue trabajando.')
    const previo = r.tarea.estado
    r.tarea.estado = 'preparando'; r.cancelado = false   // bloquea una segunda llamada mientras se resuelve el motor
    if (!r.sesion) {
      const motor = r.motor ?? await this.resolverMotor?.(r.tarea.motor).catch(() => null)
      if (!motor) { r.tarea.estado = previo; throw new Error(`El motor «${r.tarea.motorNombre}» ya no está disponible.`) }
      r.motor = motor
    }
    r.tarea.error = undefined; r.tarea.fin = undefined
    this.cambio(r, true)
    void this.ejecutar(r, texto)
  }

  responder(id: string, opcion: string | 'cancelar'): void {
    const r = this.registros.get(id)
    if (!r?.resolverPermiso) return
    const resolver = r.resolverPermiso
    r.resolverPermiso = undefined
    r.tarea.permiso = null
    if (r.tarea.estado === 'esperando') r.tarea.estado = 'trabajando'
    this.cambio(r, true)
    resolver(opcion)
  }

  async parar(id: string): Promise<void> {
    const r = this.registro(id)
    if (!ACTIVAS.includes(r.tarea.estado)) return
    r.cancelado = true
    this.responder(id, 'cancelar')
    await r.sesion?.cancelar().catch(() => undefined)
  }

  async descartar(id: string): Promise<void> {
    const r = this.registro(id)
    await this.parar(id)
    r.sesion?.cerrar(); r.sesion = undefined
    if (r.tarea.copia) await this.copias.quitar(r.tarea.copia, { dirCopias: this.dirCopias })
    r.descartada = true
    if (r.temporizador) clearTimeout(r.temporizador)
    await rm(this.archivoEventos(id), { force: true })
    this.registros.delete(id)
    this.emitir('quitada', id)
    this.guardarPronto()
  }

  lista(): Tarea[] {
    return [...this.registros.values()].map((r) => instantanea(r.tarea)).sort((a, b) => b.inicio - a.inicio)
  }

  async eventos(id: string): Promise<EventoMotor[]> {
    const r = this.registro(id)
    if (!r.parcial) return [...r.eventos]
    let texto = ''
    try { texto = await readFile(this.archivoEventos(id), 'utf8') } catch { return [...r.eventos] }
    return texto.split('\n').filter(Boolean).flatMap((l) => { try { return [JSON.parse(l) as EventoMotor] } catch { return [] } })
  }

  async diff(id: string): Promise<{ texto: string; truncado: boolean }> {
    const r = this.registro(id)
    return r.tarea.copia ? this.copias.diff(r.tarea.copia) : { texto: '', truncado: false }
  }

  cerrarTodo(): void {
    this.cerrado = true
    if (this.guardado) clearTimeout(this.guardado)
    for (const r of this.registros.values()) {
      if (r.temporizador) clearTimeout(r.temporizador)
      r.sesion?.cerrar()
    }
    this.escribirTareas()
  }

  // --- internos ---

  private registroNuevo(tarea: Tarea, parcial: boolean): Registro {
    return { tarea, eventos: [], parcial, ids: new Set(), cubo: Math.floor(this.ahora() / MS_CUBO), inicioTurno: 0,
      cancelado: false, descartada: false, ultimoEmitido: 0 }
  }

  private registro(id: string): Registro {
    const r = this.registros.get(id)
    if (!r) throw new Error('La tarea no existe.')
    return r
  }

  private archivoEventos = (id: string) => join(this.dir, `${id}.jsonl`)

  private async ejecutar(r: Registro, texto: string): Promise<void> {
    const t = r.tarea
    try {
      if (!t.copia) t.copia = await this.copias.crear({ carpeta: t.carpeta, id: t.id, dirCopias: this.dirCopias })
      if (!r.sesion) {
        const motor = r.motor!
        r.sesion = await this.abrirSesion({ comando: motor.comando, args: motor.args, cwd: t.copia.ruta, mcp: this.mcp() ?? undefined,
          alEvento: (e) => this.alEvento(r, e), alPedirPermiso: (p) => this.alPedirPermiso(r, p) })
      }
      if (r.descartada || this.cerrado) return
      t.estado = 'trabajando'; this.cambio(r, true)
      r.inicioTurno = this.ahora()
      this.registrar(r, { tipo: 'usuario', texto })
      const motivo = await r.sesion.preguntar(texto)
      if (r.descartada || this.cerrado) return
      this.registrar(r, { tipo: 'fin', motivo, ms: this.ahora() - r.inicioTurno })
      const cambios = await this.copias.cambios(t.copia).catch(() => null)
      t.cambios = cambios
      t.turnos++; t.fin = this.ahora()
      t.estado = motivo === 'cancelled' ? 'parada' : 'lista'
    } catch (e) {
      if (r.descartada || this.cerrado) return
      t.estado = 'error'; t.error = e instanceof Error ? e.message : String(e); t.fin = this.ahora()
      this.registrar(r, { tipo: 'fallo', mensaje: t.error })
      r.sesion?.cerrar(); r.sesion = undefined
    }
    r.resolverPermiso = undefined; t.permiso = null
    this.cambio(r, true)
  }

  private alPedirPermiso(r: Registro, p: Permiso): Promise<string | 'cancelar'> {
    if (r.cancelado) return Promise.resolve('cancelar')
    this.responder(r.tarea.id, 'cancelar')   // si había otro pendiente, se cancela
    return new Promise((resolver) => {
      r.resolverPermiso = resolver
      r.tarea.permiso = p; r.tarea.estado = 'esperando'
      this.cambio(r, true)
    })
  }

  private alEvento(r: Registro, e: EventoMotor): void {
    if (r.descartada || this.cerrado) return
    const t = r.tarea
    this.actividad(r)
    if (t.turnos === 0 && t.primeraRespuestaMs === undefined) t.primeraRespuestaMs = Math.max(0, this.ahora() - r.inicioTurno)
    if (e.tipo === 'herramienta') { r.ids.add(e.id); t.herramientas = Math.max(t.herramientas, r.ids.size) }
    else if (e.tipo === 'uso') { t.uso.entrada += e.entrada; t.uso.salida += e.salida; t.uso.pensamiento += e.pensamiento ?? 0 }
    else if (e.tipo === 'contexto') { t.uso.contextoUsado = e.usado; t.uso.contextoTotal = e.total; t.uso.coste = e.coste ?? t.uso.coste }
    this.registrar(r, e)
    this.cambio(r, false)
  }

  // Guarda el evento en memoria y en el .jsonl, y lo emite.
  private registrar(r: Registro, e: EventoMotor): void {
    if (r.descartada || this.cerrado) return
    r.eventos.push(e)
    if (r.eventos.length > MAX_EVENTOS) { r.eventos.shift(); r.parcial = true }
    this.anotarEvento(r.tarea.id, e)
    this.emitir('evento', { id: r.tarea.id, evento: e })
  }

  // Reparte los eventos por cubos de reloj de 1,5 s: el último es el actual.
  private actividad(r: Registro): void {
    const actual = Math.floor(this.ahora() / MS_CUBO)
    const a = r.tarea.actividad
    const saltos = Math.min(Math.max(actual - r.cubo, 0), CUBOS)
    for (let i = 0; i < saltos; i++) { a.shift(); a.push(0) }
    r.cubo = Math.max(actual, r.cubo)
    a[CUBOS - 1]++
  }

  private anotarEvento(id: string, e: EventoMotor): void {
    try { mkdirSync(this.dir, { recursive: true }); appendFileSync(this.archivoEventos(id), JSON.stringify(e) + '\n') } catch { /* el disco no debe parar la tarea */ }
  }

  // Emite `cambio` al instante o, como mucho, cada 250 ms por tarea con un disparo final.
  private cambio(r: Registro, inmediato: boolean): void {
    if (this.cerrado || r.descartada) return
    this.guardarPronto()
    const ahora = Date.now()
    const falta = MS_CAMBIO - (ahora - r.ultimoEmitido)
    if (inmediato || falta <= 0) { this.emitirCambio(r); return }
    if (!r.temporizador) r.temporizador = setTimeout(() => this.emitirCambio(r), falta)
  }

  private emitirCambio(r: Registro): void {
    if (r.temporizador) { clearTimeout(r.temporizador); r.temporizador = undefined }
    if (this.cerrado || r.descartada) return
    r.ultimoEmitido = Date.now()
    this.emitir('cambio', instantanea(r.tarea))
  }

  private guardarPronto(): void {
    if (this.cerrado || this.guardado) return
    this.guardado = setTimeout(() => { this.guardado = undefined; this.escribirTareas() }, MS_GUARDADO)
  }

  private escribirTareas(): void {
    try {
      mkdirSync(this.dir, { recursive: true })
      const destino = join(this.dir, 'tareas.json')
      writeFileSync(destino + '.tmp', JSON.stringify([...this.registros.values()].map((r) => r.tarea)))
      renameSync(destino + '.tmp', destino)
    } catch (e) { console.error('[taller] no se guardó tareas.json:', e instanceof Error ? e.message : e) }
  }
}
