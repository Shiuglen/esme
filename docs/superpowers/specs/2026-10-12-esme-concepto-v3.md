# Esme v3: concepto corregido, decisiones y análisis del FYP (2026-10-12)

Sustituye a la línea «Primera IA: Claude en PTY» de `2026-10-11-app-v2-decisiones.md`. Lo demás de ese documento sigue en vigor.

## La corrección del usuario
Esme no controla los agentes de otros en terminales. **Esme es el agente.** La gente deja de usar Claude Code, OpenCode, Codex o Cursor directamente y usa Esme. Esos servicios pasan a ser **proveedores** (motores), entre muchísimos más.

No se instalan modelos locales para el logo: se usan las mejores herramientas existentes.

## El concepto
Esme es la capa lista que está por encima de todas las IAs. Es una sola app con cualquier motor debajo.
- **Su mente es lo propio.** Una memoria neuronal que hace más lista a cualquier IA y gasta menos tokens. Medido: 0,929 de acierto con 917 tokens, frente a 0,900 con 1.495 tokens de BM25.
- **Tu contexto es tuyo.** Puedes cambiar de motor a mitad de una tarea sin perder nada.
- **Esme dirige la orquesta.** Su agente planifica con la mente, reparte el trabajo entre motores, revisa el resultado y aprende qué motor gana en cada tipo de tarea. Todo lo que rodea a la IA lo pone Esme: interfaz, mente, permisos, diffs, uso y compañeros.

## Respuestas del usuario (12-oct)
| Tema | Decisión |
|---|---|
| Público | Creadores y devs primero. |
| Negocio | Se decide más tarde. La arquitectura no se ata a ningún modelo. |
| Plataformas | Linux primero, luego Windows y por último macOS. |
| Idioma | Español e inglés desde ya: todos los textos en ficheros de idioma (i18n). |
| Motor al instalar | Gratis: OpenCode Zen, OpenRouter `:free` y Gemini con API key gratuita. |
| Claude | API key, más el binario oficial `claude` con el login del propio usuario. Antes de distribuirlo así, pedir aprobación por escrito a Anthropic. |
| Agente del Taller | Lo decide Esme: su agente propio más motores ACP, en la misma interfaz. |
| Router | Lo decide Esme: elige el motor, el usuario manda. Primero lo gratis, con presupuesto, y aprende de lo aprobado y lo rechazado. |
| Taller | Todo (código, webs, documentos, automatizaciones). No limitarse a lo que pida el usuario. |
| Seguridad | Siempre copia aislada: un worktree por tarea y comandos en contenedor local. |
| Despertar | La mente absorbe de todo, pero el usuario elige las fuentes. |
| Arena | Desde el principio: la misma tarea con 2 o 3 motores, lado a lado. |
| Personaje | Esme ES el personaje. El logo es su forma mínima y dentro de la app está viva. Lo elige Esme, al nivel «el mejor en cada detalle». |
| Carácter | Curiosa, cálida y brillante; con chispa, nunca servil. Lo elige Esme. |
| Bichitos | Reaccionan en vivo, se personalizan a fondo y tienen tienda de la comunidad. |
| Herramientas de marca | Conectores de Adobe, Canva y Figma. Pendiente: que el usuario los autorice. |
| Uso | Visible abajo en el chat (indicadores con estilo), además del panel de Uso. |

## Proveedores: lo verificado el 11-oct con fuentes oficiales
- **Suscripción por ACP (permitido), con la CLI oficial que el usuario ya tiene:** Copilot (`copilot --acp`), Cursor (`agent acp`), OpenCode (`opencode acp`), Gemini CLI, Goose, Kimi CLI, Qwen Code, Mistral Vibe y Cline. Codex va por adaptador y está en zona gris. SDK de cliente: `@agentclientprotocol/sdk` 1.8.0. `session/new` acepta `mcpServers`: así se les da la mente de Esme.
- **Claude:** prohibido ofrecer el login de Claude o enviar peticiones por planes Pro/Max desde una app de terceros. Permitido que el usuario use el binario oficial con su login «incluso cuando una plataforma lo aloja». Con API key, libre.
- **Gemini y Z.ai:** usar su OAuth fuera de su propia CLI está prohibido. Por API key, sí.
- **APIs con capa gratuita:**
  - OpenCode Zen: 13 modelos gratis; algunos entrenan con tus datos, y hay que marcarlo.
  - OpenRouter `:free`: 50 peticiones al día, 1.000 al día con 10 USD de crédito.
  - Cloudflare Workers AI, Google AI Studio, Groq y Cerebras.
  - GitHub Models se retiró el 30-jul-2026.
- **Agente propio:** Vercel AI SDK `ai` 7 (`ToolLoopAgent`).
- **Catálogo:** `models.dev/api.json` (proveedores, modelos, precios y límites). De ahí salen el selector, el router y el gasto.
- Cada proveedor lleva una marca de cumplimiento (permitido, tolerado o requiere aprobación) y la fecha en que se verificó.

## Análisis del FYP de X (12-oct): qué hay y qué hace Esme con ello
Se recorrieron unos 200 posts. Se marcaron 12 como «No me interesa» (anuncios y ruido) y se estudiaron a fondo 22 con fotos y fotogramas de vídeo.

### Competencia y mercado
- **Agently / «Jarvis»** (@ahmadafterhours, @omarships): «There are no more apps». Es un orbe que flota sobre el escritorio. Genera la interfaz que necesitas en el momento («launch video by Friday» → 24 agentes pujan). Las tarjetas de cristal muestran trabajo hecho («Sent, as promised», «Reopened 4 deals, $96K»). Construye un grafo de constelación de la empresa (personas, apps, promesas) y lleva una barra de presupuesto diario («$48,200 of $50,000 today»).
  → **Esme:** el orbe de presencia de Esme, un feed de trabajo terminado («hecho, como prometí»), la mente como constelación de entidades y el presupuesto diario visible. Nos diferencia ser local, tener memoria propia medida y ser para creadores.
- **supermemory** (memoria como API: chunking, embeddings, vector DB, extracción de hechos, perfiles, dedupe, conflictos, olvido y rerank). Esa es la lista de funciones a igualar o superar. Ya tenemos recuerdo, olvido y corte adaptativo. Faltan perfil del usuario, detección de **conflictos** (dato nuevo frente a dato viejo) y extracción de hechos con fecha.
- **JEV / Decision grid** (@thegreatest_sv): un «cerebro humano» para Claude Code, con decisión rápida instintiva, latencia ~256 ms, coste $0,42 y confianza 0,71–0,92 por evento. Visualmente es una rejilla de neuronas con trazas de neón por tipo de evento (comentario de YouTube, lead entrante, agente de navegador, ticket de soporte).
  → **Esme:** Sistema 1 (red propia rápida y local: enrutar, recordar, decidir si hace falta un LLM) más Sistema 2 (proveedores). Se ve en la Red neuronal con trazas de color por tipo de evento y con confianza y latencia en vivo.
- **@theo, «Quota Management»**: cuotas de varias cuentas y proveedores (Claude, Codex, xAI, Kimi…), con un gráfico de restante más su proyección y la pendiente de los reinicios («293 % / 600 % remaining · ~3,3 % per hour», «Next reset +200 % Tue 10:00 PM»), además de límites de 5 h y de 7 días por credencial.
  → **Esme Uso:** previsión de cuánto te dura cada suscripción y cuándo se reinicia, y abajo en el chat un indicador mínimo (motor · contexto · coste · ahorro por memoria · límite restante).
- Tendencias: marcadores de X convertidos en biblioteca o en habilidades (@nutlope, Resurface). Esme debe absorber los marcadores en el despertar. Búsqueda local tipo Spotlight con embeddings omni (jina-embeddings-v5-omni). Dictado local gratis con Gemma (fase de voz).

### El Taller
- **Agent runtime** (@disarto_max): una tarjeta clara con un enjambre isométrico de sandboxes (3/4 vivos, «cold start 170 ms»). Cada agente aparece en una fila (planner, code-exec, browser, evals) con su pastilla RUNNING/ZERO, recursos y botón «Invoke».
  → **Esme:** el panel del Taller muestra a los motores trabajando, uno por fila, con estado, coste y tokens. Arriba, la escena isométrica de los worktrees y contenedores.
- **PR guiadas** (Capy): pestañas Overview / Guide / Diff, resumen numerado y un diagrama «Before / after» con nodos de decisión.
  → **Esme:** revisión de cambios guiada, no solo un diff.
- **Inspeccionar → IDE** (@Gur__vi): clic en un elemento de la vista previa → árbol de componentes → abre el fichero.
  → **Esme:** clic en la vista previa → Esme sabe qué componente es y lo edita.
- **TesterArmy:** tests como objetivos en inglés, grabados la primera vez y repetidos después sin llamar al modelo («passed · 1 model call · 5 replayed»). Lo ilustran con una maqueta isométrica de una máquina que pulsa el móvil.
  → **Esme:** QA por objetivos, con repetición barata.
- **Fábrica de git** (@dwhitedesign): el historial convertido en una fábrica isométrica. Las carpetas son máquinas y los imports son cintas, con un control de reproducción por commits.
  → **Esme Uso / Creaciones:** cada proyecto crece como una fábrica viva que se reproduce en el tiempo. Es lo que sustituye al mapa de calor de GitHub.
- **Anatomy** (skill de Claude): «Name an idea, Claude builds the machine that explains it». Una máquina isométrica SVG/WebGL interactiva, con tipografía serif editorial y cifras grandes.
  → **Esme:** explicaciones interactivas como tipo de creación.
- **Fuentes como chips** (rare-ui): «Searched 6 sites», chips de fuente que se despliegan y citas en línea con el logo de cada sitio.
  → **Esme:** chips de fuentes y recuerdos citados en el chat.
- **Bandeja para actuar** (Gr8r) y **chat por proyecto** (designfly): una bandeja con triage y respuesta sin salir del flujo, pestañas por proyecto con contadores e «Inicio» con tareas, plazos y progreso.

### Estética: lo que manda ahora
- **Isometría** de máquinas en SVG (Iso Gunship de nesdesign, Anatomy, TesterArmy, Agent runtime, la fábrica de git). Es el lenguaje visual del momento para explicar sistemas. Encaja con el «mini ordenador» y con mostrar a Esme trabajando.
- Vidrio líquido con barra flotante y pastilla (salud/actividad). Shaders WebGPU abiertos (shaders: más de 200 componentes). Chip Search de beUI (barra que se ensancha, chips y panel desplegable). Lumina (sistemas de diseño servidos por MCP a Cursor y Claude).
- Microinteracciones: toggles.dev, cuelume.dev, blendy, somonoco, ssgoi.dev, lucide-animated, reactbits backgrounds, Kokonut UI, Anime.js.
- **Mascotas:** orbes brillantes con carita (Mzrdesign) y un ajolote pixel con personalidad y juego propio (anishfn). Claude Motion usa un orbe brillante dentro de un tarro como metáfora de «todas tus ideas en un sitio».
- **Marca:** Cardinal combina serif editorial, un trazo de línea a mano, fichas de color plano y un pájaro dibujado. Demuestra que una marca puede ser cálida y artesanal sin ser geométrica.

### Prioridades que salen del análisis (orden propuesto)
1. **Capa de proveedores:** registro con models.dev, motores gratis al instalar, cliente ACP y API keys en el llavero. Con el indicador de uso abajo en el chat.
2. **Taller como agent runtime:** filas de motores, worktree por tarea, revisión guiada, vista previa con clic para editar y arena.
3. **Uso:** previsión de cuotas, gasto, presupuesto diario y la fábrica de cada proyecto.
4. **Mente:** perfil, conflictos y hechos con fecha. Absorber marcadores de X. Sistema 1 visible en la red.
5. **Presencia de Esme** (orbe/personaje), feed de «hecho» y bichitos que reaccionan.
6. Marca con los conectores de Adobe, Canva y Figma, cuando estén autorizados.

## Segunda pasada por el FYP (12-oct, tarde)
Se vieron unos 150 posts más y se marcaron otros 47 como «No me interesa». Todos eran anuncios, cripto, trading, coches o juegos, salvo una posible duda: @ReflctWillie, «agente de pantalla completa».

- **Claude Design por dentro** (@dotey, ingeniería inversa):
  - App de escritorio con sesiones a la izquierda, chat en el centro y un lienzo editable a la derecha.
  - Sistema de diseño propio por proyecto: página con portada, colores y tipografía.
  - Menú **«+ Use a skill»** en el compositor: design, design-system, motion-graphics, narration y cover-and-title.
  - Línea de tiempo de vídeo con subtítulos.

  → **Esme:** el compositor gana «+ habilidad». El Taller produce lienzos editables, sistemas de diseño y vídeo, no solo código. Es el formato de superapp creativa al que hay que superar.
- **Coinbase:** un Qwen3.5-9B postentrenado con datos propios supera a un agente con Opus 4.5 en su tarea (de +7,5 a +35,4 puntos según la métrica) y tiene un 55 % menos de latencia P50.

  → **Esme:** valida la «red propia». Fase futura: destilar la mente del usuario en un **modelo personal** pequeño y local, que actúe como Sistema 1 y para tareas repetidas.
- **RSI-Anything** (arXiv 2610.x): bucle de automejora Propose → Predict → Select → Observe → Update → Retain, con «policy» y «world model».

  → **Esme:** es el modelo del router y la arena que aprenden. Sus mascotas son blobs de color con ojos grandes que **asoman por el borde** de la pantalla, la mejor idea vista para que los bichitos «vivan» en la app.
- **Foreman** (panel de agentes):
  - Saludo y resumen arriba.
  - Agentes activos, tareas de hoy, conectores y gasto del mes.
  - Actividad reciente en tarjetas.
  - Rendimiento por agente (tareas, % de éxito, duración).
  - Próximos disparadores y salud de conectores.

  → Referencia para Inicio y Uso.
- **Strata/DSH** (@seanhighness): inferencia local MoE con «expert skipping» (escena vóxel de una pagoda de una sola vez). Es para la Tienda de modelos locales, más adelante.
- Más señales:
  - Google lanza un asistente de notas con IA gratis para Mac.
  - Claude Kit (YesWeHack) evita que la IA invente cosas en los informes. → Esme verifica antes de afirmar.
  - Repo de 475 demos de vídeo hechas con Opus 5.5.
  - Linus usa Claude Code en el kernel.
  - GPT-6.1 Sol con 500k de contexto en Codex.

## Tercera pasada (12-oct, noche): dos piezas que se adoptan tal cual
- **Autonomía que se gana (Reeve)**: cuatro niveles por agente o motor. **Mirar** (observa e informa), **Sugerir** (redacta y tú actúas), **Preguntar primero** (actúa tras tu aprobación; es el recomendado al empezar) y **Actuar e informar** (dentro de límites, con deshacer).
  - Cuando casi todas sus propuestas se aprueban sin cambios, Esme *sugiere* darle más margen. La decisión siempre es del usuario.
  - **Reglas que ningún agente puede saltarse**, editables, con algunas bloqueadas siempre: nunca borrar registros, nunca ver tarjetas ni cuentas bancarias, gasto máximo por acción y horas de silencio.
  → Así son los permisos de Esme y el paso «Autonomía» de la bienvenida.
- **Equipo en tres niveles** (notas de @Mahaximus_ basadas en la documentación de Anthropic). El modelo caro planifica y decide, el medio construye y el barato carga con el volumen: leer, ordenar, condensar y enrutar.
  - **Escalado:** barato → medio si la confianza es menor de 0,7 o falla la comprobación de «hecho»; medio → caro tras 2 intentos fallidos; caro → persona para dinero, clientes, borrados o cualquier cosa pública.
  - **Condensación:** toda salida de herramienta pasa por el modelo barato (300 tokens como máximo, conservando rutas, números y errores exactos) antes de que la vea el caro.
  - **Coste:** prefijo cacheado idéntico en cada turno, tope de 20 turnos y 2 reintentos por herramienta. Los tokens de cada nivel se registran en `costs.jsonl`.
  - **Traspasos:** como ficheros, con objetivo, entradas, nivel responsable y comprobación de «hecho».
  - En su ejemplo, una ejecución de 30 turnos baja de 22,42 a 2,37 USD.
  → Esto es el **router de Esme**, generalizado a cualquier proveedor: los niveles salen de models.dev y la mente de Esme hace de condensador y de memoria entre turnos.
- Librerías para el Taller y el sistema de diseño:
  - **termcn** (terminales bonitas en React).
  - **audiocn** (UI de audio, para la fase de voz).
  - **uiarc.dev** («la librería que tus agentes pueden usar», con MCP).
  - **23rd.dev** (shaders y fondos).
  - **beautifului**, **bencho** y **boardui**.
  - La skill `/animation-performance` de Emil Kowalski: reglas de animación que los agentes suelen saltarse (blur pequeño, no animar sombras…). Se instala en Esme como habilidad.

## Sistema visual (12-oct, decisión del usuario)
- **La interfaz es neutra, en claro y oscuro. No tiene un color de marca:** las acciones van en blanco (noche) o negro (día) y la memoria en perla. Atención, peligro e info son solo estados.
- **El único color es la aurora, y está viva:** un gradiente cónico (`--aurora`) cuyo ángulo gira solo, más su versión lineal. Aparece solo donde hay vida:
  - el borde del compositor al escribir;
  - el hilo del menú activo;
  - los recuerdos citados;
  - las luces y los impulsos de la red neuronal, cada nodo con su matiz;
  - el halo de Esme;
  - el impulso de la Señal.
- **Marca, la «Señal»:** líneas en blanco y negro (potencial de acción que se propaga en un plano isométrico). Su impulso de luz es aurora. Se descarta la paleta fija: violeta, ámbar y esmeralda dejan de ser color de marca.
