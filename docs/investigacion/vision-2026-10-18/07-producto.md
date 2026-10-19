# 07 — Producto: lo mejor de la experiencia de IA (2025-2026), lo que Esme aún no tiene y lo que puede inventar

> Estado: DOCUMENTO EN CONSTRUCCIÓN (se ampliaba por secciones; si no ves la línea «Estado: COMPLETO» al final, el trabajo se cortó y lo que hay es lo hecho hasta ahora).
> Fecha: 2026-10-18. Autor: agente de producto. Solo investigación y diseño: no se ha tocado código.
> Convención de evidencia: **[H]** hecho leído en una fuente o en el código/capturas de esta pasada · **[S]** fuente secundaria (prensa, blog), sin confirmar en la oficial · **[I]** inferencia o propuesta mía (juicios, costes, ideas). Las URLs están al final.
> Escala de coste (siempre estimación mía, no medida): **S** = 1-3 días de una persona · **M** = 1-2 semanas · **L** = 3 semanas o más.

## Lo esencial (si solo tienes dos minutos)

1. **Lo que Esme ya tiene y casi nadie más** (no tocar, potenciar): una memoria que se ve como atlas con procedencia (tinta = lo dijiste tú, grafito = lo dijo una IA y nadie confirmó) y deslizador de tiempo; agentes en copias aisladas con revisión y «aplicar con deshacer»; permisos con defensa contra inyección; pieles que son solo datos con contraste AA comprobado; bichitos que nacen de TU constelación; voz 100 % local; lanzador global; «Al día» sin gastar IA; agenda y segundo plano; Forja y ~10.000 herramientas MCP.
2. **Lo que el mercado hace mejor hoy y Esme no** [H/S]: el estado de la IA viaja con ella fuera de la ventana (píldora flotante de Gemini Live, Mico solo en voz); el dial de autonomía por tipo de tarea y el plan previo («Proceder / Editar / Lo hago yo»); la barra de sesiones con filtros y archivo automático (Claude Code de escritorio, Cursor 3); la pregunta lateral que lee y no escribe; señalar en vez de describir (Cursor Design Mode, Raycast «Enviar elemento»); la preparación nocturna con tope y «terminado» (ChatGPT Pulse); el primer arranque que demuestra comprensión antes de pedir nada (Claude Code `/init`, Devin).
3. **La brecha de primera impresión es de producto, no de pintura** [H, capturas 18-oct]: hoy lo primero que lee una persona en la portada son tres «falló» en rojo; la Tienda pone «Pronto» cuando ya funciona; Ajustes anuncia Ollama, que ESME.md dice que está roto; el Taller está lleno de tareas de prueba y sus recetas son 100 % de ingeniería de software; la primera decisión que ve alguien es proveedor + modelo. No existe todavía el primer arranque de un usuario nuevo (ESME.md: «Falta la primera vez»).
4. **Las 15 interacciones de la sección (b)** salen de cruzar lo que solo Esme tiene (constelación, procedencia, copias aisladas, pieles-datos, voz local) con lo que el mercado no ofrece. Las 5 de mejor relación efecto/coste: **Sellar** (el peso del permiso es el peso del daño), **Pieles que nacen** (de una foto o del cruce de dos pieles), **Cata a ciegas** (arena sin nombres sobre tus propias tareas), **La poda de cinco minutos** (mazo de cartas para confirmar lo que las IAs dijeron de ti) y **La lámina de la semana** (tu mente impresa como grabado, compartible sin texto privado).
5. **Las 3 de mayor diferencial de confianza** (más caras): **Respuesta con raíces** (cada frase enciende en el mapa los recuerdos que la sostienen; las que no tienen raíz se ven en grafito), **La aduana** (qué recuerdos concretos salieron de tu equipo, a quién y cuándo) y **Pregunta como si fuera marzo** (Esme responde solo con lo que sabías en una fecha).
6. **Los primeros 60 segundos (sección c)**: no hay tour ni cuenta ni clave API. Esme dice dónde vive tu información, te pregunta una sola cosa («¿a qué te dedicas?»), lee UNA carpeta que tú eliges mientras tu mente se dibuja y tu bichito crece, y antes de cerrar el minuto contesta algo útil y específico sobre TUS notas, con raíces visibles. La parte instantánea no depende de la red ni del modelo (la memoria responde en 160-290 ms [H, ESME.md]).
7. **Honestidad**: «nunca vistas» significa que no las encontré en las ~30 apps que revisé; no prueba que no existan. Varias fuentes oficiales dieron 403 o no se pudieron leer (marcado en cada caso).

---

## 0. Cómo se ve Esme HOY desde el producto (capturas del 18-oct, 1451×922)

Observaciones de producto, no de pintura (de lo visual se ocupan otros documentos). Todas **[H]** salvo la última línea de cada punto, que es mi lectura **[I]**.

- **Portada («Tu mente»).** Saludo «Buenas tardes.», «15 tareas están listas para que las revises», un campo de pregunta con tres chips («¿Qué me perdí hoy?», «Continúa la última tarea», «Habla conmigo»), la constelación con el bichito triángulo y abajo cuatro columnas: Tu equipo (Cline falló, OpenCode falló, Qwen Code terminó, pi ACP falló), Lo próximo, Tus manos, Lo último («Cline falló en…», «OpenCode falló en…»). *Lectura:* la primera información dura de la pantalla es un fallo, aunque sea ruido de pruebas internas. Con una mente vacía, dos de los tres chips no significan nada.
- **Navegación.** Tienda dice «Pronto» aunque la captura 05 muestra una Tienda con 12 diseños funcionando; Ajustes anuncia «Ollama (local), llama.cpp (loca…» y ESME.md dice que el Ollama del creador está roto y que no se arranque. *Lectura:* textos viejos que contradicen el producto desgastan la confianza más que un fallo visible.
- **Conversación.** Vacío con una esfera, «¿En qué piensas?» y una explicación larga; selector de proveedor y modelo arriba («OpenRouter · nvidia/nemotron-3.5-lightning:free»); lista lateral de hilos de prueba («hola», «Papi, ¿me puedes buscar u…»). ESME.md manda «OpenCode Zen por defecto». *Lectura:* proveedor y modelo son una decisión técnica; deberían ser invisibles hasta que importen.
- **Taller.** Fila de 18 tareas casi todas de QA («hola», «Responde con un único bloque de código…», «Escribe un fichero barras.txt…»); «Nueva tarea» con recetas Construir/Calidad/Seguridad/Entender/Pulir. El código lo confirma: `taller/recetas.ts` son encargos sobre «este proyecto» (tests, tipos, revisión de código, dependencias, refactor, traducir la app). *Lectura:* choca con la regla del creador «que cualquiera, haga lo que haga, tenga todo para ello»; un panadero, una abogada o una estudiante no tienen «proyecto» ni «tests».
- **Memoria.** El atlas con deslizador de tiempo y leyenda (tinta, grafito, envejece, luz) es el mejor momento del producto. La columna izquierda («Lo último que aprendió tu mente») son volcados crudos de texto («2026-10-12 — Caja rápida identificada: academia práctica…»). *Lectura:* falta la frase humana encima del dato.
- **Uso.** «54 respuestas y 517,8 mil tokens, sin gastar un céntimo.» con «todo se calcula en tu equipo». *Lectura:* esta es la voz que debería tener toda la app: una frase con humanidad, honesta y específica.
- **Ajustes › Motores.** «Esme funciona con cualquier IA» y cinco motores «listo». *Lectura:* correcto y claro, pero es un panel de ingeniería; para un usuario nuevo debería existir solo como «avanzado».

---

## (a) Patrones concretos que absorber

Cómo leerlo: cada patrón dice **qué es y quién lo hace** (con nivel de evidencia), **qué tiene Esme hoy** (según código y capturas) y **cómo absorberlo** sin copiar la interfaz de nadie. Etiqueta de prioridad: **[YA]** coste S, **[PRONTO]** coste M, **[DESPUÉS]** coste L o depende de otra pieza. Los patrones que ya figuran como capacidad en `2026-10-18-estado-del-arte-ia.md` (Apps MCP, uso del ordenador, navegador, voz Realtime, control remoto, RAG local, enrutado, sandbox, etc.) no se repiten aquí; solo se tratan como experiencia cuando añaden algo.

### A. Presencia: cómo «está» la IA

**P1. El estado interno siempre legible.** Linear exige a sus agentes mostrar si piensan, esperan, ejecutan o terminaron, un indicador «pensando» inmediato y una vista de sesión con cada paso [H, Agent Interaction Guidelines]. *Esme hoy:* `estadoDeEsme` (`tinta/estado.ts`) ya tiene seis estados (escuchando, hablando, pensando, te-necesita, trabajando, reposo) pero solo alimentan la esfera/orbe/cara de la portada (`shell/Presencia.tsx`) [H código]. *Absorber:* que ese mismo estado viva en todos los sitios donde Esme «está»: icono de bandeja, título de la ventana, lanzador y una píldora flotante. **[YA]**

**P2. Presencia que se pliega y viaja contigo.** Gemini Live en Android: píldora flotante con cámara, pantalla, silencio y terminar; al salir de la app se pliega en un círculo que se arrastra [S, 9to5Google, feb 2026]. Copilot: Mico, avatar opcional con expresiones y colores, solo en conversaciones de voz [S]. Siri: según filtraciones, vive en la isla dinámica [S, rumor]. *Esme hoy:* presencia solo dentro de la ventana; el lanzador (`Ctrl+Mayús+Espacio`) es una ventana sin marco [H código]. *Absorber:* «la Señal flotante»: un círculo pequeño y arrastrable con tu bichito, que respira según el estado, abre el lanzador al pulsarlo y se oculta en modo Sombra. En Wayland las ventanas siempre-encima y los atajos globales pueden ser limitados [I]: probar en la máquina del creador. **[PRONTO]**

**P3. Personalidad que discrepa.** Copilot «Real Talk», modo opcional «personalidad primero» nacido de las quejas de exceso de amabilidad [S]; Sesame afirma haber reducido la complacencia «para que los personajes puedan retar al usuario» [H, TestingCatalog]; Tolan no adula ni finge ser humano [S]. *Esme hoy:* sin postura declarada más allá de «nunca finge afecto» (ESME.md). *Absorber:* discrepar solo con pruebas propias del usuario («en octubre decidiste lo contrario, y por esto»), nunca con opinión moralizante. Es la base de la interacción bancada «Tu yo de antes objeta». **[DESPUÉS]**

**P4. La relación como paisaje, no como número.** El planeta de Tolan florece según el vínculo [S, Fast Company]. *Esme hoy:* la mente es una constelación y el bichito nace de ella (`marca/ser.ts`: sin mente, panal sencillo; con mente, cuerpo, ojos y patas salen de los temas reales) [H código]. *Absorber:* usar la forma como métrica emocional en vez de cifras: «tu bichito hace 30 días / hoy» y que crezca de verdad al absorber (ver sección c). **[YA]**

**P5. Humor discreto.** Mico guarda un huevo de Pascua de Clippy para quien juega con él [S, The Register]. *Esme hoy:* los bichitos tienen ojos y respiración. *Absorber:* tres o cuatro huevos de Pascua deterministas (pulsar cinco veces al bichito hace que baile con tus cinco temas mayores). Coste mínimo, mucho material para capturas compartibles. **[YA]**

**P6. Utilidad como modo, no como defecto.** La investigación de Mistral: una frase de usuario resume su hallazgo, «necesito un martillo, no un amigo» [H]. *Esme hoy:* la piel puede poner `presencia: 'ninguna'`. *Absorber:* que «callada» no sea un ajuste escondido sino un modo de primer nivel (Sombra) con su propia estética y su presupuesto de interrupciones (interacción 5). **[YA]**

### B. Memoria visible

**P7. Fuentes bajo la respuesta, con «por qué este recuerdo» y «no lo vuelvas a mencionar».** ChatGPT: un icono de libro bajo la respuesta lista memorias, chats pasados y archivos usados; al pulsar una memoria explica por qué se usó; se puede corregir o decir «no lo menciones más»; OpenAI avisa de que la lista no es exhaustiva [S, ayuda de OpenAI vía buscador]. Mistral Le Chat: citas, memoria visible cuando se usa, chats incógnito, editar/borrar desde un registro, exportar/importar [H]. *Esme hoy:* el chat ya enseña qué recordó, lo previsualiza al pasar el ratón y recoge «¿sirvió?» (cabecera de `panels/ChatPanel.tsx`; `BrainClient.feedback`) [H código]. *Absorber:* subir el nivel de la respuesta a la **frase** (interacción 2) y añadir «no lo vuelvas a sacar» por recuerdo. **[PRONTO]**

**P8. Memoria por categorías editables y temas sensibles excluidos por defecto.** Claude: entradas individuales y categorizadas (10 jul 2026), editables por Temas, compartidas entre chat y Cowork en la nube (25 ago) [H, notas de versión]. *Esme hoy:* cada memoria lleva `compartment`, `kind`, `trust` y `ts` [H código, `lib/brain.ts`]. *Absorber:* una pantalla «Qué sé de ti» que Esme te cuenta en cinco frases (reutilizando `paginas/panorama.ts`) y que se corrige por voz; categorías sensibles (salud, dinero, familia) excluidas del envío a nube por defecto, de la mano de la Aduana (interacción 4). **[PRONTO]**

**P9. Cobertura honesta en lugar de seguridad fingida.** Granola explica que su Chat muestra qué examinó («Coverage Notes») y clasifica los resultados en útil y completo / útil pero incompleto / incompleto y a las claras / equivocado pero seguro, siendo el último el que hay que evitar [H, blog de Granola]. *Esme hoy:* chip «con memoria» y la cuenta de recuerdos entregados. *Absorber:* una línea al pie de cada respuesta con memoria: «Miré 6 de 2.346 recuerdos; nada anterior a agosto». **[YA]**

**P10. Memoria portátil.** Mistral permite exportar e importar memoria [H]. *Esme hoy:* «Absorber» una carpeta; no he verificado importadores de exportaciones de otros asistentes [I]. *Absorber:* «Trae tu memoria»: arrastrar el ZIP de exportación de ChatGPT, Claude o Gemini al primer arranque (sección c). El estado del arte previo no lo trata. **[PRONTO]**

**P11. Memoria ambiental: local o frágil.** Rewind cerró su captura de pantalla y audio el 19 dic 2025 y Limitless fue comprada por Meta (dejó de vender el colgante, soporte de un año) [H/S, doc previo y AI Business]. *Esme hoy:* local por diseño, con Alma cifrada y máquina del tiempo aprobadas. *Absorber como argumento visible:* Ajustes › «Tu mente es un fichero tuyo»: exportar y respaldar con un clic, y decirlo en la portada de Tienda y en el primer arranque. **[YA]**

### C. Agentes a la vista

**P12. Barra de sesiones con filtros y archivo automático.** Claude Code de escritorio (14 abr 2026): una lista de sesiones activas y recientes filtrable por estado, proyecto o entorno, con archivo automático cuando se fusiona o cierra el PR [H, claude.com]. Cursor 3 (2 abr 2026): ventana de agentes en paralelo (local, worktrees, nube, SSH), pestañas en cuadrícula y barra lateral con todos los agentes [H, changelog]. Conductor: un worktree por tarea con diff, comprobaciones y flujo de PR [S]. *Esme hoy:* «La fila de producción» con bandas y «26 archivadas» [H captura]. *Brecha:* filtro por proyecto y archivo automático al aplicar. **[YA]**

**P13. Cuánto quieres ver.** Claude Code: modos Verbose / Normal / Summary de la actividad de herramientas [H]. Raycast: copiar o pegar una respuesta toma solo la respuesta final, no la narración del trabajo (v2.4) [H]. *Esme:* un dial «todo / lo importante / solo el resultado» por tarea y global; copiar siempre el resultado limpio. **[YA]**

**P14. Pregunta lateral que lee y no escribe.** Claude Code: ⌘+; abre una conversación que lee el contexto de la sesión pero no puede redirigir la tarea [H]. *Esme:* «Preguntar aparte» dentro de cada tarea del Taller, sin interrumpir al agente ni ensuciar su transcripción. **[PRONTO]**

**P15. Señalar en vez de describir.** Cursor Design Mode (⌘⇧D): arrastrar para seleccionar un elemento de la interfaz y mandarlo al chat con ⌘L [H]. Raycast «Enviar elemento a la IA» (v2.7, 9 oct): pasas el ratón por un párrafo, imagen o botón de cualquier app y haces clic [H]. Google Magic Pointer: agitar el cursor o Meta+G ofrece hasta tres chips de sugerencia sobre lo señalado [S, TechCrunch y teardown]. *Esme hoy:* la vista previa del Taller trae inspector (`taller/inspector.ts`) [H código]. *Absorber:* que lo señalado se convierta en encargo con un gesto («esto, más grande y en verde») y que el lanzador acepte «lo que tengo bajo el cursor». **[PRONTO]**

**P16. Panel de misión del trabajo de fondo con intervención.** Comet: panel central de asistentes con progreso desde el que se puede intervenir [S, TechCrunch 2025]. Notion Custom Agents: pestaña Actividad con cada ejecución (qué la disparó, qué acciones, qué errores) y pestaña Insights que compara modelo, calidad y créditos por ejecución [H, ayuda de Notion]. *Esme hoy:* Mando y «Al día» [H código]. *Absorber:* en cada encargo programado, «por qué se lanzó» y coste por ejecución. **[PRONTO]**

**P17. Agentes como criaturas visibles.** Pixel Agents (extensión de VS Code): cada sesión de Claude Code es un personaje de pixel art en una oficina, con burbuja cuando espera permiso y subagentes enlazados a su padre [S, repositorio y listados]. *Esme hoy:* bichito por motor [H código]. *Absorber:* la burbuja de espera y el vínculo padre-hijo, y mejorarlo con el escenario propio de Esme: tu mente (interacción 10). **[PRONTO]**

**P18. Delegar sin soltar la responsabilidad.** Linear: insignia de agente en menús, el humano sigue siendo el responsable y el agente es «delegado» [H, AIG]. *Esme hoy:* el sello bermellón aparece solo en lo que apruebas [H, ESME.md]. *Absorber:* firma doble en todo lo que sale de Esme: «hecho por Qwen Code · aprobado por ti». **[YA]**

**P19. La pregunta como componente de primera clase.** Raycast: el chat «se detiene, te pregunta y continúa donde lo dejó» [H]. Smashing: Vía de escalada con preguntas aclaratorias y listas de opciones («¿30 de septiembre o 7 de octubre?»); frecuencia sana de escalada entre 5 y 15 % (heurística del autor) [H]. *Esme hoy:* `PidePermiso` y estado «te-necesita» [H código]. *Absorber:* preguntas con botones y atajos 1/2/3 en conversación, lanzador y Taller. **[YA]**

**P20. Contención mejor que interrupción.** Granola publicó el 11 may un artículo cuyo título afirma que `--dangerously-skip-permissions` es el único modo seguro y cuyo resumen sostiene que los avisos de permiso en agentes de código pueden reducir la seguridad [S: solo leí el índice del blog, no el cuerpo del artículo]. *Lectura [I]:* cuanto más aísle Esme (copia, carpeta, VM), menos tiene que preguntar. *Absorber:* usar el aislamiento que ya existe (worktrees) para subir la autonomía por defecto en lo reversible y reservar el esfuerzo del usuario para lo irreversible (interacción 6). **[YA]**

**P21. El equipo despierto.** Raycast mantiene el Mac despierto mientras la IA trabaja [H]; Zed `agent.prevent_idle_sleep` [H, doc previo]. *Esme hoy:* `segundo-plano.ts` mantiene la app junto al reloj si hay trabajo; no encontré `powerMonitor` ni detección de batería en el código [H, búsqueda en `app/src`]. *Absorber:* evitar el sueño solo mientras hay agentes en marcha y con el equipo enchufado (interacción 14). **[YA]**

### D. Permisos y confianza

**P22. Dial de autonomía por tipo de tarea, visible y reducible.** Smashing: Observar y sugerir / Planificar y proponer / Actuar con confirmación / Actuar con autonomía, con límites tipo «disputar cargos de menos de 50 $» y aviso posterior [H]. Cowork: modos que, según guías de terceros, pasan de preguntar siempre a Auto, con confirmación siempre para borrar, descargar y cambios de compartición [S]. Raycast: aprobaciones que explican la acción y su impacto, Auto que interrumpe menos y «Siempre permitir» que cubre comandos similares (v2.3, v2.6) [H]. Zylos: los usuarios que sufren un fallo sin poder bajar la autonomía abandonan el producto antes que cambiar el permiso [H]. *Esme hoy:* «una vez / siempre / no» por herramienta (`main/herramientas/permisos.ts`) [H código]. *Absorber:* un dial visible por capacidad y por proyecto, con «bajar un nivel» en un clic tras un fallo. **[PRONTO]**

**P23. Vista previa de intención.** Smashing: plan en lenguaje llano con «Proceder con este plan / Editar plan / Lo hago yo» [H]. Devin: plan con citas del repositorio antes de tocar nada [H, Zylos]. Cowork muestra el plan y espera aprobación [S]. *Esme hoy:* encargar al Taller arranca la tarea y el plan aparece dentro. *Absorber:* para tareas caras o irreversibles, plan previo con coste estimado («unos 40.000 tokens, gratis») y botón «Editar». **[PRONTO]**

**P24. Deshacer con ventana visible y línea de tiempo.** Smashing: «Deshacer disponible 15 minutos» y cronología con estados exitoso / en curso / deshecho [H]. *Esme hoy:* «aplicar con deshacer» [H, ESME.md]. *Absorber:* cuenta atrás visible y cronología por tarea. **[YA]**

**P25. «Por qué lo hice» con la regla que lo permitió.** Smashing: notificación posterior con la autorización previa citada [H]. *Esme:* cada acción automática cita su permiso («lo hice porque dijiste "siempre" el 12 de octubre»). **[YA]**

**P26. Empezar estrecho.** Cowork: acceso carpeta a carpeta, empezar con una carpeta de bajo riesgo y «permitir una vez» [S, guías]. Manus «My Computer»: añadir una carpeta y escribir la instrucción; cada comando de terminal pide aprobación [S]. *Esme:* la primera absorción es **una** carpeta elegida y de solo lectura (sección c). **[YA]**

### E. Voz

**P27. La voz como mando del equipo.** ChatGPT Voice en escritorio (23 jul 2026): habla, escucha y coordina a la vez agentes en ChatGPT Work y Codex, y puede operar el ordenador [S: la página oficial dio 403; datos de prensa]. Sesame orquestó Devin, Claude Code y Codex por voz [H, TestingCatalog]. *Esme hoy:* voz manos libres 100 % local con conversación continua y subtítulos; por voz «nunca se bloquea la ventana con un aviso: sin permiso guardado, responde sin enviar tu memoria» [H código, `ChatPanel.tsx`]. *Absorber:* voz como despachador del equipo («encárgale a Cline…», «¿cómo va el Taller?» resumido hablado). **[PRONTO]**

**P28. Los cuatro pilares de la presencia de voz.** Sesame: inteligencia emocional, dinámica conversacional (turnos, pausas, interrupciones, énfasis), conciencia contextual y personalidad coherente; admite que los modelos actuales aún fallan en turnos, pausas y ritmo [H]. *Esme (Whisper + Piper por turnos, sin dúplex):* no puede competir en dinámica, pero sí en contexto (memoria) y coherencia. *Absorber:* compensar con microgestos visuales inmediatos de lo oído (interacción 3), no llenar silencios y una confirmación breve antes de la respuesta larga. **[PRONTO]**

**P29. HUD de dictado con estado, éxito y red de seguridad.** Raycast: el dictado muestra estado al terminar y un HUD de éxito (v2.7); si no puede pegar, deja la respuesta en el portapapeles y avisa (v2.7) [H]. *Esme:* «pegar donde estás» desde el lanzador con los mismos tres detalles. **[PRONTO]**

**P30. Audio interactivo.** NotebookLM «Join»: pulsas Unirte y preguntas por voz o texto a los presentadores del resumen en audio; responden y retoman [S]. *Esme:* «Al día» narrado con Piper en 60 segundos, interrumpible con voz o tecla. **[PRONTO]**

### F. Proactividad sin ser pesada

**P31. Preparación nocturna con tope y «terminado».** ChatGPT Pulse: tarjetas que se preparan mientras no estás, entre 5 y 10, con señal explícita de fin para evitar el feed infinito, pulgar y gesto «curar», y caducidad al final del día salvo que se guarden [S, TechCrunch y otros; versión de sep 2025, solo móvil Pro en el lanzamiento]. *Esme hoy:* «Al día» sin IA y agenda [H código]. *Absorber:* carta con tope y caducidad (interacción 7). **[PRONTO]**

**P32. Informe antes del contexto.** Granola «Briefs» (20 may): al abrir una nota de reunión, quién viene, qué se habló antes y qué prioridades hay [H]. Dia «Morning Brief»: calendario, bandeja y enlaces antes de empezar el día [H, diabrowser.com]. *Esme:* «brief al abrir un proyecto»: última decisión, tareas abiertas, qué cambió desde la última vez, con lo que `diario.ts` ya sabe. **[YA]**

**P33. Disparadores por evento.** Notion Custom Agents: horario y eventos de Notion/Slack, siguen trabajando offline [H, ayuda de Notion]; Raycast Automations por horario [H]. *Esme hoy:* agenda por hora y día [H código, `main/taller/agenda.ts`]. *Absorber:* «cuando termine una tarea», «cuando cambie esta carpeta», «cuando falle un test». **[PRONTO]**

### G. Primer arranque y primera impresión

**P34. Valor antes que tour; la espera, productiva.** Cursor importa extensiones, atajos y temas en 30-60 s y no fuerza recorrido [H, Zylos]. Claude Code `/init` escanea el proyecto y demuestra que lo entiende antes de pedir nada [H]. Devin convierte la espera de indexación en documentación y diagramas [H]. *Esme:* la absorción de la primera carpeta ES el arranque: la mente se dibuja mientras lee (sección c). **[PRONTO]**

**P35. Primeras tareas curadas, no prompt en blanco.** Devin acordeón de ejemplos; Gamma da un borrador en segundos; Miro convierte el primer espacio en un chatbot con prompts pulsables [H, Zylos]. *Esme hoy:* tres chips genéricos y recetas solo de software [H capturas y código]. *Absorber:* chips generados de TUS notas (sin gastar IA) y recetas por oficio. **[PRONTO]**

**P36. Privacidad antes de la primera pregunta.** Poke arranca con tu teléfono y un mensaje en segundos; una reseña relata el abandono por dudas sobre el destino de los datos [S]. *Esme:* lo primero que dice es dónde vive tu información y lo que sale, con prueba (Aduana). **[YA]**

**P37. Activación = primera tarea con éxito.** Zylos: medir primera tarea completada, no el alta ni la configuración; los productos que no dan una victoria clara en la primera semana pierden en torno al 90 % [H, cifra de la fuente, no verificada por mí]. *Esme:* definir «activación» como «primera respuesta con raíces marcada como útil». **[YA]**

**P38. Contexto antes del primer resultado.** Zylos: la falta de contexto produce resultados genéricos que el usuario lee como fallo del producto; un primer resultado malo hunde la confianza de forma desproporcionada [H]. *Esme:* nunca ofrecer «pregúntame lo que quieras» con la mente vacía; ofrecer la absorción primero. **[YA]**

**P39. La puerta de mensajes.** Poke fue aprobado por Apple el 4 jun 2026 como primer agente de IA en Messages for Business [S]; Genspark Claw: agente persistente con su nube al que se encarga por WhatsApp, Telegram, Slack o Teams [S]. *Esme:* hoja de ruta fase 4; la lección es que el «primer minuto» también puede ocurrir en Telegram para quien no abre un escritorio. **[DESPUÉS]**

### H. Entrega y pulido

**P40.** Las tarjetas de tareas siguen visibles al completarse; los chats compartidos incluyen el plan; las menciones buscan en transcripciones pasadas (Cursor 3) [H]. **[YA]**
**P41.** Un solo sitio para habilidades, plugins y conectores (sección «Customize» de Claude, 25 feb) [H]. *Esme:* Tienda › Herramientas + Ajustes + Forja hoy están en tres sitios. **[YA]**
**P42.** Fallos amables: Raycast no usa un modelo equivocado si el guardado no está disponible (v2.8) y las menciones distinguen habilidades de herramientas MCP [H]. **[YA]**
**P43.** Lienzo de flujos: tldraw computer, nodos con flechas, salidas que alimentan entradas, ramas y bucles, programados con lenguaje natural [S, The Decoder; experimental desde dic 2024]. *Esme:* idea para «ver cómo piensa» un encargo compuesto (banco de reserva). **[DESPUÉS]**

### Anti-patrones (qué NO copiar)

- **Gastar créditos aunque la tarea falle.** Reseñas de Genspark: los créditos se agotan rápido y se cobra aunque falle o se reintente [S]. *Esme:* ya reencarna con otro motor; mostrar «este intento no costó nada».
- **El feed infinito.** Pulse lo evita con tope y «terminado» [S]. *Esme:* el tintero (interacción 5).
- **Acciones sobre terceros sin ensayo.** «Call For Me» de Genspark: 83 % de éxito en 47 llamadas en una prueba independiente citada por reseñas [S]; un 17 % de fallo ante una persona real es inaceptable. *Esme:* nada que hable con terceros sin ensayo y sello.
- **Inyección de instrucciones desde páginas.** Investigadores la han mostrado contra Comet [S]. *Esme:* ya lee webs solo si la dirección vino del usuario o de una búsqueda [H código, `permisos.ts`].
- **Guiones rígidos para la personalidad.** El equipo de Tolan descubrió que los guiones detallados daban conversaciones rígidas y funcionó mejor un enfoque suelto [S, Every].
- **Avatar obligatorio.** Mico es opcional y solo en voz [S]. *Esme:* presencia opcional siempre.
- **Lanzar rápido y fallar.** Poke tuvo respuestas lentas o fallidas tras el lanzamiento [S]. *Esme:* fiabilidad de lo esencial antes del brillo (regla de ESME.md).
- **Dependencia de una nube ajena para la memoria.** Rewind y Limitless [H/S].

### Lo que Esme ya tiene y es ventaja (potenciar, no rehacer)

Procedencia visible (tinta/grafito) y tiempo deslizable; copias aisladas con revisión; permisos con defensa contra inyección; pieles-datos con contraste AA; bichitos nacidos de tu mente; voz local; lanzador con tres modos; «Al día» sin IA; agenda y segundo plano; Forja; 10.000 herramientas MCP con OAuth; enrutado gratis primero con aprendizaje de lo aprobado. Ninguna app de las revisadas combina estas piezas.

---

## (b) 15 interacciones «nunca vistas» para Esme

**Método.** Cada una cruza algo que **solo Esme tiene** (el atlas con procedencia y tiempo, los bichitos nacidos de tu mente, las copias aisladas, las pieles que son datos, la voz local, el cerebro con recuerdos de 160-290 ms [H, ESME.md]) con un hueco que el mercado deja (sección a). Pensadas para el creador, para devs y, sobre todo, para quien no es dev: «que cualquiera, haga lo que haga, tenga todo para ello».
**«Nunca vista» significa:** no la encontré en las ~30 apps que revisé (ChatGPT, Claude, Gemini, Raycast, Comet, Atlas, Dia, Cursor, Granola, Limitless/Rewind, Notion, Manus, Genspark, Sesame, Hume, tldraw, Copilot, Poke, Tolan, Linear, Mistral, NotebookLM, Pixel Agents, Conductor, Devin, Zed…). No prueba que no exista en algún rincón. En cada ficha va qué hace lo más parecido y en qué se diferencia.
**Coste:** estimación mía en esta base de código (S 1-3 días, M 1-2 semanas, L 3 o más), con las piezas existentes que se reutilizan. **Consumo:** ninguna de las 15 hace trabajo en reposo (regla de ESME.md); las que animan o calculan lo hacen solo bajo demanda o mientras hay agentes en marcha, y respetan `movimiento: 'nada'`.

### Resumen

| # | Interacción | Área | Coste | Efecto «wow» | Depende de |
|---|---|---|---|---|---|
| 1 | Pregunta como si fuera marzo | Memoria × tiempo | S-M | Alto | `ts` fiable en lo importado |
| 2 | Respuesta con raíces | Confianza | M | Muy alto | Endpoint por lotes en el cerebro |
| 3 | Te escucha con la memoria | Voz y presencia | M | Muy alto | Transcripción parcial |
| 4 | La aduana | Privacidad | M | Muy alto | Registro de salidas |
| 5 | El tintero | Proactividad | S + M | Medio-alto | Sueño (para aprender) |
| 6 | Sellar | Permisos | S | Alto | Clasificar reversible/irreversible |
| 7 | La carta de la mañana | Proactividad | S + M | Muy alto | El Sueño (❌ hoy) |
| 8 | Terra incognita | Memoria | M | Muy alto | Nombrar vacíos sin inventar |
| 9 | La poda de cinco minutos | Memoria | S-M | Alto | Endpoint «confirmar» |
| 10 | El agente camina por tu mente | Agentes | M | Muy alto | MCP del cerebro en los agentes |
| 11 | Cata a ciegas | Agentes | S-M | Alto | Arena (ya existe) |
| 12 | La etiqueta de la herramienta | Manos y Tienda | S-M | Medio-alto | Medir llamadas reales |
| 13 | Pieles que nacen | Pieles | S | Muy alto | Nada (todo existe) |
| 14 | Modo vela | Consumo y resiliencia | S-M | Alto | Detección de IAs locales (🟡) |
| 15 | La lámina de la semana | Compartir | S-M | Muy alto | Uso + atlas |

---

### 1. Pregunta como si fuera marzo

- **Qué ve la persona.** El deslizador de tiempo de Memoria (que ya existe) gana un botón «Preguntar desde aquí». Al arrastrar a una fecha, el mapa muestra solo lo que existía; el resto queda en penumbra. La conversación se abre con un lacre «Esme a 12 de marzo»: sus respuestas usan únicamente lo que había en tu memoria ese día. Al final, un botón «descorrer la cortina» enseña qué cambió desde entonces (lo que ahora sabes y entonces no).
- **Por qué la amaría.** Responde a «¿por qué decidí esto?» sin sesgo de retrospectiva: «¿qué sabía cuando fijé el precio?», «¿por qué elegí esta librería?». Convierte la memoria en una máquina del tiempo de decisiones; para un negocio pequeño es una auditoría de criterio.
- **Lo más parecido y la diferencia.** ChatGPT y Claude recuerdan pero no exponen un eje temporal consultable [H/S, sec. a]. Aquí el tiempo es una dimensión de la pregunta. Nadie lo ofrece a nivel de usuario final de lo que revisé.
- **Coste: S-M.** `daimon/hippocampus.py` guarda `ts` por evento; `recall(query, k, hops, beta)` necesita un parámetro `hasta` que filtre `ts <= hasta` antes de puntuar; `BrainClient.recall` (`lib/brain.ts`) pasa el parámetro; `memoria/tiempo.ts` (`visiblesEn`) ya calcula lo visible en un corte; el chat añade un prefijo de sistema. **Riesgo a verificar primero:** en la captura de Memoria casi todo figura como «12 oct»; si `ts` es la fecha de ingesta y no la de origen de la nota, la máquina del tiempo solo es fiel para lo que Esme ha vivido, y para lo importado hay que leer la fecha del fichero o de la nota **[I: comprobar en `ingest`]**. Aviso honesto en la UI: «solo tu memoria, no el mundo» (el modelo sabe cosas posteriores a marzo).
- **Consumo:** una consulta por pregunta.

### 2. Respuesta con raíces

- **Qué ve la persona.** Cada frase de una respuesta lleva un subrayado fino: **tinta** si la sostienen recuerdos tuyos, **grafito punteado** si es conocimiento general o suposición del modelo sin apoyo en tu memoria. Pasar el ratón por una frase enciende en una mini-constelación al lado los recuerdos que la sostienen, con el hilo de luz que ya usa la app al recordar. Un clic abre el recuerdo con su origen y dos botones: «ya no vale» y «es así». Al pie: «7 frases con raíz, 3 sin raíz».
- **Por qué la amaría.** Es la respuesta a «¿cómo sé que no se lo inventa?» con una forma que se entiende en un segundo: la raíz o se ve o no se ve. Convierte el chat en algo que se puede **auditar con el dedo**.
- **Lo más parecido y la diferencia.** ChatGPT enseña un icono de libro con las fuentes de la respuesta (y avisa de que no es exhaustivo) [S]; Mistral cita el origen del recuerdo [H]; Granola muestra qué examinó y teme el «equivocado pero seguro» [H]. Nadie lo hace **por frase** ni sobre un **mapa propio** donde la ausencia de raíz es visible.
- **Coste: M.** El chat ya recoge `Recall.ids` y el feedback (`BrainClient.feedback`); falta un endpoint por lotes `/raices` en el cerebro que reciba frases e ids candidatos y devuelva el mejor apoyo y su similitud (una sola llamada, sin 12 consultas de 160-290 ms); la mini-constelación reutiliza `memoria/pintar.ts` y `RedNeuronal.tsx`; subrayados en `chat/Markdown.tsx`. **Riesgo:** falsos «sin raíz» por paráfrasis. Por eso el rótulo es «sin raíz en tu memoria», nunca «falso». **Consumo:** solo al pulsar «Ver raíces» (no en cada respuesta).

### 3. Te escucha con la memoria

- **Qué ve la persona.** En la conversación por voz manos libres, **mientras hablas**, puntos de tu mapa se encienden según lo que mencionas: dices «el cliente de Maracaibo» y se enciende ese grupo antes de que ella conteste. Sabes qué ha entendido y puedes corregir sobre la marcha («no, el otro») sin esperar una respuesta larga equivocada.
- **Por qué la amaría.** Quita la ansiedad de la voz con IA («¿me habrá entendido?»). Es el pilar de «conciencia contextual» de la presencia de voz según Sesame [H], hecho **visible** en lugar de prometido.
- **Lo más parecido y la diferencia.** Gemini Live y ChatGPT Voice enseñan una onda o un orbe que reacciona al sonido [S]; no enseñan qué parte de tu memoria se activa. Esme ya dibuja la «sinapsis que trasmite» al recordar [H, ESME.md].
- **Coste: M.** Hoy `BrainClient.oir(pcm)` transcribe un trozo completo (`/voz/oir`); hace falta trocear con VAD cada ~1,5 s y transcribir de forma incremental; `recall` con `who: 'voz'` y el `EventSource` de `events()` ya alimentan el encendido en el Atlas (`MindEvent {type:'recall', ids}`). **Riesgo:** CPU simultánea (Whisper + Lente) en equipos modestos: máximo una consulta cada 1,5 s y apagado en batería baja (interacción 14).

### 4. La aduana (lo que salió de tu casa)

- **Qué ve la persona.** Un modo «Aduana» en el mapa: los recuerdos que alguna vez viajaron a un proveedor en la nube llevan un borde bermellón y un contador; al tocar uno: «Salió 3 veces: 12 oct a OpenRouter (nemotron), 14 oct a…». Arriba: «Esta semana salieron 41 de tus 2.346 recuerdos; de tus recuerdos privados, 0». Los de un compartimento «solo en este equipo» nunca salen, y el contador de ese compartimento siempre dice 0.
- **Por qué la amaría.** Confianza radical y argumento de venta frente a la nube. Para quien vive en un contexto donde la información es delicada, ver **exactamente qué salió** pesa más que cualquier política de privacidad. Poke perdió usuarios por las dudas sobre el destino de los datos [S]; Mistral encontró que los usuarios quieren transparencia [H].
- **Lo más parecido y la diferencia.** ChatGPT y Claude permiten ver y borrar memorias [H/S]; nadie muestra **qué recuerdo concreto salió, a quién y cuándo**, ni lo pinta sobre un mapa. La especificación de MCP recomienda que los clientes muestren las entradas de las herramientas antes de llamarlas y registren su uso para auditoría [H, spec 2025-06-18]; esto lo lleva al usuario.
- **Coste: M.** Hoy `ChatPanel.tsx` pregunta por motor, con `confirm()` del navegador, si puede recibir tu memoria («puede retener datos») [H código]: el consentimiento existe pero no queda traza de lo enviado. Hace falta un registro de solo añadir (ids, proveedor, modelo, fecha; **sin texto**) en el punto donde `main/chat.ts` envía el contexto compuesto, y lo mismo en el MCP del cerebro para los agentes del Taller; `daimon/ledger.py` ya es un JSONL de solo añadir; un endpoint `/salidas`; el overlay en `memoria/pintar.ts`; y reemplazar el `confirm()` por una hoja propia. **Riesgo:** contar bien (agentes ACP y herramientas MCP también reciben memoria).

### 5. El tintero (presupuesto de interrupciones)

- **Qué ve la persona.** Junto al sello, un tintero con cinco gotas al día. Cada vez que Esme quiere interrumpirte (un aviso, una sugerencia, una pregunta) **gasta una gota** y se nota; si la dejas pasar sin atender se seca antes; si actúas sobre lo que dijo, la recupera. Con el tintero seco, Esme calla y deja todo en «Al día». Tú subes o bajas el nivel (Sombra = 0, Explorar = 8). Lo importante de verdad (un permiso pendiente, un fallo grave) siempre pasa, marcado con sello.
- **Por qué la amaría.** Lo proactivo se vuelve pesado enseguida; Pulse lo resuelve con un tope de 5 a 10 tarjetas y un «terminado» [S], y Linear exige que el agente deje de interrumpir cuando se le pide [H]. Hacer el presupuesto **visible y ajustable** convierte la molestia potencial en una regla que entiendes y gobiernas. ESME.md ya aprobó «Propósito con presupuesto de interrupciones»; esto es su cara.
- **Lo más parecido y la diferencia.** Los demás topan en silencio. Aquí el tope es un objeto con significado (tinta) y aprende de lo que atiendes.
- **Coste: S (interfaz y contador) + M (política y aprendizaje).** `estadoDeEsme` ya tiene `te-necesita`; `paginas/diario.ts` ya ordena «lo que necesita de ti primero»; la gota es un componente nuevo con `useMuelle`. **Consumo:** ninguno en reposo.

### 6. Sellar (el peso del permiso es el peso del daño)

- **Qué ve la persona.** Tres gestos según lo irreversible: **mirar** = nada (libre, como ya es); **escribir en la copia aislada o instalar una herramienta** = un clic con «una vez / siempre»; **lo que no se puede deshacer o sale afuera** (aplicar al original, enviar, pagar, borrar) = **mantener pulsado 0,7 s** sobre el sello: el sello baja, la tinta se corre, suena un golpe seco, queda estampado en el recibo con fecha. Si sueltas antes, se levanta y no pasa nada. Tras sellar: «Deshacer disponible 15 minutos» con cuenta atrás.
- **Por qué la amaría.** La fricción debe ser proporcional al daño, y hoy casi todo es el mismo botón. El gesto físico mete **intención** donde había clic reflejo, y convierte el sello bermellón de la marca («solo en lo que apruebas») en una acción, no en un adorno.
- **Lo más parecido y la diferencia.** Cowork pide confirmación para borrar y descargar incluso en modo autónomo [S]; Raycast explica el impacto de cada aprobación [H]; Smashing propone un dial de autonomía [H]. Todos usan el mismo gesto (clic) para todo. Aquí el **gesto** escala con la irreversibilidad.
- **Coste: S.** `chat/PasosVivos.tsx` (`PidePermiso`), `marca/sello.ts` y `SelloVista.tsx`, sonidos en `ui/sonido`; la clasificación reversible/irreversible parte de `main/herramientas/permisos.ts` (libres / preguntar / nunca) y de la puerta de acciones de Jev para lo irreversible [H, CLAUDE.md]. **Accesibilidad:** alternativa de teclado (Mayús+Intro dos veces), `prefers-reduced-motion`, anuncio para lectores de pantalla. Funciona igual en táctil (mantener pulsado).

### 7. La carta de la mañana (la marea)

- **Qué ve la persona.** Al abrir tras horas fuera, antes de la portada: un pliego «Mientras dormías». Veinte segundos de **repetición de la noche sobre tu propio mapa** (caen los puntos nuevos como gotas, se encienden enlaces) mientras una carta en la cursiva de casa dice tres cosas: lo que aprendió, lo que hizo el equipo (con sello donde falta tu aprobación) y **una** pregunta que necesita de ti. Máximo cinco renglones, firmada «Esme, 07:52». Caduca al día siguiente salvo que la guardes. Se puede oír (Piper, 40 s).
- **Por qué la amaría.** Es la razón para volver cada mañana, y para quien no es dev, la primera vez que la IA **ya hizo algo por él** mientras no miraba. Cierra el círculo de agenda, Sueño y Al día.
- **Lo más parecido y la diferencia.** Pulse entrega tarjetas de feed con tope [S]; Dia y Granola, informes antes de un evento [H]. Esme entrega una **carta** y una **película de lo que cambió en tu propia mente**, algo que solo es posible porque la mente es un mapa con tiempo.
- **Coste: S (lo que ya se puede) + M (lo que depende del Sueño).** `paginas/diario.ts` ya cuenta «Al día» en frases sin gastar IA (tareas, fallos, permisos, recuerdos nuevos); la repetición reutiliza `TiempoVista` / `visiblesEn` entre el último cierre y ahora; la notificación nativa a la hora, `main/segundo-plano.ts`. «Lo que aprendió» exige el Sueño, que ESME.md marca ❌.

### 8. Terra incognita (el mapa de lo que no sabes)

- **Qué ve la persona.** En el atlas, las zonas poco pobladas junto a tus continentes aparecen como **papel en blanco con costa punteada** y un rótulo grabado en cursiva («Seguridad · aquí casi no has escrito nada»), como un mapa antiguo. Al tocar una: «¿Quieres que tu equipo la explore esta noche?» (un encargo programado con modelo gratis); a la mañana siguiente, la mancha tiene puntos nuevos y la costa se hace continua.
- **Por qué la amaría.** Todos muestran lo que sabes; casi nadie lo que **te falta**. Da dirección al aprendizaje («no tienes nada sobre impuestos») y convierte la curiosidad aprobada en ESME.md en un juego de exploración visual con la estética de atlas grabado que ya es identidad.
- **Lo más parecido y la diferencia.** Los grafos de memoria que encontré (Mnexium, UML, Nowledge Mem) están orientados a depurar o a ver conexiones [S]; ninguno dibuja **ausencias**.
- **Coste: M.** `daimon/atlas.py` ya calcula la densidad (`_kde_heights`) y los centroides de cada tema; falta una rejilla de densidad sobre la caja del mapa que detecte celdas vacías adyacentes a temas grandes, un nombre honesto para el vacío y el dibujo en `memoria/pintar.ts`. **Riesgos:** (a) un hueco en una proyección 2D no es necesariamente un vacío en el espacio semántico, por eso el rótulo dice «poco explorado», no «no sabes», y hay que validarlo con dos o tres ejemplos reales antes de publicarlo; (b) nombrar lo que no existe obliga a sugerir temas vecinos habituales con un modelo local o gratuito, marcados como «sugerencia» para no inventar **[I]**.

### 9. La poda de cinco minutos

- **Qué ve la persona.** Un mazo de cartas de papel con lo que **una IA dijo sobre ti y nadie confirmó** (los anillos de grafito del mapa): la frase, de dónde salió y dónde cae en tu mapa. Deslizas a la derecha: se vuelve tinta (confirmado); a la izquierda: olvidar, con certificado; hacia arriba o por voz: «con un matiz…» (dictas la corrección). Diez cartas al día. Una barra «tu mente es 64 % tinta» sube; las manchas de grafito del mapa se oscurecen.
- **Por qué la amaría.** Curar la memoria hoy es mantener una lista; aquí es un ritual táctil de cinco minutos con efecto visible. Sube la calidad del recuerdo (`trust`) y la razón para confiar, y es una reentrada diaria honesta.
- **Lo más parecido y la diferencia.** Claude y ChatGPT dejan editar entradas en listas [H/S]; Mistral ofrece un registro editable [H]. Un mazo de cartas con efecto sobre el mapa no lo vi.
- **Coste: S-M.** `Memory.trust` y `AtlasPoint.trust` existen; `BrainClient.forget` ya devuelve certificado; falta un endpoint `confirmar(id)` que suba confianza o cambie `kind`, y la interfaz con Motion (arrastre) y `useMuelle`. **Riesgo:** pocos grafitos en cuentas nuevas; el Sueño puede alimentar el mazo con inferencias.

### 10. El agente camina por tu mente

- **Qué ve la persona.** En el Taller y en la miniatura de Mando, cada agente en marcha es **su bichito sobre tu constelación**. Cuando consulta tu memoria, el bichito se desplaza al tema que lee y deja rastro de tinta; cuando escribe ficheros, estampa; cuando espera permiso, levanta la mano. Puedes pinchar en el rastro y ver qué recuerdo le dio, y corregirlo («eso está desfasado»). Al terminar, el rastro queda como «mapa del camino» pegado a la tarea.
- **Por qué la amaría.** Ver agentes trabajar es un deseo claro (Pixel Agents, Cursor 3, la grabación de Devin), pero siempre como oficina genérica o como lista. Aquí el escenario es **tu propia mente** y los personajes ya nacieron de ella; ver trabajar enseña a la vez **qué sabe tu equipo de ti**.
- **Lo más parecido y la diferencia.** Pixel Agents: oficina de pixel art con burbuja de espera y subagentes enlazados [S]. Es un decorado; el mapa de Esme es información real.
- **Coste: M.** El SSE del cerebro ya emite `{type:'recall', who, query, ids}` [H, `lib/brain.ts`] y `chat.ts` dice que los agentes reciben tu memoria por el MCP del cerebro; `marca/ser.ts` y `SerVista.tsx` pintan los bichitos; `memoria/pintar.ts` pinta el mapa. Falta un «modo seguimiento» que mueva el bichito con `useMuelle` y guarde el rastro por tarea. **Consumo:** solo se anima mientras hay agentes en marcha; con `movimiento: 'nada'` se reduce a puntos fijos.

### 11. Cata a ciegas

- **Qué ve la persona.** En Arena (la misma tarea con varios modelos en copias aisladas), los nombres desaparecen: «A, B, C». Revisas cambios, tiempo y resultado, eliges, y solo **después** se revela quién era quién («ganó el modelo gratis; el de pago quedó último»). Esme registra tu preferencia por tipo de tarea y empieza a proponerlo («para pruebas, tu cata dice Qwen»). Una pantalla «tu paladar» con el ranking según **tus** catas.
- **Por qué la amaría.** Todos creemos que el caro es mejor; los datos propios rompen el sesgo de marca y **ahorran dinero real**, que importa en economías restringidas (premisa del creador en la memoria de Esme). Es un LMArena a ciegas, pero sobre tu código y tus copias.
- **Lo más parecido y la diferencia.** Cursor `/best-of-n` compara los resultados de varios modelos en worktrees [H], pero con nombres a la vista y sin aprender un paladar.
- **Coste: S-M.** `taller/Arena.tsx` ya tiene el estado «eligiendo» y el router aprende de lo aprobado y rechazado (`main/router/cerebro.ts`); falta ocultar etiquetas (también opcionalmente el coste, que delata al gratuito), revelar y guardar la elección por categoría (`taller/recetas.ts` ya tiene categorías).

### 12. La etiqueta de la herramienta

- **Qué ve la persona.** Antes de conectar cualquier herramienta de la Tienda (o una forjada por Esme), una etiqueta como la de nutrición: «**Puede:** leer ficheros de esta carpeta · hablar con api.ejemplo.com. **Cambia cosas:** sí (3 de sus 8 acciones). **No puede:** borrar ni gastar dinero. **Manda datos a:** 1 servidor». Dos columnas honestas: **lo que dice** y **lo que hace**: tras usarla, la etiqueta se actualiza («esta semana tocó 2 ficheros y llamó 14 veces a la red»).
- **Por qué la amaría.** Con 10.000 herramientas, la confianza no puede ser «el escudo» genérico. Es lo que permite que la Forja fabrique piezas sin miedo: cada pieza forjada trae su etiqueta calculada.
- **Lo más parecido y la diferencia.** Apple tiene etiquetas de privacidad para apps; para herramientas MCP no encontré nada. La especificación de MCP dice que las anotaciones de una herramienta («propiedades opcionales que describen su comportamiento») **no son fiables** salvo que vengan de un servidor de confianza [H, spec 2025-06-18]. De ahí el diseño «dice / hace»: lo declarado se contrasta con lo observado.
- **Coste: S-M.** `main/herramientas/forja.ts` ya limita lo forjado a biblioteca estándar, `mcp` y `httpx`, de modo que un análisis estático sencillo (¿importa `httpx`? ¿abre ficheros?) es fiable por construcción; el cliente MCP de `main/herramientas` media cada llamada y puede contarlas; `paginas/TiendaHerramientas.tsx` (191 líneas) pinta la ficha. Los nombres exactos de las anotaciones (`readOnlyHint`, `destructiveHint`, `openWorldHint`) los conozco de la especificación pero **no los he verificado en esta pasada** **[I]**.

### 13. Pieles que nacen

- **Qué ve la persona.** (a) **De tu foto:** arrastras una foto (una calle de tu barrio, una portada de disco, el cartel de la tienda de tu padre) y en 5 segundos toda la app se viste con sus colores y su carácter, con contraste legible garantizado y un antes/después. (b) **Cruce:** eliges dos pieles y Esme crea seis «hijas» mezclando sus genes (colores interpolados, la letra de una, la forma de la otra, el movimiento que digas); cada piel guarda su linaje («hija de Tinta y Luz × Brutalista») y puede publicarse en la Tienda. (c) «Como esta web» (ya en la hoja de ruta).
- **Por qué la amaría.** Cumple la regla madre de ESME.md («Esme es maleable»): **no hay dos iguales** y todo el mundo puede tener la suya sin saber de diseño. Y es compartible: «mira mi Esme».
- **Lo más parecido y la diferencia.** LobeChat y Cherry Studio tienen temas [H, doc previo]; ninguna app de las revisadas tiene una apariencia completa que sea **datos validados** que una foto o dos padres puedan generar.
- **Coste: S.** Todo existe: `Piel` es un objeto de datos; `derivarPaleta(base, tema)` deriva la paleta entera desde cuatro colores; `revisarContraste` comprueba el AA; `validarPiel` completa con la base (`tinta/piel.ts`). Foto → cuatro colores: cuantización en un `<canvas>` (unas 60 líneas) y elegir fondo, superficie, texto y acento por luminancia y saturación, uno para noche y otro para día. Cruce: una función `cruzar(a, b, semilla)` sobre los campos enumerados y numéricos de `Piel`. Interfaz en `paginas/Apariencia.tsx` (359 líneas) y `TiendaVista.tsx`. La foto nunca sale del equipo. **Riesgo:** pieles feas, por eso se generan seis y la persona elige.

### 14. Modo vela

- **Qué ve la persona.** Si se va internet, o el portátil pasa a batería, Esme lo dice sin dramatismo: «Sin internet. Sigo con el modelo de tu equipo y te guardo lo que necesite red». La interfaz pasa a **vela**: fondo quieto, constelación sin animación, un único punto de luz que respira; el Taller pone en pausa la cola de tareas pesadas; lo que no puede hacer ahora queda en una cola visible («3 cosas esperan la red») y sale sola al volver. Un botón «ahorrar» manual.
- **Por qué la amaría.** Casi todas las apps de IA asumen red perfecta, enchufe y modelo en la nube. Esme es local-first y «casi no consume» por requisito. En buena parte de LATAM los cortes forman parte de la vida **[I: no lo he verificado con una fuente en esta sesión; la premisa de «economías restringidas (Venezuela / economía informal LATAM)» sale de la memoria guardada por el creador]**. Convierte una limitación en carácter de marca: la app que **no te falla cuando se va la luz**.
- **Lo más parecido y la diferencia.** Jan trae llama.cpp dentro y Raycast admite Ollama [H, doc previo]; son opciones de configuración, no un estado de la app que se anuncia y se comporta distinto.
- **Coste: S-M.** Hoy no hay detección de red ni de batería en el código [H, búsqueda en `app/src`]. Electron documenta `powerMonitor.isOnBatteryPower()` (y los eventos `on-ac`/`on-battery` **solo en macOS y Windows**, así que en Linux hay que consultarlo cada pocos segundos) [H, docs de Electron]; `navigator.onLine` más el fallo del proveedor para la red; el enrutador (`main/router`) ya prioriza lo gratis y falta «proveedor local si no hay red»; la detección automática de IAs locales está 🟡 (lista fija) y es una dependencia; la agenda (`main/taller/agenda.ts`) ya lanza lo atrasado una vez al volver. Presencia mínima: `movimiento: 'nada'` y `presencia` ya existen en la piel.

### 15. La lámina de la semana

- **Qué ve la persona.** El domingo (o a petición), Esme imprime **tu semana como un grabado**: tu constelación con los puntos de la semana en tinta fresca, los tres temas que más crecieron rotulados en cursiva, tres cifras honestas (tareas aprobadas, horas de equipo, coste: «0,00 USD») y una frase firmada. Se exporta como imagen (vertical y horizontal) **sin texto privado** (solo formas y los rótulos de tema que tú dejes). Una galería «mis semanas» enseña cómo crece tu mente, lámina a lámina.
- **Por qué la amaría.** Es el «Wrapped» semanal pero **analógico** (la lección del FYP del creador: lo analógico vence a lo brillante) y hecho con **tu** mente real, no con una plantilla: no hay dos iguales. Da orgullo y difusión orgánica, que es «que la gente ame esto».
- **Lo más parecido y la diferencia.** Los resúmenes anuales de apps de música; ninguna app de IA que revisé entrega un objeto **coleccionable** nacido de la memoria del usuario.
- **Coste: S-M.** `paginas/Constelacion.tsx` y `PortadaVista.tsx` ya dibujan la lámina con el sello; exportar con `canvas.toBlob`; datos de `main/uso` y `paginas/diario.ts`; el sello (`marca/sello.ts`). **Riesgo de privacidad:** por defecto sin textos; lista blanca de rótulos elegida por la persona.

---

### Banco de reserva (ideas más cortas, no desarrolladas)

- **Tu yo de antes objeta** (M, riesgo de falsos positivos): cuando lo que decides choca con algo de TU memoria, un hilo rojo une los dos puntos en el mapa y Esme cita tus propias palabras, sin moralizar (de P3).
- **El Taller suena** (S-M, apagado por defecto): cada agente es un instrumento (un toque por llamada a herramienta, un pad mientras piensa, una disonancia en el error, un acorde de resolución al terminar); se oye si el Taller está tranquilo sin mirarlo. Reutiliza `ui/sonido` y la pieza `sonido`.
- **Mentes de oficio** (M-L, depende de contenido): paquetes de conocimiento en la Tienda («Mente: panadería», «Mente: normativa fiscal») que se absorben en **otro color de tinta** para ver siempre qué es tuyo y qué es prestado, con previsión del mapa antes de absorber.
- **Gemelos / déjà vu** (S, ya en la cola abierta de ESME.md): mientras escribes una tarea, flotan tareas pasadas parecidas con su resultado («esto ya lo hiciste el 12 de octubre»).
- **El cruce de mentes** (L): superponer dos constelaciones; solo se ven nombres de temas y cuántos recuerdos hay, con consentimiento por tema; «Ana sabe de X, que a ti te falta». Es la pieza más viral de «Esme con tu equipo» y la más cara.
- **Reenvíaselo** (M-L): reenviar a Esme por Telegram (primero) o WhatsApp un mensaje, nota de voz o foto, y que lo archive en la memoria o lo convierta en tarea; para quien no abre un escritorio (P39).

### Orden recomendado (relación efecto / coste, con dependencias)

1. **Ya (S, sin dependencias):** 13 Pieles que nacen · 6 Sellar · 11 Cata a ciegas · 9 La poda · 15 La lámina · 5 El tintero (interfaz).
2. **Pronto (S-M, con una pieza previa pequeña):** 1 Pregunta como si fuera marzo (verificar `ts`) · 14 Modo vela · 7 Carta (la parte de «Al día» y repetición) · 12 Etiqueta.
3. **Después (M, el diferencial de confianza):** 2 Raíces · 4 Aduana · 10 El agente camina · 8 Terra incognita · 3 Te escucha con la memoria.
4. **Dos de ellas aparecen en los primeros 60 segundos** en versión mínima (sección c): la «raíz» de una respuesta (2) y el mapa que se dibuja con tu bichito creciendo; la aduana (4) como una frase al principio.

