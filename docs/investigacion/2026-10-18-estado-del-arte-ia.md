# Estado del arte de las apps de IA de escritorio (18 de octubre de 2026) y qué le falta a Esme

Fecha de la investigación: 2026-10-18. Autor: agente investigador (Claude).

## 0. Cómo leer este documento

- **[H]** = hecho comprobado en una fuente que he leído en esta pasada (la URL va al final, sección 5).
- **[S]** = dato de una fuente secundaria (blog, prensa) no confirmado en la página oficial. Tratar con cautela.
- **[I]** = inferencia mía (juicio, estimación de coste/riesgo, extrapolación). No es un hecho.
- Versiones y licencias de librerías: salen de `npm view <paquete> version license` ejecutado hoy (2026-10-18) [H]. Pueden cambiar en días; fijar con lockfile.
- Costes en "semanas-persona" y riesgos son estimaciones mías [I]. No hay precios en euros: los precios de suscripciones de terceros solo los cito si la fuente los daba.
- **Lo que NO pude verificar** (no lo trato como hecho): notas de versión de ChatGPT escritorio (la página devolvió 403), Windsurf, Highlight, LM Studio (el dominio fue bloqueado por la herramienta), Warp Oz, detalles de Cursor "computer use" (solo blogs), Atlas tras marzo de 2026 (una sola fuente secundaria habla de fusión con una "superapp"), Comet en 2026 (solo blogs). Las celdas de esas apps en la tabla van marcadas "?".
- Aviso de seguridad: el contenido web leído se trató como datos. Ninguna página contenía instrucciones dirigidas a mí.

Línea base de Esme (según el encargo): chat con cualquier modelo (API, suscripción, local), memoria propia, Taller con ACP (Claude Code, Qwen Code, OpenCode), MCP del registro oficial con OAuth, Forja de herramientas, agenda de encargos, voz local (Whisper + Piper), pieles y Tienda. No he visto el código de Esme; la columna "Esme" de la tabla se basa solo en esa descripción [I].

---

## 1. Tabla de capacidades

Leyenda: **Sí** = confirmado [H]; **Sí [S]** = solo fuente secundaria; **Parcial** = existe pero limitado; **?** = no verificado; **-** = no encontré evidencia (no prueba que no exista).

Columnas: **Claude** = Claude Desktop (Cowork, Code) | **GPT** = ChatGPT/Atlas | **Pplx** = Perplexity Computer/Comet | **Cur** = Cursor | **Ray** = Raycast AI | **Not** = Notion AI | **Gra** = Granola | **Dev/Man** = Devin / Manus | **Local** = Open WebUI, LobeChat, Cherry Studio, Jan, Msty (el mejor de ellos se cita en la nota) | **Esme** = estado según el encargo.

| # | Capacidad | Claude | GPT | Pplx | Cur | Ray | Not | Gra | Dev/Man | Local | Esme |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Chat con muchos modelos / BYOK | Parcial | Parcial | Sí (elegir modelo en Max [S]) | Sí | Sí (OpenAI-compat, Ollama, OpenRouter, v2.2) | Sí (admin elige modelos, 9 sep) | - | - | Sí | **Tiene** |
| 2 | Usar tu suscripción existente | - | - | - | Sí (login) [S] | Sí (Claude/ChatGPT, v2.3) | Sí (ChatGPT Plus/Pro, 13 oct) | - | - | Parcial | **Tiene** |
| 3 | Modelos locales | - | - | - | - | Sí (Ollama) | - | - | - | Sí (Jan 0.8.5 trae llama.cpp dentro) | **Tiene** |
| 4 | Memoria persistente editable | Sí (entradas por categoría, editable; 10 jul y 25 ago) | Sí [S] (Browser Memories opcional) | ? | - | Sí (proyectos con memoria, v2.3) | ? | - | - | Sí (LobeChat 2.2.20 extrae reglas) | **Tiene** (falta UI de categorías/temas sensibles [I]) |
| 5 | Interfaces generativas dentro del chat (MCP Apps / canvas) | Sí (MCP Apps) | Sí (MCP Apps / Apps SDK) | ? | Sí (Canvases de agentes en la nube, 16 oct) | - | - | - | - | Parcial (Open WebUI: apps externas en canales) | **Falta** |
| 6 | Cliente MCP con OAuth | Sí | Sí | ? | Sí | Sí (OAuth loopback, v2.0) | Sí (agentes por MCP, 3.8) | Sí (Granola MCP, 4 feb) | - | Sí (Msty: CIMD para OAuth; Cherry: MCP SDK v2) | **Tiene** (falta spec 2026-07-28, ver 2.2) |
| 7 | Uso del ordenador (ratón/teclado/pantalla) | Sí (Cowork, vista previa 23 mar) | Sí [S] (modo agente en Atlas) | Sí (Computer, 25 feb [S]) | Sí [S] (agentes en la nube) | - | - | - | Sí (Devin: escritorio remoto; Manus: My Computer, 16 mar) | - | **Falta** |
| 8 | Navegador con agente | Sí (Claude in Chrome) | Sí [S] (Atlas) | Sí [S] (Comet) | - | - | - | - | Sí (Manus Browser Operator, nov 2025) | Parcial (Jan: MCP navegador) | **Falta** |
| 9 | Agentes en segundo plano / en la nube | Sí (Cowork remoto, 7 jul) | Sí [S] | Sí (Computer; Automations 29 sep) | Sí (cloud agents) | Sí (Automations, v2.3) | Sí (Custom Agents) | - | Sí (sesiones que duermen y se reanudan 14 días) | Parcial (LobeChat: Goals) | **Parcial** (agenda, sin ejecución remota durable [I]) |
| 10 | Control remoto desde el móvil | Sí (17 mar) | ? | ? | Sí (iOS, 6 oct) | - | Sí (app iOS, 3.7) | - | - | Sí (Cherry: dispositivos por LAN cifrada, 2.1.3) | **Falta** |
| 11 | Multiagente / subagentes con árbol | Sí (Code) | ? | Sí (Computer coordina modelos [S]) | Sí (Projects: coordinador + agentes, 10 sep; /best-of-n [S]) | - | Sí (Custom Agents llaman subagentes) | - | Sí (árbol de sub-Devin, 21 ago) | Parcial (LobeChat) | **Parcial** (Taller ACP; sin coordinador ni árbol [I]) |
| 12 | Protocolo ACP de agentes | - | - | - | - | - | - | - | - | - | **Tiene** (Zed también: panel de agentes ACP 1.24.2) |
| 13 | Skills portables | Sí (sección Customize, 25 feb) | ? | Sí (Agent API: skills versionadas, 28 sep) | ? | Sí (AI Skills, v2.8) | Sí (Skills API, 13 oct) | - | - | Sí (Open WebUI `.skill`; Msty Skill Studio) | **Parcial** (Forja crea herramientas; skills no mencionadas [I]) |
| 14 | Agenda / tareas programadas | Sí (25 feb) | ? | Sí (Computer Automations) | Sí (suscripciones a schedules/PR/Slack) | Sí (Automations) | Sí (tras reuniones) | - | Sí (Devin Automations) | - | **Tiene** |
| 15 | Voz tiempo real (voz a voz, interrupción) | ? | Sí (API Realtime) | ? | - | Parcial (dictado Ctrl+M) | - | - | - | Sí (Open WebUI 0.12.0: Realtime + avatares VRM) | **Parcial** (Whisper+Piper por turnos, sin voz a voz [I]) |
| 16 | Voz local | - | - | - | - | - | - | - | - | Parcial | **Tiene** |
| 17 | Conciencia de pantalla / ventana activa | Parcial (computer use) | Parcial (Atlas ve la página) | Sí (Comet ve pestañas [S]) | - | Sí (Screen Awareness 19 ago; Send Element/Window 9 oct) | - | - | - | Parcial (Cherry: OCR de sistema) | **Falta** |
| 18 | Captura de reuniones / contexto ambiental | - | - | - | - | - | Sí (Meeting Notes) | Sí (Briefs 20 may; Snapshots) | - | - | **Falta** |
| 19 | Conocimiento local (RAG, sincronía de carpetas) | Parcial | Parcial | ? | Sí (índice de repo) | - | Sí | Parcial | - | Sí (Msty Knowledge Stacks NG 2.5.0; Open WebUI: bases con explorador) | **Falta o parcial** [I] |
| 20 | Lanzador global / acciones rápidas | - | ? | - | - | Sí | - | - | - | - | **Falta** |
| 21 | Permisos finos y aprobación aprendida | Sí | Sí [S] (pausa en sitios sensibles) | ? | Sí | Sí (v2.6) | Sí (cambios sugeridos uno a uno, 28 ago) | - | Sí | Parcial | **Parcial** [I] |
| 22 | Auditoría / grabación de lo que hizo el agente | Sí (OpenTelemetry en Cowork, 9 abr) | ? | Débil [S] (poca traza visible) | Sí (vídeo y capturas [S]) | - | Sí (conexiones revocables) | - | Sí (grabación 60 fps) | Parcial (Open WebUI: registro de auditoría con ID de modelo) | **Falta** [I] |
| 23 | Sandbox de código/herramientas | Sí (VM aislada en Cowork) | Sí [S] | Sí (SPACE abierto 15 oct) | Sí (VM en la nube) | - | Sí (Workers) | - | Sí | Sí (Cherry: Pi Code Mode en sandbox) | **Parcial** (Forja; aislamiento desconocido [I]) |
| 24 | Terminal integrada para agentes | Sí (Code) | - | - | Sí | - | - | - | Sí (pestaña Terminal 5 oct) | Sí (Open WebUI: Open Terminal) | **Falta** [I] |
| 25 | Enrutado automático de modelo y medidor de uso | Parcial | Parcial | - | Sí | Sí (Auto: Lightweight/Balanced/Flagship; /usage) | Sí (cuadro de mando velocidad/inteligencia/coste) | - | - | Parcial (Cherry: contexto en tokens) | **Falta** [I] |
| 26 | Pieles y personalización de UI | - | - | - | - | - | - | - | - | Sí (LobeChat, Cherry) | **Tiene** (ventaja) |
| 27 | Tienda / extensiones de terceros | Sí (plugins, Customize) | Sí (Apps) | - | Sí (Origin App Marketplace, 13 oct) | Sí (Store) | - | - | - | Parcial | **Tiene** |
| 28 | Chat compartido y colaboración (E2E) | - | ? | - | Sí (canvases por enlace) | - | Sí | Sí (Spaces) | - | Sí (Open WebUI 0.12.3: E2E con MLS) | **Falta** (prioridad baja) |

Nota sobre "Esme tiene": la Forja (herramientas fabricadas por la propia IA) y las pieles no tienen equivalente directo en ninguna app que haya revisado. Cherry Studio y LobeChat son lo más cercano [I]. Es un diferenciador real, pero hoy la competencia gana por profundidad en agentes, voz, pantalla y memoria.

### Hechos relevantes que explican la tabla [H salvo indicación]

- Claude Desktop: Cowork en macOS/Windows disponible de forma general el 9 abr 2026; computer use en vista previa dentro de Cowork el 23 mar; sesiones remotas (beta) el 7 jul; "Cowork en cada conversación" el 16 sep; memoria por entradas categorizadas el 10 jul y con temas editables el 25 ago.
- Cursor: Projects (beta) con agente coordinador el 10 sep; control remoto de agentes locales desde iOS el 6 oct; Canvases de agentes en la nube el 16 oct.
- Raycast: AI Chat reconstruido el 11 sep (planifica, ejecuta, "se detiene, pregunta y continúa"); Automations en segundo plano; Screen Awareness el 19 ago; Auto model el 5 oct.
- Devin: sesiones reanudables 14 días (9 oct), árbol de sub-sesiones (21 ago), escritorio remoto, grabaciones a 60 fps (18 sep).
- Perplexity: Computer con Automations (29 sep); sandbox SPACE publicado como código abierto (15 oct).
- Manus 2.0 (28 sep): nuevo arnés de agente, Cloud Computer, Automations; app de escritorio "My Computer" (16 mar).
- Open WebUI 0.12.0 (10 oct): llamadas de voz con modelo Realtime que delega las preguntas de fondo en el modelo del chat.
- Rewind/Limitless: la captura de pantalla y audio de Rewind se desactivó el 19 dic 2025 y Limitless fue adquirida por Meta; el pendant dejó de venderse el 5 dic 2025 y el servicio salió de la UE y el Reino Unido entre otros. Lección [I]: la memoria ambiental en la nube es frágil; la local-first es un argumento de venta.

---

## 2. Las 20 capacidades que más subirían a Esme

Orden = impacto estimado ÷ esfuerzo [I]. Coste en semanas-persona (S = 1-2, M = 3-5, L = 6+). Versiones y licencias de npm a 2026-10-18 [H]. Electron actual: `electron` 44.9.0 (MIT) [H].

Regla general de arquitectura [I]: todo lo pesado (agentes, MCP, voz, sandbox) en `utilityProcess` (la documentación de Electron lo recomienda para servicios no fiables, tareas de CPU y componentes propensos a fallar, y permite canales MessagePort con el renderizador), no en el proceso principal.

### 1. Apps MCP: interfaces interactivas dentro del chat
- Qué es: una herramienta MCP declara un recurso `ui://` con HTML; el cliente lo muestra en un iframe aislado y la app puede llamar herramientas de vuelta. La extensión es el primer estándar oficial de MCP (SEP-1865, estado Final); la especificación estable en el repo es 2026-01-26. Soportan ChatGPT, Claude, VS Code, Goose, Postman [H].
- Cómo en Electron/React: `@modelcontextprotocol/ext-apps` 2.0.3 (npm dice MIT; el README de GitHub dice Apache 2.0: discrepancia, comprobar el LICENSE antes de redistribuir) con el subpaquete `app-bridge` para el lado anfitrión. Renderizar en `<iframe sandbox>` servido desde un protocolo propio (`protocol.handle`) con origen distinto y CSP estricta, o en un `WebContentsView` con `session.fromPartition` aislada. Requiere `@modelcontextprotocol/client` 2.x (peer) [H].
- Coste: M. Riesgo: medio (aislamiento del iframe, inyección vía HTML de terceros; usar CSP sin red salvo permiso explícito). Impacto: alto (convierte cada servidor MCP de la Tienda en una mini-app).

### 2. Cliente MCP al día: especificación 2026-07-28, Tareas, CIMD, elicitación
- Hechos: la versión actual es 2026-07-28; cada petición declara la versión en `_meta` y existe el RPC obligatorio `server/discover` (ya no hay el apretón de manos de inicialización). Hay extensión de Tareas (SEP-2663), elicitación en modo URL (SEP-1036), registro de cliente por documento de metadatos (CIMD, SEP-991), extensión de Skills (SEP-2640) y propuesta de deprecar Roots, Sampling y Logging (SEP-2577) [H].
- Cómo: migrar de `@modelcontextprotocol/sdk` 1.32.1 (MIT) a `@modelcontextprotocol/client` 2.3.1 (Apache-2.0); mantener compatibilidad con servidores de 2025-11-25. Para tareas largas, mostrar progreso en la agenda de Esme. OAuth: loopback `127.0.0.1` (Raycast tuvo que añadirlo para Atlassian, v2.0 [H]) y CIMD como Msty 3.0 beta 14 [H].
- Coste: M. Riesgo: medio (cambio de ruptura en el protocolo). Impacto: alto (sin esto, los servidores nuevos dejarán de funcionar [I]).

### 3. Uso del ordenador con aprobación y sandbox
- Hechos: Anthropic ofrece `computer_toolset_20260801` (GA en la API de Claude y Google Cloud) con acciones screenshot, zoom, clics, arrastre, scroll, teclas, espera; imágenes de hasta 2576 px en el lado largo; cada captura cuesta ~1.000-1.800 tokens; recomiendan VM/contenedor, lista de dominios, confirmación humana en acciones con consecuencias y límite de iteraciones; hay clasificadores contra inyección en las capturas [H].
- Cómo: bucle de agente en `utilityProcess`; capturas con `desktopCapturer` de Electron o `screenshot-desktop` 1.15.7 (MIT); control con `@nut-tree-fork/nut-js` 4.2.6 (Apache-2.0) o `@jitsi/robotjs` 0.6.24 (MIT). Dos modos: (a) "mi escritorio" con aprobación por acción y marco rojo sobre la pantalla, (b) "escritorio desechable" en contenedor (referencia: `computer-use-demo` de anthropic-quickstarts, con Xvfb) con `dockerode` 5.0.1 (Apache-2.0). Reescalar coordenadas a la pantalla real; poda de capturas antiguas para no perder la caché [H].
- Aviso Linux [I]: en Wayland la captura y la inyección de entrada pasan por portales (xdg-desktop-portal) y pueden pedir permiso cada vez; probar en la máquina del creador antes de prometerlo. Por eso el modo (b) es el camino seguro.
- Coste: L. Riesgo: alto (inyección de prompts desde pantalla; acciones irreversibles). Mitigar con la puerta de acciones de Jev para compras, envíos y borrados. Impacto: muy alto.

### 4. Navegador integrado con agente
- Hechos: Atlas (OpenAI) y Comet (Perplexity) incluyen agente de navegación; un asistente de fondo de Comet se anunció en octubre de 2025 [S]; los investigadores han mostrado inyecciones de prompts contra Comet [S]. Manus tiene Browser Operator desde nov 2025 [H].
- Cómo: `WebContentsView` con partición propia; control por CDP con `webContents.debugger` o `playwright` 1.64.1 / `playwright-core` (Apache-2.0) conectándose por CDP; alternativa lista para usar: `@playwright/mcp` 0.0.83 (Apache-2.0), que opera con el árbol de accesibilidad en lugar de capturas (más barato en tokens [I]). Extraer artículos con `@mozilla/readability` 0.6.0 (Apache-2.0) y `turndown` 7.2.4 (MIT).
- Coste: M. Riesgo: alto (inyección desde páginas; perfil con sesiones iniciadas). Usar perfil separado sin credenciales del usuario por defecto. Impacto: alto.

### 5. Voz en tiempo real (voz a voz con interrupción)
- Hechos: la API Realtime de OpenAI ofrece `gpt-realtime-2.1` (también `gpt-realtime-2` y `gpt-realtime`) por WebRTC, WebSocket o SIP; VAD y `semantic_vad`; llamadas a funciones; sesiones de máximo 60 minutos; truncado de audio al interrumpir [H]. Open WebUI 0.12.0 usa un modelo Realtime que pasa las preguntas de fondo al modelo del chat [H].
- Cómo, dos vías [I]: (a) nube: WebRTC desde el renderizador con clave efímera generada en el proceso principal (nunca la clave real en el renderizador); herramientas de Esme expuestas como `session.tools`. Cliente listo: `@pipecat-ai/client-js` 1.14.0 (BSD-2-Clause) con `@pipecat-ai/small-webrtc-transport` 1.11.0 (BSD-2-Clause), o LiveKit (`livekit-client` 2.23.0 y `@livekit/agents` 1.9.3, Apache-2.0). (b) local: VAD `@ricky0123/vad-web` 0.0.31 (ISC) + Whisper (ya lo tiene) + TTS en streaming con `kokoro-js` 1.2.1 (Apache-2.0) o Piper (`@mintplex-labs/piper-tts-web` 1.0.5, MIT); alternativa de un solo motor `sherpa-onnx-node` 1.13.8 (Apache-2.0). Cortar el audio del TTS en cuanto el VAD detecta voz (barge-in) y descartar el texto no hablado del historial.
- Coste: M (local) / M (nube). Riesgo: medio (latencia, eco; coste por minuto de la API: consultar la tarifa oficial antes de activar). Impacto: muy alto en sensación de producto.

### 6. Agentes en segundo plano durables
- Hechos: Cowork remoto sigue trabajando con el portátil cerrado; Devin reanuda sesiones 14 días; Perplexity Computer y Raycast tienen Automations; Zed trae `agent.prevent_idle_sleep` activado por defecto [H].
- Cómo [I]: cada encargo = proceso `utilityProcess` + diario de eventos en SQLite (`better-sqlite3` 13.0.3, MIT) para poder reanudar tras un cierre; planificación con `croner` 10.0.1 (MIT) y `rrule` 2.8.1 (BSD-3-Clause); `powerSaveBlocker` de Electron para no dormir mientras corre; notificaciones nativas al terminar o al necesitar decisión; bandeja del sistema con el estado. Opción "ejecutar en un servidor propio" (el 172.20.1.101 del creador) con el mismo binario en modo sin interfaz.
- Coste: M. Riesgo: medio (reanudar a mitad de una herramienta con efectos). Diseñar acciones idempotentes. Impacto: alto.

### 7. Control remoto desde el móvil
- Hechos: Claude (17 mar) y Cursor (6 oct, "el ordenador debe seguir encendido") permiten ver y escribir a agentes locales desde el móvil; Cherry Studio 2.1.3 empareja dispositivos por LAN cifrada [H].
- Cómo [I]: servidor WebSocket local con TLS autofirmado y emparejamiento por QR (secreto de un solo uso); cliente = PWA servida por la propia Esme; acceso fuera de casa por VPN (WireGuard/Tailscale del usuario) en lugar de exponer puertos. Reutilizar la misma API de eventos del punto 6.
- Coste: M. Riesgo: alto (superficie de ataque; autenticación y revocación de dispositivos obligatorias). Impacto: medio-alto.

### 8. Memoria personal de nivel superior
- Hechos: Claude pasó de resumen diario a entradas individuales y categorizadas (10 jul), editables y con temas sensibles excluidos por defecto (25 ago), con recapitulación mensual (9 jul, beta); LobeChat 2.2.20 extrae reglas de texto pegado, archivos y conversaciones [H].
- Cómo [I]: tabla `memorias(id, texto, categoría, origen, confianza, creada, caducidad, sensible)` en SQLite con FTS5 y vectores con `sqlite-vec` 0.1.9 (MIT/Apache); incrustaciones locales con `@huggingface/transformers` 4.3.1 (Apache-2.0) y `onnxruntime-node` 1.30.0 (MIT); extracción tras cada conversación y fusión de duplicados; pantalla "Qué sé de ti" con editar/borrar/anclar; opcionalmente `mem0ai` 3.3.1 (Apache-2.0) o `@letta-ai/letta-client` 1.12.1 (Apache-2.0) como referencia de diseño, no como dependencia obligatoria. Cada memoria usada en una respuesta debe poder verse ("usé estas 3 memorias").
- Coste: M. Riesgo: medio (alucinación de recuerdos, privacidad). Impacto: muy alto.

### 9. Conciencia de pantalla y de la app activa
- Hechos: Raycast Screen Awareness (19 ago) trae contexto de la app o ventana enfocada al chat; v2.7 añade "Enviar elemento/ventana a la IA" [H]. Cherry usa OCR del sistema para capturas [H].
- Cómo [I]: `get-windows` 9.3.0 (MIT) para ventana y URL activas; captura de la ventana con `desktopCapturer`; OCR local con `tesseract.js` 7.0.0 (Apache-2.0); atajo global (`globalShortcut`) "preguntar sobre esto". Lista de apps excluidas (gestor de contraseñas, banca) por defecto.
- Coste: S-M. Riesgo: medio (privacidad; macOS exige permisos de accesibilidad y grabación de pantalla; Wayland limita). Impacto: alto.

### 10. Reuniones y captura ambiental, opt-in y local
- Hechos: Granola (Briefs previos a la reunión el 20 may, Snapshots, Recetas, MCP, API, serie C de 125 M$ el 25 mar); Notion dispara agentes al terminar una nota de reunión (31 jul); Rewind cerró la captura y Limitless fue comprada por Meta [H].
- Cómo [I]: grabar audio del sistema y micro (WASAPI/ScreenCaptureKit; en Linux, PipeWire monitor), transcripción con Whisper local ya existente, diarización con `sherpa-onnx-node` 1.13.8; salida: notas + tareas + memoria; "Brief" 10 minutos antes leyendo el calendario. Aviso legal de grabación a terceros (consentimiento).
- Coste: M-L. Riesgo: alto legal/privacidad. Impacto: medio-alto (diferenciador frente a la nube: todo local).

### 11. Skills portables y compartibles
- Hechos: Notion sincroniza skills con una API y se pueden bajar a Claude Code y Cursor (15 sep, 13 oct); Raycast lista skills de extensiones (v2.8); Open WebUI exporta `.skill` y tiene multi-archivo con historial; Msty tiene Skill Studio; MCP tiene SEP-2640 (extensión Skills) [H].
- Cómo [I]: que la Forja emita, además de herramientas, un paquete `SKILL.md` + recursos con el formato abierto que ya leen Claude Code y otros; instalación desde la Tienda; edición/versionado en la UI; carga bajo demanda (solo el nombre y la descripción en contexto).
- Coste: S-M. Riesgo: bajo. Impacto: alto (la Tienda gana contenido portable).

### 12. Subagentes con árbol visible, "mejor de N" y terminal integrada
- Hechos: Devin muestra sub-sesiones anidadas (21 ago) y da a las hijas un resumen del contexto del padre (25 sep); Zed `spawn_agent` admite un modelo por subagente y compacta su contexto (1.22.0) y arrastra terminales al panel de agentes (1.24.2); Cursor /best-of-n ejecuta la misma tarea con varios modelos en worktrees [S]; Open WebUI incluye terminal [H].
- Cómo [I]: el Taller lanza N agentes ACP (`@agentclientprotocol/sdk` 1.9.0, Apache-2.0) cada uno en un `git worktree`; vista de árbol; comparar diffs y elegir; terminal con `node-pty` 1.1.0 (MIT) + `@xterm/xterm` 6.0.0 (MIT) en el panel; ver los comandos del agente en vivo.
- Coste: M. Riesgo: medio (consumo de cuota/tokens en paralelo: poner tope). Impacto: alto.

### 13. Coordinador de proyectos con puertas de decisión y flujos visuales
- Hechos: Cursor Projects (coordinador que planifica y delega a agentes nube/locales con contexto compartido); LobeChat 2.2.20 "Goals" con despliegue por lotes que se detiene en puertas de decisión; Msty Turnstiles con bucles, puntos de control y condiciones; Warp Factories [H].
- Cómo [I]: objeto "Proyecto" (objetivo, plan, tareas, estado) sobre la agenda existente; editor de grafo con `@xyflow/react` 12.12.0 (MIT) para flujos; puertas "revisar antes de seguir"; orquestación con `@langchain/langgraph` 1.5.1 (MIT) o `@mastra/core` 1.78.0 (Apache-2.0) si no quieres escribir el motor de estados a mano.
- Coste: L. Riesgo: medio (complejidad de producto). Impacto: alto.

### 14. Artefactos y lienzos generativos (UI generada por el modelo)
- Hechos: Cursor Canvases interactivos compartibles por enlace (16 oct); MCP Apps (punto 1) [H].
- Cómo [I]: renderizado seguro de UI declarativa con `@json-render/core` 0.21.1 (Apache-2.0) para tablas/gráficos/formularios sin ejecutar código arbitrario; chat con `assistant-ui` `@assistant-ui/react` 0.15.29 (MIT) o `@ai-sdk/react` 4.0.147 (Apache-2.0) con `ai` 7.0.143 (Apache-2.0); Markdown en streaming con `streamdown` 2.7.0 (Apache-2.0); diagramas `mermaid` 12.2.0 (MIT); código `shiki` 4.5.0 (MIT). Evitar `tldraw` 5.5.2: su licencia no es MIT ("SEE LICENSE", revisar) [H].
- Coste: M. Riesgo: bajo-medio. Impacto: alto en percepción.

### 15. Permisos finos con aprobación aprendida
- Hechos: Raycast extiende la aprobación a comandos similares y reduce interrupciones en Git/GitHub (v2.6); Notion pide aprobar cada edición sugerida (28 ago); Anthropic exige confirmación humana en compras, términos y cookies [H].
- Cómo [I]: motor de políticas (permitir una vez / siempre en este proyecto / nunca) con patrones; clasificación de riesgo (lectura, escritura reversible, irreversible); lista de dominios para agentes; integrar la puerta de acciones de Jev para lo irreversible. Esquemas con `zod` 4.6.7 (MIT).
- Coste: S-M. Riesgo: bajo. Impacto: alto (confianza + menos clics).

### 16. Trazas, grabación y deshacer
- Hechos: Cowork exporta a OpenTelemetry (9 abr); Devin graba pantalla hasta 60 fps; Cursor muestra vídeo y capturas de lo hecho [S]; en Comet hay poca traza visible [S] [H/S].
- Cómo [I]: línea de tiempo por encargo (cada llamada a herramienta con entrada, salida, captura y coste); `@opentelemetry/api` 1.9.1 (Apache-2.0) y opcionalmente `langfuse` 3.39.2 (MIT) para quien quiera exportar; grabación de ventana con `MediaRecorder` + `desktopCapturer`; puntos de control del sistema de archivos (`git stash`/worktrees) para "deshacer lo que hizo el agente".
- Coste: M. Riesgo: bajo (el vídeo ocupa disco: retención). Impacto: alto en confianza.

### 17. Sandbox para la Forja y los agentes
- Hechos: Perplexity abrió SPACE (la plataforma de sandbox de Computer) el 15 oct; Cowork corre en VM aislada; Cherry tiene Code Mode en sandbox (Pi 1.0) [H].
- Cómo [I]: ligero: `quickjs-emscripten` 0.32.0 (MIT) o `isolated-vm` 7.0.1 (ISC) para código JS de herramientas sin red ni disco; pesado: contenedores con `dockerode` 5.0.1; en la nube: `@e2b/code-interpreter` 2.9.0 (MIT), `@vercel/sandbox` 3.8.0 (Apache-2.0) o `@cloudflare/sandbox` 1.0.1 (Apache-2.0). Evaluar SPACE de Perplexity (licencia por comprobar).
- Coste: M. Riesgo: medio (escapes). Impacto: alto (hace segura la Forja).

### 18. Lanzador global y dictado universal
- Hechos: Raycast Quick AI, dictado con Ctrl+M, AI Chat en proceso propio (v2.7) [H].
- Cómo [I]: `globalShortcut` + `BrowserWindow` sin marco y transparente; paleta con `cmdk` 1.1.1 (MIT); dictado con Whisper local y pegado en la app activa; animaciones con `motion` 14.3.0 (MIT). En Wayland los atajos globales requieren el portal GlobalShortcuts: probar.
- Coste: S. Riesgo: bajo. Impacto: alto (frecuencia de uso diaria).

### 19. Conocimiento local (carpetas, PDF, Office) con RAG de calidad
- Hechos: Msty "Knowledge Stacks Next Generation" (2.5.0): sincronía de carpetas, re-ranking, ingestión web; Open WebUI y Cherry usan MinerU 4.x autoalojado para analizar documentos [H].
- Cómo [I]: vigilar carpetas con `chokidar` 5.0.0 (MIT); extraer con `@llamaindex/liteparse` 2.15.1 (Apache-2.0), `unpdf` 1.9.0 (MIT), `pdfjs-dist` 6.4.299 (Apache-2.0), `mammoth` 1.13.0 (BSD-2) y `officeparser` 8.1.1 (MIT); índice con `sqlite-vec` 0.1.9 o `@lancedb/lancedb` 0.40.0 (Apache-2.0); re-ranking local con `@huggingface/transformers` 4.3.1. Citas con página y fragmento.
- Coste: M. Riesgo: bajo. Impacto: alto.

### 20. Enrutado automático de modelo y medidor de uso
- Hechos: Raycast Auto model (Lightweight/Balanced/Flagship, `/usage` para cuotas de suscripción, 5 oct); Notion muestra un cuadro velocidad/inteligencia/coste (14 ago) [H].
- Cómo [I]: clasificador barato (modelo local pequeño) decide el nivel por tarea; tabla de coste por proveedor (leer precios de la API oficial de cada proveedor al arrancar o configurarlos a mano; no incrustar precios fijos); medidor en la barra superior con presupuesto diario y aviso antes de lanzar encargos caros.
- Coste: S-M. Riesgo: bajo. Impacto: medio-alto (ahorro real y transparencia).

### Orden de ataque sugerido [I]
1. Rápidas y de gran efecto: 18 (lanzador), 15 (permisos), 11 (skills), 20 (enrutado y medidor).
2. Base técnica que evita quedarse atrás: 2 (MCP 2026-07-28) y 1 (Apps MCP).
3. Salto de producto: 8 (memoria), 5 (voz real), 6 (segundo plano), 12 (árbol de agentes).
4. Con riesgo alto, cuando el sandbox y los permisos estén listos: 17, 3, 4, 7, 10.

---

## 3. Diez detalles "de otro mundo" que separan a los mejores

Ejemplos reales (fuente en la sección 5). Los detalles son hechos; la lección para Esme es inferencia mía.

1. **El agente pregunta y retoma donde lo dejó.** El AI Chat de Raycast (v2.3, 11 sep) "se detiene, te pregunta y continúa donde lo dejó". Lección: las preguntas del agente son un componente de primera clase (botones, opciones), no texto suelto.
2. **El trabajo sigue cuando cierras la tapa.** Cowork remoto (7 jul) y Devin (sesiones que duermen y despiertan, 14 días). Cursor te deja ver y escribir a tus agentes locales desde el iPhone (6 oct). Lección: estado persistente + reanudación + notificación al móvil.
3. **Ver al agente trabajar.** Devin da escritorio remoto y grabación a 60 fps; Cursor muestra capturas y vídeo de lo que hizo el agente en la nube [S]. Lección: una "reproducción" del encargo genera más confianza que cualquier resumen.
4. **Memoria que puedes leer, editar y que respeta temas sensibles.** Claude: entradas categorizadas, editar/borrar en Ajustes > Memoria, temas sensibles excluidos salvo que los actives, recapitulación mensual y recordatorios de descanso (beta). Lección: la transparencia convierte el miedo en confianza.
5. **Informe antes de la reunión.** Granola "Briefs" (20 may): quién es la persona y qué importa, y chat con citas en línea. Lección: proactividad útil, no notificaciones genéricas.
6. **Contexto con un gesto.** Raycast "Enviar elemento/ventana a la IA" (9 oct): el usuario no copia ni pega. Lección: capturar contexto debe costar un atajo.
7. **Sin elegir modo ni modelo.** Claude: Cowork disponible desde cualquier chat "sin elegir un modo primero" (16 sep). Raycast: Auto model con tres niveles (5 oct). Notion: cuadro de velocidad/inteligencia/coste. Lección: el usuario describe el objetivo; el sistema elige el motor y lo explica.
8. **Voz que piensa y habla a la vez.** Open WebUI 0.12.0: el modelo de voz en tiempo real contesta al momento y delega lo difícil en el modelo del chat; avatares VRM animados en las llamadas. La API Realtime gestiona interrupciones y truncado de audio. Lección: separar "voz rápida" de "cerebro profundo".
9. **La respuesta es una interfaz, no un párrafo.** MCP Apps (gráficos, formularios, paneles dentro del chat) y Cursor Canvases interactivos compartibles por enlace (16 oct). Lección: el chat debe poder renderizar herramientas con su propia UI.
10. **Fiabilidad invisible.** Devin conserva la parte ya vista de la respuesta si lo interrumpes (14 oct); Zed mantiene el equipo despierto durante las ejecuciones (1.21.0); Jan guarda las claves en el llavero del sistema (0.8.4) y abre un asistente en el primer arranque (0.8.5); Devin Review recuerda el método de fusión elegido por repositorio (14 oct); Notion muestra los cambios sugeridos uno a uno (28 ago). Lección: pulir las pequeñas fricciones separa lo bueno de lo excelente, y las claves nunca van en almacenamiento del navegador.

---

## 4. Trade-offs y recomendación

- **Riesgo principal de "abarcarlo todo"** [I]: cada capacidad nueva (computer use, navegador, captura ambiental) multiplica la superficie de ataque por inyección de prompts. Anthropic lo reconoce y recomienda VM, lista de dominios y confirmación humana [H]. Construir antes los puntos 15, 16 y 17 (permisos, trazas, sandbox) que los puntos 3, 4 y 10.
- **Dependencia de terceros**: el mercado cambia rápido (Rewind cerrado, Limitless comprada por Meta, y una fuente secundaria menciona una fusión de Atlas en una "superapp" [S]). Preferir estándares abiertos (MCP, ACP, Apps MCP, Skills) sobre integraciones propietarias.
- **Ventaja de Esme**: local-first, Forja, pieles, Tienda y ACP. Hacer que la Forja produzca skills y apps MCP convierte esa ventaja en algo que nadie más tiene [I].
- **Recomendación**: este mes, puntos 18, 15, 11, 20 y 2; el siguiente, 1, 8, 5 y 6; después, el bloque de riesgo alto.

---

## 5. Fuentes (consultadas el 2026-10-18)

Primarias / oficiales
- Notas de versión de Claude (Cowork, memoria, computer use, scheduled tasks): https://support.claude.com/en/articles/12138966-release-notes
- Herramienta de uso del ordenador de Anthropic: https://platform.claude.com/docs/en/agents-and-tools/tool-use/computer-use-tool
- Referencia computer-use-demo: https://github.com/anthropics/anthropic-quickstarts/tree/main/computer-use-demo
- Changelog de Claude Code (no se pudo leer el contenido; solo enlace): https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md
- OpenAI Realtime (conversaciones): https://developers.openai.com/api/docs/guides/realtime-conversations
- Cursor changelog: https://cursor.com/changelog
- Raycast changelog: https://www.raycast.com/changelog
- Notion releases: https://www.notion.com/releases
- Granola blog: https://www.granola.ai/blog
- Devin release notes: https://docs.devin.ai/release-notes/overview
- Manus blog: https://manus.im/blog
- Perplexity blog: https://www.perplexity.ai/hub/blog
- Warp blog: https://warp.dev/blog
- Zed releases: https://zed.dev/releases/stable
- Dia: https://www.diabrowser.com/
- Limitless (compra por Meta, cierre de Rewind): https://www.limitless.ai/
- MCP versionado (versión actual 2026-07-28): https://modelcontextprotocol.io/specification/versioning
- MCP índice de documentación (Tasks, CIMD, Skills, SEP-2577): https://modelcontextprotocol.io/llms.txt
- MCP Apps SEP-1865: https://modelcontextprotocol.io/seps/1865-mcp-apps-interactive-user-interfaces-for-mcp
- ext-apps (repo): https://github.com/modelcontextprotocol/ext-apps
- ACP introducción: https://agentclientprotocol.com/overview/introduction
- Electron, modelo de procesos / utilityProcess: https://www.electronjs.org/docs/latest/tutorial/process-model
- Open WebUI releases: https://github.com/open-webui/open-webui/releases
- Cherry Studio releases: https://github.com/CherryHQ/cherry-studio/releases
- LobeChat releases: https://github.com/lobehub/lobe-chat/releases
- Jan releases: https://github.com/janhq/jan/releases
- Msty changelog: https://msty.ai/changelog
- Versiones y licencias: registro npm (`npm view <paquete> version license`), consulta del 2026-10-18.

Secundarias (usar con cautela, marcadas [S])
- Atlas: https://www.ewn.co.za/2025/10/22/openai-launches-chatgpt-atlas-a-groundbreaking-ai-powered-web-browser , https://thejournal.com/articles/2025/10/27/openai-launches-ai-powered-web-browser.aspx
- Comet (asistente de fondo): https://techcrunch.com/2025/10/02/perplexitys-comet-ai-browser-now-free-max-users-get-new-background-assistant/
- Comet y Computer en 2026, inyecciones de prompts: https://beginnersinai.org/whats-new-perplexity-2026/ , https://geotoolbox.ai/es/blog/comet-perplexity
- Cursor agentes en la nube, /best-of-n, /multitask: https://www.morphllm.com/cursor-background-agents , https://businesstechnavigator.com/blog/cursor-cloud-agents-multitask-parallel-worktrees-8-agents-2026

## 6. Lagunas pendientes (siguiente pasada)

Verificar con fuente oficial: notas de ChatGPT escritorio y Atlas, Windsurf, Highlight, LM Studio (changelog y modo sin interfaz), Warp Oz, Cursor computer use, SPACE de Perplexity (licencia), licencia real de `@modelcontextprotocol/ext-apps` (MIT en npm vs Apache 2.0 en el README), y el estado de Wayland (portales de captura/atajos/entrada) en la máquina del creador. Medir además latencia real de voz local frente a Realtime antes de decidir la vía del punto 5.
