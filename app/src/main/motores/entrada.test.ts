import { describe, expect, it } from 'vitest'
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { guardarEntrada, leerEntradas } from './entrada'

describe('cómo entra Esme en cada agente', () => {
  it('recuerda el método por agente, se puede olvidar y un fichero roto no rompe nada', () => {
    const f = join(mkdtempSync(join(tmpdir(), 'entrada-')), 'motores', 'entrada.json')
    expect(leerEntradas(f)).toEqual({})
    guardarEntrada(f, 'cline', 'openai-codex'); guardarEntrada(f, 'qwen', 'openai')
    expect(leerEntradas(f)).toEqual({ cline: 'openai-codex', qwen: 'openai' })
    guardarEntrada(f, 'qwen', null)
    expect(leerEntradas(f)).toEqual({ cline: 'openai-codex' })
    expect(JSON.parse(readFileSync(f, 'utf8'))).toEqual({ cline: 'openai-codex' })
  })
  it('ignora lo que no son textos', () => {
    const f = join(mkdtempSync(join(tmpdir(), 'entrada-')), 'e.json')
    guardarEntrada(f, 'cline', 'cline')
    expect(leerEntradas(join(tmpdir(), 'no-existe', 'x.json'))).toEqual({})
  })
})
