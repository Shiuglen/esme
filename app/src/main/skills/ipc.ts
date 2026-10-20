// Los canales de las Skills para la Tienda: el catálogo (con lo que ya tienes instalado y tus agentes), la vista previa
// (se descarga del repositorio del autor, se comprueba la huella revisada y se calculan las alertas en tu equipo),
// instalar (solo lo que viste, para los agentes que elijas) y desinstalar (solo lo de Esme).
import { app, ipcMain } from 'electron'
import { homedir } from 'node:os'
import { agentesParaConversar } from '../ipc-taller'
import { alertasDe } from './alertas'
import catalogo from './catalogo.json'
import { arbolSha256, descargarSkill, esTexto, type ArchivoSkill } from './descargar'
import { AGENTES_CON_SKILLS, desinstalarSkill, esScript, instalarSkill, skillsInstaladas } from './instalar'
import { leerSkillMd } from './skill-md'
import { veredictosSkills } from './veredicto'

type EntradaCatalogo = (typeof catalogo)[number]
const vistas = new Map<string, ArchivoSkill[]>()   // lo que viste en la vista previa es lo que se instala
const datos = () => app.getPath('userData')
const mensaje = (e: unknown) => (e instanceof Error ? e.message : String(e))
const veredictos = veredictosSkills()              // el juez dictó y firmó: se comprueba una vez

async function bajarVerificada(c: EntradaCatalogo): Promise<ArchivoSkill[]> {
  const archivos = await descargarSkill({ repo: c.repo, ruta: c.ruta, commit: c.commit })
  if (arbolSha256(archivos) !== c.arbolSha256) throw new Error('Lo que hay en el repositorio no coincide con lo que Esme revisó: no se instala (posible manipulación).')
  // y el juez: si juzgó esta skill, lo que hay tiene que ser lo que él miró
  const v = veredictos.ok ? veredictos.porId.get(c.id) : undefined
  if (v && !v.entra) throw new Error(`El juez no aprobó esta skill: ${v.causa}`)
  if (v && v.medidas.arbolSha256 !== c.arbolSha256) throw new Error('El veredicto firmado juzgó otra huella del árbol: el catálogo cambió después del juicio. No se instala.')
  return archivos
}

export function registerSkills() {
  ipcMain.handle('skills:catalogo', async () => {
    const instaladas = skillsInstaladas(datos())
    const agentes = (await agentesParaConversar().catch(() => [])).filter((a) => a.instalado && AGENTES_CON_SKILLS.includes(a.id)).map((a) => ({ id: a.id, nombre: a.nombre }))
    return { skills: catalogo.map((c) => ({ ...c, instalada: instaladas.find((i) => i.id === c.id) ?? null, veredicto: veredictos.ok ? (veredictos.porId.get(c.id) ?? null) : null })), agentes }
  })
  ipcMain.handle('skills:vistaPrevia', async (_e, id: unknown) => {
    const c = catalogo.find((x) => x.id === id)
    if (!c) return { ok: false, error: 'Esa skill no está en el catálogo.' }
    try {
      const archivos = await bajarVerificada(c)
      vistas.set(c.id, archivos)
      const textos = archivos.filter((a) => esTexto(a.datos)).map((a) => ({ ruta: a.ruta, contenido: a.datos.toString('utf8'), ejecutable: a.ejecutable }))
      const md = textos.find((t) => t.ruta === 'SKILL.md')?.contenido ?? ''
      const leida = leerSkillMd(md, c.nombre)
      return {
        ok: true, skillMd: md, cuerpo: leida.ok ? leida.skill.cuerpo : null, avisos: leida.ok ? leida.avisos : [leida.error], alertas: alertasDe(textos),
        soloManual: leida.ok && leida.skill.soloManual, tokens: Math.round(md.length / 4),
        ficheros: archivos.map((a) => ({ ruta: a.ruta, bytes: a.datos.length, script: esScript(a.ruta, a.ejecutable) })),
      }
    } catch (e) { return { ok: false, error: mensaje(e) } }
  })
  ipcMain.handle('skills:instalar', async (_e, id: unknown, agentes: unknown, conScripts: unknown) => {
    const c = catalogo.find((x) => x.id === id)
    if (!c) return { ok: false, error: 'Esa skill no está en el catálogo.' }
    if (!Array.isArray(agentes) || agentes.some((a) => typeof a !== 'string' || !AGENTES_CON_SKILLS.includes(a))) return { ok: false, error: 'Agentes no válidos.' }
    try {
      const archivos = vistas.get(c.id) ?? await bajarVerificada(c)
      const r = instalarSkill({ home: homedir(), datos: datos(), id: c.id, nombre: c.nombre, archivos, agentes: agentes as string[], conScripts: conScripts === true,
        fuente: { repo: c.repo, ruta: c.ruta, commit: c.commit, arbolSha256: c.arbolSha256, licencia: c.licencia } })
      return { ok: true, ...r }
    } catch (e) { return { ok: false, error: mensaje(e) } }
  })
  ipcMain.handle('skills:desinstalar', (_e, id: unknown) => (typeof id === 'string' ? desinstalarSkill({ datos: datos(), id }) : { ok: false, error: 'Datos no válidos.' }))
}
