# ESME: la fuente de verdad

> **Para cualquier agente o persona que trabaje en Esme: lee este fichero primero.**
> - **Qué recoge:** todas las decisiones del creador y el estado real de cada una.
> - **Cuándo se actualiza:** al terminar cada paso.
> - **Qué hacer con los detalles:** están en los enlaces. Si algo contradice a este fichero, gana este fichero, y el conflicto se anota aquí.
>
> **Última revisión:** 2026-10-20, tras el trabajo «sin límites» de la mente y la búsqueda en X del mismo día.

## 0. La regla madre (palabras del creador)
- **Esme es maleable (17-oct):** «no quiero limitarlo… que sea totalmente cambiante… que la persona pueda modificar cualquier cosa, incluso cambiar lo visual por librerías que vio». No hay un diseño fijo: hay **pieles**. Todo lo visual (color, tipografía, densidad, formas, movimiento, fondo, componentes) vive en una piel que se cambia en vivo con deshacer e historial; Esme genera pieles a petición («hazla como Linear», «como esta web»), las comprueba (contraste, legibilidad) y enseña antes y después; las pieles se comparten y venden en la Tienda. Esmeralda, Tinta y Luz y el violeta son las primeras pieles, no «el diseño».
- **Una sola sesión a la vez (17-oct):** solo una sesión de Claude trabaja en Esme; las demás leen este fichero y no tocan código sin que el creador lo pida. Así la dirección no se bifurca.
- **Primero lo esencial impecable (17-oct):** conversar, recordar y el Taller funcionando perfectos (el 17-oct fallaban 14 de 41 tareas). Luego, las pieles; luego, negocio (planes, invitaciones gratis para el equipo, licencias) y funciones grandes.
- **El nivel:** «De otro mundo», «la maravilla» en cada detalle, lo mejor de la era de la IA. Esme debe ser propia e incomparable: nunca una copia.
- **Ninguna orden limita:** «Cualquier orden mía mal dicha puede limitar el proyecto». Si una decisión achica Esme, se cambia por algo mejor y se explica.
- **El ritmo:** paso a paso, perfeccionando y en orden, pero sin quedarse nunca satisfecho. Cada paso termina preguntándose «¿qué falta para que sea lo mejor que existe?».
- **No perder nada:** cada aprendizaje se guarda aquí, en el vault y en la red neuronal.
- **Absorber todo:** el FYP de X, cada publicación, las librerías. No se copia: se absorbe y se supera.
- **Casi no consumir (12-oct):** «otras apps no consumen prácticamente nada». El consumo es un requisito de primera: se mide (memoria PSS por proceso, CPU en reposo, recálculo de estilo) antes y después de cada cambio, y en reposo Esme no hace trabajo: nada de bucles ni animaciones vivas sin motivo.
- **Que cada usuario la cambie mucho (12-oct):** «quiero que los usuarios puedan cambiar mucho». La personalización es profunda (tintas, luz, papel, sello, qué cuenta la portada, el personaje y sus bichitos) y siempre con vista previa y deshacer.
- **Que todos la amen:** «necesitamos que todos amen lo nuestro». Manos libres para Esme; en orden y paso a paso.

## 1. Qué es Esme
- **No es otro agente:** es un **sistema cognitivo con red neuronal propia** que envuelve a *cualquier* IA (local, por API o por suscripción) y la hace **mucho más inteligente** con el conocimiento de la red.
- **La red conoce a las IAs:** comprende a cada una, dirige mejor la información hacia ella a través del mensaje y crece sin límite.
- **La gente deja de usar los agentes sueltos:** Claude Code, OpenCode, Codex y los demás pasan a ser **proveedores** dentro de Esme (por ACP). Las API van por el bucle propio de Esme.
- **«Adiós a los .md»:** ningún modelo vuelve a perder información por los ficheros de memoria. Usa la red de Esme.
- **Una super app:** pensar e investigar, dinero y negocio, comunicación y creación, construir. Todo, en orden.
- **Para quién:** primero el creador, luego sus colaboradores y después servicio público de pago. Primeros usuarios: creadores y devs.
- **Plataformas:** Linux, luego Windows y por último macOS. Idiomas: español e inglés desde ya.
- **Nombre y personaje:**
  - El nombre es **Esme**; el nombre en clave del repo, Daimon.
  - El símbolo, provisional, es la **Señal**: potencial de acción en isométrico.
  - El personaje y los «bichitos» van aparte del logo: reaccionan en vivo, se personalizan a fondo y tienen tienda de la comunidad.

## 2. Decisiones del creador (todas, agrupadas)
### Mente y red neuronal
- **Tiene que ser mucho más que un LLM:** «memoria neuronal o algo mejor aún que no exista».
  - Ya aprobado: memoria de tres sistemas (episódica, neuronal que aprende al usarse y reflejos), con el sueño que enseña de una a otra y desaprender de verdad.
  - **Sección 2 ampliada, aprobada:** un solo tejido, memoria fractal, percepción, curiosidad, saliencia, historia del pensamiento, simulador de ti, Tálamo que reemplaza los `.md`, perfiles de IAs, Prefrontal, Núcleo predictivo, Imaginación y Telepatía.
  - **Sección 3, aprobada:** Propósito con presupuesto de interrupciones; Manos con su propio ordenador, rebobinar y bóveda de llaves; Sistema inmune con DNI por recuerdo, cuarentena, desaprender, vacunas e inmunidad de rebaño.
  - **Sección 4, aprobada:**
    - Profesores con «¿cabe en tu PC?», Cuerpo con gobernador y nube elástica, Alma cifrada con máquina del tiempo.
    - Nace sabiendo, nunca más límites, gasto con objetivo, nube confidencial, modo sombra, siestas, diario de la mente y recuperación social de la llave.
    - **Laya por defecto** (gratis y local) en vez de Jev, que es de pago. Todo personalizable.
    - Fusión de respuestas y «esta semana aprendí».
- **La red «Metabolismo» quedó RECHAZADA** por limitante. Requisitos para la red:
  - no machacar el PC del usuario;
  - no romperse cuando usa su modelo local;
  - superar cualquier cosa actual.
- **Voz propia (futuro):** un mini-LLM destilado, original, rápido y el mejor (respetando las condiciones de uso).
- **Fuentes que absorbe:** «todo», universal, pero el usuario elige (Obsidian, X y sus marcadores, noticias…).
- **Estudio de mentes:** solo de usuarios con permiso y en redes. Cada usuario puede ampliar su red en privado; el creador y sus colaboradores mantienen la red general.

### Modos, autonomía y modelos
- **Modos visibles (el creador los quiere):** Explorar, Construir, Evolucionar y Sombra/Silencio, «y piensa más modos». También diales que la mente aprende a ajustar sola. Dinero y envíos siempre preguntan.
- **Autonomía:** depende de lo que elija el usuario. La mente puede **mejorar la propia Esme**, pero las ideas revolucionarias las aprueba el creador.
- **Todas las IAs:** locales, por API, de pago, gratis y por suscripción, sin límites. Detección automática de las locales (Ollama, llama.cpp, LM Studio…).
- **Cuando un modelo se niega:**
  - La regla: cambiar a uno que sí pueda (un local *uncensored* u *obliterated* de Hugging Face, o uno frontera que lo permita) y seguir con el trabajo.
  - **Matiz de seguridad (spec):** se le muestran al usuario los modelos que sí pueden y **el usuario elige**.
- **Tienda:**
  - Contenido: todos los MCP del mundo, plugins, skills, modelos locales («¿cabe en tu PC?») y bichitos.
  - Con escudo de seguridad.
- **Router:** decide Esme. Primero lo gratis, con presupuesto, y aprende de lo aprobado y lo rechazado. **Arena desde el principio.**
- **Motores:**
  - **Al instalar:** gratis, OpenCode Zen por defecto.
  - **Claude:** con API key más el binario oficial con el login propio del usuario (requiere aprobación de Anthropic para distribuir).

### Experiencia y aspecto
- **Identidad aprobada: «Tinta y Luz», escalada.**
  - De día, tinta viva sobre papel que se dibuja sola. De noche, mientras aprende, la tinta se vuelve luz bioluminiscente.
  - El clima es el estado mental, con estaciones y tinta que siente.
  - Música generativa, el ser que nace de ti, tu sello, el día y la noche con tu propio sol, y tipografía propia.
  - Los bocetos 1–4 fueron «pobres». **La paleta no es fija:** claro y oscuro, y el color es la vida.
- **Principios de la Ventana:**
  - La interfaz y el flujo:
    - la Red es el menú;
    - la interfaz nace y desaparece, y respira con la mente;
    - no hay dos iguales;
    - deslizar el tiempo y pensar juntos en vivo;
    - ver el Parlamento: los modelos debatiendo.
  - Cómo se expresa la mente:
    - piensa en imágenes;
    - la mente anima sus propias explicaciones;
    - un mundo vivo procedural.
  - Sensación, alcance y calidad:
    - la interfaz siente la voz y tiene física con peso;
    - presencia en todas partes y sonido con emoción;
    - menos de 100 ms y accesible;
    - cada efecto tiene interruptor y nunca finge afecto.
- **El «mini ordenador» donde trabaja la mente:** un objeto físico estilo Mac mini, **pero un animal**. Lo decide Esme.
- **Al abrir:** la bienvenida «la mente despierta». La mente absorbe lo que el usuario elija.
- **Uso:** modelos y gasto, actividad tipo GitHub, creaciones y proyectos, crecimiento de la mente y GitHub (las dos vías). Bajo el chat, «las cositas» con estilo. Alertas según lo que quiera el usuario.
- **Taller:** agentes en paralelo, revisar cambios dentro, aprobaciones visuales, vista previa en vivo y copia aislada siempre. Hace «todo»: Esme pone todo lo que rodea a la IA.
- **Puertas:** chat, voz (sí, paso a paso), *pop-ups*, móvil, WhatsApp y Telegram, en fases.
- **Herramientas de diseño:** conectores Adobe, Canva y Figma, y créditos de Higgsfield (pocos) si sirven.
- **Base visual:** «Usa todo y más». beUI, Motion, shadcn, Arc UI, Kobra, skills de Emil y Jakub, y Spline/Unicorn para 3D, convertidos en un sistema **propio**.

### Restricciones permanentes
- **Fuera de todo:** el proyecto de la empresa del creador, con sus datos, su servidor y sus ejemplos. El nombre está en la configuración global del agente (`~/.claude/CLAUDE.md`) y aquí no se escribe, para que la mente de Esme pueda absorber este documento.
- **Nunca publicar** en la X del creador. Sí se puede leer y pulsar «No me interesa».
- **Secretos:** nunca en el vault ni en logs. Se redactan.
- **Ollama del creador:** está roto. No arrancarlo ni arreglarlo. La memoria no puede depender de él.

## 3a. Pieles: Esme maleable (17-oct)
- **P1 ✅** motor de pieles (`tinta/piel.ts`): una piel es solo datos (color, letra, forma, densidad, movimiento, fondo), validada y con contraste AA comprobado; historial con deshacer/rehacer y ensayo en vivo; `Ctrl+Mayús+0` vuelve a la de casa. 11 pieles de casa (Esmeralda, Tinta y Luz, Cuarzo, Lima, Medianoche, Monocromo, Editorial, Boreal, Terminal, Nube, Estudio) y 7 letras nuevas que se cargan al elegirlas. Ajustes › Apariencia es el vestidor.
- **P2 ✅ (código)** «Pídesela a Esme»: la IA diseña la piel, Esme la valida y la ensaya en toda la app. Nunca un modelo de pago sin elegirlo. El 17-oct no se pudo ver una propuesta real: OpenRouter había gastado las peticiones gratis del día.
- **Arreglos de paso:** la ecuación del estilo propio dejaba vacíos fondo, superficie y texto; el fondo ignoraba el estilo (papel negro fijo); y el chat se tragaba los errores del proveedor (acababa mudo). Los tres arreglados con test.
- **Siguiente:** P3 (la mente y la portada como piezas intercambiables; la navegación ya lo es) y P4 (Tienda de pieles). Pieles desde un enlace o una captura («como esta web»).

## 3b. Noche del 17-oct: navegación, carácter, «Al día» y negocio
- **Navegación como capa de la piel ✅**: leyenda, riel o muelle (`shell/Leyenda.tsx`); hojas, portada y saludo se colocan según `shell/marcos.ts`. Probado en la app con los tres modos.
- **Carácter del movimiento ✅** (`tinta/caracter.ts`): preciso, pesado, magnético, elástico, lanzado. Transforma con física (ω y ζ) los 13 muelles de la app (`useMuelle`) y las curvas de CSS (`--curva`, `--lento`, `--ease-salida`). Con movimiento «nada», tampoco anima Motion. Control y bola de prueba en Ajustes › Apariencia.
- **«Al día» ✅** (`paginas/diario.ts`): «¿Qué me perdí hoy?» cuenta las últimas 24 horas en frases, sin gastar IA (tareas, fallos, permisos pendientes primero, lo aplicado, recuerdos nuevos por tema).
- **Planes y licencias ✅** (spec `superpowers/specs/2026-10-17-planes-y-licencias.md`): códigos ESME- firmados con Ed25519, comprobados sin servidor. Invitar a un colaborador: `node scripts/esme-licencias.mjs invitar --para "Nombre"` (la clave privada está solo en `~/.config/esme-licencias/`). Precios: los decide el creador.
- **Ideas de los guardados de X**: `docs/ideas/2026-10-17-marcadores-x.md` (qué entra, qué viene y qué no entra nunca).
- **Pendiente**: lint (el proyecto no tiene configuración de ESLint 9); el Sueño (ya destila personas, escenas y **tareas repetidas** —20-oct—; falta que la propuesta llegue a ser una skill de verdad); cobro con una tienda que haga de comerciante; GitHub (sin sesión iniciada en `gh`).

## 3c. La hoja de ruta «todo y más» (18-oct, decidida con el creador)
Por pasos, cada uno impecable antes del siguiente:
1. **Rediseño completo** al nivel de «Mando»: conversación → Taller → Memoria → Ajustes (escenas, cristal, movimiento con carácter, componentes de Kokonut UI y React Bits revisados a mano).
2. **El Sueño**: Esme proactiva — ordena la memoria, aprende de las tareas del Taller, prepara tu día y avisa de lo importante.
3. **Esme actúa en tu PC**: usa apps y webs por ti, con permiso explícito en cada acción delicada.
4. **Esme en todas partes**: móvil y web conectados a tu Esme, mente sincronizada y cifrada.
5. **Esme con tu equipo**: mentes compartidas, tareas entre personas y agentes, Tienda de pieles.
- **FirmeDigital y el servidor 101 (18-oct, hecho):** FirmeDigital salió del 101 (servicio, PM2, `/opt`, `/tmp`, Caddy). Copias verificadas en `~/respaldos/firmedigital-101-*.tar.zst` y en Windows, en `Downloads/firma digital page glm5.2/respaldos-servidor-101/` (sha `eb7023a3…` y `fd7f9104…`). El 101 es **solo del creador** y queda libre para Esme: Ubuntu 24.04, 4 núcleos, 4,5 GB RAM, 30 GB (21 libres, ampliable). Acceso: VPN de la empresa en túnel dividido (`~/vpn/101.ovpn`, convive con RiseupVPN) + llave `~/.ssh/id_ed25519_esme` (la llave prometheus se retiró); `ubuntu` tiene sudo sin contraseña (`/etc/sudoers.d/90-ubuntu-esme`). Caddy responde «Servidor de Esme» en `http://172.20.1.101`. IP privada: **no sirve como Tienda pública**, sí para trabajos de Esme (compilar versiones, agentes que trabajan de noche, pruebas).
6. **Versiones para todos (al terminar, pedido del creador 18-oct)**: instaladores de escritorio para Windows, macOS y Linux con electron-builder (macOS sin firmar desde Linux; firmar y notarizar exige un Mac o CI con macOS), para que el equipo vea el avance. Para la versión móvil de iOS, el creador propone **xtool** (compila apps Swift/SwiftPM de iOS desde Linux).
- **El salto del 18-oct (noche): Esme deja de ser «una mosca»** (palabras del creador: «poder hacer todo y lo que nadie puede»):
  - **Las manos** (spec `superpowers/specs/2026-10-18-manos.md`): la conversación ya actúa — busca y lee en internet, recuerda, ve al equipo del Taller, le encarga trabajo y lo programa en la agenda. Cada paso se ve en la respuesta; lo que actúa pide permiso (una vez / siempre / no); leer webs solo es libre si la dirección vino del usuario o de una búsqueda (defensa contra inyección).
  - **Herramientas del mundo**: Tienda › Herramientas conecta cualquiera de las ~10.000 del registro oficial de MCP (14 destacadas viajan dentro: Figma, Notion, Linear, Atlassian, Canva, Hugging Face, Cloudflare, Exa, Perplexity, Neon, Airtable, Apify, PayPal y **REA**, la de ingeniería inversa). Remotas por HTTP o locales con npx/uvx; **inicio de sesión OAuth** (PKCE + state + registro dinámico; probado contra HF, Linear y Notion); claves y tokens cifrados en el llavero; las mismas herramientas llegan a los agentes del Taller.
  - **Buscador privado en el 101**: SearXNG (solo 127.0.0.1, publicado por Caddy bajo una ruta secreta). Esme encuentra lo de ayer mismo (probado: Electron v44.9.0 del 17-oct). Sin él: Brave con clave gratuita o Wikipedia.
  - **Agenda y segundo plano**: encargos programados (esta noche, mañana, cada día, laborables) que el equipo lanza solo; al cerrar la ventana Esme se queda junto al reloj si hay trabajo (Ajustes › Sistema).
  - **Versiones**: Linux (AppImage/.deb), Windows (NSIS) y macOS (dmg, Apple Silicon) compilan en GitHub Actions con el cerebro dentro (Python 3.13 autónomo verificado por SHA-256). Un test impide nombres de fichero que solo difieren en mayúsculas.
  - **Siguiente**: MCP Apps (herramientas con interfaz propia: el «editor tipo After Effects» de la Tienda), el Sueño (aprender de las tareas de noche), modos visibles, Parlamento, firma de las versiones y actualizaciones automáticas.
Hecho ya el 17-18 oct: «Mando» (portada centro de mando con esfera viva), 23 escenas WebGL, voz manos libres 100 % local (Whisper + Piper) con subtítulos y conversación continua, panorama de la mente para responder con sustancia, licencias e invitaciones, copia privada en GitHub (Shiuglen/esme).
En pie desde el 19-oct, por decisión del creador: **la ingeniería inversa está permitida** (tus aparatos, software que inspeccionas con autorización, interoperabilidad, protocolos y mercado para la Tienda y las Manos; REA entra por aquí). Lo único que no se hace: malware, robo de credenciales, crack de DRM, tocar la vida o los datos de terceros. Esme se escribe sola, no se copia: las ideas se toman de donde sea.

**El salto del 20-oct (medianoche): la memoria llega sola y Esme se mira al espejo**
- **La herencia ✅**: MemGPT, Mem0, Hindsight y Letta señalan lo mismo: cada sesión nueva empieza en blanco y el usuario pega el contexto a mano. Esme ya tenía la memoria; faltaba dársela sin pedirla. Ahora, **antes de la primera pregunta de cada tarea, el Taller pregunta a la mente qué sabe del encargo y se lo pasa al motor**: un Claude Code, un Codex o un Cline abren los ojos con lo que tú ya sabías. En la línea de tiempo se ve («Le heredé tu memoria: 2 recuerdos»). Si la mente no está, la tarea arranca igual: es una mejora, nunca una condición. *(`app/src/main/taller/herencia.ts`)*
- **REA en la Tienda ✅**: `io.github.morluto/rea` (npm `rea-agents` 6.7.0, MIT) es la 14ª destacada del catálogo. El registro oficial lo publica con `packageArguments: ["mcp"]`: sin recogerlos, el servidor se lanzaba en modo CLI y **no hablaba MCP** — Esme lo contaba como «falló» sin decir por qué. Ahora la ficha guarda los argumentos (`args`) y el lanzamiento los pone detrás (`npx -y rea-agents@6.7.0 mcp`). **Probado de verdad**: el servidor arranca y devuelve sus 11 herramientas (`investigate_feature`, `analyze_javascript_application`, `inspect_binary_layout`, `open_binary`, `verify_reconstruction`…).
- **La receta «Entender un programa» ✅**: encargo del Taller que usa REA para analizar un ejecutable, un `.asar`, un `.apk` o una `.dll` — con la regla de Esme: cada conclusión con su evidencia y con los límites de esa evidencia.
- **El espejo ✅ (Palanca 6, medida)**: REA sobre el binario de Esme (`analyze-javascript-application` sobre la carpeta que se construye, 75 ficheros, 4 minutos) reconstruyó **los 86 canales IPC de la app**: **0 falsos positivos y 0 falsos negativos** contra el código fuente. También halló el puente de contexto (`daimon`, 127 miembros), las dos `BrowserWindow` con sus `webPreferences`, el proceso utilitario (`main/pty-host.js`) y las 9 claves de `localStorage`. Sus diez limitaciones están escritas, y una es real: el bundle grande del renderer se quedó sin memoria (72 de 75 ficheros parseados). Detalle: `docs/resultados/2026-10-20-rea-sobre-el-propio-esme.md`.
- **El espejo pasa de informe a agente ✅ (21-oct)**: mirar un programa ya no es una receta que alguien recuerda: es una capacidad que **cualquier agente** tiene. `daimon/rea.py` convierte la evidencia de REA en un informe con lo que vio **y con lo que no se pudo ver** (11.548 desconocidos agrupados por razón, más los límites que declara REA con sus palabras), y ese informe **entra en la memoria** como recuerdos con procedencia (`rea:<programa>`), cada uno con el título de su apartado para que la mente lo encuentre. Lo llaman la herramienta MCP `esme_absorbe_programa` (Claude Code, Codex, Cline…), la herramienta de la conversación `absorber_programa` —que **pregunta antes de mirar**, porque la ingeniería inversa no es una acción libre— y el oficio **«Espejo»** del Taller. **Medido contra la app real**: 91,3 s de análisis de 92 ficheros (631.624 nodos de AST, 1.030 hallazgos), 179 recuerdos nuevos, y las preguntas sobre el programa se responden en **0,3 s** («qué canales IPC expone» → los 122 canales con su fichero y su línea; «las ventanas» → las 3 con sus `webPreferences`). **Dos fallos de raíz que salieron y están en los tests**: los canales se contaban dos veces (el mismo lo ve el proceso principal y el renderer: 248 «canales vistos» donde había 123) y los recuerdos no sabían de qué programa eran. Detalle: `docs/resultados/2026-10-21-el-espejo.md`.
- **El bucle absorber → recrear ✅ (21-oct)**: mirar un programa es sólo la mitad; la otra mitad es **rehacerlo con lo que la mente sabe**. Ahora el encargo de la Forja lleva lo que la mente sabe de la necesidad **y, si el encargo nombra la ruta del programa, todo el conocimiento que el espejo dejó de él** (puerta `/rea/recuerdos`: 179 recuerdos para la app real). El agente que fabrica la herramienta ya no adivina: recibe. Y la receta «Entender un programa» apunta al camino de Esme primero.
- **La mente a mano ✅**: `daimon recall "lo que se decidió sobre X"` y `daimon remember "…"`: la misma puerta que usan Claude Code y el resto, pero sin servidor, para un script, un cron o tu terminal. Probado contra la mente real de esta máquina.
- **El informe de equivalencia ✅ (Palanca 11)**: los 74 turnos reales de esta noche costaron **0,4996 $** con las APIs de pago de los mismos modelos y **0,0000 $** con lo local; la memoria en la nube (Mem0, Hindsight) costaría **0,87 – 4,98 $ por cada 1.000 tareas** y la de Esme, 0. La energía: 43 W generando → 0,05 € por 1.000 tareas. Con el script que lo recalcula: `docs/resultados/2026-10-20-equivalencia-economica.md`.
- **El banco de la memoria ✅ (Palanca 5)**: **mem0** (Apache-2.0, 67K★, la memoria de agente más usada del mundo) medida **con las mismas reglas** que el examen de Esme: mismo corpus (5.768 recuerdos), mismas 35 preguntas ocultas, mismo presupuesto (1.500 tokens), mismo empaquetado y **el mismo codificador** (la Lente de Esme, para que lo que se mida sea la recuperación y no quién codifica mejor); mem0 con su propio Qdrant local, su BM25 híbrido y su reordenado. Resultado: **Esme 0,929 con 1.124 tokens · mem0 0,857 con 1.499** (literales) y **0,900 con 1.246 · 0,757 con 1.499** (paráfrasis): Esme acierta **7,2 puntos más con un 25 % menos de contexto**, y la ventaja **crece** cuando la pregunta no es literal. Cara a cara: Esme gana 3, mem0 gana 1, empatan 31. La diferencia está en **el corte aprendido**, no en el ranking (mem0 tenía la evidencia en su top-20 en el 95,7 % de los casos, pero el presupuesto se la dejaba fuera en 4 de 35). Velocidad: 482 ms contra 697 ms por pregunta. **Lo que no se midió y queda dicho**: la consolidación de mem0 con LLM (su terreno) y Hindsight (necesita servidor). Detalle y script: `docs/resultados/2026-10-20-banco-memoria.md`.
- **Los oficios del equipo ✅ (Palanca 9, primer paso)**: la arena ya no es «tres motores con lo mismo»: cada rival trabaja **con un papel**. De casa: **Constructor** (hace el encargo entero), **Revisor** (lo mira con ojo crítico, sin rehacerlo), **Probador** (escribe y ejecuta las pruebas) y **Explorador** (se entera antes de tocar nada). El creador elige los oficios con un clic y el encargo llega al motor con su oficio delante («Encargo: …» debajo). Los oficios son **del creador**: si pone un `roles.json` en la carpeta del Taller, mandan los suyos. La fila de cada tarea muestra su oficio, y **la arena muestra qué tocó cada rival** (fichero a fichero, con las líneas), que es lo que hace falta para elegir bien.
- **La Agent Card ✅ (Palanca 3, primer paso)**: Esme ya es **descubrible**: `/.well-known/agent-card.json` (y su alias `agent.json`) en el cerebro, **pública** (no lleva nada de tu memoria: sólo capacidades, para que otro agente sepa qué ofrece antes de pedir nada). Dice lo que sabe hacer hoy —**memoria** (`recall`/`remember`/`feedback`, por MCP y por HTTP), **navegador** (`navegar`/`clic`/`escribir`, 20-oct), **sueño** y **voz**—, cómo se le habla y que todo va en tu equipo. **No promete lo que no hay**: encargar tareas al Taller desde fuera todavía no existe, y la tarjeta no lo insinúa. Con pruebas.
- **La voz, medida de verdad ✅ (Palanca 10)**: el oído (faster-whisper «small») y la voz (Piper) de Esme, medidos en esta máquina con el método limpio — **el texto es la verdad**: se sintetiza, se oye y se compara palabra a palabra. La voz habla **12 veces más rápido que en tiempo real** (RTF 0,083) y **el oído estaba yendo más despacio que en tiempo real en la CPU** (RTF 0,643: una frase de diez segundos tardaba seis y medio en transcribirse — por eso el dictado se sentía pesado). **En la GPU el oído es 8,6 veces más rápido y se equivoca igual** (RTF 0,074, WER 0,150). **Arreglado**: `daimon/voz.py` elige dónde oye — GPU si hay CUDA y 1,5 GB de VRAM libre (la app la usa para sus escenas), si no CPU (que no se cae). El WER de 0,150 es casi todo el modelo escribiendo cifras («dos mil» → «2.000»), no fallos de oído. Detalle: `docs/resultados/2026-10-20-voz.md`.
- **La bienvenida ✅ (la primera vez)**: la primera vez que alguien abre Esme, la mente está viva pero **en blanco**: hasta ahora eso se comunicaba con un «tu mente está en blanco, empieza desde Memoria», que es un manual. Ahora la portada **se presenta**: «Soy Esme. Vivo en tu equipo: recuerdo lo que me cuentas, actúo por ti (busco, leo, encargo) y mi equipo trabaja mientras tú haces otra cosa», más **tres primeros pases que funcionan de verdad** (la mente se abre · las manos buscan y leen · el equipo trabaja en una copia), cada uno con su pista. Nada de lo que no existe: los tres caminos son los de hoy.
- **La mente aprende del equipo ✅**: cada veredicto del creador (aplicar = sí, descartar = no) **se lo cuenta a la mente**, que lo destila en una lección que no se olvida: «con opencode no te quedaste ninguna de las 10 tareas que hizo; se rompió 7 veces con «Internal error»». La lección es un recuerdo como los demás (id por contenido: si el equipo mejora, se actualiza en vez de acumular gemelos), así que **la herencia se la pasa al siguiente agente** antes de su primera pregunta. Comprobado de verdad: con los datos reales de este equipo la mente guardó 4 lecciones y el `recall` del equipo las devuelve.
- **La curva del Taller ✅ (Palanca 5-bis, primera parte)**: Esme, por fin, **mide a sus propios agentes** — y sin gastar un token: la etiqueta es del propio creador (aplicar los cambios de una tarea es un sí, descartarlos un no) y las medidas (tiempo, tokens, coste, herramientas, ficheros tocados) las dejó la app al trabajar. Vive en **Uso › La curva del Taller** (aciertos por día, por motor y lo que falla), con su script para la terminal (`scripts/curva_taller.py`), su pieza en el laboratorio (`?pieza=curva`) y sus pruebas.
  - **Un solo formato ✅ (20-oct)**: el script y la app ahora aplican **las mismas reglas** y escriben **la misma forma**: no hay traducción, hay la misma cuenta. Antes mentían el uno al otro en cuatro cosas (el script contaba los días en UTC y la app en el calendario del creador; el script mezclaba los fallos de tareas que se recuperaron y la app sólo los de las que acabaron en error; el coste del acierto contaba tareas que ningún veredicto atribuye; y el orden y los redondeos no coincidían). **No es una promesa, es una prueba**: `tests/fixtures/taller-curva/` es un Taller de ejemplo y las dos pruebas —la de Python (`tests/test_curva_taller.py`) y la de la app (`app/src/main/taller/curva-io.test.ts`)— lo comparan con el mismo `esperado.json`; y una tercera prueba lo comprueba **contra el Taller real de este equipo**: hoy dan el mismo número los dos.
  - **Lo que encontró al mirar de verdad (20-oct)**: de 46 tareas, **16 acabaron con error (35 %)**: «Internal error» del proveedor (7), «Internal error: Rate limit exceeded» (2), «la sesión del motor está cerrada» (6) y «modelo retirado» (1). De 11 veredictos, **ninguno positivo** (0 aciertos / 11 no). Y aparte, en las tareas que **esperan al creador** (no son fallos de Esme, son cuentas que faltan): «Authentication required» (3), «getaddrinfo ETIMEOUT» (2) y «OpenCode server is unavailable» (1).
  - **El router también aprende de los fallos ✅ (20-oct)**: hasta aquí el router del Taller sólo aprendía de lo que el creador aplicaba o descartaba — y en la curva real **no había ni un veredicto positivo**, así que le faltaba casi todo. Ahora también aprende de lo que **ya falló sin que nadie lo etiquete**: cada tarea que acabó en error es un fallo de su motor y su modelo, entra en la cuenta como fallo y **el router lo relega**; y lo explica en palabras («Acertó 0 de 4 veces · 1 acabó en error: Internal error…»), también al elegir en la arena. **Medido con los datos reales de este equipo**: el modelo que había fallado 7 veces («Internal error» de OpenRouter) **deja de elegirse** (0 de 400 tiradas; antes era el más probable) y suben los que nunca fallaron. Los fallos que mueren antes de elegir modelo (la sesión se cae) siguen siendo culpa del motor, y de ésos se ocupa «no está listo».
  - **Un modelo que vuelve a funcionar, vuelve a estar disponible ✅ (20-oct)**: los modelos que el motor rechazaba por retirado o caído se guardaban en una lista que **sólo crecía**: se quedaban fuera para siempre. Ahora manda el último intento, como con los motores que no están listos.
  - **La mente aprende del equipo sin esperar a un veredicto ✅ (20-oct)**: la lección del equipo («con opencode no te quedaste ninguna de las 10 tareas que hizo») se escribía **sólo cuando el creador aplicaba o descartaba algo**; como en la curva real no hay ni un «sí», la mente de este equipo **no tenía ni una lección** y la herencia llegaba vacía. Ahora la mente se lo apunta **al despertar** y **cada vez que una tarea se rompe**, y se le manda sólo lo que necesita para destilar la lección (no la tarea entera).
  - **El navegador de Esme ✅ (Palanca 1, primera parte)**: el navegador deja de ser texto plano y pasa a ser **un espacio**: la página da su **estado** (texto, enlaces, botones, campos) y sus **acciones posibles**, y el agente elige una y la ejecuta (`navegar`, `clic`, `escribir`). Ventana propia y oculta, en una *partition* aparte, que **se cierra sola a los dos minutos** (en reposo no hay navegador abierto). Vive en la app (`app/src/main/navegador/`) y sus manos se las pasan al chat. **Lo que viene**: el resolver (Laya local decide la acción, el modelo grande sólo escribe el texto), los localizadores profundos de stagehand y **las manos servidas como MCP** para que las usen también los agentes del Taller y los de fuera. Pila, licencias y decisiones: `docs/ideas/2026-10-20-el-navegador-de-esme.md`.
  - **El Ojo ✅ (20-oct)**: el hueco nº9 de la lista del creador («no hay modo «lee mi pantalla»») y la idea del FYP: una **memoria de pantalla local, opcional y con olvido**. No es un grabador: es *una mirada ahora*; lo que se miró hace un rato **se borra solo** (media hora, ocho capturas, **nunca en disco**). La herramienta `ver_la_pantalla` pasa por el guardián de permisos (la captura es de tu pantalla: pregunta antes) y la imagen no sale de tu equipo.
  - **La puerta del navegador: cualquier agente puede usar la web de Esme ✅ (20-oct)**: la app sirve su navegador por una HTTP diminuta en 127.0.0.1 con el **mismo token que la mente** (quien puede leer tu memoria puede abrir tu navegador: mismo nivel de confianza, mismas guardas). El **cerebro** habla esa puerta y le añade **tres herramientas MCP** (`navegar`, `clic_en_la_pagina`, `escribir_en_la_pagina`). Con eso, el navegador de Esme sale de la app: lo usan **los agentes del Taller** (que sólo tenían la memoria), el de la conversación y **cualquier agente de fuera** que hable con la mente. Si la app no está delante, la mente lo dice y no finge que ha navegado. Comprobado de punta a punta (dos procesos: la puerta en Node y el cliente en Python).
  - **Ahora lo temporal se reintenta solo**: la red caída, el proveedor saturado, el «Internal error» del proveedor (una vez, no más) y la sesión que se cierra (**se abre otra y se sigue por donde iba**). Lo que **necesita al creador** —entrar en su cuenta— **no** se reintenta: reintentar no entra por ti. Todo queda en la línea de tiempo de la tarea.
  - **El vigilante ✅**: una tarea cuyo motor se muere en silencio se quedaba **colgada para siempre**: el 12-oct una tarea estuvo «trabajando» tres días sin un solo error (y otra dos días), y el creador las paró a mano. Ahora, **treinta minutos sin una sola señal** y el motor se da por muerto: la tarea pasa a error con un mensaje claro («El motor dejó de responder») y se puede reencarnar (⟳). **Una tarea que espera a su creador no se toca**: eso es normal, no un motor muerto. El vigilante sólo mira mientras hay tareas en marcha: en reposo no hace nada.
  - **Lo que falta**: el juez de calidad (DeepEval con juez local) y la traza abierta (OpenLLMetry). El juez **no se puede hacer hoy**: el Ollama de esta máquina está roto y un juez de pago rompe la regla de no consumir. Queda escrito, no inventado.

## 3. Estado real (12-oct)
**Leyenda:** ✅ hecho y verificado · 🟡 a medias · ❌ pendiente · ⚠️ roto.

| Área | Estado | Nota |
|---|---|---|
| Red neuronal en la app | ✅ | **12-oct: ya no depende de Ollama.** La Lente corre dentro del cerebro con ONNX Runtime (EmbeddingGemma-300M int8, 309 MB, CPU con la mitad de los núcleos, lotes por presupuesto de tokens y caché). Los vectores siguen siendo compatibles (coseno 0,990 con los guardados). Recuerda en 160–290 ms. La app vuelve a mostrar 2.122 recuerdos. Pendientes: recodificar en el Sueño con el motor nuevo, medir otros codificadores con la Prueba 0 y arreglar el Inicio en blanco en el riel. La red cortada se arregló en 4b (se reencuadra al pararse la física, sin quitarle la vista al usuario). |
| Absorción de la propia Esme | ✅ | **12-oct:** la mente absorbió `docs/` con el botón «absorber» de la app: 212 recuerdos nuevos (2.334 en total), entre ellos ESME.md, la biblioteca del FYP y las specs. **Hallazgo:** la búsqueda solo por significado acierta en unas preguntas («¿qué hace el ser con los modos?») y falla en otras («¿competidor directo?» no encuentra TencentDB). Fallan las tablas y los fragmentos largos. Hay que trocear por filas de tabla y por apartados, recuperar de forma híbrida en todo el camino y medirlo con la Prueba 0 (paso 9). |
| Prueba 0 (examen de «me conoce») | 🟡 | Hecho el 11-oct (recall 0,77 con EmbeddingGemma). Falta la validación humana del oro y la comparación de punta a punta. |
| Tálamo que reemplaza los `.md` (MCP para Claude Code) | 🟡 | Hay puerta MCP en el cerebro. No está empaquetado como producto (M1). |
| Corteza, sueño, desaprender con certificado, Prefrontal, Parlamento, simulador | ❌ | Fases F4–F6. |
| Chat con memoria y tira de uso | ✅ | Funciona cuando hay cerebro. |
| Taller | ✅ | Runtime ACP, planta, HUD, revisión, aplicar con deshacer, router, arena, vista previa con inspector y avisos. |
| Agente propio de Esme para API | ❌ | Necesita una clave (OpenCode Zen, OpenRouter o Gemini gratis) que pondrá el usuario. |
| Cambio de modelo ante negativa | ❌ | |
| Modos visibles | ❌ | Se ven en el taller del ser (Explorar, Construir, Evolucionar, Sombra) más una página de Autonomía y permisos por mente y motor, estilo Atlas, con «lo que no puede ver». |
| Tienda | ❌ | Solo la página «Próximamente». |
| Detección automática de IAs locales | 🟡 | La lista es fija; falta detectar. |
| Uso | 🟡 | Gasto, actividad y fuera de Esme están. Faltan el uso de los motores del Taller, creaciones, crecimiento de la mente y GitHub. Del FYP: historias («dónde se fue tu dinero»), ranking por motor, auditoría y KPI con acción. |
| Identidad «Tinta y Luz» | ✅ | **4c hecho (12-oct): el Taller es un grabado** (rayado por cara según la luz de tu sol; de noche, esgrafiado) **y tu sello**: bermellón, con la constelación de tu propia mente, solo en lo que apruebas (revisión, fila y tapa de la máquina). **4d hecho: Inicio es la portada de tu mente** (fecha, saludo en la cursiva de los rótulos, tu mente contada en frases, la lámina de tu mente real con tu sello, que se dibuja sola una vez por sesión) y la Señal es tinta que envejece hacia atrás con impulso de luz. **4a hecho (12-oct):** tokens de papel, tinta y luz en los dos temas (AA comprobado). Papel de algodón con fibras e iluminado por el ángulo de tu sol de día; de noche, papel de tinta con luz bioluminiscente (NeuroNoise) solo mientras la mente piensa o recuerda. Hojas en vez de cristal, selección en tinta, y la vida es luz y no arcoíris en la planta, la Señal, la red y las micrográficas. Spec: `specs/2026-10-12-tinta-y-luz.md`. **4b hecho (12-oct): la mente en tinta.** Cada recuerdo es un punto de tinta: su color es su edad (tinta ferrogálica en escala logarítmica absoluta: una semana ya envejece un 35 %, de seis meses a un año solo un 12 %) y su tamaño, su confianza. Lo que dijo una IA y nadie confirmó es un anillo de grafito. Los temas son aguadas opacas en una capa propia, apiladas como recortes y con línea de marea, y llevan su nombre rotulado como un atlas grabado (Bodoni Moda cursiva, dos líneas, sin que ningún nombre pise a otro). Se puede **deslizar el tiempo**: regla con histograma en la tinta de cada día, y la tinta vuelve a estar fresca en el pasado. La mente **se dibuja sola** la primera vez en cada sesión, y lo nuevo cae como una gota que se seca. Luz al recordar. A 60 fps, con los puntos por lotes de tono (de unas 2.400 llamadas por fotograma a unas 130). Los temas se nombran con la Lente: una palabra central en el tema y que lo distingue del resto de la mente, con acentos y mayúsculas como las escribes. Contraste AA comprobado en los 12 pares. **Pendiente de 4b:** la goma (lo olvidado, con certificado) necesita que el atlas guarde la posición de lo olvidado; los temas hechos de registros aún se nombran con verbos («añadieron · corrijo»), y los nombrará bien un modelo en el Sueño (paso 8). Antes: | **La interfaz actual (cristal más malla de gradiente) es una tendencia, no nuestra identidad: rehacerla.** El FYP lo confirma: lo que más brilla es materia impresa (grabado, trama de puntos, tinta electrónica, pixel art). **Lo nuestro: la tinta la traza la red real del usuario.** |
| Personaje, bichitos y mini ordenador animal | ❌ | Del FYP: el taller del personaje cambia con el modo (son los modos visibles), vive en notificaciones y bordes, y hay un bichito por motor. **Lo nuestro: el ser nace de la red de cada usuario (no hay dos iguales).** |
| Bienvenida «la mente despierta» | 🟡 | La portada de Inicio ya despierta (la lámina se dibuja sola, del recuerdo más viejo al más nuevo). Falta la primera vez de un usuario nuevo: el recorrido de bienvenida que le presenta su sello y su mente. |
| Consumo | ✅ | **12-oct, medido:** renderer de 2,4 GB creciendo 26 MB/s y 41 % de CPU en reposo → 139 MB estables y 0 % (la causa: una animación de una variable heredada en `<html>` que recalculaba todo el documento cada fotograma). Cerebro en reposo 407 → 228 MB (la Lente suelta el modelo tras 60 s; cargarlo cuesta 0,1 s) y pico al absorber 2,7 → 1,6 GB (lotes de 2048 tokens). **20-oct, vuelto a medir:** el cerebro en reposo sigue en **224 MB y 0,02 %** (sin regresión) y la app **con una tarea en marcha** cuesta 2.665 MB y 11,6 % (el renderer con la escena del Taller viva manda: 1.515 MB y 8,7 %). La app en reposo no se ha vuelto a medir porque el creador tenía una tarea en marcha. Detalle: `docs/resultados/2026-10-20-reposo.md`. Pendiente: medir con la app de producción (sin servidor de desarrollo) y comparar con otras apps. |
| Escritorio | ✅ | Icono en el escritorio y en el menú (`scripts/instalar-escritorio`), hecho con la geometría real de la Señal; instancia única (pulsar el icono con Esme abierta la trae al frente). |
| Personalización profunda | ❌ | Pedida el 12-oct: el usuario cambia tintas, luz, papel, sello, la portada y su personaje, con vista previa y deshacer. Va en el paso 6. |
| Voz, móvil y mensajería | ❌ | En fases. |
| Absorción total del FYP | ✅ | **12-oct (tarde):** 215 publicaciones leídas, 52 de oro analizadas con imágenes y fotogramas. Biblioteca en `docs/investigacion/fyp-2026-10-12-biblioteca.md` (con hojas y JSON en bruto). Antes había 55 en `specs/2026-10-12-lenguaje-visual-v2.md`. **Se repite cada semana:** el FYP cambia y la regla es lo más nuevo, días o una semana como mucho. |

## 4. Orden de trabajo (decidido por Esme con la regla madre)
1. ✅ **Esta fuente de verdad** y su copia en el vault y en la memoria (para no perder nada).
2. ✅ **Revivir el corazón:** red neuronal sin Ollama (EmbeddingGemma en un motor propio, local y ligero) y vuelta a medir con la Prueba 0.
3. ✅ **Absorción total del FYP:** biblioteca estructurada de cada publicación (técnica, por qué es buena, cómo la supera Esme), guardada en el repo y en el vault.
4. ✅ **Identidad «Tinta y Luz» escalada**, nacida de la red real y no de una moda. Rehacer el sistema visual y la Señal dentro de ella.
   - De día es grabado vivo; de noche, luz.
   - La red se dibuja como plumilla.
   - El chat responde con interfaz generativa en la misma tinta.
5. **Modos visibles, cambio de modelo ante negativa y agente propio** (con la clave del usuario).
6. **Bienvenida «la mente despierta»**, el personaje y el mini ordenador animal, y la **personalización profunda** (tintas, luz, papel, sello, portada y personaje, con vista previa y deshacer).
7. **Tienda con escudo**, detección de IAs locales y uso completo.
8. **Corteza, sueño, Parlamento**: las fases F4–F6 de la spec.
9. **Memoria que supera a TencentDB Agent Memory** (competidor directo, MIT):
   - informe de absorción con conflictos;
   - personas y escenas;
   - Tálamo que condensa los registros en símbolos;
   - paquete de contexto visible;
   - cifras de la Prueba 0 a la vista.
10. **Taller pro:** cascada de trazas, bandeja de borradores para aprobar, y negativas con los modelos que sí pueden (elige el usuario).

## 4b. Venas ya vivas (2026-10-17)
- **La familia viva**: `marca/ser.ts` nace bichitos deterministas de la constelación del atlas (silueta Catmull-Rom, párpados, ring de luz); están en el selector de tareas, filas de motor, historial y bienvenida.
- **Hoja de servicio**: en cada tarea del Taller, la fachada del Taller nace desde su `Tarea` real (estados: nace → páginas → toca ficheros → terminó → error), con la frase de servicio en prosa.
- **Prisma del motor ✅ PROBADO CON MOTOR REAL (chat Y taller)**: convención ` ```prisma ` aceptada en TODO el Markdown de la casa. El motor trae un JSON (línea/barras/fichas) y la casa lo dibuja con tinta y luz (`leerPrisma` estricto + `caminoLinea` + `chat/Prisma.tsx`).
  - Probado por el puente con cohere/north-mini-code:free (chat) — emitió el bloque exacto.
  - Probado en el Taller con qwen-code: el En vivo nace con barras agrupadas pintadas (alturas fieles, etiquetas, fichas Σ por serie) y sello «PRISMA».
  - **El spec manda, no la etiqueta**: los motores cercan el json con ```json``` — la puerta acepta prisma por forma, no por language. Fence prisma podrido → código crudo. 337 tests verdes.
  - Lección de puente: modelos *thinking* (deepseek-v4-flash, nemotron) dejan el textStream vacío — el chat puede necesitar indicador de pensado.

## 5. Documentos de detalle
- Arquitectura y red: `docs/superpowers/specs/2026-10-11-daimon-design.md`
- Concepto v3 y análisis del FYP: `docs/superpowers/specs/2026-10-12-esme-concepto-v3.md`
- Lenguaje visual v2 (técnicas de X y librerías): `docs/superpowers/specs/2026-10-12-lenguaje-visual-v2.md`
- Taller: `docs/superpowers/plans/2026-10-12-taller-runtime.md`
- Identidad «Tinta y Luz»: `docs/superpowers/specs/2026-10-12-tinta-y-luz.md`
- Laboratorio (ver lienzos y animaciones de verdad): `app/src/renderer/laboratorio.html`
- Decisiones de la app v2 (nombre y logo): `docs/superpowers/specs/2026-10-11-app-v2-decisiones.md`
  - **Reencarna ✅ visible en el Taller**: tarea con error → ⟳ en su detalle → hermana nueva con el siguiente motor instalado (misma petición, prefijo «Reencarnación de una tarea que falló con X»).
  - **Los muertos hablan humano ✅**: «Internal error» → «El motor se cayó sin decidir» (familia motor: red rota, tiempos) con consejo de reencarnación; banner completo en el detalle. 339 tests verdes.
- **El pensado viaja ✅ probado por el puente**: `chat.ts` manda los deltas de razonamiento por `chat:pensamiento` (AI SDK 7 `fullStream`, `reasoning-delta`); cohere/north-mini-code traía 366 caracteres de pensado + texto por separado. En el chat, una burbuja esperando muestra el velo «pensando» con el hilo del razonamiento en itálica y desvanecido.
  - **Honestidad ante modelos vacíos**: si done sin texto ni pensado, la burbuja ya no queda en blanco: «El modelo respondió vacío…» o «El modelo pensó (n caracteres) pero no trajo texto». Los modelos gratis que callan (elorian/glimpse, deepseek-v4-flash-free en su vía, kimi-k3-free) ya no engañan.
  - Estado: el circuito está probado a nivel de eventos; el velo en la burbuja es la vista de esos mismos eventos.

## Oleada visual: la fila de producción con peso (17 oct 2026)

- **Bandas con sello ✅**: cabecera de banda en versalitas con tracking, raya de puntos hasta la cuenta y la cifra en píldora; el punto de «Trabajando» respira (`animate-pulse`). Se ve estampado, no gris.
- **Acciones rápidas en la fila ✅**: la tarjeta pasa de `<button>` a `div role=button` (HTML válido con botones anidados) y al pasar el foco flotan en la esquina — sin reservar sitio ni empujar el título: «Aplica» (lista), «Reencarna» (error), «Parar» (en marcha). Cableadas a `tl.aplicar/reencarnar/parar` reales.
- **Métricas que solo hablan ✅**: se acabó la fila de ceros. Una tarjeta sin huellas dice «Sin huellas todavía.»; con vida muestra solo lo que tiene (1.ª respuesta, +/− cambios, tokens, coste).
- **Medallón de quién trabaja ✅**: el detalle encabeza con el bichito del motor en anillo tintado por su estado (aurora viva / velo peligro / línea apagada).
- **Pestañas con marca de luz ✅**: el subrayado deja de ser fondo gris y es una línea de aurora que viaja con `layoutId` entre pestañas.
- **Fin de turno como rúbrica ✅**: «Terminó en 0:27» lleva su línea a los lados y un check sellado en luz.
- **Hilo del que responde ✅**: cada respuesta del chat nace de una línea de aurora a la izquierda (peligro si trajo error) — verificado con conversación real en la piel.
- **El nombre del motor no se parte ✅**: «Qwen Code» en una línea; el modelo es lo que trunca.
- Verificado en caliente: 339 tests verdes, typecheck limpio, build 3.0 s, capturas de Taller y conversación.

## La vena prisma, confirmada por el puente (16 oct 2026)

- **Conversación real por el puente ✅**: chat de verdad (no mock) → el motor emite exactamente el bloque:

  ````
  ```prisma
  {"tipo":"linea","titulo":"Tokens por turno","unidades":"tokens","valores":[50,80,90,70,95],"etiquetas":["t1","t2","t3","t4","t5"]}
  ```
  ````

  144 caracteres, uso 130 entrada / 299 salida. La tubería entera respiró: motor → Markdown → `leerPrisma` → panel pintado. La convención ` ```prisma ` ya es la vía de los lienzos.
- Aviso de vena: los modelos «que piensan» (deepseek, nemotron) mandan todo al canal de razonamiento y el `textStream` llega vacío — para pruebas de emisión, modelos que no piensan (north-mini-code) obedecen el formato a la primera.

## La noche larga: la nebulosa del pensamiento (17 oct 2026)

- **Los bookmarks da la llave ✅**: pasadas las 13 hojas del FYP. La señal para la mente vive en #158 TencentDB **Agent Memory** («simbólica → Mermaid; de largo plazo → píxeles planos»; el logo: grafo sináptico con núcleo encendido) y #37 Nizam (números en matriz de puntos) — y la doctrina vieja «la mente se dibuja sola» (fyp-biblioteca).
- **LA RAÍZ DEL MAL (bug real de meses) ✅**: el tema noche define su tinta en `hsl(...)` y `mezclar()` no la leía → la convertía en `rgb(0 0 0)`. Los recuerdos se pintaban NEGRO SOBRE NEGRO desde el principio. Ahora `tinta/luz.ts` parsea hex/rgb/hsl a mano (el lienzo de últimos) y la mente sale de la penumbra: 2346 recuerdos visibles en vez de polvo.
- **Nebulosas vivas ✅**: cada aguada es ya un cuerpo con centro denso y orilla en vuelo (gradiente radial dentro de la mancha), tinte por edad y la marea grabada al borde.
- **El fresco arde ✅**: la tinta de los últimos días lleva halo (sprite por tono, preparado una vez, estampado con `drawImage` bajo la trama) — lo nuevo brilla, lo viejo asienta en brasa.
- **Sinapsis que trasmite ✅**: al recordar, los ENLACES del vecindario se encienden con la tinta más fresca y la impulso VIAJA por ellos (partículas dirigidas); pasada la palpitación, el cable vuelve a su calma.
- **La trama de Nizam ✅**: bajo cada rótulo de tema, sus recuerdos tejidos en nudos de puntos (3 por fila, máx. 12) — la cantidad es textura, no número.
- **Enlaces con voz nocturna ✅**: las alfas de noche suben (0,5/0,26/0,11) y las aguadas se diluyen menos sobre papel de tinta.
- **El cajón de terminales ✅**: sello de taller por agente (monograma; no instalado, a lápiz), estado de memoria con luz, rótulo TERMINALES y hebra de aurora en la cresta del cajón.
- **La escena enfoca ✅**: la pieza elegida SE LEVANTA del suelo (muelle y amortiguada) y su conducto se ilumina en luz del tema: la conexión con la mente se ve.
- **Identidad de motores en Ajustes ✅**: cada motor de la casa lleva SU bichito (la colmena determinista por id) — en Conectados, Tu suscripción y Catálogo. Los enchufes genéricos se han ido excepto en privacidad.
- **Las cifras de Uso en cursiva de casa ✅**: los KPI con la tipografía display de los números grandes del Taller.
- Puertas: 339 tests verdes · typecheck limpio · build 4 s. Capturas: mente-viva, taller-enfocada, cajon-nuevo, ajustes-bichos.
- **Cola abierta (para no dormirse nunca)**: Nueva tarea con vida al teclear (gemelos) · prismas mayores (área/línea + mermaid propio) · muelle de subagentes (Synara #198) · trazas en cascada (Charm #33) · paleta con estados de la casa · minar más del FYP y del GitHub del creador.

## Sin límites: la mente deja de frenar al agente (20 oct 2026)

- **Encargo del creador**: «elimina limitaciones de esto que estamos creando» y «cambiar todo esto ya que es malísimo». Regla aplicada: **un límite sólo se conserva si es decisión del creador, nunca un resto de una decisión anterior**. Tres tipos: de recurso (fuera), de seguridad (intactos: token, hosts, `Origin`, redacción, exclusión) y de política (intactos: no clonar apps ajenas).
- **La memoria ya no cierra la puerta ✅**: `recall` ya no devuelve vacío cuando nada parece mucho; devuelve lo mejor que hay y lo marca `[contexto débil: …]`. Antes el agente se quedaba parado sin saber por qué.
- **Los recuerdos ya no se olvidan solos ✅**: la recencia tenía vida media de 90 días (a los ~276 días un recuerdo pesaba 0,05 y desaparecía). Ahora son 3650 días y configurable (`recencia_dias`): lo viejo se atenúa, no se amputa.
- **Lo aprendido sobrevive al reinicio ✅**: antes el feedback sólo valía si recall y feedback-passaban en el mismo proceso — al cerrar la app se perdía la lección de cada IA. Ahora las consultas compuestas se guardan (`ultimas.json`) y el feedback sigue sirviendo al arrancar.
- **El contexto ya no se corta a media palabra ✅**: `pack()` recortaba a caracteres crudos (y la garantía dura quitaba de cuatro en cuatro). Ahora recorta al final de una palabra y marca con «…».
- **Sin topes arbitrarios ✅**: fuera el tope de 60 recuerdos (manda el presupuesto, y `budget=0` = sin límite); fuera el presupuesto fijo de 1500 tokens (el de la mente es configurable, 4000 por defecto); el HTTP `/recall` también lo toma.
- **La mente ve mucho más ✅**: la ingesta sólo leía `.md` y `.jsonl` — el código, la configuración y los datos del usuario eran invisibles. Ahora lee 26 formatos (con salto de lo que pase de 2 MiB) y una nota con un fragmento excluido ya no se tira entera: cae sólo el trozo culpable.
- **Los ids citados son los que entraron ✅**: antes los recuerdos truncados desaparecían sin que nadie lo supiera; ahora se cita lo que de verdad está en el contexto.
- **El tipo de un recuerdo ya no se pierde ✅**: `decision`, `preferencia` o lo que sea se guarda tal cual (antes todo se forzaba a `note`); y la misma idea con otros espacios ya no crea un recuerdo gemelo.
- **LA MEMORIA LLEGABA A OPENCODE POR LA FORMA QUE ESTÁ EN DESUSO ✅**: Esme escribía `mcp.esme` en `opencode.json`; el esquema de OpenCode marca esa forma plana como *deprecated* (`additionalProperties` con `"deprecated": true`) y la moderna es `mcp.servers.esme`. Ahora se escribe en `mcp.servers.esme` y, al conectar, se retira la plana que quedara de antes. Sin esto, un OpenCode abierto a mano no tenía tu memoria (las sesiones de la app sí, por ACP).
- **Más aire donde sobraba**: `k` de candidatos 40→120, `recall(k=60, hops=3)`, `/memories` 20→200, texto de voz 4000→20 000 caracteres, audio 3→15 minutos, historial SSE 200→2000, lente hasta 8192 tokens (recortado a la ventana que declara el modelo).
- **El aviso ya no se pierde por una palabra ✅**: `feedback` exigía la **misma cadena** de consulta que el `recall`; un espacio de diferencia y el aprendizaje se iba. Ahora los **ids son la verdad**: si la consulta no coincide, se busca entre las composiciones recientes la que traiga esos recuerdos.
- **La Tienda pasa de 30 a 55 skills ✅**: se incorporan las 25 de `addyosmani/agent-skills` (MIT, 108.668★, la mayor colección abierta que existe), cada una fijada a un commit con su huella de árbol y su licencia leída en su carpeta, por el mismo mecanismo de siempre. Se copia la carpeta entera, así que sus `references/` viajan con ella (el fallo #361 de `npx skills add` no aplica). Cero salidas: las 30 anteriores siguen ahí, nueve con el commit al día.
- **El examen: arreglado, medido y con dos reversos ✅**: el examen **oculto** da **la misma exactitud con un 23 % menos de contexto** (0,929 → 0,929 con 1497 → 1157 tokens; `bm25` y `rag_denso_eg` igual). Para llegar ahí hubo que:
  - **Arreglar el examen, que estaba midiendo cosas distintas**: la variante `daimon` usaba el `pesos.npz` que hubiera por ahí (el que guarda la app al aprender) y **no** el tálamo entrenado en esa corrida. Y `Home` cargaba `pesos.npz` antes que `thalamus.npy`, así que la app dejaba de usar el tálamo que el propio examen había entrenado. Arreglado en los dos sitios: el examen mide su corrida y la app usa el tálamo entrenado.
  - **Medir una variable cada vez** (5 corridas de validación cruzada con los mismos datos): el pool ancho de 120 candidatos **pierde** exactitud (0,831 frente a 0,851) porque entran más falsos positivos que ganan por azar; la recencia larga (3650 días) también la pierde (0,831), y se descubrió que el peso aprendido sobre la recencia es 0,02 — **la recencia nunca amputaba recuerdos**: era un problema inventado. **Revertido a 90 días.**
  - **El diseño que cumple las dos cosas**: **la cabeza elige, la cola rellena** (pool corto de 40 para elegir, pool ancho de 120 sólo para llenar el presupuesto sobrante) y el ajuste de los pesos se hace con la cabeza. El examen ahora construye el tálamo **con la misma configuración que la app**, que antes no era así.
  - **El corte adaptativo (`max_drop`) ahora sí entra**: antes se descartaba; con el recorte por palabras, 0,844 con 1220 tokens frente a 0,851 con 1498 — mismo acierto, 18 % menos contexto.
- **Puertas**: 154 pruebas Python verdes (antes 120) · 761 pruebas de la app verdes (120 ficheros) · typecheck limpio.
- **Investigación en X (mismo día)**: 17 búsquedas con el navegador del creador (el CLI de `agent-reach` no está instalado y el puente de `opencli` no está conectado; se fue a mano con CDP, sólo lectura). Salieron 52 señales con 8 palancas: el navegador como espacio de primera clase con Jev (7 s / 0,0039 $ por tarea), publicar `esme` en el Registro oficial de MCP, A2A y Agent Cards para el Taller, Mem0/Hindsight como banco de examen, skills por cuenco de trabajo, roles en YAML (OpenRig), voz local diminuta (SKI, tyger-s2s con ASR de 14 M) y el informe de equivalencia económica. Está en `docs/investigacion/2026-10-20-x-escala.md`.
- **La tesis de escala y el orden**: `docs/ideas/2026-10-20-escala-maxima.md` (doce palancas, tres movimientos, y la frontera legal de REA: ingeniería inversa sólo sobre lo propio, lo del usuario con permiso y el forense propio; nunca sobre apps de terceros para copiarlas).
- **Detalle de lo quitado**: `docs/resultados/2026-10-20-limites-eliminados.md`.
- **Cola abierta**: medir el examen con el contexto nuevo · que todo motor nuevo arranque con la sesión de la mente sin pedirla · el informe de equivalencia (lo que Esme sustituye por 0 €) · REA (`rea-agents` v6.7.0, MIT) registrado como MCP de Esme para que entienda su propio binario.

## El juez de las skills: la Tienda deja de vender sin veredicto (20 oct 2026)

- **El encargo**: la Tienda ofrecía 55 skills y ninguna tenía veredicto. La app comprobaba la huella contra el catálogo (que puede cambiar de mano entre la revisión y la descarga) y nada más. Ahora hay un juez que dicta y **firma**.
- **El juez vive en el kit** (`tienda/skills.ts`): dicta con hechos comprobables del catálogo, no con estrellas. Entra si hay commit fijado, huella del árbol y licencia que deja redistribuir (`MIT`, `Apache-2.0`, `BSD`, `ISC`, `Unlicense`); avisa si trae scripts, si pesa más de 1 MiB o si trae más de 40 ficheros; fuera si algo de lo anterior falta. Un id repetido no juzga dos veces.
- **El veredicto va firmado ✅**: Ed25519 sobre un cuerpo con las claves en orden fijo (spec abierta `estandar/skill-veredicto.spec.yaml` del kit). La firma **cubre la huella del árbol que se juzgó**, así que la app ya no se fía solo del catálogo: si la huella firmada no es la del catálogo, no instala («el catálogo cambió después del juicio»). Y si el juez no aprobó la skill, tampoco.
- **El veredicto va atado al catálogo que juzgó ✅**: declara `catalogoSha256` (la huella del catálogo en forma canónica: el formato del fichero no la altera). Si el catálogo de la app cambia, el veredicto deja de aplicar y las skills vuelven a «sin medir». **El juez pone el listón, nunca lo quita**: un veredicto viejo jamás bloquea a una app nueva.
- **Se busca, no se regala ✅**: red → copia local → el que viaja con la app (como el catálogo). Lo que la red trae sin firma válida **no se usa ni se guarda**. Y la Tienda lo dice: «juzgadas y firmadas por el juez (de la red)».
- **El repo de la tienda no existía ✅**: la app pedía por HTTPS un catálogo y un veredicto a `Shiuglen/esme-tienda` y ese repo daba 404 (el catálogo remoto de la tienda nunca estuvo vivo; la app caía en la «colección de casa»). Ahora el repo público existe y el veredicto ya está publicado y verificado por la app: **juez → firma → publicación → descarga → verificación → veredicto en pantalla**.
- **La app verifica y lo dice ✅**: `main/skills/veredicto.ts` comprueba hash, firma y quién firmó contra la clave fijada del juez (`main/skills/clave-juez.ts`). La Tienda muestra el sello: *juzgada ✓*, *juzgada ⚠*, *fuera ✗* o *sin medir*, con el motivo a un hover. Sin veredicto válido no se bloquea nada: el juez pone el listón, no lo quita.
- **Lo que NO se inventa ✅**: el juez **no estima** el ahorro de contexto de una skill (eso lo mide la vista previa, con el `SKILL.md` delante). Y no estima que una skill sirva para algo: eso todavía no se mide, y por eso la causa dice lo que dice — hechos, no promesas.
- **El juez juzga el fichero, no solo el catálogo ✅**: con `--medir` baja el `SKILL.md` de cada skill del commit fijado y lo lee. Si no se puede leer, la skill **no entra**; si ocupa más de 12.000 tokens, avisa. Como la medida va dentro del veredicto firmado, la Tienda enseña **cuánto contexto ocupa cada skill antes de descargarla** (~2.600 tokens de mediana entre las 55).
- **Un bug real que encontró el juez ✅**: `vercel/composition-patterns` (y cualquier otra skill con `description:` en varias líneas, que es YAML plegado) **no se podía leer** — ni el parser de la app ni el del kit lo entendían, así que la app enseñaba un error en vez del contenido. Ahora los dos lo leen (valor plegado en una línea; un mapa anidado no se cuela como valor). De 55 skills ilegibles: 1 → 0.
- **Puertas**: el kit con 155 tests verdes (+14 del juez y la medida) · la app con 664 verdes (+2 del parser y el veredicto) · build de la app en verde · typecheck limpio en los ficheros de este paso.
- **Cola abierta**: publicar el `catalogo.json` de la tienda (necesita la **llave de release**, que no está en este equipo: la dev key firma el veredicto, no el catálogo) · medir el **efecto** real de una skill (juez LLM con tareas reales, no con excusas) · la llave de release firmando en vez de la dev. · el juez de calidad del Taller (hace falta un modelo local: el Ollama de esta máquina está roto) y la traza abierta con OpenLLMetry · la consolidación de mem0 (extraer hechos con un LLM y decidir qué se queda: es lo que la memoria de Esme todavía no tiene) · Hindsight, cuando haya un servidor donde correrla · publicar de verdad la entrada de MCP (falta subir el cerebro a PyPI y el token del registro) · la caché de contexto, que es la siguiente palanca del gasto (0,4996 $ → 0,3239 $ con el 90 % de la entrada cacheada) · el navegador como espacio de primera clase · las skills propuestas por el sueño (la **detección** ya está: el sueño agrupa los encargos que repites y la app los enseña junto a las Recetas; falta que la propuesta sea una skill de verdad, con fichero y permiso) · la Agent Card del Taller (A2A) · **el espejo ya es de agente**: falta que la Forja pida a la mente lo que sabe del programa que va a recrear (el bucle absorber → recrear, explícito), un botón «Entender este programa» en la interfaz y una pregunta nueva en el banco del examen que mida esto con un número.

