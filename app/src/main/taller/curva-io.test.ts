import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { leeCurva } from './curva-io'

/** El Taller de ejemplo: lo leen las dos pruebas (esta y la de Python) con el mismo esperado. */
const EJEMPLO = fileURLToPath(new URL('../../../../tests/fixtures/taller-curva/', import.meta.url))
const RAIZ = fileURLToPath(new URL('../../../../', import.meta.url))
const TALLER_REAL = join(homedir(), '.config', 'daimon-app', 'taller')

const esperado = JSON.parse(readFileSync(join(EJEMPLO, 'esperado.json'), 'utf8'))

describe('la curva: la app y la terminal cuentan lo mismo', () => {
  it('el Taller de ejemplo da el número que espera el esperado.json', async () => {
    expect(await leeCurva(EJEMPLO)).toEqual(esperado)
  })

  it('el script de la terminal da ese mismo número', () => {
    const salida = execFileSync(
      'python3',
      [join(RAIZ, 'scripts', 'curva_taller.py'), '--taller', EJEMPLO, '--json'],
      { encoding: 'utf8' },
    )
    expect(JSON.parse(salida)).toEqual(esperado)
  })

  it.runIf(existsSync(TALLER_REAL))('en el Taller de este equipo, los dos dan el mismo número', async () => {
    const salida = execFileSync(
      'python3',
      [join(RAIZ, 'scripts', 'curva_taller.py'), '--taller', TALLER_REAL, '--json'],
      { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
    )
    expect(await leeCurva(TALLER_REAL)).toEqual(JSON.parse(salida))
  })
})
