// Catálogo de motores por suscripción que hablan ACP y su detección en el equipo. Esme no guarda tokens: cada uno inicia sesión por su cuenta.
export type Cumplimiento = 'permitido' | 'tolerado' | 'requiere-aprobacion'
export type MotorACP = { id: string; nombre: string; binarios: string[]; args: string[]; cumplimiento: Cumplimiento; nota: string; verificado: string; login: string }

const F = '2026-10-12'
export const MOTORES_ACP: MotorACP[] = [
  { id: 'copilot', nombre: 'GitHub Copilot', binarios: ['copilot'], args: ['--acp'], cumplimiento: 'permitido', verificado: F,
    nota: '`copilot --acp` (stdio por defecto) según docs.github.com; no instalado aquí.', login: 'Inicia sesión con tu cuenta de GitHub en el propio copilot (/login).' },
  { id: 'cursor', nombre: 'Cursor', binarios: ['cursor-agent', 'agent'], args: ['acp'], cumplimiento: 'permitido', verificado: F,
    nota: '`agent acp` según cursor.com/docs/cli/acp; el binario se llama `agent` (alias `cursor-agent`, sin verificar). No instalado aquí.', login: 'Ejecuta `agent login` una vez con tu cuenta de Cursor.' },
  { id: 'opencode', nombre: 'OpenCode', binarios: ['opencode'], args: ['acp'], cumplimiento: 'permitido', verificado: F,
    nota: '`opencode acp` confirmado con `opencode acp --help` en este equipo.', login: 'Ejecuta `opencode auth login` y elige tu proveedor o suscripción.' },
  { id: 'gemini', nombre: 'Gemini CLI', binarios: ['gemini'], args: ['--acp'], cumplimiento: 'permitido', verificado: F,
    nota: '`gemini --acp` según geminicli.com/docs/cli/acp-mode; no instalado aquí.', login: 'Ejecuta `gemini` y entra con tu cuenta de Google.' },
  { id: 'goose', nombre: 'Goose', binarios: ['goose'], args: ['acp'], cumplimiento: 'permitido', verificado: F,
    nota: 'Subcomando `goose acp` sin verificar (la doc consultada no respondió y el binario no está instalado).', login: 'Configura el proveedor con `goose configure`.' },
  { id: 'kimi', nombre: 'Kimi CLI', binarios: ['kimi'], args: ['acp'], cumplimiento: 'permitido', verificado: F,
    nota: 'Subcomando `kimi acp` sin verificar (la doc consultada no respondió y el binario no está instalado).', login: 'Ejecuta `kimi` y usa /login con tu cuenta de Kimi.' },
  { id: 'qwen', nombre: 'Qwen Code', binarios: ['qwen'], args: ['--acp'], cumplimiento: 'permitido', verificado: F,
    nota: '`qwen --acp` según la guía oficial de integración con Zed; no verificado con el binario (aquí `qwen` es un alias de shell distinto).', login: 'Ejecuta `qwen` y entra con Qwen OAuth o tu clave.' },
  { id: 'vibe', nombre: 'Mistral Vibe', binarios: ['vibe-acp', 'vibe'], args: [], cumplimiento: 'permitido', verificado: F,
    nota: 'Binario `vibe-acp` sin verificar (la doc consultada no respondió y no está instalado).', login: 'Ejecuta `vibe --setup` con tu clave o cuenta de Mistral.' },
  { id: 'cline', nombre: 'Cline', binarios: ['cline'], args: ['--acp'], cumplimiento: 'permitido', verificado: F,
    nota: '`cline --acp` confirmado con `cline --help` en este equipo.', login: 'Ejecuta `cline auth` con tu cuenta o proveedor.' },
  { id: 'codex', nombre: 'Codex (adaptador)', binarios: ['codex-acp'], args: [], cumplimiento: 'tolerado', verificado: F,
    nota: 'Adaptador `@agentclientprotocol/codex-acp` (el repo zed-industries/codex-acp está archivado; `npx @zed-industries/codex-acp` aún funciona). Nombre del binario sin verificar; no instalado aquí.', login: 'Inicia sesión con tu suscripción de ChatGPT en Codex (`codex login`).' },
  { id: 'claude', nombre: 'Claude (adaptador)', binarios: ['claude-agent-acp'], args: [], cumplimiento: 'requiere-aprobacion', verificado: F,
    nota: 'Adaptador `@agentclientprotocol/claude-agent-acp`; nombre del binario sin verificar. Solo con el login del propio usuario y el binario oficial; para distribuirlo hay que pedir aprobación a Anthropic.', login: 'Inicia sesión con tu cuenta de Claude en el Claude Code oficial (`claude /login`).' },
]

export async function detectarMotores(which: (bin: string) => Promise<string | null>): Promise<(MotorACP & { instalado: boolean; ruta?: string })[]> {
  const buscar = async (bin: string) => { try { return await which(bin) } catch { return null } }
  return Promise.all(MOTORES_ACP.map(async (m) => {
    for (const b of m.binarios) { const ruta = await buscar(b); if (ruta) return { ...m, instalado: true, ruta } }
    return { ...m, instalado: false }
  }))
}
