// La Forja, del lado del proceso principal: encargar una herramienta al equipo (desde la conversación) e instalarla
// cuando el agente termina y tú la apruebas. Vive aparte para no enredar el Taller con las herramientas.
import { app, ipcMain } from 'electron'
import { readFileSync, renameSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { avisosDe, encargoDeForja, instalarForjada, rutasDe, slugDeForja } from './herramientas/forja'
import { conectarForjada, probarForjada, pythonDeEsme, slugsEnUso } from './herramientas/ipc'
import { ClienteCerebro } from './mente/cliente'
import { copiaDeTarea, encargarDesdeChat, estadoDeTarea } from './ipc-taller'

type Encargo = { slug: string; necesidad: string; instalada?: boolean }
type Mente = { url: string; token: string }
const fichero = () => join(app.getPath('userData'), 'forja.json')
const leer = (): Record<string, Encargo> => { try { return JSON.parse(readFileSync(fichero(), 'utf8')) } catch { return {} } }
const guardar = (x: Record<string, Encargo>) => { mkdirSync(app.getPath('userData'), { recursive: true }); writeFileSync(`${fichero()}.tmp`, JSON.stringify(x), { mode: 0o600 }); renameSync(`${fichero()}.tmp`, fichero()) }
const mensaje = (e: unknown) => (e instanceof Error ? e.message : String(e))

/**
 * Lo que la mente ya sabe de la necesidad: para que el agente no invente lo que Esme ya tiene.
 * (Si el programa que hay que recrear ya se ha mirado con el espejo, aquí sale su conocimiento.)
 */
async function loQueSabe(mente: Mente | null, necesidad: string): Promise<string> {
  if (!mente || !necesidad.trim()) return ''
  try {
    const j = await new ClienteCerebro(mente).recordar(necesidad, { budget: 1200, who: 'forja' })
    return (j.context ?? '').trim()
  } catch {
    return ''   // sin mente no hay contexto, pero la Forja sigue
  }
}

/**
 * Lo que la mente sabe de un programa concreto: sin esto, el encargo depende de que la búsqueda
 * acierte; con esto, el que va a recrear recibe el conocimiento del programa, sí o sí.
 */
async function loQueSabeDe(mente: Mente | null, necesidad: string): Promise<string> {
  if (!mente) return ''
  const trozos: string[] = []
  for (const ruta of rutasDe(necesidad)) {
    try {
      const r = await new ClienteCerebro(mente).recuerdosDePrograma(ruta)
      if (r.ok && r.recuerdos?.length) trozos.push(`Lo que Esme sabe de ${ruta} (${r.recuerdos.length} recuerdos):\n${r.recuerdos.join('\n')}`)
    } catch { /* ese programa no está (o la mente no está): se sigue sin él */ }
  }
  return trozos.join('\n\n')
}

/** Desde la conversación: encarga al equipo la herramienta que falta. */
export async function forjarDesdeChat(necesidad: string, o: { nombre?: string; agente?: string; mente?: Mente | null } = {}) {
  const encargos = leer()
  const slug = slugDeForja(o.nombre ?? necesidad, [...slugsEnUso(), ...Object.values(encargos).map((e) => e.slug)])
  const [sabe, delPrograma] = await Promise.all([
    loQueSabe(o.mente ?? null, necesidad),
    loQueSabeDe(o.mente ?? null, necesidad),
  ])
  const contexto = [sabe, delPrograma].filter(Boolean).join('\n\n')
  const t = await encargarDesdeChat(encargoDeForja(necesidad, slug, pythonDeEsme(), contexto), o.agente)
  guardar({ ...encargos, [t.id]: { slug, necesidad } })
  return { tarea: t.id, herramienta: slug, agente: t.agente, siguiente: 'Cuando el agente termine, el usuario la revisa en el Taller y pulsa «Instalar como herramienta».' }
}

export function registerForja(o: { brainInfo: () => Mente | null } = { brainInfo: () => null }) {
  // desde la Tienda: escribes lo que necesitas y la Forja lo encarga al equipo, sin pasar por la conversación
  ipcMain.handle('forja:encargar', async (_e, necesidad: unknown, nombre: unknown, agente: unknown) => {
    if (typeof necesidad !== 'string' || necesidad.trim().length < 15 || necesidad.length > 4000) return { ok: false, error: 'Describe con un poco más de detalle qué necesitas.' }
    try {
      const r = await forjarDesdeChat(necesidad.trim(), { ...(typeof nombre === 'string' && /^[a-z][a-z0-9_]{2,19}$/.test(nombre) ? { nombre } : {}), ...(typeof agente === 'string' && agente ? { agente } : {}), mente: o.brainInfo() })
      return { ok: true, ...r }
    } catch (e) { return { ok: false, error: mensaje(e) } }
  })
  ipcMain.handle('forja:de', (_e, id: unknown) => {
    const x = typeof id === 'string' ? leer()[id] : undefined
    if (!x) return null
    const copia = copiaDeTarea(id as string)
    let codigo = ''
    try { if (copia) codigo = readFileSync(join(copia, 'herramienta.py'), 'utf8') } catch { /* aún no está */ }
    return { ...x, listo: !!codigo, avisos: avisosDe(codigo) }
  })
  ipcMain.handle('forja:probar', async (_e, id: unknown) => {
    const x = typeof id === 'string' ? leer()[id] : undefined
    const copia = typeof id === 'string' ? copiaDeTarea(id) : null
    if (!x || !copia) return { ok: false, error: 'Esta tarea no es de la Forja.' }
    try { return { ok: true, acciones: await probarForjada(join(copia, 'herramienta.py'), x.slug) } }
    catch (e) { return { ok: false, error: `No arranca: ${mensaje(e)}` } }
  })
  ipcMain.handle('forja:instalar', async (_e, id: unknown) => {
    const encargos = leer(), x = typeof id === 'string' ? encargos[id] : undefined
    if (!x) return { ok: false, error: 'Esta tarea no es de la Forja.' }
    if (estadoDeTarea(id as string) !== 'lista') return { ok: false, error: 'Espera a que el agente termine.' }
    const copia = copiaDeTarea(id as string)
    if (!copia) return { ok: false, error: 'La tarea ya no tiene su copia.' }
    try {
      const ficha = instalarForjada({ copia, base: join(app.getPath('userData'), 'forja'), slug: x.slug, necesidad: x.necesidad })
      const r = await conectarForjada(ficha)
      guardar({ ...encargos, [id as string]: { ...x, instalada: true } })
      return { ok: true, herramienta: x.slug, acciones: r.acciones }
    } catch (e) { return { ok: false, error: `No arrancó: ${mensaje(e)}` } }
  })
}
