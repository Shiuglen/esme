// Las skills de la propia Esme (no es un agente de terminal, así que hace lo que hace cualquier cliente del estándar):
// en su prompt solo el nombre y la descripción de cada skill instalada; cuando la tarea encaja, la herramienta `usar_skill`
// lee sus instrucciones completas o un fichero suyo. Solo las instaladas por Esme (con su marca) y nunca fuera de su carpeta.
import { existsSync, readdirSync, readFileSync, realpathSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { leerSkillMd } from './skill-md'

const MARCA = '.esme-skill.json'
const raiz = (datos: string) => join(datos, 'skills')
const instalada = (dir: string) => existsSync(join(dir, MARCA)) && existsSync(join(dir, 'SKILL.md'))

export function skillsParaEsme(datos: string): { nombre: string; descripcion: string; soloManual: boolean }[] {
  if (!existsSync(raiz(datos))) return []
  return readdirSync(raiz(datos)).sort().flatMap((n) => {
    const dir = join(raiz(datos), n)
    if (!instalada(dir)) return []
    const s = leerSkillMd(readFileSync(join(dir, 'SKILL.md'), 'utf8'), n)
    return s.ok ? [{ nombre: n, descripcion: s.skill.descripcion, soloManual: s.skill.soloManual }] : []
  })
}

const listar = (dir: string, base = dir): string[] => readdirSync(dir).sort().flatMap((n) => {
  const p = join(dir, n)
  if (n === MARCA || (dir === base && n === 'SKILL.md')) return []
  return statSync(p).isDirectory() ? listar(p, base) : [relative(base, p).split(sep).join('/')]
})

export function usarSkill(datos: string, nombre: string, fichero?: string): { instrucciones: string; ficheros: string[] } {
  const dir = join(raiz(datos), nombre)
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(nombre) || !instalada(dir)) throw new Error(`No hay ninguna skill instalada que se llame «${nombre}».`)
  const ficheros = listar(dir)
  if (!fichero) {
    const s = leerSkillMd(readFileSync(join(dir, 'SKILL.md'), 'utf8'), nombre)
    return { instrucciones: s.ok ? s.skill.cuerpo : readFileSync(join(dir, 'SKILL.md'), 'utf8'), ficheros }
  }
  const real = (() => { try { return realpathSync(join(dir, fichero)) } catch { return null } })()
  const base = realpathSync(dir)
  if (!real || !(real === base || real.startsWith(base + sep))) throw new Error('Ese fichero está fuera de la skill.')
  if (statSync(real).size > 200_000) throw new Error('Ese fichero es demasiado grande para leerlo entero.')
  return { instrucciones: readFileSync(real, 'utf8'), ficheros }
}
