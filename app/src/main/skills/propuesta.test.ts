// La propuesta del sueño, hecha skill: el bucle entero, de la tarjeta a la carpeta del agente.
import { describe, expect, it } from 'vitest'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { desinstalarSkill, skillsInstaladas } from './instalar'
import { instalarPropuesta } from './propuesta'

const entorno = () => { const raiz = mkdtempSync(join(tmpdir(), 'propuesta-')); return { home: join(raiz, 'home'), datos: join(raiz, 'datos') } }
const receta = { nombre: 'readme-instalacion', descripcion: 'Actualiza el readme con la instalación nueva.', cuerpo: '# Hola\n\n- [ ] Qué hay que mirar primero.', agentes: ['claude'] }

describe('la receta que el creador escribe', () => {
  it('se instala como cualquier skill: copia canónica, enlace en la carpeta y marca de Esme', () => {
    const e = entorno()
    const r = instalarPropuesta(receta, e)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    const canon = join(e.datos, 'skills', 'readme-instalacion')
    expect(r.canonica).toBe(canon)
    expect(readFileSync(join(canon, 'SKILL.md'), 'utf8')).toContain('name: readme-instalacion')
    expect(readlinkSync(join(e.home, '.claude', 'skills', 'readme-instalacion'))).toBe(canon)
    // y queda en el manifiesto: se puede quitar después
    expect(skillsInstaladas(e.datos)).toMatchObject([{ nombre: 'readme-instalacion' }])
  })

  it('el fichero que se escribe es el SKILL.md que se puede leer (el mismo formato)', () => {
    const e = entorno()
    const r = instalarPropuesta(receta, e)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.skillMd).toContain('description: Actualiza el readme con la instalación nueva.')
    expect(r.skillMd).toContain('- [ ] Qué hay que mirar primero.')
  })

  it('instalarla dos veces no rompe nada (la misma receta, el mismo sitio)', () => {
    const e = entorno()
    const a = instalarPropuesta(receta, e)
    const b = instalarPropuesta(receta, e)
    expect(a.ok && b.ok).toBe(true)
    if (!a.ok || !b.ok) return
    expect(b.canonica).toBe(a.canonica)
    expect(skillsInstaladas(e.datos)).toHaveLength(1)
  })

  it('no pisa una skill ajena con el mismo nombre: lo dice como conflicto', () => {
    const e = entorno()
    mkdirSync(join(e.home, '.claude', 'skills', 'readme-instalacion'), { recursive: true })
    writeFileSync(join(e.home, '.claude', 'skills', 'readme-instalacion', 'SKILL.md'), 'ajena')
    const r = instalarPropuesta(receta, e)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.conflictos).toHaveLength(1)
    expect(readFileSync(join(e.home, '.claude', 'skills', 'readme-instalacion', 'SKILL.md'), 'utf8')).toBe('ajena')
  })

  it('sin nombre, sin cuerpo, sin agentes o con un nombre imposible: no escribe nada', () => {
    const e = entorno()
    expect(instalarPropuesta({ ...receta, nombre: '' }, e)).toMatchObject({ ok: false })
    expect(instalarPropuesta({ ...receta, cuerpo: '  ' }, e)).toMatchObject({ ok: false })
    expect(instalarPropuesta({ ...receta, agentes: [] }, e)).toMatchObject({ ok: false })
    expect(instalarPropuesta({ ...receta, nombre: 'con espacio' }, e)).toMatchObject({ ok: false })
    expect(instalarPropuesta({ ...receta, agentes: ['inventado'] }, e)).toMatchObject({ ok: false })
    expect(existsSync(join(e.datos, 'skills'))).toBe(false)
  })

  it('se puede quitar como cualquier skill (la marca de Esme la deja fuera)', () => {
    const e = entorno()
    instalarPropuesta(receta, e)
    const r = desinstalarSkill({ datos: e.datos, id: skillsInstaladas(e.datos)[0].id })
    expect(r.ok).toBe(true)
    expect(existsSync(join(e.home, '.claude', 'skills', 'readme-instalacion'))).toBe(false)
  })
})
