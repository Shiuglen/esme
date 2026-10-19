import { describe, expect, it } from 'vitest'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { instalarSkill } from './instalar'
import { skillsParaEsme, usarSkill } from './esme'

const fuente = { repo: 'a/b', ruta: 's', commit: 'a'.repeat(40), arbolSha256: 'f'.repeat(64), licencia: 'MIT' }
const preparar = () => {
  const raiz = mkdtempSync(join(tmpdir(), 'esme-skills-')), datos = join(raiz, 'datos'), home = join(raiz, 'home')
  const md = (n: string, extra = '') => Buffer.from(`---\nname: ${n}\ndescription: Hace ${n}.${extra}\n---\nInstrucciones de ${n}.`)
  instalarSkill({ home, datos, id: 'a/tdd', nombre: 'tdd', fuente, agentes: [], archivos: [{ ruta: 'SKILL.md', datos: md('tdd'), ejecutable: false }, { ruta: 'references/guia.md', datos: Buffer.from('Guía larga'), ejecutable: false }] })
  instalarSkill({ home, datos, id: 'a/grill', nombre: 'grill-me', fuente, agentes: [], archivos: [{ ruta: 'SKILL.md', datos: md('grill-me', '\ndisable-model-invocation: true'), ejecutable: false }] })
  return { datos, raiz }
}

describe('las skills de Esme', () => {
  it('Esme conoce las instaladas por su nombre y descripción; las «solo manual» van aparte', () => {
    const { datos } = preparar()
    expect(skillsParaEsme(datos)).toEqual([{ nombre: 'grill-me', descripcion: 'Hace grill-me.', soloManual: true }, { nombre: 'tdd', descripcion: 'Hace tdd.', soloManual: false }])
  })
  it('usar una skill devuelve sus instrucciones y sus ficheros; un fichero concreto también', () => {
    const { datos } = preparar()
    expect(usarSkill(datos, 'tdd')).toEqual({ instrucciones: 'Instrucciones de tdd.', ficheros: ['references/guia.md'] })
    expect(usarSkill(datos, 'tdd', 'references/guia.md')).toEqual({ instrucciones: 'Guía larga', ficheros: ['references/guia.md'] })
  })
  it('no deja salir de la carpeta de la skill ni usar una que no está', () => {
    const { datos, raiz } = preparar()
    writeFileSync(join(raiz, 'secreto.txt'), 'no')
    expect(() => usarSkill(datos, 'tdd', '../../../secreto.txt')).toThrow(/fuera/)
    expect(() => usarSkill(datos, 'no-existe')).toThrow(/instalada/)
    mkdirSync(join(datos, 'skills', 'suelta'), { recursive: true })
    expect(() => usarSkill(datos, 'suelta')).toThrow(/instalada/)
  })
})
