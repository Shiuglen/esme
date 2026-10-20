import { describe, expect, it } from 'vitest'
import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ROLES_POR_DEFECTO, leeRoles, textoConRol } from './roles'

describe('los oficios del equipo', () => {
  it('sin archivo, los de casa', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'roles-'))
    expect(leeRoles(dir)).toEqual(ROLES_POR_DEFECTO)
    expect(leeRoles(dir).map((r) => r.id)).toContain('constructor')
  })

  it('si el creador pone los suyos, los suyos mandan', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'roles-'))
    await writeFile(join(dir, 'roles.json'), JSON.stringify([{ id: 'cocinero', nombre: 'Cocinero', instruccion: 'Cocina.' }]), 'utf8')
    const roles = leeRoles(dir)
    expect(roles).toHaveLength(1)
    expect(roles[0].nombre).toBe('Cocinero')
  })

  it('un archivo tonto no rompe nada: se usan los de casa', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'roles-'))
    await writeFile(join(dir, 'roles.json'), '[{"id": 1}]', 'utf8')
    expect(leeRoles(dir)).toEqual(ROLES_POR_DEFECTO)
    await writeFile(join(dir, 'roles.json'), 'no es json', 'utf8')
    expect(leeRoles(dir)).toEqual(ROLES_POR_DEFECTO)
  })

  it('el encargo lleva su oficio delante, y sin oficio queda igual', () => {
    const rol = { id: 'revisor', nombre: 'Revisor', instruccion: 'Míralo con ojo crítico.' }
    const t = textoConRol('Arregla el fallo del arranque', rol)
    expect(t.startsWith('Míralo con ojo crítico.')).toBe(true)
    expect(t).toContain('Arregla el fallo del arranque')
    expect(textoConRol('Arregla el fallo', null)).toBe('Arregla el fallo')
    expect(textoConRol('Arregla el fallo', { id: 'x', nombre: 'X', instruccion: '  ' })).toBe('Arregla el fallo')
  })
})
