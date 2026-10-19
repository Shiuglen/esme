// Instalar una skill para Esme y para los agentes que elijas (docs/investigacion/2026-10-19-skills.md §5.2–5.5):
// una copia canónica en los datos de Esme (con su marca `.esme-skill.json`) y un enlace en la carpeta de cada agente.
// Sin duplicados: si un agente ya lee la carpeta de otro (OpenCode lee la de Claude; Codex y Gemini comparten ~/.agents),
// no se crea una segunda entrada. Nunca se pisa una skill ajena con el mismo nombre ni un enlace roto ajeno. Los scripts
// van fuera salvo que los pidas, y nunca con bit de ejecución. Desinstalar solo quita lo que lleva la marca de Esme.
import { cpSync, existsSync, lstatSync, mkdirSync, readFileSync, readlinkSync, renameSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import type { ArchivoSkill } from './descargar'

export type FuenteInstalada = { repo: string; ruta: string; commit: string; arbolSha256: string; licencia: string }
type Plan = { carpetas: { carpeta: string; agentes: string[] }[] }

// la carpeta propia de cada agente y todas las que lee (tabla 2.1 del estudio, verificada en su documentación)
const PROPIA: Record<string, string> = { claude: '.claude/skills', codex: '.agents/skills', gemini: '.gemini/skills', goose: '.agents/skills',
  opencode: '.config/opencode/skills', cursor: '.cursor/skills', qwen: '.qwen/skills', cline: '.cline/skills' }
const LEE: Record<string, string[]> = { claude: ['.claude/skills'], codex: ['.agents/skills'], gemini: ['.agents/skills', '.gemini/skills'],
  goose: ['.agents/skills', '.claude/skills'], opencode: ['.config/opencode/skills', '.claude/skills', '.agents/skills'],
  cursor: ['.cursor/skills', '.agents/skills', '.claude/skills'], qwen: ['.qwen/skills'], cline: ['.cline/skills'] }
const ORDEN = ['claude', 'codex', 'gemini', 'goose', 'opencode', 'cursor', 'qwen', 'cline']
export const AGENTES_CON_SKILLS = ORDEN

export function planDeInstalacion(agentes: string[], home: string): Plan {
  const carpetas: Plan['carpetas'] = []
  for (const a of ORDEN.filter((x) => agentes.includes(x))) {
    const ya = carpetas.find((c) => LEE[a].some((l) => c.carpeta === join(home, l)))
    if (ya) ya.agentes.push(a)
    else carpetas.push({ carpeta: join(home, PROPIA[a]), agentes: [a] })
  }
  return { carpetas }
}

const NOMBRE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/
const EJECUTABLE = /\.(py|sh|bash|zsh|js|mjs|cjs|ts|ps1|bat|cmd|exe|rb|pl|php)$/i
export const esScript = (ruta: string, ejecutable: boolean) => ejecutable || ruta.startsWith('scripts/') || EJECUTABLE.test(ruta)
const MARCA = '.esme-skill.json'
const leerJson = <T,>(f: string, d: T): T => { try { return JSON.parse(readFileSync(f, 'utf8')) as T } catch { return d } }
const manifiestoDe = (datos: string) => join(datos, 'skills', 'instaladas.json')
type Entrada = { nombre: string; canonica: string; enlaces: string[]; agentes: string[]; instaladoEl: number } & FuenteInstalada
const guardarManifiesto = (datos: string, m: Record<string, Entrada>) => {
  const f = manifiestoDe(datos); mkdirSync(dirname(f), { recursive: true })
  writeFileSync(`${f}.tmp`, JSON.stringify(m, null, 1)); renameSync(`${f}.tmp`, f)
}
const marcaDe = (dir: string) => leerJson<{ id?: string } | null>(join(dir, MARCA), null)

export function instalarSkill(o: { home: string; datos: string; id: string; nombre: string; archivos: ArchivoSkill[]; fuente: FuenteInstalada
  agentes: string[]; conScripts?: boolean; plataforma?: NodeJS.Platform }) {
  if (!NOMBRE.test(o.nombre)) throw new Error(`El nombre «${o.nombre}» no es válido para una skill.`)
  const canonica = join(o.datos, 'skills', o.nombre)
  if (existsSync(canonica) && marcaDe(canonica)?.id !== o.id) throw new Error(`Ya hay otra skill llamada «${o.nombre}» en Esme.`)
  // la copia canónica se escribe aparte y se cambia de golpe: nunca queda a medias
  const nueva = `${canonica}.nueva`
  rmSync(nueva, { recursive: true, force: true })
  let scriptsOmitidos = false
  for (const a of o.archivos) {
    if (esScript(a.ruta, a.ejecutable) && !o.conScripts) { scriptsOmitidos = true; continue }
    const destino = join(nueva, a.ruta)
    mkdirSync(dirname(destino), { recursive: true })
    writeFileSync(destino, a.datos, { mode: 0o644 })
  }
  const plan = planDeInstalacion(o.agentes, o.home)
  writeFileSync(join(nueva, MARCA), JSON.stringify({ id: o.id, nombre: o.nombre, ...o.fuente, scriptsOmitidos, agentes: o.agentes, instaladoEl: Date.now() }, null, 1))
  rmSync(canonica, { recursive: true, force: true })
  renameSync(nueva, canonica)

  const enlaces: string[] = [], conflictos: { carpeta: string; motivo: string }[] = []
  for (const c of plan.carpetas) {
    const destino = join(c.carpeta, o.nombre)
    let previo: ReturnType<typeof lstatSync> | null = null
    try { previo = lstatSync(destino) } catch { /* no existe */ }
    if (previo) {
      if (previo.isSymbolicLink() && readlinkSync(destino) === canonica) { enlaces.push(destino); continue }
      if (previo.isDirectory() && marcaDe(destino)?.id === o.id) { rmSync(destino, { recursive: true, force: true }) }
      else { conflictos.push({ carpeta: c.carpeta, motivo: `Ya hay una skill «${o.nombre}» que no instaló Esme: no la toco.` }); continue }
    }
    mkdirSync(c.carpeta, { recursive: true })
    // en Windows los enlaces piden privilegios: allí se copia (con la marca, para poder quitarla luego)
    if ((o.plataforma ?? process.platform) === 'win32') cpSync(canonica, destino, { recursive: true })
    else symlinkSync(canonica, destino, 'dir')
    enlaces.push(destino)
  }
  const m = leerJson<Record<string, Entrada>>(manifiestoDe(o.datos), {})
  m[o.id] = { nombre: o.nombre, canonica, enlaces, agentes: o.agentes, instaladoEl: Date.now(), ...o.fuente }
  guardarManifiesto(o.datos, m)
  return { canonica, carpetas: plan.carpetas, conflictos, scriptsOmitidos }
}

export function desinstalarSkill(o: { datos: string; id: string }): { ok: true; quitados: string[] } | { ok: false; error: string } {
  const m = leerJson<Record<string, Entrada>>(manifiestoDe(o.datos), {})
  const e = m[o.id]
  if (!e) return { ok: false, error: 'Esa skill no está instalada por Esme.' }
  const quitados: string[] = []
  for (const enlace of e.enlaces) {
    let st: ReturnType<typeof lstatSync> | null = null
    try { st = lstatSync(enlace) } catch { continue }
    if (st.isSymbolicLink() && readlinkSync(enlace) === e.canonica) { unlinkSync(enlace); quitados.push(enlace) }
    else if (st.isDirectory() && marcaDe(enlace)?.id === o.id) { rmSync(enlace, { recursive: true, force: true }); quitados.push(enlace) }
  }
  if (existsSync(e.canonica) && marcaDe(e.canonica)?.id === o.id) { rmSync(e.canonica, { recursive: true, force: true }); quitados.push(e.canonica) }
  delete m[o.id]
  guardarManifiesto(o.datos, m)
  return { ok: true, quitados }
}

export type EstadoEnlace = 'ok' | 'roto' | 'falta'
export function skillsInstaladas(datos: string) {
  const m = leerJson<Record<string, Entrada>>(manifiestoDe(datos), {})
  return Object.entries(m).map(([id, e]) => ({
    id, nombre: e.nombre, repo: e.repo, commit: e.commit, licencia: e.licencia, agentes: e.agentes, instaladoEl: e.instaladoEl,
    enlaces: e.enlaces.map((enlace) => {
      let estado: EstadoEnlace = 'falta'
      try {
        const st = lstatSync(enlace)
        estado = st.isSymbolicLink() ? (readlinkSync(enlace) === e.canonica && existsSync(e.canonica) ? 'ok' : 'roto') : marcaDe(enlace)?.id === id ? 'ok' : 'roto'
      } catch { /* falta */ }
      return { ruta: enlace, estado }
    }),
  }))
}
