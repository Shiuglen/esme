// El puente de llaves: ajustes de territorio propio, llave solo por env y nada en disco.
import { describe, expect, it } from 'vitest'
import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ajustesQwen, credencialesDe } from './credenciales'

describe('ajustesQwen', () => {
  it('escribe settings.json apuntando a OpenRouter, con la llave nombrada por env (nunca en disco)', async () => {
    const carpeta = await mkdtemp(join(tmpdir(), 'esme-qwen-'))
    ajustesQwen(carpeta, 'qwen/qwen3-coder-flash')
    const s = JSON.parse(await readFile(join(carpeta, 'settings.json'), 'utf8'))
    expect(s.modelProviders.openai[0]).toMatchObject({ id: 'qwen/qwen3-coder-flash', baseUrl: 'https://openrouter.ai/api/v1', envKey: 'OPENROUTER_API_KEY' })
    expect(s.security.auth.selectedType).toBe('openai')
    expect(s.model.name).toBe('qwen/qwen3-coder-flash')
    expect(JSON.stringify(s)).not.toContain('sk-')
  })
})

describe('credencialesDe', () => {
  it('teje el env de qwen-code con la llave del llavero y su territorio', () => {
    const r = credencialesDe('qwen-code', () => 'sk-prueba', '/tmp/esme-motores')
    if (!r) throw new Error('la credencial debía existir')
    expect(r.env.OPENROUTER_API_KEY).toBe('sk-prueba')
    expect(r.env.QWEN_HOME).toBe('/tmp/esme-motores/qwen-code')
    expect(r.nota).toContain('OpenRouter')
  })

  it('nada para motores sin familia o sin llave', () => {
    expect(credencialesDe('pi-acp', () => 'sk-prueba', '/tmp/esme-motores')).toBe(null)
    expect(credencialesDe('qwen-code', () => undefined, '/tmp/esme-motores')).toBe(null)
  })
})
