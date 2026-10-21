// Runtime del Taller: tareas con motores ACP, cada una en su copia aislada, con permisos, uso, cambios y persistencia.
import type { McpServer } from '@agentclientprotocol/sdk'
import { randomBytes } from 'node:crypto'
import { appendFileSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { readFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { abrirSesionACP, type EventoMotor, type OpcionConfig } from '../motores/sesion-acp'
import { ClienteCerebro } from '../mente/cliente'
import { bloqueEquipo, bloqueHerencia, heredar, heredarEquipo, type Mente } from './herencia'
import { leeCurva } from './curva-io'
import type { Curva } from './curva'
import { errorDelProveedor, esTemporal, sesionMuerta } from './fallos'
import { esNegativaTexto } from './negativa'
import { leeRoles, textoConRol, type Rol } from './roles'
import { otroModeloGratis } from './gratis'
import { autoRespuesta, type Acceso } from './acceso'
import { declaradas, enjaular } from '../motores/jaula'
import { aplicarParche, cambiosCopia, commitCopia, crearCopia, diffCopia, exportarCopia, parcheCopia, puntosCopia, quitarCopia, volverAlPunto, type Cambios, type Copia, type Punto } from './copias'
import { mensajeTurno, turnosDe } from './turnos'

export type EstadoTarea = 'preparando' | 'trabajando' | 'esperando' | 'lista' | 'parada' | 'error'
export type Permiso = { titulo: string; opciones: { id: string; nombre: string; tipo: string }[]; clase?: string }   // clase: read, edit, execute, fetch… (ACP)
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
  rol?: string     // el oficio del motor en esa arena (constructor, revisor, probador…)
  acceso?: Acceso   // cuánto puede hacer sin preguntarte (taller/acceso.ts); las antiguas, sin campo, preguntan todo
  objetivo?: string   // el objetivo del rumbo al que sirve esta tarea (id del objetivo en la mente)
  credenciales?: { vistas: string[]; ocultas: string[] }   // la jaula: qué credenciales ve el agente y cuáles no
}
export type MotorElegido = { id: string; nombre: string; comando: string; args: string[]; env?: Record<string, string>; entrarCon?: string }
export type SesionMotor = { preguntar(texto: string): Promise<string>; cancelar(): Promise<void>; cerrar(): void; configurar(id: string, valor: string): Promise<void> }
export type AbrirSesion = (o: { comando: string; args: string[]; cwd: string; env?: Record<string, string>; permitidas?: string[]; mcp?: { nombre: string; url: string; token: string }; masMcp?: McpServer[]; config?: Record<string, string>
  alEvento(e: EventoMotor): void; alPedirPermiso(p: Permiso): Promise<string | 'cancelar'> }) => Promise<SesionMotor>
export type OperacionesCopia = { crear: typeof crearCopia; cambios: typeof cambiosCopia; diff: typeof diffCopia; quitar: typeof quitarCopia
  parche: typeof parcheCopia; aplicar: typeof aplicarParche; commit: typeof commitCopia; exportar: typeof exportarCopia
  puntos: typeof puntosCopia; volver: typeof volverAlPunto }
export type Aplicada = { cuando: number; modo: 'carpeta' | 'rama' | 'exportada'; ficheros: number; destino?: string; commit?: string }
export type Veredicto = { ts: number; motor: string; modelo: string | null; exito: boolean; tarea?: string }
// El delta de uso real de un turno, para el Uso de la app: cada tarea levanta su historia.
export type Anoto = { motorId: string; motorNombre: string; modelo: string | null; origen: 'taller' | 'arena'; tareaId: string; titulo: string
  delta: { entrada: number; salida: number; pensamiento: number }; coste?: { cantidad: number; moneda: string } }
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
  usoEscrito?: { entrada: number; salida: number; pensamiento: number; contexto: number; coste?: number }   // lo que ya llegó al Uso: los turnos anotan su delta
  textoUltimo?: string   // el último mensaje del motor del turno (los trozos del ACP se juntan): aquí mira la negativa
}

const finCubo = (ms: number) => (Math.floor(ms / MS_CUBO) + 1) * MS_CUBO
const mensajeDe = (e: unknown) => (e instanceof Error ? e.message : String(e))
const nuevoId = () => Array.from(randomBytes(8), (b) => 'abcdefghijklmnopqrstuvwxyz0123456789'[b % 36]).join('')
const instantanea = (t: Tarea): Tarea => ({ ...t, uso: { ...t.uso }, actividad: [...t.actividad] })

// El vigilante: cada cuánto se mira si algún motor se ha muerto en silencio, y cuánto se le
// concede antes de darlo por muerto. Medido en las tareas reales (20-oct): una tarea se quedó
// «trabajando» tres días con el motor muerto, sin un solo error; su trabajo, al menos, quedó a
// salvo en la copia. Treinta minutos sin una señal es un motor muerto, no uno que piensa.
const MS_VIGILIA = 30_000
const MS_SILENCIO = 30 * 60_000

export class Taller {
  private readonly registros = new Map<string, Registro>()
  private readonly dir: string
  private readonly dirCopias: string
  private readonly emitir: (canal: 'cambio' | 'evento' | 'quitada', dato: unknown) => void
  private readonly abrirSesion: AbrirSesion
  private readonly copias: OperacionesCopia
  private readonly mcp: () => Mcp | null
  private readonly masMcp: () => McpServer[]
  private readonly mente: () => Mente | null
  private readonly resolverMotor?: (id: string) => Promise<MotorElegido | null>
  private readonly alAnotar?: (a: Anoto) => void
  private readonly ahora: () => number
  private readonly esperas: number[]
  private readonly intervaloVigila: number
  private readonly silencioMaximo: number
  private guardado?: NodeJS.Timeout
  private vigilante?: NodeJS.Timeout
  private cerrado = false

  constructor(o: { dir: string; emitir(canal: 'cambio' | 'evento' | 'quitada', dato: unknown): void
    abrirSesion?: AbrirSesion; copias?: OperacionesCopia; mcp?: () => Mcp | null; masMcp?: () => McpServer[]
    mente?: () => Mente | null
    resolverMotor?: (id: string) => Promise<MotorElegido | null>; alAnotar?: (a: Anoto) => void; ahora?: () => number; esperasReintento?: number[]
    vigilarMs?: number; silencioMs?: number }) {
    this.dir = o.dir
    this.dirCopias = join(o.dir, 'copias')
    this.emitir = o.emitir
    this.abrirSesion = o.abrirSesion ?? ((x) => abrirSesionACP(x))
    this.copias = o.copias ?? { crear: crearCopia, cambios: cambiosCopia, diff: diffCopia, quitar: quitarCopia, parche: parcheCopia, aplicar: aplicarParche, commit: commitCopia, exportar: exportarCopia, puntos: puntosCopia, volver: volverAlPunto }
    this.mcp = o.mcp ?? (() => null)
    this.masMcp = o.masMcp ?? (() => [])
    this.mente = o.mente ?? (() => null)
    this.resolverMotor = o.resolverMotor
    this.alAnotar = o.alAnotar
    this.ahora = o.ahora ?? Date.now
    this.esperas = o.esperasReintento ?? [8000, 20_000, 45_000]
    this.intervaloVigila = o.vigilarMs ?? MS_VIGILIA
    this.silencioMaximo = o.silencioMs ?? MS_SILENCIO
  }

  /** El vigilante: una tarea cuyo motor no da señales desde hace media hora tiene el motor muerto.
   *
   * No se mata a la ligera: se marca como error con un mensaje claro (para que la reencarnación
   * sea una mano) y su trabajo sigue a salvo en la copia. Sólo se mira mientras hay tareas en
   * marcha: en reposo no se hace nada.
   */
  private mirarSilencios(): void {
    const ahora = this.ahora()
    for (const r of this.registros.values()) {
      const t = r.tarea
      if (t.estado !== 'trabajando' || !t.actividadMs) continue
      const silencio = ahora - t.actividadMs
      if (silencio < this.silencioMaximo) continue
      const minutos = Math.round(silencio / 60000)
      t.estado = 'error'
      t.error = `El motor dejó de responder (${minutos} min sin señales).`
      t.fin = ahora
      this.registrar(r, { tipo: 'fallo', mensaje: t.error })
      r.sesion?.cerrar(); r.sesion = undefined
      this.cambio(r, true)
    }
  }

  private arrancarVigilante(): void {
    if (this.vigilante || this.cerrado) return
    this.vigilante = setInterval(() => {
      if (![...this.registros.values()].some((r) => ACTIVAS.includes(r.tarea.estado))) { this.pararVigilante(); return }
      this.mirarSilencios()
    }, this.intervaloVigila)
    this.vigilante.unref?.()
  }

  private pararVigilante(): void {
    if (this.vigilante) { clearInterval(this.vigilante); this.vigilante = undefined }
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
      const r = this.registroNuevo(t, true)
      // tras reiniciar, la sesión que se reabra debe pedir el modelo y el modo que la tarea usaba, no los de la config del motor
      r.config = Object.fromEntries((t.opciones ?? []).filter((o) => o.id === 'model' || o.id === 'mode' || o.id === 'credenciales').map((o) => [o.id, o.actual]))
      this.registros.set(t.id, r)
    }
  }

  crear(p: { motor: MotorElegido; carpeta: string | null; texto: string; config?: Record<string, string>; arena?: string; acceso?: Acceso; rol?: Rol; objetivo?: string }): Tarea {
    let id = nuevoId()
    while (this.registros.has(id)) id = nuevoId()
    const titulo = (p.texto.split('\n').find((l) => l.trim()) ?? '').trim().slice(0, 120)
    // El oficio va delante del encargo: el motor sabe de entrada para qué está trabajando.
    const encargo = textoConRol(p.texto, p.rol)
    const tarea: Tarea = { id, titulo, texto: encargo, motor: p.motor.id, motorNombre: p.motor.nombre, carpeta: p.carpeta, ...(p.arena ? { arena: p.arena } : {}),
      ...(p.rol ? { rol: p.rol.nombre } : {}),
      estado: 'preparando', copia: null, inicio: this.ahora(), turnos: 0, herramientas: 0, cambios: null,
      uso: { entrada: 0, salida: 0, pensamiento: 0 }, permiso: null, actividad: new Array(CUBOS).fill(0), actividadMs: 0, opciones: [], modelo: null,
      acceso: p.acceso ?? 'ediciones', ...(p.objetivo ? { objetivo: p.objetivo } : {}) }
    tarea.actividadMs = finCubo(tarea.inicio)
    const r = this.registroNuevo(tarea, false)
    r.motor = p.motor; r.config = { ...p.config }
    this.registros.set(id, r)
    this.cambio(r, true)
    void this.ejecutar(r, encargo)
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

  /** Si la jaula escondió credenciales, el error lo dice: si la tarea falló por una llave que no
   *  vio, el motivo tiene que estar a la vista (si no, el fallo es una adivinanza).
   *  Los nombres se acotan: con treinta llaves escondidas el mensaje deja de explicar nada. */
  private conLaJaula(error: string, t: Tarea): string {
    const ocultas = t.credenciales?.ocultas ?? []
    if (!ocultas.length) return error
    const n = ocultas.length
    const algunas = ocultas.slice(0, 3).join(', ') + (n > 3 ? ` y ${n - 3} más` : '')
    return `${error} — La jaula escondió ${n === 1 ? 'una credencial' : `${n} credenciales`} (${algunas}). Si esta tarea la necesita, declárala en la opción «credenciales».`
  }

  /** El punto del turno: un commit en la rama de la tarea.
   *
   * Es lo que permite deshacer **un turno** y no la tarea entera. No guarda estado nuevo: los
   * puntos son los commits de la rama. Si el commit falla, la tarea sigue (el punto es un extra).
   */
  private async punto(r: Registro, n: number): Promise<void> {
    const copia = r.tarea.copia
    if (!copia?.ruta) return
    try { await this.copias.commit(copia, mensajeTurno(n)) } catch { /* el punto es un extra */ }
  }

  /** Los puntos de la tarea: un commit por turno, con su número. */
  async puntos(id: string): Promise<{ ok: true; puntos: Punto[] } | Fallo> {
    const r = this.registro(id)
    const copia = r.tarea.copia
    if (!copia?.ruta) return { ok: false, error: 'Esta tarea no tiene copia donde mirar.' }
    try { return { ok: true, puntos: await this.copias.puntos(copia) } }
    catch (e) { return { ok: false, error: mensajeDe(e) } }
  }

  /** Deshacer **un turno**: la copia vuelve al punto que se le diga.
   *
   * La rama de la tarea rebobina hasta ese punto: lo que vino después deja de estar en ella (queda
   * en su reflog). La carpeta del usuario no se toca nunca.
   */
  async deshacerTurno(id: string, sha: string): Promise<{ ok: true } | Fallo> {
    const r = this.registro(id)
    const copia = r.tarea.copia
    if (!copia?.ruta) return { ok: false, error: 'Esta tarea no tiene copia donde volver.' }
    if (!sha || !sha.trim()) return { ok: false, error: 'No hay punto al que volver.' }
    try { await this.copias.volver(copia, sha) }
    catch (e) { return { ok: false, error: mensajeDe(e) } }
    r.tarea.cambios = await this.copias.cambios(copia).catch(() => null)
    this.cambio(r, true)
    return { ok: true }
  }

  /** Deshacer el **último turno**: la copia vuelve al punto del turno anterior.
   *
   * Es lo mismo que deshacer un turno, pero sin que quien mira tenga que saber qué sha es cuál.
   */
  async deshacerUltimoTurno(id: string): Promise<{ ok: true; turno: number } | Fallo> {
    const r = this.registro(id)
    const copia = r.tarea.copia
    if (!copia?.ruta) return { ok: false, error: 'Esta tarea no tiene copia donde volver.' }
    let puntos: Punto[]
    try { puntos = await this.copias.puntos(copia) }
    catch (e) { return { ok: false, error: mensajeDe(e) } }
    const turnos = turnosDe(puntos)
    if (turnos.length < 2) return { ok: false, error: 'No hay ningún turno que deshacer.' }
    const anterior = turnos[turnos.length - 2]
    try { await this.copias.volver(copia, anterior.sha) }
    catch (e) { return { ok: false, error: mensajeDe(e) } }
    r.tarea.cambios = await this.copias.cambios(copia).catch(() => null)
    this.cambio(r, true)
    return { ok: true, turno: anterior.n }
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

  /** Los oficios del equipo: los del creador si ha puesto los suyos, si no los de casa. */
  roles(): Rol[] {
    return leeRoles(this.dir)
  }

  /** La curva: qué rindieron las tareas de verdad (aciertos por día, por motor y los fallos). */
  async curva(): Promise<Curva> {
    return leeCurva(this.dir)
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
    this.pararVigilante()
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
    // `tarea` es el id de la tarea: sin él, la curva del Taller sólo sabe el motor, no quién deliveró.
    const v: Veredicto = { ts: this.ahora(), motor: r.tarea.motor, modelo: r.tarea.modelo, exito, tarea: r.tarea.id }
    try { mkdirSync(this.dir, { recursive: true }); appendFileSync(join(this.dir, 'veredictos.jsonl'), JSON.stringify(v) + '\n') } catch { /* no debe romper la operación */ }
    // Y la mente se lo apunta: lo que tú te quedas o descartas es la lección del equipo.
    void this.aprenderEquipo()
  }

  /** Le cuenta a la mente cómo va el equipo (qué te quedas, qué descartas, qué se rompe). */
  async aprenderEquipo(): Promise<void> {
    const mente = this.mente()
    if (!mente) return
    try {
      // Sólo lo que la mente necesita para destilar la lección. El encargo va recortado: la mente
      // no necesita el texto entero, sí necesita saber QUÉ se le pidió, porque una tarea repetida
      // es la que se puede convertir en skill. Sin el texto, la mente sólo sabe que hubo una tarea.
      const tareas = this.lista().map((t) => ({ id: t.id, motor: t.motor, modelo: t.modelo, estado: t.estado, error: t.error, encargo: t.titulo }))
      // por la puerta: el token y el reloj son de la puerta, no de aquí
      await new ClienteCerebro(mente).equipo({ veredictos: await this.veredictos(), tareas })
    } catch { /* la mente no está o no contesta: la tarea sigue igual */ }
  }

  private escribirParche(id: string, parche: string): void {
    try { mkdirSync(this.dir, { recursive: true }); writeFileSync(this.archivoParche(id), parche) } catch { /* sin parche no habrá deshacer */ }
  }

  private archivoParche = (id: string) => join(this.dir, `${id}.aplicado.patch`)

  private archivoEventos = (id: string) => join(this.dir, `${id}.jsonl`)

  // El grifo del Uso: al cerrar cada turno anota el delta de trabajo real del motor (lista, parada o fallo).
  private anotarTurno(r: Registro): void {
    if (!this.alAnotar || !r.motor) return
    const t = r.tarea, e = r.usoEscrito ?? { entrada: 0, salida: 0, pensamiento: 0, contexto: 0 }
    const delta = { entrada: t.uso.entrada - e.entrada, salida: t.uso.salida - e.salida, pensamiento: (t.uso.pensamiento ?? 0) - e.pensamiento }
    const contexto = Math.max(0, (t.uso.contextoUsado ?? 0) - e.contexto)
    r.usoEscrito = { entrada: t.uso.entrada, salida: t.uso.salida, pensamiento: t.uso.pensamiento ?? 0, contexto: t.uso.contextoUsado ?? 0, coste: t.uso.coste?.cantidad }
    // Motores que solo cuentan el contexto (el usage del ACP): los tokens leídos son el uso honesto que puede verse.
    const entrada = delta.entrada > 0 ? delta.entrada : contexto
    if (entrada + delta.salida + delta.pensamiento <= 0) return
    // El coste en cambio: los motores lo mandan acumulado; solo se anota cuando difiere del ya escrito.
    const coste = t.uso.coste && t.uso.coste.cantidad > 0 && t.uso.coste.cantidad !== e.coste ? t.uso.coste : undefined
    this.alAnotar({ motorId: r.motor.id, motorNombre: r.motor.nombre, modelo: t.modelo, origen: t.arena ? 'arena' : 'taller',
      tareaId: t.id, titulo: t.titulo, delta: { entrada, salida: delta.salida, pensamiento: delta.pensamiento }, ...(coste ? { coste } : {}) })
  }

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
        r.sesion = await this.abrirSesionDe(r)
      }
      if (r.descartada || this.cerrado || parada()) return
      t.estado = 'trabajando'; this.cambio(r, true)
      this.arrancarVigilante()
      r.inicioTurno = this.ahora()
      this.registrar(r, { tipo: 'usuario', texto })
      // La herencia: el primer turno de la tarea empieza con lo que la mente ya sabe del encargo.
      // Solo el primero: en los turnos siguientes el motor ya lo tiene en su conversación.
      let mensaje = texto
      if (t.turnos === 0) {
        const h = await heredar(this.mente(), texto)
        if (h) {
          this.registrar(r, { tipo: 'herencia', tokens: h.tokens, recuerdos: h.ids.length })
          mensaje = bloqueHerencia(h) + texto
        }
        // Y lo que la mente aprendió del equipo: qué motor acierta contigo y qué se rompe siempre.
        const e = await heredarEquipo(this.mente())
        if (e) mensaje = bloqueEquipo(e) + mensaje
      }
      // Cada turno mira lo que el motor diga EN ESTE turno: el texto del anterior no mancha este.
      r.textoUltimo = ''
      const motivo = await this.preguntar(r, mensaje)
      if (r.descartada || this.cerrado) return
      this.registrar(r, { tipo: 'fin', motivo, ms: this.ahora() - r.inicioTurno })
      const cambios = await this.copias.cambios(t.copia).catch(() => null)
      t.cambios = cambios
      t.turnos++; t.fin = this.ahora()
      // El punto del turno: el estado de la copia tal como quedó. Deshacer un turno, no la tarea.
      await this.punto(r, t.turnos)
      // La negativa, con palabras o por el motivo del ACP: no es un éxito (el motor pudo y no quiso) ni «lista».
      const negado = motivo === 'refusal' || (motivo === 'end_turn' && esNegativaTexto(r.textoUltimo))
      if (negado) {
        t.estado = 'error'
        t.error = motivo === 'refusal' ? `${t.motorNombre} se negó a hacer el encargo` : `${t.motorNombre} se negó a hacerlo`
        this.registrar(r, { tipo: 'fallo', mensaje: t.error })
        r.sesion?.cerrar(); r.sesion = undefined
        void this.aprenderEquipo()   // lo que se niega también es una lección para el equipo
      } else {
        t.estado = motivo === 'cancelled' ? 'parada' : 'lista'
      }
      this.anotarTurno(r)
    } catch (e) {
      if (r.descartada || this.cerrado) return
      t.estado = 'error'; t.error = this.conLaJaula(e instanceof Error ? e.message : String(e), t); t.fin = this.ahora()
      this.registrar(r, { tipo: 'fallo', mensaje: t.error })
      this.anotarTurno(r)
      // Lo que se rompe también es una lección: la mente se lo apunta para el siguiente encargo.
      void this.aprenderEquipo()
      r.sesion?.cerrar(); r.sesion = undefined
    }
    r.resolverPermiso = undefined; t.permiso = null
    this.cambio(r, true)
  }

  // Los proveedores gratis limitan las peticiones a la vez: ante un límite, primero se pasa a otro modelo gratis del mismo
  // motor (sin esperar); si no quedan, se reintenta con espera creciente. Lo mismo con lo temporal (la red o el
  // proveedor se caen un rato) y con la sesión del motor que se cierra: se reintenta, y si la sesión está muerta se abre otra.
  // Todo se cuenta en la línea de tiempo. Lo que necesita al creador (entrar en su cuenta) no se reintenta: no se arregla.
  private async preguntar(r: Registro, texto: string): Promise<string> {
    const probados = new Set<string>()
    for (let intento = 0; ; ) {
      try { return await r.sesion!.preguntar(texto) } catch (e) {
        const motivo = e instanceof Error ? e.message : String(e)
        const limite = /rate limit|too many requests|\b429\b|quota exceeded/i.test(motivo)
        const muerta = sesionMuerta(motivo)
        const temporal = esTemporal(motivo) || (errorDelProveedor(motivo) && intento < 1)
        if (limite && !r.cancelado && !r.descartada && !this.cerrado) {
          const actual = r.tarea.opciones?.find((o) => o.id === 'model')?.actual
          if (actual) probados.add(actual)
          const otro = probados.size <= 5 ? otroModeloGratis(r.tarea.opciones, probados) : null
          if (otro) {
            await r.sesion!.configurar('model', otro).catch(() => {})
            probados.add(otro)
            this.registrar(r, { tipo: 'reintento', ms: 0, motivo: `${motivo} · paso a ${otro}` })
            this.cambio(r, true)
            continue
          }
        }
        if ((!limite && !temporal && !muerta) || intento >= this.esperas.length || r.cancelado || r.descartada || this.cerrado) throw e
        const ms = this.esperas[intento++]
        this.registrar(r, { tipo: 'reintento', ms, motivo: muerta ? `${motivo} · abro sesión nueva` : motivo })
        this.cambio(r, true)
        const fin = Date.now() + ms
        while (Date.now() < fin && !r.cancelado && !r.descartada && !this.cerrado) await new Promise((ok) => setTimeout(ok, Math.min(250, fin - Date.now())))
        if (r.cancelado) return 'cancelled'
        if (muerta) {
          // la sesión está cerrada: se abre otra y se sigue por donde iba
          r.sesion?.cerrar(); r.sesion = undefined
          r.sesion = await this.abrirSesionDe(r)
        }
      }
    }
  }

  /** Abre la sesión del motor de una tarea (la primera vez y cuando la anterior se muere). */
  private async abrirSesionDe(r: Registro): Promise<SesionMotor> {
    const t = r.tarea
    const motor = r.motor!
    const permitidas = declaradas(r.config?.credenciales)
    const jaula = enjaular({ ...process.env, ...motor.env }, [...Object.keys(motor.env ?? {}), ...permitidas])
    t.credenciales = { vistas: jaula.vistas, ocultas: jaula.ocultas }
    return this.abrirSesion({ comando: motor.comando, args: motor.args, cwd: t.copia!.ruta, env: motor.env, permitidas, ...(motor.entrarCon ? { entrarCon: motor.entrarCon } : {}), mcp: this.mcp() ?? undefined, masMcp: this.masMcp(), config: { ...r.config },
      alEvento: (e) => this.alEvento(r, e), alPedirPermiso: (p) => this.alPedirPermiso(r, p) })
  }

  private alPedirPermiso(r: Registro, p: Permiso): Promise<string | 'cancelar'> {
    if (r.cancelado) return Promise.resolve('cancelar')
    // lo que el modo de acceso de la tarea permite se aprueba solo, y queda anotado en su historia
    const auto = autoRespuesta(r.tarea.acceso ?? 'preguntar', p.clase, p.opciones)
    if (auto) { this.registrar(r, { tipo: 'aprobado', titulo: p.titulo, ...(p.clase ? { clase: p.clase } : {}) }); return Promise.resolve(auto) }
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
    if (e.tipo === 'texto') r.textoUltimo = (r.textoUltimo ?? '') + e.texto
    // lo que interrumpe el mensaje (pensar, herramienta, plan) corta: lo que manda es lo ÚLTIMO que dijo
    else if (e.tipo === 'pensamiento' || e.tipo === 'herramienta' || e.tipo === 'plan') r.textoUltimo = ''
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
