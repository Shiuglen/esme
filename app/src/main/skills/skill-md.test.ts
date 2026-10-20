import { describe, expect, it } from 'vitest'
import { leerSkillMd } from './skill-md'

const md = (cabecera: string, cuerpo = '# Hola\nInstrucciones.') => `---\n${cabecera}\n---\n${cuerpo}\n`

describe('leer un SKILL.md (estándar abierto agentskills.io)', () => {
  it('lee name, description y los opcionales, y separa el cuerpo', () => {
    const s = leerSkillMd(md('name: tdd\ndescription: "Escribe el test primero: rojo, verde, refactor."\nlicense: MIT\nallowed-tools: Bash Read\ndisable-model-invocation: true'), 'tdd')
    expect(s.ok).toBe(true)
    if (!s.ok) return
    expect(s.skill).toMatchObject({ nombre: 'tdd', descripcion: 'Escribe el test primero: rojo, verde, refactor.', licencia: 'MIT', herramientasPermitidas: 'Bash Read', soloManual: true })
    expect(s.skill.cuerpo).toBe('# Hola\nInstrucciones.')
  })
  it('una descripción en varias líneas (bloque «>») se junta', () => {
    const s = leerSkillMd(md('name: x\ndescription: >\n  Primera línea\n  y segunda.'), 'x')
    expect(s.ok && s.skill.descripcion).toBe('Primera línea y segunda.')
  })
  it('una descripción en varias líneas sin indicador (YAML la pliega) también se lee', () => {
    const s = leerSkillMd(md('name: x\ndescription:\n  Primera línea\n  y segunda.'), 'x')
    expect(s.ok && s.skill.descripcion).toBe('Primera línea y segunda.')
  })
  it('un mapa anidado no se cuela como valor', () => {
    const s = leerSkillMd(md('name: x\ndescription: y\nmetadata:\n  author: vercel\n  version: \'1.0.0\''), 'x')
    expect(s.ok && s.skill.descripcion).toBe('y')
  })
  it('sin cabecera, sin name o sin description: no vale, y dice por qué', () => {
    expect(leerSkillMd('# solo texto', 'x')).toMatchObject({ ok: false })
    expect(leerSkillMd(md('description: algo'), 'x')).toMatchObject({ ok: false, error: expect.stringMatching(/name/) })
    expect(leerSkillMd(md('name: x'), 'x')).toMatchObject({ ok: false, error: expect.stringMatching(/description/) })
  })
  it('avisa si el nombre no coincide con la carpeta o se pasa de largo', () => {
    const s = leerSkillMd(md(`name: otra\ndescription: d`), 'carpeta')
    expect(s.ok && s.avisos).toContain('El nombre «otra» no coincide con la carpeta «carpeta».')
    const largo = leerSkillMd(md(`name: ${'a'.repeat(70)}\ndescription: d`), 'a'.repeat(70))
    expect(largo.ok && largo.avisos.some((a) => /64/.test(a))).toBe(true)
  })
})
