# Investigación: arquitectura de la app (2026-10-11)

Resumen de fuentes primarias consultadas por el investigador (docs oficiales, npm, repos). [H] hecho, [I] inferencia.

- **OpenCode** (`anomalyco/opencode`, MIT, v1.19.0 del 2026-10-11) [H].
  - Formas de integrarlo: `opencode serve` (API HTTP + SSE), SDK `@opencode-ai/sdk` y `opencode acp` (stdio).
  - **Zen:** pasarela de pago por uso con endpoints compatibles con OpenAI y con Anthropic (`https://opencode.ai/zen/v1/...`).
  - Zen tiene modelos gratis que cambian: pedir la lista en tiempo de ejecución. Algunos gratis pueden retener datos.
- **ACP** (Agent Client Protocol, `@agentclientprotocol/sdk` 1.8.0) [H].
  - JSON-RPC por stdio, con más de 40 agentes compatibles.
  - Claude se conecta vía `claude-agent-acp`, Codex vía `codex-acp`; Gemini (`gemini --acp`) y OpenCode (`opencode acp`) lo traen de serie.
- **Claude Code** [H]:
  - Se permite que el usuario inicie sesión con SU suscripción en el binario **sin modificar**, aunque lo aloje una plataforma.
  - Se prohíbe enrutar o guardar sus credenciales, y usar el Agent SDK con login de suscripción.
  - No se puede usar «Claude Code» en el nombre del producto.
  - **Decisión:** Claude va en un PTY con `--mcp-config` y el usuario hace su propio login.
- **Terminales:** `@xterm/xterm` 6.0.0 + `node-pty` 1.1.0 (módulo nativo: reconstruir para Electron, o usar binarios precompilados) [H].
- **Chat multi-IA:** Vercel AI SDK `ai` 7.0.x + proveedores (Ollama `ollama-ai-provider-v2` 4.x, Anthropic, OpenAI, Google y compatibles OpenAI) [H].
  - Claves en `safeStorage`; en Linux sin llavero cae a texto plano, así que hay que avisar [H].
- **Stack:** Electron 44.7, React 19.3, electron-vite 5, three.js 0.186 [H].
  - WebGPU en Linux sigue detrás de banderas: WebGL2 por defecto y WebGPU opcional [H/I].
  - UMAP en Python (umap-js lleva sin publicar desde 2024) [H/I].
- **Seguridad de la API local** [I]: escuchar solo en loopback, con token, validando Origin. El contenido de la memoria es dato no confiable para los agentes.
- **Referencias:** T3 Code, Conductor, Crystal/Nimbalyst (worktree por agente, diffs en la app, servidor local único) [H].
