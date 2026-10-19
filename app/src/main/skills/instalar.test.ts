import { describe, expect, it } from 'vitest'
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readlinkSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { desinstalarSkill, instalarSkill, planDeInstalacion, skillsInstaladas } from './instalar'

const archivos = [
  { ruta: 'SKILL.md', datos: Buffer.from('---\nname: tdd\ndescription: d\n---\nCuerpo'), ejecutable: false },
  { ruta: 'references/guia.md', datos: Buffer.from('guía'), ejecutable: false },
  { ruta: 'scripts/run.sh', datos: Buffer.from('echo hola'), ejecutable: true },
]
const fuente = { repo: 'mattpocock/skills', ruta: 'skills/tdd', commit: 'a'.repeat(40), arbolSha256: 'f'.repeat(64), licencia: 'MIT' }
const entorno = () => { const raiz = mkdtempSync(join(tmpdir(), 'skills-')); return { home: join(raiz, 'home'), datos: join(raiz, 'datos') } }

describe('a qué carpeta va cada agente, sin duplicados', () => {
  it('OpenCode ya lee la de Claude, Codex y Gemini comparten ~/.agents: una sola copia por carpeta', () => {
    const p = planDeInstalacion(['opencode', 'claude', 'codex', 'gemini', 'qwen'], '/h')
    expect(p.carpetas.map((c) => c.carpeta)).toEqual(['/h/.claude/skills', '/h/.agents/skills', '/h/.qwen/skills'])
    expect(p.carpetas[0].agentes).toEqual(['claude', 'opencode'])
    expect(p.carpetas[1].agentes).toEqual(['codex', 'gemini'])
  })
  it('un agente sin carpeta conocida se ignora', () => {
    expect(planDeInstalacion(['desconocido'], '/h').carpetas).toEqual([])
  })
})

describe('instalar y desinstalar', () => {
  it('copia canónica con su marca, enlaces a cada carpeta y los scripts fuera por defecto', () => {
    const e = entorno()
    const r = instalarSkill({ ...e, id: 'mattpocock/tdd', nombre: 'tdd', archivos, fuente, agentes: ['claude', 'qwen'] })
    const canon = join(e.datos, 'skills', 'tdd')
    expect(readFileSync(join(canon, 'SKILL.md'), 'utf8')).toContain('name: tdd')
    expect(existsSync(join(canon, 'scripts', 'run.sh'))).toBe(false)
    expect(JSON.parse(readFileSync(join(canon, '.esme-skill.json'), 'utf8'))).toMatchObject({ id: 'mattpocock/tdd', scriptsOmitidos: true, commit: fuente.commit })
    expect(readlinkSync(join(e.home, '.claude', 'skills', 'tdd'))).toBe(canon)
    expect(lstatSync(join(e.home, '.qwen', 'skills', 'tdd')).isSymbolicLink()).toBe(true)
    expect(r.conflictos).toEqual([])
    expect(skillsInstaladas(e.datos)).toMatchObject([{ id: 'mattpocock/tdd', nombre: 'tdd', enlaces: [{ estado: 'ok' }, { estado: 'ok' }] }])
  })
  it('con scripts solo si lo pides, y nunca con bit de ejecución', () => {
    const e = entorno()
    instalarSkill({ ...e, id: 'x/tdd', nombre: 'tdd', archivos, fuente, agentes: [], conScripts: true })
    const s = join(e.datos, 'skills', 'tdd', 'scripts', 'run.sh')
    expect(existsSync(s)).toBe(true)
    expect(lstatSync(s).mode & 0o111).toBe(0)
  })
  it('no pisa una skill ajena con el mismo nombre (ni un enlace roto ajeno): lo dice como conflicto', () => {
    const e = entorno()
    mkdirSync(join(e.home, '.claude', 'skills', 'tdd'), { recursive: true }); writeFileSync(join(e.home, '.claude', 'skills', 'tdd', 'SKILL.md'), 'mía')
    mkdirSync(join(e.home, '.qwen', 'skills'), { recursive: true }); symlinkSync('/no/existe', join(e.home, '.qwen', 'skills', 'tdd'))
    const r = instalarSkill({ ...e, id: 'x/tdd', nombre: 'tdd', archivos, fuente, agentes: ['claude', 'qwen'] })
    expect(r.conflictos.map((c) => c.carpeta)).toEqual([join(e.home, '.claude', 'skills'), join(e.home, '.qwen', 'skills')])
    expect(readFileSync(join(e.home, '.claude', 'skills', 'tdd', 'SKILL.md'), 'utf8')).toBe('mía')
  })
  it('desinstalar quita solo lo suyo y deja lo ajeno', () => {
    const e = entorno()
    mkdirSync(join(e.home, '.claude', 'skills', 'ajena'), { recursive: true })
    instalarSkill({ ...e, id: 'x/tdd', nombre: 'tdd', archivos, fuente, agentes: ['claude'] })
    const quitado = desinstalarSkill({ datos: e.datos, id: 'x/tdd' })
    expect(quitado.ok).toBe(true)
    expect(existsSync(join(e.home, '.claude', 'skills', 'tdd'))).toBe(false)
    expect(existsSync(join(e.datos, 'skills', 'tdd'))).toBe(false)
    expect(existsSync(join(e.home, '.claude', 'skills', 'ajena'))).toBe(true)
    expect(skillsInstaladas(e.datos)).toEqual([])
  })
  it('un nombre con «..» o barras no se instala', () => {
    const e = entorno()
    expect(() => instalarSkill({ ...e, id: 'x/y', nombre: '../malo', archivos, fuente, agentes: [] })).toThrow(/nombre/)
  })
})
