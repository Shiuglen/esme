// Agentes del Taller. Cada uno corre SIN MODIFICAR en su terminal; los que lo admiten se conectan al cerebro por MCP.
import { accessSync, constants, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { delimiter, join } from 'node:path'
import type { BrainInfo } from './brain-process'

export type AgentPreset = { id: string; label: string; bin: string; installed: boolean; memory: boolean; note?: string }

function which(bin: string): string | null {
  for (const dir of (process.env.PATH ?? '').split(delimiter)) {
    const p = join(dir, bin)
    try { accessSync(p, constants.X_OK); return p } catch { /* sigue */ }
  }
  return null
}

const DEFS = [
  { id: 'claude', label: 'Claude (tu suscripción)', bin: 'claude', memory: true, note: 'binario oficial sin modificar; el login es tuyo' },
  { id: 'opencode', label: 'OpenCode', bin: 'opencode', memory: true, note: 'modelos de OpenCode Zen y cualquier otro' },
  { id: 'codex', label: 'Codex', bin: 'codex', memory: false },
  { id: 'gemini', label: 'Gemini CLI', bin: 'gemini', memory: false },
  { id: 'shell', label: 'Terminal', bin: process.env.SHELL?.split('/').pop() ?? 'bash', memory: false },
]

export function listAgents(): AgentPreset[] {
  return DEFS.map((d) => ({ ...d, installed: which(d.bin) !== null }))
}

/** Comando para lanzar un agente conectado a la memoria (la cabecera lleva el token del cerebro, solo en loopback). */
export function agentCommand(id: string, brain: BrainInfo | null): { cmd: string; args: string[]; env: Record<string, string> } {
  const def = DEFS.find((d) => d.id === id)
  if (!def) throw new Error(`agente desconocido: ${id}`)
  const cmd = which(def.bin) ?? def.bin
  const mcp = brain ? { url: `${brain.url}/mcp`, headers: { Authorization: `Bearer ${brain.token}` } } : null
  if (id === 'claude' && mcp) {
    return { cmd, args: ['--mcp-config', JSON.stringify({ mcpServers: { daimon: { type: 'http', ...mcp } } })], env: {} }
  }
  if (id === 'opencode' && mcp) {
    const dir = mkdtempSync(join(tmpdir(), 'daimon-oc-'))
    const cfg = join(dir, 'opencode.json')
    writeFileSync(cfg, JSON.stringify({ $schema: 'https://opencode.ai/config.json', mcp: { daimon: { type: 'remote', enabled: true, ...mcp } } }), { mode: 0o600 })
    return { cmd, args: [], env: { OPENCODE_CONFIG: cfg } }
  }
  return { cmd, args: [], env: {} }
}
