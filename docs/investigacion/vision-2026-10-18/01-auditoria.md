# 01 — Auditoría visual de Esme (2026-10-18)

> Estado: EN CURSO (borrador 1: capturas revisadas; falta cruzar con código).
> Fuentes: capturas `scratchpad/auditoria/*.png` (piel Arcilla, hoy) y `scratchpad/*.png` (pieles anteriores: Tinta y Luz `tyl-*`, `mando-nuevo*`; piel cósmica `vista-*`, `chat*`, `tienda-herr*`; Arcilla temprana `agenda*`, `sistema.png`; primer arranque `instalada.png`).
> Marcas: (H) hecho visible en captura o código; (I) inferencia; (Hip) hipótesis por verificar.

## Notas de capturas (crudo, se ordena abajo)

### Tu mente / portada (00-tecla1, mando-nuevo*, vista-0, instalada)
- (H) Costura vertical dura en x≈681 px: la constelación vive en un rectángulo negro con borde izquierdo e inferior visibles (y≈817). Corta el degradado del fondo y atraviesa el chip «Habla conmigo». Aparece en Arcilla (00) y en Tinta y Luz (mando-nuevo, mando-nuevo2): es estructural, no de la piel.
- (H) La mascota (triángulo lila, 200 px) tapa las etiquetas de la constelación («Pruebas», «Fallo»); en Tinta y Luz el anillo tapa «Fallo»/«Pruebas». La presencia y el mapa compiten por el mismo sitio.
- (H) «Buenas tardes.» empieza ~20 px (Arcilla) / ~50 px (Tinta y Luz) a la derecha de la fecha y del subtítulo: margen izquierdo roto.
- (H) Contradicción de datos: titular «15 tareas están listas» vs navegación «Taller · 20 listas para revisar, 2 con err…».
- (H) Formato numérico mezclado en la misma pantalla: «2346 recuerdos» (cabecera, navegación) vs «2.346 recuerdos · 17 temas» (pie del mapa).
- (H) Un icono «⋮» huérfano flota dentro del compositor (x≈791, y≈362) sin función aparente.
- (H) ~300 px de vacío muerto entre los chips (y≈480) y la franja inferior (y≈795) en la columna izquierda.
- (H) Franja inferior «Tu equipo / Lo próximo / Tus manos / Lo último»: todo truncado con «…», 3 de 4 agentes en rojo «falló» en la pantalla de bienvenida; «Qwen Code» aparece dos veces (terminó y falló) en mando-nuevo.
- (H) Navegación en tarjeta flotante abajo a la izquierda (desplegada solo en portada; en el resto, carril de iconos de 50 px que no llega arriba). Subtítulos truncados: «Ollama (local), llama.cpp (loca…», «Tienda · Pronto» (la Tienda existe y funciona).
- (H) Los tres contenedores de la cabecera (miga, buscador, píldora de recuerdos+sol) llevan halo/contorno lila doble: brillo «neón» en el cromo, no en el contenido.
- (H) Primer arranque (instalada.png): «Tu mente guarda 0 recuerdos en 0 temas.» + anillo + «Buenas noches.». Ninguna bienvenida, ningún paso guiado; Taller y Tienda («Pronto») sin explicar.
- (H) Piel cósmica (vista-0): eclipse luminoso + campo de estrellas: el cliché visual «IA = cosmos».

### Conversación (01-tecla2, tyl-1, chat1–4)
- (H) Estado vacío = esfera brillante + «¿En qué piensas?» + párrafo centrado: plantilla de chat de IA.
- (H) Selectores con ids crudos: «OpenRouter» + «nvidia/nemotron-3.5-lightning:free». La misma cadena se repite debajo del compositor y en cada respuesta («Esme · nvidia/nemotron-3.5-lightning:free»).
- (H) Tira de uso bajo el compositor: barra al 0 %, «$0», «hoy $0»: ruido permanente.
- (H) Dos buscadores visibles a la vez (global «Busca o pregunta Ctrl K» y «Buscar en lo hablado»).
- (H) Lista de conversaciones: títulos = primera frase truncada («Papi, ¿me puedes buscar u…»), sin agrupar por día, barra de desplazamiento nativa visible.
- (H) Dos columnas de navegación pegadas (carril de iconos + lista de conversaciones) y un marco con halo lila alrededor de todo.
- (H) chat3/chat4: espacios entre números y palabras casi desaparecen («el10dediciembre de1815», «Electronv44.9.0», «el17deoctubrede2026»).
- (H) chat4: 14 píldoras «recuerdo 1 … recuerdo 14» idénticas (sin contenido) + «1488 tokens de memoria»; error técnico crudo en la conversación: «Hugging Face: MCP HTTP Transport Error: POSTing to endpoint (HTTP 401): Un…».
- (H) «sirvió / no sirvió» como texto plano; acciones (voz, copiar) diminutas a 700 px del texto.

### Taller (02-tecla3, 10-estado-actual, tyl-2, vista-2, agenda*, sistema)
- (H) Todos los agentes tienen la MISMA cara (triángulo lila con ojos); «Claude (adap…», «Autohand Co…» truncados. Error = la mascota se deforma en «!» o en una gota sin cara (zoom-caras-taller): dos presentaciones distintas del mismo estado.
- (H) Cada tarjeta muestra un id de modelo cortado con paréntesis huérfano: «laguna-s-2.1:free)».
- (H) Cronómetro «27:29:27» en la tarjeta frente a «Trabajando en «hola» 53s» en el detalle (10-estado-actual): dos relojes que se contradicen.
- (H) Título de tarea «hola» frente al encargo real «piensa en algo revolucionario…».
- (H) Microgramas de barras decorativos en cada tarjeta, sin eje ni leyenda.
- (H) Tipografías mezcladas en una tarjeta: sans (nombre), mono (id del modelo, «0 herramientas usadas», «carpeta nueva»), cifras grandes en otra familia.
- (H) Selector de motor desborda por la derecha («Agoragen…», icono cortado); «Qwen Code» aparece apagado aunque es el único que funciona; «Cline» seleccionado aunque está en error.
- (H) Botón «Empezar Ctrl↵» casi invisible (lila sobre lila).
- (H) Contenedores anidados 4 niveles (marco con halo → panel r≈40 → compositor r≈30 → chips en píldora) y 2–3 zonas de desplazamiento independientes en la misma vista.
- (H) «Taller · 15 listas» aquí vs «20 listas» en la navegación.
- (H) Única etiqueta en MAYÚSCULAS espaciadas de la app («LISTAS PARA APLICAR», «PROGRAMADO», «TRABAJANDO»).

### Memoria (03-tecla4, tyl-3, tyl2-3, vista-3)
- (H) Lista de recuerdos con markdown crudo: «## 6. Fases de implantación … **4a. Cimientos:** -» con asteriscos y almohadillas visibles; fecha duplicada («12 oct · mcp» y luego «2026-10-12 — …»); nombre de fichero como metadato.
- (H) Etiquetas de temas sin sentido para una persona: «quieras / necesitamos», «prueba / Compruebo» y «pruebas» (duplicado), «client / API», «America» sin tilde.
- (H) Debajo de cada etiqueta una rejilla 3×3 de puntos sin significado explicado.
- (H) Envolventes convexas de 17 temas superpuestas: madeja de contornos.
- (H) Leyenda con 4 conceptos poéticos («Tinta», «Grafito», «La tinta envejece», «Luz») en 11 px; los puntos de leyenda no se distinguen entre sí.
- (H) tyl-3/vista-3: panel izquierdo VACÍO (800 px en blanco entre buscador y «absorber») — estado vacío sin diseñar; marcador de posición cortado «~/Documentos/(».
- (H) La lista lleva halo lila; el lienzo del mapa, ninguno: marco incoherente.

### Uso (04-tecla5, tyl-4, vista-4)
- (H) Locales mezclados: «517,8 mil» (titular) vs «517.8k» (tarjeta) vs «292.9k», «441.8M», fechas ISO «2026-10-12» y «10-18».
- (H) Contradicción: «pico: 441.8M tokens el 2026-10-12» en un periodo cuyo total es 517,8 mil (el mapa de calor incluye Claude Code y el total no; no se explica).
- (H) Mapa de calor de 13 semanas ocupa ~60 px de una tarjeta de ~1.090 px: 90 % vacío.
- (H) Cuatro tarjetas KPI en fila (Gasto $0, Tokens, Llamadas, Presupuesto $0): patrón de panel de administración.
- (H) Gráfico «Sin gasto en 30 días» vacío (solo línea discontinua) en Tinta y Luz.
- (H) Ids crudos y paréntesis dobles: «Qwen3 Coder (OpenRouter · poolside/laguna-s-2.1:free) (qwen-code)»; «qwen-code» partido en dos líneas.

### Tienda (05-tecla6, tyl-5, vista-5, tienda-herr*)
- (H) Las 12 previsualizaciones son la MISMA composición (esfera + «Buenas noches.» + barra + 2 píldoras) recoloreada: el escaparate confiesa que las pieles son recolores.
- (H) La esfera brillante aparece incluso en «Brutalista — Sin adornos».
- (H) 12 botones «Vestir» rellenos con el acento de la piel ACTUAL (no de la piel mostrada): 12 llamadas a la acción principales compitiendo.
- (H) Filtro de 9 círculos de color arcoíris + «Sorpréndeme» con halo.
- (H) Herramientas: cargando = 6 rectángulos grises; luego cada herramienta con el MISMO icono de nube genérico (sin logotipos reales), ids de dominio invertido («com.figma.mcp/mcp · v1.0.3»), descripciones en inglés, botón «Conectar» relleno en todas.
- (H) Un formulario de claves de Brave/SearXNG dentro de la Tienda.

### Ajustes (06-tecla, tyl-6, vista-6)
- (H) Dos filas de pestañas en píldora idénticas (Motores… / Conectados…): la jerarquía se pierde.
- (H) Todos los motores «✓ listo» mientras el Taller marca OpenCode y Cline «Error».
- (H) Tinta y Luz / cósmica muestran rutas del sistema («/home/sakai/.local/share/mise/installs/node/lts/bin/qwen»).
- (H) Iconos de motor diminutos (16 px) casi ilegibles en círculo gris; 60 % inferior de la pantalla vacío.

### Paleta Ctrl+K (11-paleta-ctrlk)
- (H) Solo «Ir a» (7 secciones) + «Cambiar entre día y noche». El marcador promete «Busca, pregunta o da una orden…» y no hay órdenes, recuerdos, tareas ni conversaciones.

## Notas de código (crudo, causas verificadas)
- (H) Costura x≈681: `paginas/MandoVista.tsx:91-93` — la constelación vive en `absolute top-0 right-0 bottom-[120px] w-[54%]` y encima se pinta `bg-[radial-gradient(closest-side,transparent_55%,var(--fondo))]`. La viñeta pinta `--fondo` liso en los bordes de la caja; cuando la piel trae escena (Arcilla: `aurora-suave`, `tinta/pieles-tienda.ts:18`) el resto de la ventana no es `--fondo` y la caja aparece como un rectángulo oscuro. 46 % de 1.480 px = 681 px; 940−120 = 820 px. Cuadra al píxel.
- (H) La presencia tapa las etiquetas: el botón mide `size-[132px]` (`MandoVista.tsx:95`) pero la cara se dibuja a `size={220}` (`shell/Presencia.tsx:28`) y las etiquetas de tema (`paginas/Constelacion.tsx:81-83`) se colocan en el centro de cada cúmulo sin evitar nada.
- (H) «Buenas tardes.» desplazado: `tinta/PiezasVivas.tsx:20` — la pieza de saludo `enfoque` (la de casa, `tinta/piezas.ts:26`) usa `BlurText … className="justify-center"`: centra el titular dentro de una columna alineada a la izquierda.
- (H) 15 vs 20 listas: `MandoVista.tsx:67` cuenta `lista && !aplicada && !archivable` («las mismas que enseña el Taller»); `App.tsx:228` (nota de la navegación) cuenta `lista && !aplicada` sin `archivable`. Dos definiciones del mismo número.
- (H) «2346» vs «2.346»: `App.tsx:263` y `shell/BarraSuperior.tsx:46` usan `toLocaleString('es-ES')` (en español CLDR no agrupa números de 4 cifras); `MandoVista.tsx:99` fuerza `useGrouping: 'always'`.
- (H) «517,8 mil» vs «517.8k»: dos formateadores, `paginas/historia-uso.ts:6` (español) y `chat/formatos.ts` `fmtTokens` (inglés, punto decimal y «k/M»).
- (H) «Tienda · Pronto»: literal `tienda: { texto: 'Pronto' }` en `App.tsx:264`, aunque la Tienda está montada y funciona.
- (H) La piel = variables: `tinta/piel.ts:183-193` (`variablesDePiel`) solo produce radios ×factor, `--spacing`, dos familias tipográficas, sombra y la paleta derivada de 4 colores. Composición, jerarquía, iconos, componentes y copy no son de la piel. Por eso Arcilla, Tinta y Luz y la cósmica son la misma app recoloreada (capturas 02-tecla3 vs tyl-2 vs vista-2).
- (H) Un solo acento hace de todo: `derivarPaleta` asigna `--acento`, `--memoria`, `--luz`, `--esmeralda`, `--foco` y `--actividad-4` al MISMO color (`piel.ts:146-152`). No hay color semántico para memoria, agentes o vida.
- (H) Nombres heredados que mienten: `--esmeralda*` es el acento de cualquier piel (lila en Arcilla); `esme.css:1` dice que el estilo por defecto es «Esmeralda» mientras `piel.ts:47` dice que la de casa es «Tinta y Luz».
- (H) Biblioteca de efectos de plantilla: `ui/fondos/*` (23 fondos WebGL de React Bits: Aurora, Galaxy, Hyperspeed, LiquidEther, Plasma…), `ui/efectos/*` (BlurText, GlitchText, ShinyText, ElectricBorder, StarBorder, ClickSpark, GlassSurface), Kokonut UI (`status-island`, `ai-voice`, `ai-loading`), ElevenLabs Orb, `agentfaces`. `MandoVista.tsx:5` lo declara: «Componentes: Kokonut UI (MIT) y React Bits, revisados y copiados».
- (H) Código muerto en `ui/`: `bento-grid.tsx` (1.835 líneas), `action-search-bar.tsx` (1.134), `ai-tool-approval.tsx` (676) sin importar; `components/CommandPalette.tsx`, `components/Panel.tsx`, `panels/SettingsPanel.tsx`, `panels/WorkshopPanel.tsx`, `core/CoreView.tsx`, `atlas/Atlas.tsx` sin importar; `Proximamente` importado en `App.tsx:21` y nunca usado.
- (H) Tres sistemas de personaje compitiendo: (1) `marca/ser.ts` + `SerVista.tsx` (bichitos generados de TU constelación, uno por motor: portada, avisos, barra); (2) `agentfaces` (`AgentFace`, el triángulo con ojos, IGUAL para todos los motores, teñido con el acento: `paginas/Taller.tsx:131`, `taller/FilaMotor.tsx:84`, `taller/Detalle.tsx:57`); (3) la presencia de la piel (`shell/Presencia.tsx`: orbe React Bits, orbe 3D ElevenLabs o cara). Más las marcas `Señal`, `Sello` y `Chispa`.
- (H) Sin escala tipográfica: 24 tamaños `text-[Npx]` distintos en 60 TSX propios (13, 12.5, 12, 11, 15, 13.5, 11.5, 14, 10.5, 19, 22, 16, 34, 14.5, 30, 15.5, 10, 40, 32, 28, 26, 24, 21, 18) + `text-xs/sm/base/lg`; 11 valores de `tracking-[…]`; 77 colores hex literales fuera de los tokens.
- (H) Píldoras por defecto: 142 `rounded-full` frente a 133 usos de los radios de la piel (`rounded-1..4`): la «forma» de la piel no gobierna la mayoría de las formas.
- (H) Capas decorativas simultáneas posibles: `FondoVivo` (papel/aurora + NeuroNoise) + `Escena` (WebGL React Bits) + `RedNeuronal`/`Constelacion` (canvas) + `Vidrio` (GlassSurface SVG) + `Presencia` (WebGL) + halo de cursor (`shell/Luz.ts`, `.hoja::before`) + `ClickSpark` + `ElectricBorder`.
