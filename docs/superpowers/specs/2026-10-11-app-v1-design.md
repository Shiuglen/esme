# Daimon App v1 — «Trabajas dentro de tu mente»

- **Fecha:** 2026-10-11
- **Estado:** aprobado en dirección por el usuario («todo y más»).
- **Specs relacionadas:** `2026-10-11-daimon-design.md` (§3, §7) y `docs/investigacion/2026-10-11-app-arquitectura.md`.

## 1. Objetivo

Una app de escritorio (Linux primero) donde el usuario:
1. habla con **cualquier IA** usando la memoria de Daimon;
2. **construye dentro** con agentes (su Claude Code, OpenCode, Codex, Gemini, shell) conectados al mismo cerebro;
3. **ve su mente real** como un atlas vivo;
4. **gestiona su memoria** (fuentes, búsqueda, olvido certificado).

Desde la v1 se usará para seguir desarrollando Daimon.

## 2. Experiencia

- **El Atlas es el fondo de toda la app.**
  - Los recuerdos reales se proyectan a 2D con UMAP y la densidad se convierte en relieve: los temas fuertes son montañas.
  - Las regiones llevan etiquetas sacadas de los propios datos (términos característicos de cada grupo).
  - Al hacer zoom se pasa de región a grupo y a recuerdo.
  - De día, curvas de nivel en tinta sobre papel; de noche, relieve con luz.
- **Paneles flotantes sobre el Atlas:** Chat, Taller (pestañas de terminal) y Memoria. Se mueven, se acoplan y se minimizan.
- **Memoria visible:**
  - Cuando cualquier cliente (chat o agente por MCP) usa `recall`, el cerebro emite un evento y en el Atlas **se iluminan los recuerdos usados**, con la marca de quién preguntó: chat, claude, opencode…
  - Cada agente tiene color y presencia en el mapa.
- **Chat:**
  - Selector de IA. La memoria va activada por defecto.
  - Bajo cada respuesta, los recuerdos citados (clic → lo enfoca en el Atlas) y los gestos «sirvió» / «no sirvió» (feedback del Tálamo).
  - Si el Tálamo se abstiene, se indica «sin memoria relevante».
- **Cmd+K:** paleta para todo (abrir agente, preguntar, buscar recuerdo, cambiar IA, día/noche).
- **Barra de estado:** estado de la mente, recuerdos, tokens ahorrados por el corte adaptativo y proveedor activo.
- **Principios aplicados:**
  - menos de 100 ms por interacción;
  - lo raro en el mundo y lo familiar en los controles;
  - cada efecto con interruptor;
  - nada finge emociones.

## 3. Arquitectura

| Proceso | Responsabilidad | Tecnología |
|---|---|---|
| **Cerebro** (sidecar Python) | Memoria, Tálamo, Atlas (UMAP), eventos, MCP | FastAPI + uvicorn en `127.0.0.1:<puerto>`, token por arranque; MCP *streamable HTTP* en `/mcp` |
| **Main** (Electron 44) | Lanza el cerebro, ventanas, claves (`safeStorage`), enrutado de chat | `ai` 7 + proveedores |
| **PTY** (utilityProcess) | Terminales de agentes | `node-pty` (o binario precompilado) |
| **Renderer** | Interfaz | React 19 + Vite + TypeScript, three.js, `@xterm/xterm` 6 |

**API del cerebro:**
- Todas las rutas exigen la cabecera `Authorization: Bearer <token>`. Se rechaza cualquier `Origin` que no sea la app.
- `GET /health`
- `POST /recall {query, budget, who}` → `{context, tokens, ids, abstained}`, y emite el evento `recall`.
- `POST /remember {text, kind}`
- `POST /feedback {ids, useful, query}`
- `GET /memories?q=&limit=` (búsqueda)
- `GET /memory/{id}` (con su DNI de procedencia)
- `POST /forget {id}` → certificado
- `POST /ingest {paths}` → recuerdos nuevos
- `GET /atlas` → `{points:[{id,x,y,h,cluster,kind,source}], clusters:[{id,label,x,y,size}]}`
- `GET /events` (SSE)
- `/mcp`: las herramientas `recall`, `remember` y `feedback`, que también emiten eventos (con `who` = cliente MCP).

**Agentes en el Taller (v1 en PTY):**
- `claude`: binario sin modificar, login propio del usuario, con `--mcp-config` apuntando a `/mcp` y su token.
- `opencode`: con la configuración MCP inyectada mediante su variable o fichero de configuración.
- `codex`, `gemini` y `shell` se ofrecen si están instalados.
- ACP queda para la v1.1, con aprobaciones y diffs nativos.

**Proveedores de chat:**
- `ollama`: local, por defecto.
- `opencode-zen`: OpenAI-compatible, `https://opencode.ai/zen/v1`, con la clave del usuario.
- `anthropic`, `openai`, `google`, `openrouter`, `deepseek`, `groq`.
- Las claves se guardan solo en el main con `safeStorage`. Si el backend es `basic_text`, se avisa.
- Los proveedores marcados «pueden retener datos» piden confirmación antes de recibir memoria.

## 4. Seguridad y privacidad

- La API y el MCP escuchan solo en loopback, con un token aleatorio por arranque. Las rutas no se exponen fuera.
- El contenido de la memoria es **dato no confiable** para los agentes: se entrega como contexto citado, nunca como instrucciones.
- Ninguna clave de proveedor ni ningún token de suscripción pasa por el renderer ni por el cerebro.
- La app no lee ni guarda credenciales de Claude: el login es del binario.
- El proyecto de la empresa y los secretos ya están filtrados por el sistema inmune. El ingest de la app usa la misma ruta (`collect`).

## 5. Pruebas y verificación

- **Cerebro:** pytest (API con token, eventos, atlas, MCP HTTP).
- **App:** vitest para la lógica (registro de proveedores, composición de mensajes, cliente del cerebro).
- **Verificación visual:** el renderer corre también en el navegador (modo web, contra la API del cerebro), lo que permite comprobarlo en el panel del navegador.
- **Electron:** prueba de humo de arranque (el cerebro se lanza, la ventana carga y el PTY abre una shell).

## 6. Fuera de la v1

- ACP con diffs y aprobaciones nativas.
- Worktrees por agente.
- Voz, móvil y canales de mensajería.
- Tienda de modelos.
- Corteza y Sueño.
- Empaquetado instalable (la v1 corre con `npm run dev`).
