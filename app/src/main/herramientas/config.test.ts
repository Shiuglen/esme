import { describe, it, expect } from 'vitest'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { leerConfig, guardarConfig } from './config'

describe('la configuración de las manos', () => {
  it('se guarda y se vuelve a leer; un fichero roto o raro da la de siempre', () => {
    const f = join(mkdtempSync(join(tmpdir(), 'manos-')), 'herramientas.json')
    expect(leerConfig(f)).toEqual({ politicas: {} })
    guardarConfig(f, { politicas: { encargar_al_equipo: 'siempre' }, searxng: 'http://172.20.1.101:8888' })
    expect(leerConfig(f)).toEqual({ politicas: { encargar_al_equipo: 'siempre' }, searxng: 'http://172.20.1.101:8888' })
    writeFileSync(f, '{roto'); expect(leerConfig(f)).toEqual({ politicas: {} })
    writeFileSync(f, JSON.stringify({ politicas: { x: 'quizas', y: 'nunca' }, searxng: 'ftp://x' }))
    expect(leerConfig(f)).toEqual({ politicas: { y: 'nunca' } })
  })
})
