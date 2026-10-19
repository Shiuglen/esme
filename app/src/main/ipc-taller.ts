// Canales IPC del Taller: motores detectados, tareas, permisos, diff y eventos en vivo hacia las ventanas.
import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import { spawn } from 'node:child_process'
import { access, constants, mkdtemp, rm } from 'node:fs/promises'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'
import { detectarMotores, type Cumplimiento } from './motores/acp-motores'
import { cargarRegistro } from './motores/catalogo-registry'
import { credencialesDe } from './motores/credenciales'
import { instaladosNpm, lanzarRegistro, paqueteDe, type GlobalesNpm } from './motores/registro-lanzar'
import { crearWhich, extsPlataforma } from './motores/which'
import { guardarEntrada, leerEntradas } from './motores/entrada'
import { abrirSesionACP, metodosDeEntrada, type MetodoEntrada, type OpcionConfig } from './motores/sesion-acp'
import { anotarConsumo } from './ipc-proveedores'
import { keys } from './keys'
import { Taller, type MotorElegido } from './taller/taller'
import { mcpParaTaller } from './herramientas/ipc'
import { servirCopia, type Servidor } from './taller/vista-previa'
import { accesoValido } from './taller/acceso'
import { guardarAgenda, leerAgenda, nuevoIdProgramado, proximaVez, tocan, validarProgramado, type Programado } from './taller/agenda'

export type MotorTaller = { id: string; nombre: string; instalado: boolean; cumplimiento: Cumplimiento; login: string; nota: string; via?: 'local' | 'registro'; instalacion?: string | null; credencia?: string | null }

const ID = /^[a-z0-9]{6,16}$/
const MAX_TEXTO = 20_000
let taller: Taller | null = null
let relojAgenda: NodeJS.Timeout | null = null
let agenda: Programado[] = []
let alLanzarProgramado: (p: Programado) => void = () => {}
/** Lo que tu equipo tiene pendiente (para decidir si Esme se queda junto al reloj al cerrar la ventana). */
export function pendienteTaller() {
  const ahora = Date.now(), proximas = agenda.map((p) => proximaVez(p, ahora)).filter((x): x is number => x !== null)
  return { programados: proximas.length, trabajando: taller?.lista().filter((x) => x.estado === 'trabajando' || x.estado === 'preparando').length ?? 0, proxima: proximas.length ? Math.min(...proximas) : null }
}
export const alLanzar = (fn: (p: Programado) => void) => { alLanzarProgramado = fn }

// Para las manos de la conversación (main/herramientas/propias.ts): ver al equipo, encargarle y programar.
let programarInterno: ((p: unknown) => { ok: true } | { ok: false; error: string }) | null = null
// el agente que mejor ha trabajado: el que más tareas dejó listas; si no hay historia, el primero instalado
async function agentePreferido(): Promise<string | null> {
  const cuenta = new Map<string, number>()
  for (const x of taller?.lista() ?? []) if (x.estado === 'lista') cuenta.set(x.motor, (cuenta.get(x.motor) ?? 0) + 1)
  const mejor = [...cuenta].sort((a, b) => b[1] - a[1])[0]?.[0]
  return mejor ?? (await motoresTaller()).find((m) => m.instalado)?.id ?? null
}
export const equipoParaChat = () => (taller?.lista() ?? []).slice().sort((a, b) => b.inicio - a.inicio).slice(0, 15)
  .map((x) => ({ titulo: x.titulo, estado: x.estado, agente: x.motorNombre }))
export async function encargarDesdeChat(encargo: string, agente?: string) {
  if (!taller) throw new Error('El Taller aún no está listo.')
  const id = agente ?? await agentePreferido()
  if (!id) throw new Error('No hay ningún agente instalado en el Taller.')
  const motor = await elegirMotor(id)
  if ('error' in motor) throw new Error(motor.error)
  const t = taller.crear({ motor, carpeta: null, texto: encargo })
  return { id: t.id, titulo: t.titulo, agente: t.motorNombre }
}
/** Tus agentes de este equipo, para hablar con ellos en la conversación (src/main/router/cerebro.ts). */
export const agentesParaConversar = async () => (await detectar()).map((m) => ({ id: m.id, nombre: m.nombre, instalado: m.instalado }))
export const motorParaConversar = (id: string) => elegirMotor(id)
/** Con quién seguir si el cerebro de la conversación se agota: primero el agente que mejor ha trabajado, luego los demás instalados. */
export async function agentesDeRespaldo(): Promise<MotorElegido[]> {
  const mejor = await agentePreferido()
  const ids = [...new Set([mejor, ...(await detectar()).filter((m) => m.instalado).map((m) => m.id)].filter((x): x is string => !!x))]
  const motores = await Promise.all(ids.map((id) => elegirMotor(id)))
  return motores.filter((m): m is MotorElegido => !('error' in m))
}
/** La carpeta de trabajo (copia aislada) de una tarea, para la Forja. */
export const copiaDeTarea = (id: string) => taller?.lista().find((x) => x.id === id)?.copia?.ruta ?? null
export const estadoDeTarea = (id: string) => taller?.lista().find((x) => x.id === id)?.estado ?? null
export async function programarDesdeChat(p: { texto: string; cuando: unknown; agente?: string }) {
  if (!programarInterno) return { ok: false as const, error: 'La agenda aún no está lista.' }
  const motor = p.agente ?? await agentePreferido()
  if (!motor) return { ok: false as const, error: 'No hay ningún agente instalado en el Taller.' }
  return programarInterno({ motor, carpeta: null, texto: p.texto, cuando: p.cuando })
}
const vistas = new Map<string, Servidor>()
const cerrarVista = (id: string) => { vistas.get(id)?.cerrar(); vistas.delete(id) }
// Dónde está la web dentro de la copia: la raíz o una de las carpetas habituales.
async function buscarIndice(raiz: string): Promise<string | null> {
  for (const dir of ['', 'public', 'dist', 'docs', 'site', 'www', 'src', 'build']) {
    if (await access(join(raiz, dir, 'index.html'), constants.R_OK).then(() => true, () => false)) return dir
  }
  return null
}

const cacheOpciones = new Map<string, OpcionConfig[]>()
const textoCorto = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && v.length <= 200

// config: objeto plano de hasta 10 claves con valores string cortos; undefined si no es válido.
function configValida(v: unknown): Record<string, string> | undefined | null {
  if (v === undefined || v === null) return undefined
  if (typeof v !== 'object' || Array.isArray(v)) return null
  const e = Object.entries(v)
  if (e.length > 10 || !e.every(([k, x]) => textoCorto(k) && textoCorto(x))) return null
  return Object.fromEntries(e) as Record<string, string>
}

// Abre el motor en una carpeta temporal, recoge sus opciones (600 ms tras la última, máx. 3 s) y lo cierra.
async function sondear(motor: MotorElegido): Promise<OpcionConfig[]> {
  const cwd = await mkdtemp(join(tmpdir(), 'esme-sondeo-'))
  let opciones: OpcionConfig[] = []
  let sesion: Awaited<ReturnType<typeof abrirSesionACP>> | null = null
  try {
    await new Promise<void>((fin) => {
      let calma: NodeJS.Timeout | undefined
      const tope = setTimeout(fin, 3000)
      const listo = () => { clearTimeout(tope); if (calma) clearTimeout(calma); fin() }
      abrirSesionACP({ comando: motor.comando, args: motor.args, cwd, env: motor.env, alPedirPermiso: async () => 'cancelar',
        alEvento: (e) => { if (e.tipo === 'opciones') { opciones = e.opciones; if (calma) clearTimeout(calma); calma = setTimeout(listo, 600) } } })
        .then((x) => { sesion = x }, listo)
    })
  } finally {
    (sesion as { cerrar(): void } | null)?.cerrar()
    await rm(cwd, { recursive: true, force: true })
  }
  return opciones
}

const emitir = (canal: string, dato: unknown) => { for (const w of BrowserWindow.getAllWindows()) if (!w.isDestroyed()) w.webContents.send(canal, dato) }
const mensaje = (e: unknown) => (e instanceof Error ? e.message : String(e))
const idValido = (v: unknown): v is string => typeof v === 'string' && ID.test(v)
const textoValido = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0 && v.length <= MAX_TEXTO

function detectar() {
  const existe = (r: string) => access(r, constants.X_OK).then(() => true, () => false)
  return detectarMotores(crearWhich(process.env.PATH, existe, { exts: extsPlataforma(process.platform, process.env.PATHEXT) }))
}

async function motoresTaller(): Promise<MotorTaller[]> {
  // Locales: los 12 verificados con `which`. Registro: el catálogo vivo de ACP (42+); si su paquete npm ya
  // vive globalmente en el equipo, se marca instalado de verdad aun cuando su arranque aún no esté cableado.
  const locales = (await detectar())
    .map((m) => ({ id: m.id, nombre: m.nombre, instalado: m.instalado, cumplimiento: m.cumplimiento, login: m.login, nota: m.nota, via: 'local' as const }))
    .sort((a, b) => Number(b.instalado) - Number(a.instalado))
  const idsLocales = new Set(locales.map((m) => m.id))
  const registro = await cargarRegistro(app.getPath('userData')).catch(() => [])
  const globales = await globalesConMemo().catch(() => new Map())
  const delRegistro = registro
    .filter((m) => !idsLocales.has(m.id))
    .map((m) => {
      const paquete = m.instalacion ? paqueteDe(m.instalacion) : null
      const colocado = !!paquete && globales.has(paquete)
      const credencial = credencialesDe(m.id, (i) => keys.get(i), join(app.getPath('userData'), 'motores'))?.nota
      return {
        id: m.id, nombre: m.nombre, instalado: colocado, cumplimiento: 'permitido' as Cumplimiento, via: 'registro' as const, instalacion: m.instalacion,
        credencia: credencial ?? null,
        login: colocado
          ? 'Instalado de verdad (npm global) y listo para arrancar desde el Taller.'
          : m.repo ? `Código y sesión: ${m.repo}${m.instalacion ? ` · instalar así: \`${m.instalacion}\`` : ''}` : 'Revisa su repositorio para instalarlo.',
        nota: colocado
          ? credencial ? `Instalado y ${credencial}; pídele tareas en el Taller.` : 'Instalado de verdad; arranca desde el Taller.'
          : m.descripcion ? `${m.descripcion} (del registro ACP; no puede arrancar hasta que esté instalado).` : 'Motor del registro ACP; no puede arrancar hasta que esté instalado.',
      }
    })
  return [...locales, ...delRegistro]
}

// Los paquetes globales npm, con memoria breve: 45 consultas serían un gasto, una cada minuto es un suspiro.
let globalesMemo: { cuando: number; nombres: GlobalesNpm } | null = null
function globalesConMemo(): Promise<GlobalesNpm> {
  if (globalesMemo && Date.now() - globalesMemo.cuando < 60_000) return Promise.resolve(globalesMemo.nombres)
  return instaladosNpm().then((nombres) => { globalesMemo = { cuando: Date.now(), nombres }; return nombres })
}

async function elegirMotor(id: unknown): Promise<MotorElegido | { error: string }> {
  const m = await elegirMotorSinEntrada(id)
  const entrarCon = typeof id === 'string' ? leerEntradas(ficheroEntradas())[id] : undefined
  return 'error' in m || !entrarCon ? m : { ...m, entrarCon }
}
const ficheroEntradas = () => join(app.getPath('userData'), 'motores', 'entrada.json')

async function elegirMotorSinEntrada(id: unknown): Promise<MotorElegido | { error: string }> {
  if (typeof id !== 'string') return { error: 'Motor no válido.' }
  const m = (await detectar()).find((x) => x.id === id)
  if (m) {
    if (!m.instalado || !m.ruta) return { error: `«${m.nombre}» no está instalado en este equipo.` }
    return { id: m.id, nombre: m.nombre, comando: m.ruta, args: m.args }
  }
  // Escalón del registro: motor instalado por el propio Taller (`npm install -g`) y lanzado por el puente,
  // con las credenciales del llavero si el motor las pide y el llavero las tiene.
  const registro = await cargarRegistro(app.getPath('userData')).catch(() => [])
  const r = registro.find((x) => x.id === id)
  if (!r) return { error: 'Motor no válido.' }
  const globales = await globalesConMemo().catch(() => new Map())
  const lanzable = await lanzarRegistro(r, globales)
  if ('error' in lanzable) return { error: `«${r.nombre}»: ${lanzable.error}` }
  const carpetaMotores = join(app.getPath('userData'), 'motores')
  const credencial = credencialesDe(r.id, (i) => keys.get(i), carpetaMotores)
  return {
    id: r.id, nombre: r.nombre, comando: lanzable.comando,
    args: [...lanzable.args, ...(credencial?.argsExtra ?? [])],
    env: credencial ? { ...lanzable.env, ...credencial.env } : lanzable.env,
  }
}

// ---------- El instalador y el puente del registro: el catálogo deja de mirar y empieza a hacer ----------
const instancias = new Set<string>()

/** Instala de verdad un motor del registro: `npm install -g <paquete>`, con el detalle corriendo en vivo. */
export async function instalarMotor(id: unknown, lanzar: typeof spawn = spawn): Promise<{ ok: true; nombre: string } | { ok: false; error: string }> {
  if (typeof id !== 'string' || !id || id.length > 80) return { ok: false, error: 'Datos no válidos.' }
  if (instancias.has(id)) return { ok: false, error: 'Su instalación ya está corriendo.' }
  const registro = await cargarRegistro(app.getPath('userData')).catch(() => [])
  const m = registro.find((x) => x.id === id)
  if (!m) return { ok: false, error: 'Motor desconocido del registro.' }
  const paquete = m.instalacion ? paqueteDe(m.instalacion) : null
  if (!paquete) return { ok: false, error: 'Este motor no declara instalación automática: revisa su repositorio.' }
  instancias.add(id)
  try {
    return await new Promise((res) => {
      const p = lanzar(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['install', '-g', '--no-audit', '--no-fund', paquete], { env: process.env })
      let viviendo = true
      const reloj = setTimeout(() => { viviendo = false; p.kill('SIGKILL') }, 10 * 60_000)
      p.stdout?.on('data', (d: unknown) => emitir('taller:instalar-progreso', { id, trozo: String(d) }))
      p.stderr?.on('data', (d: unknown) => emitir('taller:instalar-progreso', { id, trozo: String(d) }))
      p.on('error', (e) => { clearTimeout(reloj); res({ ok: false, error: mensaje(e) }) })
      p.on('close', (code) => {
        clearTimeout(reloj)
        if (!viviendo) return res({ ok: false, error: 'La instalación agotó sus diez minutos.' })
        if (code === 0) { globalesMemo = null; emitir('taller:instalar-progreso', { id, listo: true }); return res({ ok: true, nombre: m.nombre }) }
        res({ ok: false, error: `npm terminó con código ${code}; mira su propio detalle en la terminal.` })
      })
    })
  } finally { instancias.delete(id) }
}

export function registerTaller(o: { brainInfo: () => { url: string; token: string } | null }) {
  const t = new Taller({
    dir: join(app.getPath('userData'), 'taller'),
    emitir: (canal, dato) => emitir(`taller:${canal}`, dato),
    mcp: () => { const i = o.brainInfo(); return i ? { nombre: 'esme', url: `${i.url}/mcp`, token: i.token } : null },
    masMcp: () => { try { return mcpParaTaller() } catch { return [] } },
    resolverMotor: async (id) => { const m = await elegirMotor(id); return 'error' in m ? null : m },
    // Cada turno que termina alimenta el Uso de la app: la historia del gasto real por tarea.
    alAnotar: (a) => anotarConsumo({ ts: Date.now(), proveedor: a.motorId, modelo: a.modelo ?? a.motorNombre, entrada: a.delta.entrada,
      salida: a.delta.salida + a.delta.pensamiento, origen: a.origen, tarea: a.tareaId, titulo: a.titulo,
      ...(a.coste ? { costeDirecto: { cantidad: a.coste.cantidad, moneda: a.coste.moneda } } : {}) }),
  })
  taller = t
  void t.cargar().catch((e) => console.error('[taller] no cargó:', mensaje(e)))

  const accion = async (f: () => Promise<unknown> | unknown) => {
    try { await f(); return { ok: true } } catch (e) { return { ok: false, error: mensaje(e) } }
  }
  const entrada = { ok: false, error: 'Datos no válidos.' }

  ipcMain.handle('taller:motores', () => motoresTaller())
  // Entrar en un agente que pide sesión (Cline, OpenCode, Qwen…): primero cómo se entra; luego Esme llama a authenticate con
  // el método elegido (algunos abren tu navegador para que entres con tu cuenta) y, si funciona, lo recuerda para siempre.
  ipcMain.handle('agentes:metodos', async (_e, id: unknown): Promise<{ ok: true; metodos: MetodoEntrada[]; actual: string | null } | { ok: false; error: string }> => {
    const m = await elegirMotorSinEntrada(id)
    if ('error' in m) return { ok: false, error: m.error }
    try { return { ok: true, metodos: await metodosDeEntrada({ comando: m.comando, args: m.args, cwd: tmpdir(), env: m.env }), actual: leerEntradas(ficheroEntradas())[m.id] ?? null } }
    catch (e) { return { ok: false, error: mensaje(e) } }
  })
  ipcMain.handle('agentes:entrar', async (_e, id: unknown, metodo: unknown) => {
    const m = await elegirMotorSinEntrada(id)
    if ('error' in m) return { ok: false, error: m.error }
    if (metodo === null) { guardarEntrada(ficheroEntradas(), m.id, null); return { ok: true } }
    if (!textoCorto(metodo)) return entrada
    let metodos: MetodoEntrada[]
    try { metodos = await metodosDeEntrada({ comando: m.comando, args: m.args, cwd: tmpdir(), env: m.env }) } catch (e) { return { ok: false, error: mensaje(e) } }
    const x = metodos.find((k) => k.id === metodo)
    if (!x) return { ok: false, error: 'Ese método no existe en este agente.' }
    if (x.terminal) return { ok: false, terminal: true, error: `«${x.nombre}» se hace en una terminal: ábrela en el Taller y escribe «${m.comando.split('/').pop()} ${m.args.join(' ')}».` }
    const cwd = await mkdtemp(join(tmpdir(), 'esme-entrar-'))
    try {
      const s = await abrirSesionACP({ comando: m.comando, args: m.args, cwd, env: m.env, entrarCon: x.id, alEvento: () => {}, alPedirPermiso: async () => 'cancelar' })
      s.cerrar()
      guardarEntrada(ficheroEntradas(), m.id, x.id)
      return { ok: true }
    } catch (e) { return { ok: false, error: mensaje(e) } }
    finally { await rm(cwd, { recursive: true, force: true }).catch(() => {}) }
  })
  ipcMain.handle('taller:instalarMotor', (_e, id: unknown) => instalarMotor(id))
  ipcMain.handle('taller:lista', () => t.lista())
  ipcMain.handle('taller:eventos', async (_e, id: unknown) => (idValido(id) ? t.eventos(id).catch(() => []) : []))
  ipcMain.handle('taller:crear', async (_e, p: { motor?: unknown; carpeta?: unknown; texto?: unknown; config?: unknown; arena?: unknown; acceso?: unknown } | null) => {
    const config = p ? configValida(p.config) : undefined
    if (!p || config === null || (p.arena !== undefined && !idValido(p.arena)) || !textoValido(p.texto) || !(p.carpeta === null || (typeof p.carpeta === 'string' && p.carpeta.length > 0))) return entrada
    const motor = await elegirMotor(p.motor)
    if ('error' in motor) return { ok: false, error: motor.error }
    try { return { ok: true, tarea: t.crear({ motor, carpeta: p.carpeta, texto: p.texto, config, ...(typeof p.arena === 'string' ? { arena: p.arena } : {}), ...(accesoValido(p.acceso) ? { acceso: p.acceso } : {}) }) } } catch (e) { return { ok: false, error: mensaje(e) } }
  })
  ipcMain.handle('taller:seguir', (_e, id: unknown, texto: unknown) => (idValido(id) && textoValido(texto) ? accion(() => t.seguir(id, texto)) : entrada))
  ipcMain.handle('taller:parar', (_e, id: unknown) => (idValido(id) ? accion(() => t.parar(id)) : entrada))
  ipcMain.handle('taller:descartar', (_e, id: unknown) => (idValido(id) ? accion(() => { cerrarVista(id); return t.descartar(id) }) : entrada))
  ipcMain.handle('taller:configurar', (_e, id: unknown, opcion: unknown, valor: unknown) =>
    (idValido(id) && textoCorto(opcion) && textoCorto(valor) ? accion(() => t.configurar(id, opcion, valor)) : entrada))
  ipcMain.handle('taller:opcionesMotor', async (_e, motorId: unknown): Promise<OpcionConfig[]> => {
    if (typeof motorId !== 'string') return []
    const previo = cacheOpciones.get(motorId)
    if (previo) return previo
    const motor = await elegirMotor(motorId)
    if ('error' in motor) return []
    try {
      const o = await sondear(motor)
      if (o.length) cacheOpciones.set(motorId, o)
      return o
    } catch { return [] }
  })
  ipcMain.handle('taller:aplicar', (_e, id: unknown) => (idValido(id) ? t.aplicar(id) : entrada))
  ipcMain.handle('taller:deshacer', (_e, id: unknown) => (idValido(id) ? t.deshacer(id) : entrada))
  ipcMain.handle('taller:guardarRama', (_e, id: unknown, mensaje: unknown) => {
    if (!idValido(id) || !(mensaje === undefined || mensaje === null || (typeof mensaje === 'string' && mensaje.length <= 300))) return entrada
    return t.guardarEnRama(id, typeof mensaje === 'string' ? mensaje : undefined)
  })
  ipcMain.handle('taller:exportar', async (_e, id: unknown) => {
    if (!idValido(id)) return entrada
    const tarea = t.lista().find((x) => x.id === id)
    if (!tarea) return { ok: false, error: 'La tarea no existe.' }
    const documentos = join(homedir(), 'Documentos')
    const base = await access(documentos).then(() => documentos, () => homedir())
    const slug = tarea.titulo.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'tarea'
    const r = await dialog.showSaveDialog({ defaultPath: join(base, slug) })
    if (r.canceled || !r.filePath) return { ok: false, error: 'cancelado' }
    return t.exportar(id, r.filePath)
  })
  ipcMain.handle('taller:veredictos', () => t.veredictos())
  ipcMain.handle('taller:responder', (_e, id: unknown, opcion: unknown) => {
    if (!idValido(id) || typeof opcion !== 'string' || opcion.length === 0 || opcion.length > 200) return entrada
    t.responder(id, opcion)
    return { ok: true }
  })
  ipcMain.handle('taller:diff', async (_e, id: unknown) => {
    if (!idValido(id)) return { texto: '', truncado: false }
    try { return await t.diff(id) } catch { return { texto: '', truncado: false } }
  })
  ipcMain.handle('taller:carpeta', async () => {
    const r = await dialog.showOpenDialog({ properties: ['openDirectory'] })
    return r.canceled || !r.filePaths[0] ? null : r.filePaths[0]
  })
  // Vista previa: un servidor por tarea (solo 127.0.0.1) que sirve su copia, abierto en su index.html.
  ipcMain.handle('taller:vistaPrevia', async (_e, id: unknown) => {
    if (!idValido(id)) return entrada
    const copia = t.lista().find((x) => x.id === id)?.copia
    if (!copia) return { ok: false, error: 'La tarea no tiene copia.' }
    const dir = await buscarIndice(copia.ruta)
    if (dir === null) return { ok: false, error: 'No encuentro un index.html en la copia: la vista previa es para webs.' }
    try {
      let s = vistas.get(id)
      if (!s) { s = await servirCopia(copia.ruta); vistas.set(id, s) }
      return { ok: true, url: s.url + (dir ? `${dir}/` : '') }
    } catch (e) { return { ok: false, error: mensaje(e) } }
  })
  ipcMain.handle('taller:cerrarVista', (_e, id: unknown) => { if (idValido(id)) cerrarVista(id); return { ok: true } })
  ipcMain.handle('taller:abrir', async (_e, id: unknown) => {
    if (!idValido(id)) return entrada
    const copia = t.lista().find((x) => x.id === id)?.copia
    if (!copia) return { ok: false, error: 'La tarea no tiene copia.' }
    const fallo = await shell.openPath(copia.ruta)
    return fallo ? { ok: false, error: fallo } : { ok: true }
  })
  // La agenda: encargos que tu equipo hace solo. Cada minuto se lanza lo que toca como una tarea normal.
  const ficheroAgenda = join(app.getPath('userData'), 'taller', 'agenda.json')
  agenda = leerAgenda(ficheroAgenda)
  const conProxima = () => agenda.map((p) => ({ ...p, proxima: proximaVez(p, Date.now()) }))
  const guardar = () => { guardarAgenda(ficheroAgenda, agenda); emitir('taller:agenda', conProxima()) }
  const revisarAgenda = async () => {
    const ahora = Date.now(), toca = tocan(agenda, ahora)
    for (const p of toca) {
      p.ultima = ahora
      if (p.cuando.tipo === 'una') p.activo = false
      const motor = await elegirMotor(p.motor)
      if ('error' in motor) { console.error('[agenda] no lancé', p.id, motor.error); continue }
      try { t.crear({ motor, carpeta: p.carpeta, texto: p.texto }); alLanzarProgramado(p) } catch (e) { console.error('[agenda] no lancé', p.id, mensaje(e)) }
    }
    if (toca.length) guardar()
  }
  relojAgenda = setInterval(() => { void revisarAgenda() }, 60_000)
  setTimeout(() => { void revisarAgenda() }, 15_000)   // al abrir, lo atrasado mientras el equipo estuvo apagado
  ipcMain.handle('taller:agenda', () => conProxima())
  programarInterno = (v: unknown) => {
    const r = validarProgramado(v)
    if (!r.ok) return { ok: false, error: r.motivo }
    if (agenda.length >= 50) return { ok: false, error: 'Ya tienes 50 encargos programados: quita alguno.' }
    agenda.push({ id: nuevoIdProgramado(), ...r.valor, activo: true, creado: Date.now() }); guardar()
    return { ok: true }
  }
  ipcMain.handle('taller:programar', (_e, v: unknown) => programarInterno!(v))
  ipcMain.handle('taller:pausarProgramado', (_e, id: unknown, activo: unknown) => {
    const p = agenda.find((x) => x.id === id)
    if (!p || typeof activo !== 'boolean') return entrada
    p.activo = activo; if (activo && p.cuando.tipo === 'diaria') p.ultima = Date.now(); guardar(); return { ok: true }
  })
  ipcMain.handle('taller:quitarProgramado', (_e, id: unknown) => {
    const antes = agenda.length; agenda = agenda.filter((x) => x.id !== id)
    if (agenda.length === antes) return entrada
    guardar(); return { ok: true }
  })
}

export function cerrar() { if (relojAgenda) clearInterval(relojAgenda); for (const s of vistas.values()) s.cerrar(); vistas.clear(); taller?.cerrarTodo() }
