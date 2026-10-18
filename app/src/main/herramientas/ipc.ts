// Las herramientas conectadas, del lado del proceso principal: buscarlas en el registro oficial, conectarlas (sus
// secretos al llavero), probarlas, activarlas o quitarlas. La conversación y el Taller las piden aquí.
import { auth } from '@ai-sdk/mcp'
import { app, ipcMain, shell } from 'electron'
import { join } from 'node:path'
import { keys } from '../keys'
import { guardarConfig, leerConfig, type ConfigManos } from './config'
import { faltan, GestorMCP, lanzamientoDe, type Conectada } from './lanzar-mcp'
import { esperarCodigo, ProveedorOAuth, PUERTO_OAUTH } from './oauth'
import type { Manos } from './propias'
import destacadasDeCasa from './destacadas.json'
import { buscarEnRegistro, type Ficha } from './registro-mcp'

const fichero = () => join(app.getPath('userData'), 'herramientas.json')
const clave = (f: Ficha, v: string) => `mcp:${f.slug}:${v}` as const
const valoresDe = (f: Ficha, c: ConfigManos = leerConfig(fichero())): Record<string, string> => ({
  ...c.valores?.[f.slug],
  ...Object.fromEntries(f.variables.filter((v) => v.secreta).map((v) => [v.nombre, keys.get(clave(f, v.nombre)) ?? '']).filter(([, x]) => x)),
})
const llavero = { get: (k: string) => keys.get(k as `mcp:${string}`), set: (k: string, v: string) => keys.set(k as `mcp:${string}`, v), remove: (k: string) => keys.remove(k as `mcp:${string}`) }
const proveedor = (f: Ficha, interactivo: boolean) => new ProveedorOAuth(f.slug, llavero, { interactivo, abrir: (u) => void shell.openExternal(u), puerto: PUERTO_OAUTH })
const gestor = new GestorMCP((f) => valoresDe(f), (f) => proveedor(f, false))

// inicia sesión en tu navegador y guarda el token cifrado (solo cuando tú lo pides, al conectar)
async function iniciarSesion(f: Ficha) {
  if (f.conexion.tipo !== 'remoto') throw new Error('Esta herramienta no usa inicio de sesión.')
  const p = proveedor(f, true)
  if (await auth(p, { serverUrl: f.conexion.url }) === 'AUTHORIZED') return
  const { code, state } = await esperarCodigo(PUERTO_OAUTH)
  await auth(p, { serverUrl: f.conexion.url, authorizationCode: code, ...(state ? { callbackState: state } : {}) })
}
const pideSesion = (e: unknown) => /401|unauthori[sz]ed|iniciar sesión|invalid_token/i.test(mensaje(e))
// las destacadas viajan dentro de Esme (scripts/destacadas-mcp.mjs): se ven al instante y sin conexión
const destacadas = destacadasDeCasa as Ficha[]

/** Las acciones de las herramientas activas, con el guardián de permisos de la conversación. */
export function herramientasConectadas(m: Pick<Manos, 'preguntar' | 'politicas' | 'guardarPolitica' | 'conocidas' | 'alPaso'>) {
  return gestor.herramientas(leerConfig(fichero()).conectadas ?? [], m)
}

/** Para los agentes del Taller (ACP): las herramientas activas como servidores MCP de su sesión. */
export function mcpParaTaller(): ({ name: string; command: string; args: string[]; env: { name: string; value: string }[] } | { type: 'http'; name: string; url: string; headers: { name: string; value: string }[] })[] {
  const c = leerConfig(fichero())
  return (c.conectadas ?? []).filter((x) => x.activa).map(({ ficha }) => {
    const l = lanzamientoDe(ficha, valoresDe(ficha, c))
    const par = (o: Record<string, string>) => Object.entries(o).map(([name, value]) => ({ name, value }))
    return l.tipo === 'http' ? { type: 'http' as const, name: ficha.slug, url: l.url, headers: par(l.headers) } : { name: ficha.slug, command: l.comando, args: l.args, env: par(l.env) }
  })
}

// una ficha que llega de la ventana se comprueba entera antes de guardarla
const fichaValida = (f: unknown): f is Ficha => {
  const x = f as Partial<Ficha> | null
  return !!x && typeof x.id === 'string' && typeof x.slug === 'string' && /^[a-z0-9_]{1,24}$/.test(x.slug) && typeof x.titulo === 'string' && Array.isArray(x.variables)
    && !!x.conexion && ((x.conexion.tipo === 'remoto' && /^https?:\/\//.test(x.conexion.url)) || ((x.conexion.tipo === 'npm' || x.conexion.tipo === 'pypi') && typeof x.conexion.paquete === 'string'))
}
const mensaje = (e: unknown) => (e instanceof Error ? e.message : String(e))

export function registerHerramientas() {
  ipcMain.handle('herramientas:buscar', async (_e, q: unknown) => {
    try {
      if (typeof q === 'string' && q.trim()) return { ok: true, fichas: await buscarEnRegistro(q.slice(0, 100)) }
      return { ok: true, fichas: destacadas }
    } catch (e) { return { ok: false, error: mensaje(e) } }
  })
  ipcMain.handle('herramientas:conectadas', () => (leerConfig(fichero()).conectadas ?? []).map((c) => ({ ...c, faltan: faltan(c.ficha, valoresDe(c.ficha)) })))
  ipcMain.handle('herramientas:conectar', async (_e, f: unknown, valores: unknown) => {
    if (!fichaValida(f) || !valores || typeof valores !== 'object') return { ok: false, error: 'Datos no válidos.' }
    const v = Object.fromEntries(Object.entries(valores as Record<string, unknown>).filter(([k, x]) => typeof x === 'string' && x && f.variables.some((y) => y.nombre === k))) as Record<string, string>
    const sinValor = faltan(f, v)
    if (sinValor.length) return { ok: false, error: `Falta: ${sinValor.join(', ')}.` }
    const c = leerConfig(fichero())
    for (const x of f.variables) if (x.secreta && v[x.nombre]) keys.set(clave(f, x.nombre), v[x.nombre])
    const publicos = Object.fromEntries(f.variables.filter((x) => !x.secreta && v[x.nombre]).map((x) => [x.nombre, v[x.nombre]]))
    const conectadas: Conectada[] = [...(c.conectadas ?? []).filter((x) => x.ficha.slug !== f.slug), { ficha: f, activa: true }]
    guardarConfig(fichero(), { ...c, conectadas, valores: { ...c.valores, [f.slug]: publicos } })
    await gestor.olvidar(f.slug)
    // se prueba de verdad: si arranca, cuenta sus acciones; si no, queda conectada pero se dice por qué
    const probar = () => Promise.race([gestor.acciones(f), new Promise<never>((_, no) => setTimeout(() => no(new Error('no respondió en 60 s')), 60_000))])
    try { return { ok: true, acciones: (await probar()).length } }
    catch (e) {
      if (f.conexion.tipo !== 'remoto' || !pideSesion(e)) return { ok: true, acciones: 0, aviso: `Se guardó, pero no arrancó: ${mensaje(e)}` }
      // pide iniciar sesión: se abre en tu navegador y, al volver, se prueba otra vez
      try { await iniciarSesion(f); await gestor.olvidar(f.slug); return { ok: true, acciones: (await probar()).length, sesion: true } }
      catch (e2) { return { ok: true, acciones: 0, aviso: `Se guardó, pero falta iniciar sesión: ${mensaje(e2)}` } }
    }
  })
  ipcMain.handle('herramientas:alternar', async (_e, slug: unknown, activa: unknown) => {
    const c = leerConfig(fichero())
    if (typeof activa !== 'boolean' || !c.conectadas?.some((x) => x.ficha.slug === slug)) return { ok: false, error: 'No existe.' }
    guardarConfig(fichero(), { ...c, conectadas: c.conectadas.map((x) => (x.ficha.slug === slug ? { ...x, activa } : x)) })
    if (!activa) await gestor.olvidar(slug as string)
    return { ok: true }
  })
  ipcMain.handle('herramientas:quitar', async (_e, slug: unknown) => {
    const c = leerConfig(fichero())
    const q = c.conectadas?.find((x) => x.ficha.slug === slug)
    if (!q) return { ok: false, error: 'No existe.' }
    for (const v of q.ficha.variables) if (v.secreta) keys.remove(clave(q.ficha, v.nombre))
    keys.remove(`mcp:${q.ficha.slug}:__oauth`)
    const { [q.ficha.slug]: _fuera, ...valores } = c.valores ?? {}
    guardarConfig(fichero(), { ...c, conectadas: c.conectadas!.filter((x) => x !== q), valores })
    await gestor.olvidar(q.ficha.slug)
    return { ok: true }
  })
  // buscar en internet: la clave de Brave (al llavero) y un SearXNG propio
  ipcMain.handle('herramientas:busqueda', () => ({ brave: keys.has('brave'), searxng: leerConfig(fichero()).searxng ?? '' }))
  ipcMain.handle('herramientas:ponerBusqueda', (_e, o: { brave?: unknown; searxng?: unknown } | null) => {
    if (!o) return { ok: false, error: 'Datos no válidos.' }
    if (typeof o.brave === 'string') { if (o.brave.trim()) keys.set('brave', o.brave.trim()); else keys.remove('brave') }
    if (typeof o.searxng === 'string') {
      const s = o.searxng.trim()
      if (s && !/^https?:\/\/[^\s]+$/.test(s)) return { ok: false, error: 'La dirección del SearXNG no es válida.' }
      const c = leerConfig(fichero()); const { searxng: _viejo, ...resto } = c
      guardarConfig(fichero(), s ? { ...resto, searxng: s } : resto)
    }
    return { ok: true }
  })
}

export const cerrarHerramientas = () => gestor.cerrar()
