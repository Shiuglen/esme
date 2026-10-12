// Runtime del Taller: tareas con motores ACP, cada una en su copia aislada, con permisos, uso, cambios y persistencia.
import { randomBytes } from 'node:crypto'
import { appendFileSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { readFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { abrirSesionACP, type EventoMotor, type OpcionConfig } from '../motores/sesion-acp'
import { aplicarParche, cambiosCopia, commitCopia, crearCopia, diffCopia, exportarCopia, parcheCopia, quitarCopia, type Cambios, type Copia } from './copias'

export type EstadoTarea = 'preparando' | 'trabajando' | 'esperando' | 'lista' | 'parada' | 'error'
export type Permiso = { titulo: string; opciones: { id: string; nombre: string; tipo: string }[] }
export type UsoTarea = { entrada: number; salida: number; pensamiento: number; contextoUsado?: number; contextoTotal?: number; coste?: { cantidad: number; moneda: string } }
export type Tarea = {
  id: string; titulo: string; texto: string; motor: string; motorNombre: string; carpeta: string | null
  estado: EstadoTarea; copia: Copia | null; inicio: number; fin?: number; turnos: number
  primeraRespuestaMs?: number; herramientas: number; cambios: Cambios | null; uso: UsoTarea
  permiso: Permiso | null; error?: string
  actividad: number[]   // 40 cubos de 1,5 s con el número de eventos; el último es el cubo actual
  opciones: OpcionConfig[]; modelo: string | null   // modelo: nombre del valor actual de la opción «model»
  aplicada?: Aplicada   // adónde se llevaron los cambios: carpeta (con deshacer), rama o exportada
  actividadMs: number   // dónde acaba el último cubo: sin eventos nuevos, la interfaz desplaza la micrográfica sola
  arena?: string   // las tareas que compiten con el mismo encargo comparten este id
}
export type MotorElegido = { id: string; nombre: string; comando: string; args: string[] }
export type SesionMotor = { preguntar(texto: string): Promise<string>; cancelar(): Promise<void>; cerrar(): void; configurar(id: string, valor: string): Promise<void> }
export type AbrirSesion = (o: { comando: string; args: string[]; cwd: string; mcp?: { nombre: string; url: string; token: string }; config?: Record<string, string>
  alEvento(e: EventoMotor): void; alPedirPermiso(p: Permiso): Promise<string | 'cancelar'> }) => Promise<SesionMotor>
export type OperacionesCopia = { crear: typeof crearCopia; cambios: typeof cambiosCopia; diff: typeof diffCopia; quitar: typeof quitarCopia
  parche: typeof parcheCopia; aplicar: typeof aplicarParche; commit: typeof commitCopia; exportar: typeof exportarCopia }
export type Aplicada = { cuando: number; modo: 'carpeta' | 'rama' | 'exportada'; ficheros: number; destino?: string; commit?: string }
export type Veredicto = { ts: number; motor: string; modelo: string | null; exito: boolean }
type Fallo = { ok: false; error: string; ficheros?: string[] }
type Mcp = { nombre: string; url: string; token: string }

const CUBOS = 40
const MS_CUBO = 1500
const MAX_EVENTOS = 4000
const MS_CAMBIO = 250
const MS_GUARDADO = 500
const ACTIVAS: EstadoTarea[] = ['preparando', 'trabajando', 'esperando']

// Estado interno de una tarea; solo `tarea` sale hacia fuera.
type Registro = {
  tarea: Tarea; motor?: MotorElegido; config: Record<string, string>; sesion?: SesionMotor; resolverPermiso?: (r: string | 'cancelar') => void
  total?: number   // eventos ya guardados en el historial; se cuenta del disco la primera vez tras recargar
  eventos: EventoMotor[]; parcial: boolean   // parcial: la memoria no tiene todos los eventos, hay que leer el disco
  ids: Set<string>; cubo: number; inicioTurno: number; cancelado: boolean; descartada: boolean
  ultimoEmitido: number; temporizador?: NodeJS.Timeout
}

const finCubo = (ms: number) => (Math.floor(ms / MS_CUBO) + 1) * MS_CUBO
const mensajeDe = (e: unknown) => (e instanceof Error ? e.message : String(e))
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
  private readonly esperas: number[]
  private guardado?: NodeJS.Timeout
  private cerrado = false

  constructor(o: { dir: string; emitir(canal: 'cambio' | 'evento' | 'quitada', dato: unknown): void
    abrirSesion?: AbrirSesion; copias?: OperacionesCopia; mcp?: () => Mcp | null
    resolverMotor?: (id: string) => Promise<MotorElegido | null>; ahora?: () => number; esperasReintento?: number[] }) {
    this.dir = o.dir
    this.dirCopias = join(o.dir, 'copias')
    this.emitir = o.emitir
    this.abrirSesion = o.abrirSesion ?? ((x) => abrirSesionACP(x))
    this.copias = o.copias ?? { crear: crearCopia, cambios: cambiosCopia, diff: diffCopia, quitar: quitarCopia, parche: parcheCopia, aplicar: aplicarParche, commit: commitCopia, exportar: exportarCopia }
    this.mcp = o.mcp ?? (() => null)
    this.resolverMotor = o.resolverMotor
    this.ahora = o.ahora ?? Date.now
    this.esperas = o.esperasReintento ?? [8000, 20_000, 45_000]
  }

  async cargar(): Promise<void> {
    let guardadas: Tarea[] = []
    try { guardadas = JSON.parse(await readFile(join(this.dir, 'tareas.json'), 'utf8')) } catch { /* sin datos o ilegible: se empieza vacío */ }
    if (!Array.isArray(guardadas)) return
    for (const t of guardadas) {
      if (!t || typeof t.id !== 'string') continue
      if (ACTIVAS.includes(t.estado)) { t.estado = 'parada'; t.fin = t.fin ?? this.ahora() }
      t.permiso = null; t.opciones ??= []; t.modelo ??= null
      t.actividadMs ??= finCubo(t.fin ?? t.inicio)
      this.registros.set(t.id, this.registroNuevo(t, true))
    }
  }

  crear(p: { motor: MotorElegido; carpeta: string | null; texto: string; config?: Record<string, string>; arena?: string }): Tarea {
    let id = nuevoId()
    while (this.registros.has(id)) id = nuevoId()
    const titulo = (p.texto.split('\n').find((l) => l.trim()) ?? '').trim().slice(0, 120)
    const tarea: Tarea = { id, titulo, texto: p.texto, motor: p.motor.id, motorNombre: p.motor.nombre, carpeta: p.carpeta, ...(p.arena ? { arena: p.arena } : {}),
      estado: 'preparando', copia: null, inicio: this.ahora(), turnos: 0, herramientas: 0, cambios: null,
      uso: { entrada: 0, salida: 0, pensamiento: 0 }, permiso: null, actividad: new Array(CUBOS).fill(0), actividadMs: 0, opciones: [], modelo: null }
    tarea.actividadMs = finCubo(tarea.inicio)
    const r = this.registroNuevo(tarea, false)
    r.motor = p.motor; r.config = { ...p.config }
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

  async configurar(id: string, opcion: string, valor: string): Promise<void> {
    const r = this.registro(id)
    r.config[opcion] = valor
    await r.sesion?.configurar(opcion, valor)
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
    r.descartada = true   // antes de cerrar: que el cierre de la sesión no se lea como un fallo
    r.sesion?.cerrar(); r.sesion = undefined
    try {
      if (r.tarea.copia) await this.copias.quitar(r.tarea.copia, { dirCopias: this.dirCopias })
    } catch (e) {
      r.descartada = false
      if (ACTIVAS.includes(r.tarea.estado)) { r.tarea.estado = 'parada'; r.tarea.fin ??= this.ahora() }
      this.cambio(r, true)
      throw e
    }
    if (r.temporizador) clearTimeout(r.temporizador)
    if (!r.tarea.aplicada && r.tarea.turnos > 0) this.veredicto(r, false)
    await rm(this.archivoEventos(id), { force: true })
    await rm(this.archivoParche(id), { force: true })
    this.registros.delete(id)
    this.emitir('quitada', id)
    this.guardarPronto()
  }

  // Trae los cambios a la carpeta real del usuario (solo el árbol de trabajo). Si algo choca, no se toca nada.
  async aplicar(id: string): Promise<{ ok: true; ficheros: number } | Fallo> {
    const r = this.registro(id)
    const previo = this.puedeLlevar(r, true)
    if (previo) return previo
    const copia = r.tarea.copia!
    let parche: string
    try { parche = await this.copias.parche(copia) } catch (e) { return { ok: false, error: mensajeDe(e) } }
    if (!parche.trim()) return { ok: false, error: 'No hay cambios que aplicar.' }
    if (r.tarea.aplicada?.modo === 'carpeta') return { ok: false, error: 'Ya está aplicada.' }
    const res = await this.copias.aplicar(copia.repo!, parche)
    if (!res.ok) return { ok: false, error: 'Tu carpeta ha cambiado en esos ficheros: no se aplicó nada.', ficheros: res.ficheros }
    const ficheros = r.tarea.cambios?.ficheros ?? (parche.match(/^diff --git /gm)?.length ?? 0)
    this.escribirParche(id, parche)
    r.tarea.aplicada = { cuando: this.ahora(), modo: 'carpeta', ficheros }
    this.cambio(r, true)
    this.veredicto(r, true)
    return { ok: true, ficheros }
  }

  async deshacer(id: string): Promise<{ ok: true } | Fallo> {
    const r = this.registro(id)
    if (r.tarea.aplicada?.modo !== 'carpeta' || !r.tarea.copia?.repo) return { ok: false, error: 'No hay nada que deshacer.' }
    let parche: string
    try { parche = await readFile(this.archivoParche(id), 'utf8') } catch { return { ok: false, error: 'No se encuentra el parche aplicado: no se puede deshacer.' } }
    const res = await this.copias.aplicar(r.tarea.copia.repo, parche, { inverso: true })
    if (!res.ok) return { ok: false, error: 'Tu carpeta ha cambiado en esos ficheros: no se deshizo nada.', ficheros: res.ficheros }
    await rm(this.archivoParche(id), { force: true })
    r.tarea.aplicada = undefined
    this.cambio(r, true)
    return { ok: true }
  }

  async guardarEnRama(id: string, mensaje?: string): Promise<{ ok: true; commit: string } | Fallo> {
    const r = this.registro(id)
    const previo = this.puedeLlevar(r, true)
    if (previo) return previo
    try {
      const commit = await this.copias.commit(r.tarea.copia!, mensaje?.trim() || `Esme: ${r.tarea.titulo}`)
      if (!commit) return { ok: false, error: 'No hay cambios que guardar.' }
      r.tarea.aplicada = { cuando: this.ahora(), modo: 'rama', commit, ficheros: r.tarea.cambios?.ficheros ?? 0 }
      this.cambio(r, true)
      this.veredicto(r, true)
      return { ok: true, commit }
    } catch (e) { return { ok: false, error: mensajeDe(e) } }
  }

  async exportar(id: string, destino: string): Promise<{ ok: true } | Fallo> {
    const r = this.registro(id)
    const previo = this.puedeLlevar(r, false)
    if (previo) return previo
    try {
      await this.copias.exportar(r.tarea.copia!, destino)
      r.tarea.aplicada = { cuando: this.ahora(), modo: 'exportada', ficheros: r.tarea.cambios?.ficheros ?? 0, destino }
      this.cambio(r, true)
      this.veredicto(r, true)
      return { ok: true }
    } catch (e) { return { ok: false, error: mensajeDe(e) } }
  }

  async veredictos(): Promise<Veredicto[]> {
    let texto = ''
    try { texto = await readFile(join(this.dir, 'veredictos.jsonl'), 'utf8') } catch { return [] }
    return texto.split('\n').filter(Boolean).flatMap((l) => { try { return [JSON.parse(l) as Veredicto] } catch { return [] } })
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
    return { tarea, config: {}, eventos: [], parcial, ids: new Set(), cubo: Math.floor((tarea.actividadMs || finCubo(this.ahora())) / MS_CUBO) - 1, inicioTurno: 0,
      cancelado: false, descartada: false, ultimoEmitido: 0 }
  }

  private registro(id: string): Registro {
    const r = this.registros.get(id)
    if (!r) throw new Error('La tarea no existe.')
    return r
  }

  // Comprobaciones comunes de aplicar, guardar en rama y exportar, en el orden del plan.
  private puedeLlevar(r: Registro, conRepo: boolean): Fallo | null {
    const c = r.tarea.copia
    if (conRepo && (!c || c.repo === null)) return { ok: false, error: 'Esta tarea está en una carpeta nueva: guárdala donde quieras.' }
    if (!conRepo && c && c.repo !== null) return { ok: false, error: 'Solo se exporta una tarea hecha en una carpeta nueva.' }
    if (ACTIVAS.includes(r.tarea.estado)) return { ok: false, error: 'Espera a que termine.' }
    if (!c) return { ok: false, error: 'La tarea no tiene copia.' }
    return null
  }

  private veredicto(r: Registro, exito: boolean): void {
    const v: Veredicto = { ts: this.ahora(), motor: r.tarea.motor, modelo: r.tarea.modelo, exito }
    try { mkdirSync(this.dir, { recursive: true }); appendFileSync(join(this.dir, 'veredictos.jsonl'), JSON.stringify(v) + '\n') } catch { /* no debe romper la operación */ }
  }

  private escribirParche(id: string, parche: string): void {
    try { mkdirSync(this.dir, { recursive: true }); writeFileSync(this.archivoParche(id), parche) } catch { /* sin parche no habrá deshacer */ }
  }

  private archivoParche = (id: string) => join(this.dir, `${id}.aplicado.patch`)

  private archivoEventos = (id: string) => join(this.dir, `${id}.jsonl`)

  private async ejecutar(r: Registro, texto: string): Promise<void> {
    const t = r.tarea
    const parada = () => {
      if (!r.cancelado || r.descartada || this.cerrado) return false
      t.estado = 'parada'; t.fin = this.ahora(); this.cambio(r, true)
      return true
    }
    try {
      if (!t.copia) t.copia = await this.copias.crear({ carpeta: t.carpeta, id: t.id, dirCopias: this.dirCopias })
      if (parada()) return
      if (!r.sesion) {
        const motor = r.motor!
        r.sesion = await this.abrirSesion({ comando: motor.comando, args: motor.args, cwd: t.copia.ruta, mcp: this.mcp() ?? undefined, config: { ...r.config },
          alEvento: (e) => this.alEvento(r, e), alPedirPermiso: (p) => this.alPedirPermiso(r, p) })
      }
      if (r.descartada || this.cerrado || parada()) return
      t.estado = 'trabajando'; this.cambio(r, true)
      r.inicioTurno = this.ahora()
      this.registrar(r, { tipo: 'usuario', texto })
      const motivo = await this.preguntar(r, texto)
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

  // Los proveedores gratis limitan las peticiones a la vez: ante un límite se reintenta con espera creciente, y se cuenta.
  private async preguntar(r: Registro, texto: string): Promise<string> {
    for (let intento = 0; ; intento++) {
      try { return await r.sesion!.preguntar(texto) } catch (e) {
        const motivo = e instanceof Error ? e.message : String(e)
        const limite = /rate limit|too many requests|\b429\b|quota exceeded/i.test(motivo)
        if (!limite || intento >= this.esperas.length || r.cancelado || r.descartada || this.cerrado) throw e
        const ms = this.esperas[intento]
        this.registrar(r, { tipo: 'reintento', ms, motivo })
        this.cambio(r, true)
        const fin = Date.now() + ms
        while (Date.now() < fin && !r.cancelado && !r.descartada && !this.cerrado) await new Promise((ok) => setTimeout(ok, Math.min(250, fin - Date.now())))
        if (r.cancelado) return 'cancelled'
      }
    }
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
    if (e.tipo === 'opciones') {
      t.opciones = e.opciones
      const m = e.opciones.find((x) => x.id === 'model')
      t.modelo = m ? (m.valores.find((v) => v.id === m.actual)?.nombre ?? m.actual) : null
      this.registrar(r, e); this.cambio(r, true)
      return
    }
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
    r.total ??= this.contarEventos(r.tarea.id)
    this.anotarEvento(r.tarea.id, e)
    this.emitir('evento', { id: r.tarea.id, n: r.total++, evento: e })
  }

  // Reparte los eventos por cubos de reloj de 1,5 s: el último es el actual.
  private actividad(r: Registro): void {
    const actual = Math.floor(this.ahora() / MS_CUBO)
    const a = r.tarea.actividad
    const saltos = Math.min(Math.max(actual - r.cubo, 0), CUBOS)
    for (let i = 0; i < saltos; i++) { a.shift(); a.push(0) }
    r.cubo = Math.max(actual, r.cubo)
    r.tarea.actividadMs = (r.cubo + 1) * MS_CUBO
    a[CUBOS - 1]++
  }

  private contarEventos(id: string): number {
    try { return readFileSync(this.archivoEventos(id), 'utf8').split('\n').filter(Boolean).length } catch { return 0 }
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
