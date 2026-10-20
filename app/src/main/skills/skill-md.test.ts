import { describe, expect, it } from 'vitest'
import { escribirSkillMd, leerSkillMd } from './skill-md'

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
  it('avisa si el cuerpo está vacío (no hay instrucciones que leer)', () => {
    const s = leerSkillMd('---\nname: x\ndescription: d\n---\n\n   \n', 'x')
    expect(s.ok && s.avisos).toContain('El cuerpo está vacío: no hay instrucciones que leer.')
  })

describe('escribir un SKILL.md (el mismo formato que se lee)', () => {
  it('lo que se escribe, se lee igual', () => {
    const texto = escribirSkillMd({ nombre: 'readme-instalacion', descripcion: 'Actualiza el readme con la instalación nueva.', cuerpo: '# Hola\nInstrucciones.' })
    const s = leerSkillMd(texto, 'readme-instalacion')
    expect(s.ok).toBe(true)
    if (!s.ok) return
    expect(s.skill.nombre).toBe('readme-instalacion')
    expect(s.skill.descripcion).toBe('Actualiza el readme con la instalación nueva.')
    expect(s.skill.cuerpo).toBe('# Hola\nInstrucciones.')
    expect(s.avisos).toEqual([])
  })
  it('una descripción con dos puntos no rompe la cabecera', () => {
    const texto = escribirSkillMd({ nombre: 'x', descripcion: 'Tarea: actualizar el readme: paso a paso.', cuerpo: 'cuerpo' })
    const s = leerSkillMd(texto, 'x')
    expect(s.ok && s.skill.descripcion).toBe('Tarea: actualizar el readme: paso a paso.')
  })
  it('una descripción con comillas sobrevive el viaje', () => {
    const texto = escribirSkillMd({ nombre: 'x', descripcion: 'Lo llama "el readme" y nada más.', cuerpo: 'cuerpo' })
    const s = leerSkillMd(texto, 'x')
    expect(s.ok && s.skill.descripcion).toBe('Lo llama "el readme" y nada más.')
  })
  it('los opcionales van en la cabecera (herramientas, licencia, sólo a mano)', () => {
    const texto = escribirSkillMd({ nombre: 'x', descripcion: 'd', cuerpo: 'cuerpo', herramientas: 'Bash Read', licencia: 'MIT', soloManual: true })
    const s = leerSkillMd(texto, 'x')
    expect(s.ok && s.skill.herramientasPermitidas).toBe('Bash Read')
    expect(s.ok && s.skill.licencia).toBe('MIT')
    expect(s.ok && s.skill.soloManual).toBe(true)
  })
  it('sin nombre, sin descripción o sin cuerpo: no se escribe (y se dice por qué)', () => {
    expect(() => escribirSkillMd({ nombre: ' ', descripcion: 'd', cuerpo: 'c' })).toThrow(/nombre/)
    expect(() => escribirSkillMd({ nombre: 'x', descripcion: ' ', cuerpo: 'c' })).toThrow(/descripción/)
    expect(() => escribirSkillMd({ nombre: 'x', descripcion: 'd', cuerpo: '  ' })).toThrow(/cuerpo/)
  })
})
