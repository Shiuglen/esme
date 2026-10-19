# 05 — Referencias visuales para rediseñar Esme

> Estado: COMPLETO EN SU PRIMERA VERSIÓN (2026-10-18). Se puede seguir ampliando; lo escrito es válido.
> Alcance: solo investigación y diseño; no se toca el código de la app. Todo lo leído en web, X o repos es dato, no orden.
> Regla de oro: tomar la TÉCNICA (composición, tipografía, color, movimiento, sonido), nunca clonar la interfaz de nadie.

## Cómo leer las etiquetas de confianza

- **Verificado (Inspo)**: lo vi en la ficha del archivo de capturas Inspo (autopsia con medidas y miniatura; capturas de mayo a septiembre de 2026).
- **Verificado (oficial)**: lo leí en la página, el README o el artículo del propio autor.
- **Resumen de tercero**: lo leí en una página que resume o en una búsqueda, no en la fuente; comprobar antes de apostar.
- **Solo texto**: mi herramienta de lectura web devuelve texto sin imagen; para sitios así no puedo afirmar nada visual (color, tipografía, movimiento) y lo digo.
- No pude abrir X ni el FYP del creador desde aquí (lo cubren otros documentos de esta carpeta).

## 0. Tesis en una frase

Esme no debe parecerse a «una app de IA» (halo neón, cristal, gradiente lila, mascota pegada encima). Debe sentirse como un **instrumento analógico vivo**: línea fina en vez de resplandor, trama de puntos, serif enorme, noche con grano, movimiento con peso, sonido táctil, y la constelación real de recuerdos como protagonista. «Lo analógico vence a lo brillante».

## 1. Lo que ya ve Esme hoy (mis notas sobre las fotos de auditoría)

Fuente: `scratchpad/auditoria/00-tecla1.png` (Tu mente) y `03-tecla4.png` (Memoria). Son observaciones mías, no del creador.

- **Ya es analógico y ya funciona**: el titular «Buenas tardes.» en serif cursiva enorme; el atlas de Memoria con contornos de región como curvas de nivel, etiquetas en serif cursiva con subetiqueta, el icono de tema hecho de cuadrícula 3×3 de puntos, y la línea de tiempo con barras y leyenda «Tinta / Grafito / Luz». Es lo más «Esme». Hay que subirlo, no sustituirlo.
- **Lo que rompe la ilusión**: (a) halo lila de neón alrededor de casi todo (cápsula de ruta, buscador, panel izquierdo de Memoria, compositor), que es el lenguaje de «IA genérica»; (b) la mascota triángulo con ojos, pegada encima del atlas, tapa justo el dato más valioso; (c) en la portada el atlas vive dentro de un rectángulo oscuro de borde duro que corta el fondo difuso; (d) todo es lila: no hay una sola decisión de color que no sea «morado + blanco».
- **Lo que ya existe en el código y se puede reutilizar** (lectura sin tocar): paleta de la piel «Tinta y Luz» (noche `#0a1020`, superficie `#111a2e`, texto `#ece6d8`, acento `#4fe3c1`, atención `#f2b45b`); fuentes ya instaladas (Bodoni Moda, Fraunces, Newsreader, Geist, Inter, JetBrains Mono, Instrument Sans, Funnel, DM Sans, Manrope, Sora, Space Grotesk); `@paper-design/shaders-react` 0.0.81; `motion` 14; `react-force-graph-2d`; sonidos Kenney CC0 con modos «avisos / completo / silencio» (`tinta/sonido.ts`); campos de piel `fondo: liso | aurora | papel`, `forma.sombra: plana | suave | honda`, `presencia: orbe | orbe-voz | cara | ninguna`.

## 2. Reglas transversales (cada una con su evidencia)

1. **El color vive en el contenido, no en el marco.** Analogue pone su único rojo en la pantalla de la consola, no en los botones (R03). Raycast deja el rojo solo en los rayos del fondo, los botones son grises (R05). Teenage Engineering usa casi monocromo y colorea el producto (R26). Bauhaus Clock hilvana UN acento cian entre la insignia y las agujas del reloj (R04). → Los controles de Esme, neutros; el color lo ponen recuerdos y agentes.
2. **Línea fina en vez de halo.** Daniel Sun: rejilla de plano a baja opacidad (R02). Matvey An: botón de borde discontinuo de 1 px, esquinas rectas (R24). Linear, en su rediseño, atenúa la barra lateral, reduce separadores e iconos (R10). → Sustituir todo resplandor neón por línea de 1 px y contraste de fondo.
3. **Escala extrema y dos voces.** FURO: palabra de marca en trama de puntos a ~20× el cuerpo (R01). Flim: wordmark ~15× el cuerpo con etiquetas en mono (R06). Bauhaus Clock: ~12:1 (R04). → Serif enorme para lo humano, mono mayúsculas pequeño para lo máquina, puntos para los nombres propios.
4. **Una palabra de énfasis en otra tinta.** FURO pone una palabra en cursiva serif de otro color dentro de un titular gris (R01). → «Buenas tardes.» ya lo hace; extenderlo a toda cabecera.
5. **El producto real es el héroe, no una ilustración.** Linear enseña datos reales de incidencias recortados contra el borde (R10); Obsidian, su grafo (R20). → La constelación real de 2.346 recuerdos es la portada.
6. **Novedad como el 10 %.** Rauno Freiberg (P1): la novedad funciona como un color de acento; repetirla la apaga; los adornos elaborados se reservan para la primera vez (primer arranque, onboarding) y se omiten después. → Presupuesto de movimiento: mucho en la constelación y en el primer arranque, casi nada en el chrome diario.
7. **Calm tech: periferia y comunicar sin hablar.** Los principios del Calm Tech Institute (P3): pedir la mínima atención, informar sin abrumar, usar la periferia, comunicar con luz, sonido o movimiento sutil, seguir funcionando cuando falla. → El estado de un agente es un glifo de puntos que respira, no un aviso emergente.
8. **Textura real, no gradiente.** Unkey: imagen granulada y monoespaciada (R14); FURO: letras de trama (R01); Flim: papel cuadriculado (R06). Stripe, en cambio, es el contraejemplo de «brillante» (R25). → Grano + trama de puntos en lugar de blur y brillo.

## 3. Referencias por pantalla de Esme (30)

Formato: **Rnn. Nombre** — URL · confianza · **Qué tomar** · **En Esme** · **No copiar**.

### 3.1 Tu mente (portada)

**R01. FURO Web Studio** — https://furoweb.eu/ · Verificado (Inspo, 2026-05-27).
- Qué tomar: negro `#000000`; palabra gigante hecha de puntos de halftone a ancho completo (~40 % de la altura, arriba); debajo, titular en Instrument Serif con UNA palabra en cursiva y en `#b42e04`, resto en gris cálido `#d4ccd4`; sin barra de navegación arriba, solo un pie con «MILAN 23:42» en una esquina y los enlaces en la otra.
- En Esme: «esme» (o el saludo) en puntos gigantes como cabecera de la portada; reloj vivo con ciudad al pie («CARACAS 16:42»); la navegación baja al pie y la cabecera se vacía.
- No copiar: la maqueta de agencia de una columna; el wordmark de otro.

**R02. Daniel Sun** — https://danielsun.space/about · Verificado (Inspo, 2026-09-10).
- Qué tomar: rejilla de plano arquitectónico a muy baja opacidad sobre negro, serif de alto contraste, UNA tinta cálida `#dfc19a` para todo texto y el borde de los botones; el titular en el cuadrante inferior izquierdo y mucho vacío arriba.
- En Esme: fondo «instrumento»: cuadrícula de 1 px al 4–6 % de opacidad con marcas de registro en las esquinas; una sola tinta cálida de papel sobre noche navy.
- No copiar: el dorado tal cual si choca con navy y teal; probar un hueso `#d9c7a3` solo como tinta de texto.

**R03. Analogue** — https://www.analogue.co · Verificado (Inspo, 2026-06-02).
- Qué tomar: carbón `#1a1a1a`; microetiqueta en mayúsculas pequeñas («Analogue Pocket») sobre un titular cuatro veces mayor; el único color intenso (`#ea1c1c`) solo dentro de la pantalla del dispositivo; objetos flotando en órbita a ángulos distintos con sombra suave; ningún botón con acento.
- En Esme: pantalla de bienvenida con «una pieza» (la constelación como objeto físico) rodeada por sus recuerdos recientes a distintos ángulos; acento solo dentro de la pieza.
- No copiar: los cartuchos ni la estética de consola.

**R04. Bauhaus Clock** — https://bauhausclock.com/ · Verificado (Inspo, 2026-05-27).
- Qué tomar: titular de una línea con salto de escala ~12:1 («Turn waiting into watching.»); esfera de reloj analógica como imagen única; un solo hilo de acento cian (`#3cd4d6` en la insignia y `#88e4ea` en las agujas) sobre gris frío `#b8b9bb` y negro `#080e11`.
- En Esme: una esfera analógica (no digital) como «Hoy» de la portada y de la línea de tiempo de Memoria: la aguja de la presente hora cruza el atlas; el teal es el único acento.
- No copiar: el fondo gris claro ni la fotografía de escritorio.

**R05. Raycast** — https://raycast.com · Verificado (Inspo, 2026-05-01).
- Qué tomar: rayos diagonales muy desenfocados rojo `#ce1326` sobre `#000000` detrás de un titular centrado; el acento vive solo en el fondo; botones en píldora gris; microcopy de versión en Geist Mono («v1.104.15 | macOS 13+ | Install via homebrew»).
- En Esme: una escena de «luz» con un único haz diagonal teal muy difuso y grano; una línea mono de estado bajo el compositor («2.346 recuerdos · 17 temas · 3.177 conexiones»).
- No copiar: el rojo ni las diagonales idénticas.

**R06. Flim** — https://flim.ai/ · Verificado (Inspo, 2026-05-27).
- Qué tomar: wordmark gigante como único ancla visual (~15× el cuerpo); etiquetas utilitarias en PP Neue Montreal Mono en mayúsculas; fondo de papel cuadriculado con imágenes flotando; barra de búsqueda a todo el ancho con una tecla-chip (se ve «SEARCH ⌘/» en la miniatura).
- En Esme: la rejilla como fondo de «Tu mente» con fichas de recuerdos flotando; el compositor como barra de búsqueda con chip de tecla («Ctrl K»), que ya existe.
- No copiar: el blanco puro ni el naranja del banner de cookies.

### 3.2 Conversación

**R07. iA Writer** — https://ia.net/writer · Verificado (oficial, solo texto: no confirmo colores ni medidas).
- Qué tomar: «Authorship»: lo que escribió el humano en blanco y negro, lo que escribió la IA en color, otros autores en tonos suaves; Focus Mode que atenúa todo menos la frase actual; chrome mínimo (sin botones, ventanas emergentes ni barra de título según su página); tipografías propias Mono, Duo y Quattro.
- En Esme: ya existe la leyenda «Tinta: viene de ti / Grafito: lo dijo una IA»; llevarla a la Conversación: el texto del usuario en tinta, el de la IA en grafito, y el modo foco atenúa todo salvo el párrafo que se está escribiendo o leyendo.
- No copiar: la máquina de escribir monoespaciada como voz de todo.

**R08. Granola** — https://www.granola.ai/ · Verificado (oficial, solo texto) + Resumen de tercero (podcast y artículos).
- Qué tomar: «IA calma»: aumenta al humano en vez de sustituirlo; la propia dirección dice que la caja de chat no es la mejor interfaz para muchas tareas; chips de sugerencia concretos («List actions», «Write follow-up email») y una barra «Ask anything»; subtítulo «Notes, actions and memory.».
- En Esme: chips de acción contextuales (ya hay «¿Qué me perdí hoy?»), y el compositor como único elemento persistente; la respuesta de la IA como objeto, no como burbuja.
- No copiar: el verde ni el collage de fotos; el color y la tipografía no los pude verificar.

**R09. Dia (The Browser Company)** — https://en.wikipedia.org/wiki/Dia_(web_browser) · Resumen de tercero.
- Qué tomar: la IA no es un botón ni una app, es el entorno: la barra de direcciones sirve de prompt; minimalismo deliberado en el núcleo (el botón de marcadores solo aparece al pasar sobre la barra; sin avisos de actualización); el contexto de las pestañas abiertas personaliza.
- En Esme: controles que aparecen solo al pasar (hover) o con tecla; el lanzador y el compositor son la misma puerta; el contexto de la ventana activa alimenta la respuesta.
- No copiar: el parecido a Chrome.

**R10. Linear** — https://linear.app · Verificado (Inspo, 2026-05-04) + Verificado (oficial: artículo del rediseño).
- Qué tomar: producto real recortado contra el borde como héroe (datos de verdad: «Faster app launch»); titular a ~64 px con cuerpo a ~14 px; Inter Variable; acento dorado pálido `#e9d890` solo en marcas diminutas; en el registro de actividad, eventos de agentes en línea («Triage intelligence added the label…»); rediseño: gris cálido y menos saturado, barra lateral atenuada para dar peso al contenido, pestañas más compactas, menos iconos, separadores más suaves, herramienta interna de color para ajustar tono, croma y luminosidad por token.
- En Esme: los eventos del equipo (Cline, OpenCode, Qwen) como líneas de registro en la conversación, con hora en mono; la navegación atenuada; ajuste de color por token con «recetas» compartibles (encaja con el sistema de pieles).
- No copiar: la maqueta de panel de incidencias ni el dorado.

### 3.3 Taller (equipo de agentes)

**R11. Conductor** — https://www.conductor.build/ · Verificado (oficial, solo texto) + Resumen de tercero (búsqueda).
- Qué tomar: cada espacio de trabajo respaldado por un worktree de git propio (rama y carpeta propias), todos los hilos activos visibles de un vistazo, con diff, checks y camino hasta el PR; copia aislada = misma idea que el Taller de Esme. Tono de texto: frases cortas y llanas.
- En Esme: la lista del Taller como «mesa de trabajo» con una ficha por copia aislada; confirmar visualmente qué agente toca qué copia. No pude ver su interfaz con mi herramienta: ver sus capturas antes de decidir.
- No copiar: su disposición de paneles sin verla.

**R12. Cursor 3 — Agents Window** — https://cursor.com/blog/cursor-3 · Verificado (oficial, solo texto).
- Qué tomar: ventana de agentes con barra lateral única que lista todos, locales y en la nube, incluidos los lanzados desde móvil, web, Slack, GitHub o Linear; los agentes en la nube entregan demos y capturas de lo que hicieron; sesiones que se mueven de la nube a local; vista de diffs con stage, commit y PR.
- En Esme: «el agente enseña lo que hizo»: cada tarea terminada trae una miniatura/captura y un diff resumido; recoger tareas listas («15 tareas están listas para que las revises») como una bandeja.
- No copiar: el aspecto IDE.

**R13. Buildkite — pipelines** — https://buildkite.com · Verificado (Inspo, captura de ~2026-05-12; solo miniatura, no abrí la ficha completa).
- Qué tomar: el flujo como cadena de chips con marca de verificación («Upload pipeline › Build › Test › Package › Deploy»), cabecera con «Passed in 5s» y un check grande verde, botón «Rebuild».
- En Esme: cada tarea del Taller como cadena de pasos (leer, planificar, editar, probar, entregar) con su estado; el fallo marca el chip, no toda la tarjeta.
- No copiar: el violeta ni el aire de CI/CD.

**R14. Unkey** — https://unkey.com · Verificado (Inspo, 2026-06-02).
- Qué tomar: diagrama de red con dos nodos «hub» y nodos cuadrados que irradian, líneas finas, que se cuela detrás del texto; imagen granulada en blanco y negro con rótulo monoespaciado («Deploy in minutes.»); acento lima `#c9e735` solo en los hubs.
- En Esme: cada agente como hub con sus tareas orbitando; hilos finos hasta la copia aislada del proyecto; grano en la franja del hero.
- No copiar: el lima ni el aire de panel de API.

**R15. Glifos de matriz de puntos (Nothing Glyph, DotMatrix, Doto)** — https://dotmatrix.zzzzshawn.cloud · Verificado (oficial, solo texto) + Resumen de tercero (Nothing Glyph).
- Qué tomar: más de 55 cargadores/indicadores de matriz de puntos de código abierto (Radar Arc, Sound Bars, Core Spiral, Twin Orbit, Pulse Ladder…), instalables como componentes; la Glyph Interface de Nothing usa luz en segmentos para comunicar sin pantalla (encaja con «comunicar sin hablar», P3).
- En Esme: el estado de cada agente (pensando, leyendo, falló, terminó) como un glifo 5×5 con su propio ritmo de respiración, en vez de texto rojo «falló»; también sirve de presencia de Esme (sustituto del triángulo).
- No copiar: Ndot, que es propietaria; licencia de DotMatrix sin declarar en su página (revisar el repositorio).

### 3.4 Memoria (atlas)

**R16. Embedding Atlas (Apple)** — https://github.com/apple/embedding-atlas · Verificado (oficial, MIT).
- Qué tomar: clustering y etiquetado automáticos; densidad con contornos para separar zonas densas de atípicos; transparencia independiente del orden (los puntos solapados no se saturan); búsqueda en tiempo real y vecinos más cercanos; visores por tipo (texto, imagen, audio, tiempo); acceso para agentes vía MCP; componentes para React; hasta unos pocos millones de puntos con WebGPU.
- En Esme: ya hay contornos y etiquetas. Falta: (a) mezcla de puntos que SUME luz en las zonas densas, (b) al pasar sobre un recuerdo, encender sus vecinos y apagar el resto, (c) etiquetas que cambian de nivel al hacer zoom.
- No copiar: su UI de panel.

**R17. Nomic Atlas / Deepscatter** — https://docs.nomic.ai/atlas/embeddings-and-retrieval/guides/how-to-visualize-embeddings · Verificado (oficial).
- Qué tomar: mapa en WebGL que colorea y filtra por metadatos, zoom a clústeres, anotar puntos concretos.
- En Esme: «anotar» = dejar una nota sobre un punto y que sea un recuerdo más; filtros por origen (tinta / grafito / luz).
- No copiar: la dependencia en la nube; Esme debe seguir local.

**R18. Hindsight — Constellation View** — https://hindsight.vectorize.io/blog/2026/04/16/constellation-view · Verificado (oficial).
- Qué tomar: color de la arista según el tipo de vínculo (semántico azul, temporal teal, entidad ámbar, causal púrpura); nodos más brillantes cuanto más conectados, de modo que los hubs destacan; distribución determinista (el grafo se ve igual entre visitas, comparable antes y después de un cambio).
- En Esme: colores de arista con significado (tu navy+teal+ámbar ya los tiene) y brillo = conexiones; layout estable para que el creador «reconozca su mente» cada día.
- No copiar: su panel de control.

**R19. Supermemory — memory graph** — https://docs.bswen.com/blog/2026-06-02-visualize-ai-memory-graph · Resumen de tercero.
- Qué tomar: dos formas para dos cosas (documentos como rectángulos, recuerdos como hexágonos); aristas con nombre (UPDATE, EXTENDS, DERIVES) que hacen visible cómo cambia un dato; dos modos, consola y consumidor.
- En Esme: recuerdos que «reemplazan» a otros dibujados como trazo doble; un modo simple (constelación) y un modo experto (tipos de arista).
- No copiar: los hexágonos de Supermemory tal cual.

**R20. Obsidian** — https://obsidian.md · Verificado (Inspo, 2026-05-04).
- Qué tomar: la vista de grafo como «prueba viva» en el hero (nodos verdes y violeta `#7c3ceb` / `#246a37` sobre `#0d0d0d`); botón con etiqueta dinámica por plataforma («Get Obsidian for macOS») con un enlace de texto discreto al lado.
- En Esme: el atlas real del usuario en la tienda y el onboarding; botón único + enlace discreto.
- No copiar: el violeta.

**R21. Synthesis Partners — biblioteca** — https://www.synthesis.partners/library · Verificado (Inspo, 2026-09-10).
- Qué tomar: «corcho digital»: láminas de papel sueltas con rotación y altura variables sobre un vacío crema; conmutador CANVAS / GRID; Fraunces + Public Sans; texto teal oscuro `#0d5552` sobre beige `#ccc7bd`.
- En Esme: modo «mesa» de Memoria: los recuerdos recientes como fichas de papel sobre la constelación (arrastrables, rotación ±3°) y un conmutador constelación / lista. Referencia directa para la piel de día.
- No copiar: crema y coral de su marca.

**R22. Microdot** — https://microdot.vision/ · Verificado (Inspo, 2026-05-28).
- Qué tomar: tira de fotogramas (scrubber) como chrome fijo abajo; etiquetas catalográficas en mayúsculas tracking amplio ~10 px con números de índice («M. WORK 2505 320»); rojo `#d82826` solo en el borde del fotograma activo.
- En Esme: la línea de tiempo de Memoria ya tiene barras: convertirla en una tira de fotogramas de la constelación (cada barra = una miniatura del atlas de ese día) y catalogar recuerdos con índice («R-2346»).
- No copiar: fotografía ni el fondo rojo.

### 3.5 Uso (coste y tokens)

**R23. Sparklines (Edward Tufte)** — https://www.edwardtufte.com/notebook/sparkline-theory-and-practice-edward-tufte/ · Verificado (oficial).
- Qué tomar: gráfico del tamaño de una palabra, intenso y sencillo, que se puede insertar en una frase o una tabla; muestra el camino de un valor en el tiempo contra una banda normal.
- En Esme: cada cifra de Uso (coste, tokens, modelo) con su sparkline en línea; banda de «normal» para que un pico se vea como desviación.
- No copiar: nada, es técnica.

**R24. Matvey An (portafolio)** — https://matveyan.com/ · Verificado (Inspo, 2026-05-28).
- Qué tomar: tira de cotizaciones en vivo abajo (símbolo, valor y variación en mono, p. ej. BTC, IMOEX, S&P500 en la miniatura); botón con borde discontinuo de 1 px, esquinas rectas, sin relleno; titular en mayúsculas con «×»; monedas 3D desenfocadas como atmósfera.
- En Esme: pie persistente con tres o cuatro lecturas en vivo («hoy 0,42 USD · 18,2k tokens · Qwen 71 %») en mono; botón de borde discontinuo como acción secundaria de instrumento.
- No copiar: las monedas ni el tema fintech.

**R25. Stripe (cifra viva en microcopy)** — https://stripe.com · Verificado (Inspo, 2026-05-18; en la miniatura se lee una línea pequeña «Global GDP running on Stripe: 1.64890663…» sobre el titular; parece un contador en vivo, no pude comprobar que se actualice) y contraejemplo en todo lo demás.
- Qué tomar: UNA cifra con muchos decimales como microcopy encima del titular.
- En Esme: contador de recuerdos o tokens como línea mono sobre el titular de la portada (si late, mejor).
- No copiar: las cintas de gradiente naranja-rosa-violeta (es exactamente el «brillante» a evitar).

### 3.6 Tienda (pieles y herramientas)

**R26. Teenage Engineering** — https://teenageengineering.com · Verificado (Inspo, 2026-05-04) + Resumen de tercero (página DESIGN.md de shadcn.io).
- Qué tomar: hardware como héroe, flotando en vacío sobre gradiente `#1a1a1a` a `#4a4a4a`; logotipo en trazo con un solo círculo naranja `#f27735` sustituyendo un contador; densidad de ficha técnica. Según el resumen de tercero: tipografía de mapa de bits propia (te-40, te-20) a peso ≤300, divisores de 1 px, radio 0, sin sombras, teselas de producto `#f6f8f7` sobre negro, colores del producto solo como anotación.
- En Esme: cada piel en la tienda como «producto fotografiado» sobre vacío oscuro, con rejilla de celdas separadas por línea de 1 px; el color del producto es la propia piel.
- No copiar: las fuentes propietarias.

**R27. Nothing** — https://nothing.tech · Resumen de tercero (shadcn.io DESIGN.md; no comprobado contra el sitio vivo).
- Qué tomar: tres voces: Ndot (puntos) solo para nombres de producto en minúsculas con paréntesis, p. ej. `phone(2a)`; sans ultraligera para titulares; mono en mayúsculas de 11–14 px para botones, nav y etiquetas; sin color de UI ni en hover ni en foco; base de 8 px; botones 6 px, tarjetas 8 px, sin píldoras; plano con bordes de 1 px.
- En Esme: nombrar pieles y herramientas como `arcilla(1)`, `tinta-y-luz(1)` en voz de puntos; etiquetas utilitarias en mono mayúsculas.
- No copiar: blanco y negro puro; Ndot.

**R28. Raycast Themes** — https://ray.so/themes/ · Verificado (oficial, solo texto).
- Qué tomar: galería con búsqueda, vista de lista, muestra con «Primary Text» y fila de swatches de color, variantes Dark y Light por separado, botón «Add to Raycast», menú de acciones con ⌘K.
- En Esme: previsualizar cada piel con sus swatches y un texto de muestra real, y un botón «Vestir Esme» de un solo paso; variantes noche y día como enlaces hermanos.
- No copiar: el formato de lista; Esme muestra la piel puesta, no solo muestras.

### 3.7 Ajustes

**R29. Things 3 (Cultured Code)** — https://culturedcode.com/things/ · Solo texto (resúmenes de reseñas de terceros; no confirmo colores ni tipografías).
- Qué tomar: restraint: las reseñas hablan de animaciones «con propósito» y de una interfaz que «no estorba»; Apple Design Award según su página. Sirve de brújula de tono para Ajustes: pocas filas, cada una con efecto inmediato y reversible.
- En Esme: Ajustes con una sola columna, interruptores con efecto en vivo, mono mayúsculas para la etiqueta, valores a la derecha; los ajustes peligrosos con confirmación mantenida (la lista de craft de Rauno, P1, incluye una pieza llamada «Hold Enter to confirm»; no la abrí, comprobarla antes de apostar).
- No copiar: nada visual (no verificado).

### 3.8 Lanzador global (Ctrl+Mayús+Espacio)

**R30. cmdk (Paco Coursey) y el patrón Raycast** — https://github.com/pacocoursey/cmdk · Verificado (oficial: «Composable command menu React component»); Raycast en R05.
- Qué tomar: menú de comandos composable; regla de Rauno (P1): omitir animación en acciones frecuentes y de baja novedad, para que el lanzador abra instantáneo; pie con atajos en mono; la IA como primera fila, no como pantalla aparte (como Dia, R09).
- En Esme: el lanzador abre sin transición (o con la más corta posible); resultados con separador de 1 px, no tarjetas; pie con `↵ abrir · ⌘K acciones` en mono; sonido `clickSoft` muy bajo.
- No copiar: el aspecto exacto de Raycast.

## 4. Los maestros (no cuentan entre las 30 pero fijan el criterio)

- **P1. Rauno Freiberg** — https://rauno.me · Verificado (oficial). Manifiesto: «hazlo rápido, hermoso, consistente, cuidadoso, atemporal, con alma». Piezas útiles: *Novelty* (feb 2026: 90 % familiar, 10 % novedad; los adornos largos solo la primera vez), *Contrasting Aesthetics* (contraste de épocas y de tipos, p. ej. tipografía bitmap frente a pintura renacentista; girar UN elemento; anclas constantes), *Designing Depth* (capas, desenfoque del fondo interior, fondo atenuado bajo una capa, borde inferior desvanecido, entradas escalonadas), *Invisible Details of Interaction Design* (movimiento interrumpible, conservar el impulso del gesto, acciones destructivas solo al soltar, anclar el zoom al punto de pellizco, saltarse la animación en lo frecuente). Todas en https://rauno.me/craft/...; Devouring Details en https://www.devouringdetails.com.
- **P2. Emil Kowalski** — https://emilkowal.ski · Verificado (oficial, lista de artículos) + Resumen de tercero (guías que empaquetan sus ideas). Sonner (toasts), Vaul (cajón), animations.dev (curso); artículos «You Don't Need Animations», «The Magic of Clip Path», «Friction as a Feature». Resúmenes de tercero atribuyen: entradas desde escala 0,95 y no desde 0; los popovers crecen desde su disparador.
- **P3. Calm Tech Institute (Amber Case)** — https://calmtech.institute/calm-tech-principles · Verificado (oficial). Ocho principios: mínima atención; informar y crear calma; usar la periferia; amplificar lo mejor de la tecnología y de la humanidad; comunicar sin hablar; seguir funcionando cuando falla; la mínima tecnología necesaria; respetar las normas sociales.
- **P4. Paco Coursey** — https://paco.me · Verificado (oficial). «Experimentando con detalles mágicos en interfaces»; cmdk, Writer (editor de texto plano centrado en rendimiento), next-themes; sección Craft.

Menciones menores (patrón serif sobre negro, sin ficha completa): Tana https://tana.inc (serif sobre negro con una palabra en cursiva y botón `#e2f1bb`; el producto es un «grafo de contexto que se construye solo»), Railway https://railway.com (IBM Plex Serif sobre cielo de píxeles), Perplexity API (teal `#5a9da0` sobre `#0a0a0a`, ver 6).

## 5. Material de construcción (todo lo que se puede usar sin inventarlo)

### 5.1 Tipografía
| Necesidad | Opción | Estado | Nota |
|---|---|---|---|
| Serif enorme | Fraunces, Bodoni Moda, Newsreader | YA instaladas | Fraunces «Soft» es la de Synthesis (R21); Bodoni es la actual de «Tinta y Luz» |
| Serif de titular con cursiva viva | Instrument Serif | Por añadir (la usa FURO, R01) | Comprobar licencia y paquete `@fontsource` antes de instalar |
| Puntos (nombres propios y cifras) | Doto (Google Fonts, OFL, variable 100–900, ejes de tamaño y redondez del punto) | Por añadir | Glifos en rejilla 6×10; PROBAR `ñ á é í ó ú ¿ ¡` |
| Puntos/píxel de familia Geist | Geist Pixel (feb 2026; Square, Grid, Circle, Triangle, Line; 480 glifos, 32 idiomas) | Por añadir | La importación `geist/font/pixel` es de Next.js; en Electron/Vite hay que usar los archivos de https://vercel.com/font; licencia no declarada en el artículo |
| Mono pixel | Departure Mono (Helena Zhang, OFL) | Por añadir | Nítida en múltiplos de 11 px |
| Mono utilitaria | Geist Mono / JetBrains Mono | JetBrains YA; Geist Mono no está en la lista | Mayúsculas 11–12 px con tracking |

Fuentes: https://vercel.com/blog/introducing-geist-pixel · https://fonts.google.com/specimen/Doto/about · https://departuremono.com. Probar SIEMPRE los acentos del español antes de adoptar una fuente de puntos; Ndot de Nothing, por ejemplo, no cubre todos los alfabetos.

### 5.2 Trama, grano y puntos
- **Paper Shaders** — https://shaders.paper.design · Verificado (oficial): halftone dots, halftone CMYK, dithering, image dithering, grain gradient, dot grid, dot orbit, paper texture, fluted glass, water, heatmap, liquid metal, metaballs, god rays, warp, swirl, voronoi, perlin, simplex, pulsing border… Licencia Apache-2.0, pedir fijar la versión (0.0.x, rompe entre versiones). El paquete YA está en la app (0.0.81): comprobar que esa versión incluye cada shader antes de planificar.
- **Dithering** — https://surma.dev/things/ditherpunk/ · Verificado (oficial): en GPU usar mapa de umbrales precomputado y teselado (ruido azul = orgánico; Bayer = estructura); evitar difusión de error (secuencial); convertir a luz lineal antes de cuantizar. Obra Dinn usa ruido azul para el entorno y Bayer para los objetos de interés.
- **Magic UI** — https://magicui.design · Verificado (oficial, índice): `noise-texture` (grano SVG con contraste), `dot-pattern`, `grid-pattern`, `flickering-grid`, `particles`, `number-ticker`, `animated-beam`, `orbiting-circles`, `border-beam`, `light-rays`, `blur-fade`, `hyper-text`, `morphing-text`. Comprobar licencia.
- **Animate UI** — https://animate-ui.com · Verificado (oficial): primitivas animadas con Motion dentro; muelles y tweens cortos con ease-out fuerte, salidas más rápidas que entradas, interrumpibles, respetan reducir movimiento. Coincide con las reglas de P1 y P2.
- **Orb / waveforms** — https://github.com/elevenlabs/ui · Verificado (oficial): «orbs, waveforms, voice agents, audio players», MIT, React y shadcn; instalables por `npx @elevenlabs/cli@latest components add orb`. Útil si la presencia deja de ser un triángulo (R15 para la alternativa de puntos).

### 5.3 Motores de visualización
- `react-force-graph-2d` (ya instalado) es suficiente para 2.346 nodos. cosmos.gl https://github.com/cosmosgl/graph (MIT) hace layout y dibujo en shaders de GPU y apunta a cientos de miles de puntos; `highlightedPointIndices`, `outlinedPointIndices`, `transitionDuration` por defecto 800 ms; avisos de WebGL en algunos iOS/Android (Electron en escritorio no los tiene). Embedding Atlas (R16) para la lectura del mapa. Hacerlo solo si el atlas crece de ~50.000 puntos.

### 5.4 Sonido
- Esme ya tiene sonidos CC0 de Kenney con tres modos. Guía de práctica (resumen de tercero, https://www.freecodecamp.org/news/web-audio-for-the-user-interface-1592687f898c y la lista de skills de https://userinterface.wiki): el sonido inesperado es motivo de rechazo; interruptor maestro de silencio; precargar al arrancar para no tener latencia; reiniciar el tiempo del clip para que los disparos rápidos suenen; volumen por defecto bajo (ejemplo 0,3); peso del sonido según la importancia de la acción; todo aviso sonoro con equivalente visual.
- Ideas (mías, a probar): tic al arrastrar la línea de tiempo de Memoria con el tono según el tema bajo la aguja; un «thock» seco al abrir el lanzador; silencio total en el chrome diario.

### 5.5 Componentes con movimiento que valen la pena (registros shadcn que la app YA tiene configurados)

Contexto: `app/components.json` ya declara los registros `@magicui`, `@kokonutui`, `@reactbits` y `@aceternity`. El MCP shadcn, desde este directorio de trabajo, solo ve `@shadcn` (no hay `components.json` aquí), así que leí los índices de cada registro directamente (nombres verificados; no instalé nada ni toqué el código). Para el nombre exacto de la variante, usar `npx shadcn@latest search @reactbits -q <nombre>` desde `app/`.

Lo que la app ya trae y empuja hacia «brillante» (observación mía, sin juzgar su uso concreto): carpeta `ui/efectos` (ElectricBorder, StarBorder, GlassSurface, GradientText, ShinyText, GlitchText…) y `ui/fondos` (Aurora, Iridescence, LiquidChrome, Lightning, Hyperspeed, Plasma, Prism…). Los halos de los marcos vienen además del propio CSS (`styles/esme.css`, p. ej. el `box-shadow` con `--luz` al 48–55 % hacia la línea 252 y los keyframes `latido` y `pulso-trabajo` hacia las líneas 375–376): son los primeros sospechosos del «halo neón» de las fotos.

Lo que añadiría o rescataría, por pantalla (todo con movimiento, todo analógico o de instrumento):

| Pantalla | Registro / componente | Qué hace (según el índice) | Por qué encaja |
|---|---|---|---|
| Portada, Memoria | `@reactbits` Noise | grano de película, de fino a polvo | textura real en vez de gradiente (regla 8) |
| Portada | `@reactbits` DitherVeil | foto en 1 bit con dither que el cursor revela a todo color | «lo analógico vence a lo brillante», con interacción |
| Portada, Tienda | `@reactbits` HalftoneReveal | los puntos del halftone se inflan hasta ser la foto | trama de puntos con movimiento (R01) |
| Portada | `@reactbits` SplitFlapText | panel mecánico de láminas que cambia de frase | saludo y hora como tablero de estación (instrumento) |
| Portada, Uso | `@reactbits` Counter y CountUp | número tipo odómetro, dígitos que ruedan | la cifra viva de R25 |
| Portada | `@magicui` dotted-map | mapa hecho de puntos | «Caracas» como punto en un mapa de puntos |
| Memoria | `@reactbits` Stack | pila de tarjetas arrastrables | la «mesa» de fichas de R21 |
| Memoria | `@reactbits` TargetCursor y Crosshair | retícula cuyos corchetes se ajustan al objetivo, con coordenadas en vivo | cursor de instrumento sobre el atlas |
| Tienda | `@reactbits` ChromaGrid | rejilla en gris que recupera el color al pasar el foco | rejilla de pieles: la piel bajo el cursor se «enciende» (R26) |
| Tienda, Portada | `@reactbits` PixelTransition y PixelSwap | disolución por píxeles al cambiar de contenido | cambio de piel como disolución de puntos |
| Taller | `@kokonutui` ai-loading | progreso del agente como lista de pasos con registro vivo, tiempo y resumen | cadena de pasos de R13 |
| Taller | `@kokonutui` ai-diff-review | edición del agente revisada por fichero, con aceptar, rechazar y deshacer | «el agente enseña lo que hizo» (R12) |
| Taller | `@kokonutui` status-island | píldora que informa de tareas en segundo plano y se expande | YA existe en la app (`ui/status-island.tsx`) |
| Conversación | `@kokonutui` ai-citations | texto con fichas de fuente junto a cada afirmación | citar recuerdos de la memoria en cada frase |
| Conversación | `@kokonutui` ai-prompt, ai-autocomplete, type-writer | compositor con menú de modelo y esfuerzo, sugerencia gris tras el cursor, máquina de escribir con erratas | compositor con voz propia (R07, R08) |
| Uso | `@kokonutui` ai-context-meter | anillo del pie del compositor que muestra cuánto del contexto está lleno, con desglose | medidor de instrumento para tokens (R23) |
| Ajustes, Taller | `@kokonutui` hold-button, undo-button | pulsar y mantener para confirmar; deshacer con cuenta atrás en el borde | acciones destructivas con peso físico (Rauno, P1) |
| Lanzador | `@kokonutui` command-button, action-search-bar | atajo como teclas que se hunden; paleta con páginas anidadas | YA hay `ui/action-search-bar.tsx`; añadir las teclas que se hunden |
| Presencia | `@kokonutui` ai-text-loading | «pensando» con una onda por las letras | estado de Esme sin mascota |

Esfuerzo: la mayoría son componentes de copiar y adaptar; los de fondos con WebGL (DitherVeil, HalftoneReveal) pesan más: usar UNO solo por pantalla y apagarlo con «movimiento: nada». Las licencias de cada registro no están declaradas en los índices: comprobarlas antes de incorporar.

## 6. Paleta de las referencias (medida en capturas Inspo)

| Sitio | Fondo | Texto | Acento | Lectura |
|---|---|---|---|---|
| Perplexity API | `#0a0a0a` | `#fcfcf4` | teal `#5a9da0` | teal apagado, de instrumento |
| Bauhaus Clock | `#b8b9bb` / `#080e11` | `#080e11` | cian `#3cd4d6`, `#88e4ea` | un solo hilo de acento |
| Moshi Moshi | navy `#062736` | blanco | `#19a5e5`, `#87d0f1` | navy + azul cielo |
| Daniel Sun | `#000000` | `#dfc19a` | el mismo hueso | monocolor cálido |
| FURO | `#000000` | `#d4ccd4` | `#b42e04` solo en una palabra | acento mínimo |
| Esme «Tinta y Luz» (código) | `#0a1020` | `#ece6d8` | teal `#4fe3c1`, ámbar `#f2b45b` | ya es navy + teal |

Hipótesis a probar (mía): un teal más apagado y menos neón (`#5a9da0` / `#3cd4d6`) para marcos y datos, reservando `#4fe3c1` para «Luz = lo que recuerda ahora», y un hueso cálido `#d9c7a3` para la tinta de texto.

## 7. Anti-referencias (lo que NO tomar)

- Cintas de gradiente multicolor sobre blanco (Stripe, R25): es lo brillante que el creador rechaza.
- Cartuchos, monedas 3D, fotografía de stock de personas trabajando (Analogue, Matvey An, Tana): sirven la técnica, no el motivo.
- Halo neón y cristal esmerilado en controles: ninguna de las 30 referencias los usa para el chrome; el color y la luz están en el contenido.
- Novedad en todas partes: Rauno (P1) lo desaconseja; el primer arranque puede deslumbrar, el diario debe ser quieto.
- Tipografía de puntos para párrafos: Nothing la limita a nombres de producto (R27); mantener Doto/Geist Pixel para cifras y nombres propios.

## 8. Recetas de piel propuestas (para quien rediseñe; no toco el código)

Tres pieles hechas SOLO de datos, cada una combinando referencias. Campos nuevos que haría falta añadir a `piel.ts` (sugerencia, a decidir por quien lo implemente): `fondo: 'trama' | 'grano' | 'plano'`, `forma.borde: 'linea' | 'halo'`, `letra.datos: 'puntos' | 'mono'`, `etiquetas: 'mono-mayusculas' | 'normal'`.

- **«Instrumento»** (noche, por defecto): R02 + R26 + R27 + R14. Fondo `#0a1020` con rejilla de 1 px al 5 %; radio 0–2; sin sombras ni halos; texto hueso; teal apagado en datos; cifras en Doto; etiquetas en mono mayúsculas; presencia = glifo de puntos (R15); portada = constelación a sangre con cabecera de puntos (R01).
- **«Papel»** (día): R21 + R07 + R29. Crema `#eeebe3`, superficie `#fbfaf6`, tinta `#141821`, acento `#08705e` (ya en «Tinta y Luz»); serif Fraunces Soft; Memoria en modo mesa con fichas.
- **«Grabado»** (negro puro): R01 + R03 + R05. Negro `#000000`, una sola tinta cálida, halftone en el fondo (Paper `halftone-dots`), un haz de luz difuso (R05), todo el resto línea; la «pieza» central (constelación) con el único color.

## 9. Qué probaría primero (ordenado por impacto frente a esfuerzo)

1. Quitar el halo neón de todos los marcos y sustituir por línea de 1 px (cambio global, efecto inmediato).
2. Portada: constelación a sangre, sin el rectángulo oscuro; sustituir el triángulo por glifo de puntos (R15) o por trazo en el borde (R03).
3. Etiquetas utilitarias en mono mayúsculas 11–12 px y cifras de contador en tipografía de puntos (R27, R26); probar los acentos del español antes.
4. Grano fijo + trama de puntos (Paper `grain-gradient`, `halftone-dots`, ya instalado) sobre el fondo (R01, R14).
5. Memoria: vecinos encendidos al pasar, mezcla aditiva en zonas densas, etiquetas por nivel (R16, R18) y tira de fotogramas en la línea de tiempo (R22).
6. Taller: cadena de pasos por tarea (R13), glifo de estado por agente (R15), «el agente enseña lo que hizo» con miniatura (R12).
7. Uso: sparklines en cada cifra (R23) y pie con lecturas en vivo (R24, R25).
8. Tienda: pieles como producto fotografiado sobre vacío con rejilla de 1 px y nombre `piel(n)` (R26, R27); previsualización con swatches (R28).
9. Lanzador instantáneo con pie de atajos en mono (R30).
10. Sonido: mantener los modos actuales; añadir el tic de la línea de tiempo.

## 10. Riesgos y límites de esta investigación

- Mi herramienta de lectura web devuelve texto, no imágenes: para sitios no capturados por Inspo (Granola, iA Writer, Things, Conductor, Cursor, Dia, Rauno, Emil) no puedo afirmar nada visual. Antes de apostar, abrir los sitios en el navegador integrado y mirar.
- Stripe Sessions: la página solo devolvió texto sin pistas visuales; por eso uso Stripe general (R25), con la miniatura de Inspo.
- Los resúmenes de Teenage Engineering y Nothing (R26, R27) son de una página de tercero y chocan en detalles con la ficha Inspo de TE (negro con producto sobre gradiente frente a teselas `#f6f8f7`): comprobar en vivo.
- Fuentes de puntos: licencias de Geist Pixel e Instrument Serif sin verificar aquí; Doto y Departure Mono son OFL según las búsquedas. Probar acentos y `¿¡`.
- Accesibilidad: mono de 11 px y teal sobre navy necesitan medir contraste (WCAG); respetar «reducir movimiento»; en móvil las fuentes de puntos pierden legibilidad bajo ~14 px.
- Rendimiento: shaders de Paper y varias escenas a la vez pueden pesar en portátiles modestos; usar un solo shader de fondo y apagarlo con «movimiento: nada».
- No pude consultar X/FYP del creador desde este encargo; su gusto aquí viene del resumen del encargo.

## 11. Fuentes consultadas (URLs)

Inspo (capturas 2026): furoweb.eu, danielsun.space/about, analogue.co, bauhausclock.com, raycast.com, flim.ai, linear.app, unkey.com, buildkite.com, warp.dev, obsidian.md, synthesis.partners/library, microdot.vision, matveyan.com, stripe.com, teenageengineering.com, perplexity.ai.
Oficiales: ia.net/writer, granola.ai, conductor.build, cursor.com/blog/cursor-3, linear.app/now/behind-the-latest-design-refresh, github.com/apple/embedding-atlas, docs.nomic.ai, github.com/cosmosgl/graph, hindsight.vectorize.io, edwardtufte.com, rauno.me, emilkowal.ski, paco.me, calmtech.institute, shaders.paper.design, surma.dev/things/ditherpunk, vercel.com/blog/introducing-geist-pixel, magicui.design, animate-ui.com, dotmatrix.zzzzshawn.cloud, ray.so/themes, github.com/elevenlabs/ui, github.com/paper-design/shaders.
De tercero: shadcn.io/design/teenage-engineering y /nothing, en.wikipedia.org/wiki/Dia_(web_browser), docs.bswen.com (Supermemory), freecodecamp.org (audio web), fonts.google.com/specimen/Doto, búsquedas sobre Conductor y Departure Mono.
