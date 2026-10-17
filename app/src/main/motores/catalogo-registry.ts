// Registro vivo de motores ACP (agentclientprotocol.com/registry) para el catálogo del Taller.
// Se descarga cada 12 h, se guarda copia en userData y si no hay red ni caché se usa el espejo interno.
// Estos motores son informativos (instalado: false): elegirMotor solo acepta los locales.
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

export type MotorRegistro = { id: string; nombre: string; descripcion: string; repo: string | null; instalacion: string | null }
type EntradaRegistro = { id?: unknown; name?: unknown; description?: unknown; repository?: unknown; distribution?: unknown }

const URL_REGISTRO = 'https://cdn.agentclientprotocol.com/registry/v1/latest/registry.json'
const CADUCIDAD = 12 * 60 * 60 * 1000
let copia: MotorRegistro[] | null = null

// Espejo embebido (42 del 16-oct-2026): garantiza catálogo aunque no haya red ni caché.
const ESPEJO: MotorRegistro[] = [
  {
    "id": "agoragentic-acp",
    "nombre": "Agoragentic",
    "descripcion": "Agent marketplace with 174+ AI capabilities. Browse, invoke, and pay for agent services settled in USDC on Base L2.",
    "repo": "https://github.com/rhein1/agoragentic-integrations",
    "instalacion": "npx agoragentic-mcp@1.3.0 --acp"
  },
  {
    "id": "amp-acp",
    "nombre": "Amp",
    "descripcion": "ACP wrapper for Amp - the frontier coding agent",
    "repo": "https://github.com/tao12345666333/amp-acp",
    "instalacion": null
  },
  {
    "id": "antigravity-acp",
    "nombre": "Google Antigravity",
    "descripcion": "Google’s AI coding agent",
    "repo": null,
    "instalacion": null
  },
  {
    "id": "auggie",
    "nombre": "Auggie CLI",
    "descripcion": "Augment Code's powerful software agent, backed by industry-leading context engine",
    "repo": "https://github.com/augmentcode/auggie",
    "instalacion": "npx @augmentcode/auggie@0.36.0 --acp"
  },
  {
    "id": "autohand",
    "nombre": "Autohand Code",
    "descripcion": "Autohand Code - AI coding agent powered by Autohand AI",
    "repo": "https://github.com/autohandai/autohand-acp",
    "instalacion": "npx @autohandai/autohand-acp@0.2.1"
  },
  {
    "id": "bob",
    "nombre": "Bob",
    "descripcion": "IBM Bob is your AI-Powered Development Partner",
    "repo": null,
    "instalacion": "npx @ibm/bob@2.0.8 acp"
  },
  {
    "id": "claude-acp",
    "nombre": "Claude Agent",
    "descripcion": "ACP wrapper for Anthropic's Claude",
    "repo": "https://github.com/agentclientprotocol/claude-agent-acp",
    "instalacion": "npx @agentclientprotocol/claude-agent-acp@0.92.0"
  },
  {
    "id": "cline",
    "nombre": "Cline",
    "descripcion": "Autonomous coding agent CLI - capable of creating/editing files, running commands, using the browser, and more",
    "repo": "https://github.com/cline/cline",
    "instalacion": "npx cline@3.0.72 --acp"
  },
  {
    "id": "codebuddy-code",
    "nombre": "Codebuddy Code",
    "descripcion": "Tencent Cloud's official intelligent coding tool",
    "repo": null,
    "instalacion": "npx @tencent-ai/codebuddy-code@2.168.2 --acp"
  },
  {
    "id": "codex-acp",
    "nombre": "Codex",
    "descripcion": "ACP adapter for OpenAI's coding assistant",
    "repo": "https://github.com/agentclientprotocol/codex-acp",
    "instalacion": "npx @agentclientprotocol/codex-acp@2.2.2"
  },
  {
    "id": "cortex-code",
    "nombre": "Cortex Code",
    "descripcion": "Snowflake's Cortex Code coding agent",
    "repo": "https://docs.snowflake.com/en/user-guide/cortex-code/cortex-code",
    "instalacion": null
  },
  {
    "id": "corust-agent",
    "nombre": "Corust Agent",
    "descripcion": "Co-building with a seasoned Rust partner.",
    "repo": "https://github.com/Corust-ai/corust-agent-release",
    "instalacion": null
  },
  {
    "id": "crow-cli",
    "nombre": "crow-cli",
    "descripcion": "Minimal ACP Native Coding Agent",
    "repo": "https://github.com/crow-cli/crow-cli",
    "instalacion": null
  },
  {
    "id": "cursor",
    "nombre": "Cursor",
    "descripcion": "Cursor's coding agent",
    "repo": null,
    "instalacion": null
  },
  {
    "id": "deepagents",
    "nombre": "DeepAgents",
    "descripcion": "Batteries-included AI coding and general purpose agent powered by LangChain.",
    "repo": "https://github.com/langchain-ai/deepagentsjs",
    "instalacion": "npx deepagents-acp@0.1.7"
  },
  {
    "id": "devin",
    "nombre": "Devin",
    "descripcion": "Devin CLI coding agent by Cognition",
    "repo": "https://github.com/CognitionAI/devin-cli",
    "instalacion": null
  },
  {
    "id": "dimcode",
    "nombre": "DimCode",
    "descripcion": "A coding agent that puts leading models at your command.",
    "repo": null,
    "instalacion": "npx dimcode@0.5.19 acp"
  },
  {
    "id": "dirac",
    "nombre": "Dirac",
    "descripcion": "Reduces API costs by more than 50%, produces better and faster work. Uses Hash anchored parallel edits, AST manipulation and a whole lot of neat optimizations. Fully Open Source.",
    "repo": "https://github.com/dirac-run/dirac",
    "instalacion": "npx dirac-cli@0.5.21 --acp"
  },
  {
    "id": "factory-droid",
    "nombre": "Factory Droid",
    "descripcion": "Factory Droid - AI coding agent powered by Factory AI",
    "repo": null,
    "instalacion": "npx droid@0.243.0 exec --output-format acp-daemon"
  },
  {
    "id": "fast-agent",
    "nombre": "fast-agent",
    "descripcion": "Code and build agents with comprehensive multi-provider support",
    "repo": "https://github.com/evalstate/fast-agent",
    "instalacion": null
  },
  {
    "id": "gemini",
    "nombre": "Gemini CLI",
    "descripcion": "Google's official CLI for Gemini",
    "repo": "https://github.com/google-gemini/gemini-cli",
    "instalacion": "npx @google/gemini-cli@0.64.0 --acp"
  },
  {
    "id": "github-copilot-cli",
    "nombre": "Copilot",
    "descripcion": "GitHub's AI pair programmer",
    "repo": "https://github.com/github/copilot-cli",
    "instalacion": "npx @github/copilot@1.0.98 --acp"
  },
  {
    "id": "glm-acp-agent",
    "nombre": "GLM Agent",
    "descripcion": "ACP agent powered by Zhipu AI's GLM Coding Plan models (glm-5.1, glm-5-turbo, glm-4.7, glm-4.5-air). Supports streaming, tool calls, mid-session model switching, image input via Z.AI Coding Plan Vision MCP, and session l",
    "repo": "https://github.com/stefandevo/glm-acp-agent",
    "instalacion": "npx glm-acp-agent@1.15.0"
  },
  {
    "id": "goose",
    "nombre": "goose",
    "descripcion": "A local, extensible, open source AI agent that automates engineering tasks",
    "repo": "https://github.com/block/goose",
    "instalacion": null
  },
  {
    "id": "grok-build",
    "nombre": "Grok Build",
    "descripcion": "xAI's coding agent and CLI",
    "repo": null,
    "instalacion": "npx @xai-official/grok@1.0.62 agent stdio"
  },
  {
    "id": "harn",
    "nombre": "Harn",
    "descripcion": "Harn runs .harn agent pipelines as a native ACP coding agent over stdio.",
    "repo": "https://github.com/burin-labs/harn",
    "instalacion": null
  },
  {
    "id": "junie",
    "nombre": "Junie",
    "descripcion": "AI Coding Agent by JetBrains",
    "repo": "https://github.com/JetBrains/junie-acp-release",
    "instalacion": null
  },
  {
    "id": "kilo",
    "nombre": "Kilo",
    "descripcion": "The open source coding agent",
    "repo": "https://github.com/Kilo-Org/kilocode",
    "instalacion": "npx @kilocode/cli@7.8.12 acp"
  },
  {
    "id": "kimchi",
    "nombre": "Kimchi",
    "descripcion": "Coding agent powered by multi-model orchestration",
    "repo": "https://github.com/getkimchi/kimchi",
    "instalacion": null
  },
  {
    "id": "kimi",
    "nombre": "Kimi CLI",
    "descripcion": "Moonshot AI's coding assistant",
    "repo": "https://github.com/MoonshotAI/kimi-cli",
    "instalacion": null
  },
  {
    "id": "minimax-code",
    "nombre": "MiniMax Code",
    "descripcion": "MiniMax Code is an AI coding agent with Agent Client Protocol support.",
    "repo": null,
    "instalacion": "npx @minimax-ai/code@0.2.7 acp"
  },
  {
    "id": "minion-code",
    "nombre": "Minion Code",
    "descripcion": "An enhanced AI code assistant built on the Minion framework with rich development tools",
    "repo": "https://github.com/femto/minion-code",
    "instalacion": null
  },
  {
    "id": "mistral-vibe",
    "nombre": "Mistral Vibe",
    "descripcion": "Mistral's open-source coding assistant",
    "repo": "https://github.com/mistralai/mistral-vibe",
    "instalacion": null
  },
  {
    "id": "nova",
    "nombre": "Nova",
    "descripcion": "Nova by Compass AI - a fully-fledged software engineer at your command",
    "repo": "https://github.com/Compass-Agentic-Platform/nova",
    "instalacion": "npx @compass-ai/nova@1.1.54 acp"
  },
  {
    "id": "opencode",
    "nombre": "OpenCode",
    "descripcion": "The open source coding agent",
    "repo": "https://github.com/anomalyco/opencode",
    "instalacion": null
  },
  {
    "id": "pi-acp",
    "nombre": "pi ACP",
    "descripcion": "ACP adapter for pi coding agent",
    "repo": "https://github.com/svkozak/pi-acp",
    "instalacion": "npx pi-acp@0.0.34"
  },
  {
    "id": "poolside",
    "nombre": "Poolside",
    "descripcion": "Poolside's coding agent",
    "repo": "https://github.com/poolsideai/pool",
    "instalacion": null
  },
  {
    "id": "qoder",
    "nombre": "Qoder CLI",
    "descripcion": "AI coding assistant with agentic capabilities",
    "repo": null,
    "instalacion": "npx @qoder-ai/qodercli@0.2.14 --acp"
  },
  {
    "id": "qwen-code",
    "nombre": "Qwen Code",
    "descripcion": "Alibaba's Qwen coding assistant",
    "repo": "https://github.com/QwenLM/qwen-code",
    "instalacion": "npx @qwen-code/qwen-code@0.25.2 --acp --experimental-skills"
  },
  {
    "id": "sigit",
    "nombre": "siGit Code",
    "descripcion": "Local-first coding agent. Runs entirely on your machine with optional on-device LLM inference via Onde.",
    "repo": "https://github.com/getsigit/sigit",
    "instalacion": "npx @smbcloud/sigit@1.7.0"
  },
  {
    "id": "stakpak",
    "nombre": "Stakpak",
    "descripcion": "Open-source DevOps agent in Rust with enterprise-grade security",
    "repo": "https://github.com/stakpak/agent",
    "instalacion": null
  },
  {
    "id": "vtcode",
    "nombre": "VT Code",
    "descripcion": "An open-source coding agent with LLM-native code understanding and robust shell safety. Supports multiple LLM providers with automatic failover and efficient context management.",
    "repo": "https://github.com/vinhnx/VTCode",
    "instalacion": null
  }
]

function norma(e: EntradaRegistro): MotorRegistro | null {
  const id = typeof e.id === 'string' ? e.id.trim() : null
  const nombre = typeof e.name === 'string' ? e.name.trim() : null
  if (!id || !nombre) return null
  const dist = (typeof e.distribution === 'object' && e.distribution !== null ? e.distribution : {}) as { npx?: unknown }
  const npx = (typeof dist.npx === 'object' && dist.npx !== null ? dist.npx : {}) as { package?: unknown; args?: unknown }
  const paquete = typeof npx.package === 'string' && npx.package.trim() ? npx.package.trim() : null
  let instalacion: string | null = null
  if (paquete) {
    const extra = Array.isArray(npx.args) ? (npx.args as unknown[]).filter((a) => typeof a === 'string').join(' ') : ''
    instalacion = `npx ${paquete}${extra ? ` ${extra}` : ''}`
  }
  return {
    id, nombre,
    descripcion: typeof e.description === 'string' ? e.description : '',
    repo: typeof e.repository === 'string' ? e.repository : null,
    instalacion,
  }
}

function validas(x: unknown): MotorRegistro[] {
  if (!Array.isArray(x)) return []
  return x.filter((m): m is MotorRegistro => !!m && typeof (m as MotorRegistro).id === 'string' && typeof (m as MotorRegistro).nombre === 'string')
}

// Nunca lanza: miles de horas de catálogo no pueden morir por un corte de red de 5 s.
export async function cargarRegistro(dirUsuario: string): Promise<MotorRegistro[]> {
  if (copia) return copia
  const fichero = join(dirUsuario, 'registro-acp.json')
  const enDisco = await readFile(fichero, 'utf8').then(
    (t) => JSON.parse(t) as { cuando?: unknown; motores?: unknown },
    () => null,
  ).catch(() => null)
  if (enDisco && typeof enDisco.cuando === 'number' && Date.now() - enDisco.cuando < CADUCIDAD) {
    const m = validas(enDisco.motores)
    if (m.length) { copia = m; return copia }
  }
  try {
    const r = await fetch(URL_REGISTRO, { signal: AbortSignal.timeout(5000) })
    if (!r.ok) throw new Error(String(r.status))
    const d = (await r.json()) as { agents?: unknown }
    const m = validas((Array.isArray(d.agents) ? d.agents : []).map(norma))
    if (m.length) {
      copia = m
      try { await mkdir(dirname(fichero), { recursive: true }); await writeFile(fichero, JSON.stringify({ cuando: Date.now(), motores: m })) } catch {}
      return copia
    }
  } catch {}
  const vieja = enDisco ? validas(enDisco.motores) : []
  copia = vieja.length ? vieja : ESPEJO
  return copia
}
