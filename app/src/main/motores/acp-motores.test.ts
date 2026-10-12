import { describe, it, expect } from 'vitest'
import { MOTORES_ACP, detectarMotores } from './acp-motores'

describe('MOTORES_ACP', () => {
  it('trae los once motores con campos completos', () => {
    expect(MOTORES_ACP.map((m) => m.id).sort()).toEqual(['claude', 'cline', 'codex', 'copilot', 'cursor', 'gemini', 'goose', 'kimi', 'opencode', 'qwen', 'vibe'])
    for (const m of MOTORES_ACP) {
      expect(m.binarios.length).toBeGreaterThan(0)
      expect(m.verificado).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(m.login.length).toBeGreaterThan(5)
    }
  })
  it('cumplimiento: claude requiere aprobación, codex tolerado, el resto permitido', () => {
    const c = Object.fromEntries(MOTORES_ACP.map((m) => [m.id, m.cumplimiento]))
    expect(c.claude).toBe('requiere-aprobacion')
    expect(c.codex).toBe('tolerado')
    expect(MOTORES_ACP.filter((m) => !['claude', 'codex'].includes(m.id)).every((m) => m.cumplimiento === 'permitido')).toBe(true)
  })
  it('lo no confirmado queda marcado «sin verificar» en la nota', () => {
    expect(MOTORES_ACP.some((m) => /sin verificar/i.test(m.nota))).toBe(true)
  })
})

describe('detectarMotores', () => {
  it('marca instalado con ruta usando el primer binario que exista', async () => {
    const r = await detectarMotores(async (b) => (b === 'agent' ? '/x/agent' : b === 'opencode' ? '/x/opencode' : null))
    const cursor = r.find((m) => m.id === 'cursor')!
    expect(cursor.instalado).toBe(true)
    expect(cursor.ruta).toBe('/x/agent')
    expect(r.find((m) => m.id === 'opencode')!.instalado).toBe(true)
    const gemini = r.find((m) => m.id === 'gemini')!
    expect(gemini.instalado).toBe(false)
    expect(gemini.ruta).toBeUndefined()
  })
  it('un which que lanza error cuenta como no instalado', async () => {
    const r = await detectarMotores(async () => { throw new Error('boom') })
    expect(r.every((m) => !m.instalado)).toBe(true)
  })
})
