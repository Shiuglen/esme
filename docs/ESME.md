# ESME: la fuente de verdad

> **Para cualquier agente o persona que trabaje en Esme: lee este fichero primero.**
> - **Qué recoge:** todas las decisiones del creador y el estado real de cada una.
> - **Cuándo se actualiza:** al terminar cada paso.
> - **Qué hacer con los detalles:** están en los enlaces. Si algo contradice a este fichero, gana este fichero, y el conflicto se anota aquí.
>
> **Última revisión:** 2026-10-12, tras releer las 58 rondas de preguntas y todos los mensajes del creador.

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
- **Pendiente**: lint (el proyecto no tiene configuración de ESLint 9); el Sueño (lecciones de las tareas del Taller → memoria); cobro con una tienda que haga de comerciante; GitHub (sin sesión iniciada en `gh`).

## 3c. La hoja de ruta «todo y más» (18-oct, decidida con el creador)
Por pasos, cada uno impecable antes del siguiente:
1. **Rediseño completo** al nivel de «Mando»: conversación → Taller → Memoria → Ajustes (escenas, cristal, movimiento con carácter, componentes de Kokonut UI y React Bits revisados a mano).
2. **El Sueño**: Esme proactiva — ordena la memoria, aprende de las tareas del Taller, prepara tu día y avisa de lo importante.
3. **Esme actúa en tu PC**: usa apps y webs por ti, con permiso explícito en cada acción delicada.
4. **Esme en todas partes**: móvil y web conectados a tu Esme, mente sincronizada y cifrada.
5. **Esme con tu equipo**: mentes compartidas, tareas entre personas y agentes, Tienda de pieles.
6. **Versiones para todos (al terminar, pedido del creador 18-oct)**: instaladores de escritorio para Windows, macOS y Linux con electron-builder (macOS sin firmar desde Linux; firmar y notarizar exige un Mac o CI con macOS), para que el equipo vea el avance. Para la versión móvil de iOS, el creador propone **xtool** (compila apps Swift/SwiftPM de iOS desde Linux).
Hecho ya el 17-18 oct: «Mando» (portada centro de mando con esfera viva), 23 escenas WebGL, voz manos libres 100 % local (Whisper + Piper) con subtítulos y conversación continua, panorama de la mente para responder con sustancia, licencias e invitaciones, copia privada en GitHub (Shiuglen/esme).
Límite que no cambia: nada de ingeniería inversa de productos ajenos para copiarlos (riesgo legal y Esme debe ser propia); las ideas sí se toman de donde sea.

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
| Consumo | ✅ | **12-oct, medido:** renderer de 2,4 GB creciendo 26 MB/s y 41 % de CPU en reposo → 139 MB estables y 0 % (la causa: una animación de una variable heredada en `<html>` que recalculaba todo el documento cada fotograma). Cerebro en reposo 407 → 228 MB (la Lente suelta el modelo tras 60 s; cargarlo cuesta 0,1 s) y pico al absorber 2,7 → 1,6 GB (lotes de 2048 tokens). Pendiente: medir con la app de producción (sin servidor de desarrollo) y comparar con otras apps. |
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
