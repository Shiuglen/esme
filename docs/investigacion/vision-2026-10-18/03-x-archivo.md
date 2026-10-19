# 03 · Archivo de X: lo aprendido, lo que falta y las 15 referencias que más valen

Fecha: 2026-10-18. Parte de la investigación `vision-2026-10-18` (solo investigación y diseño: no se tocó código de la app).
Estado de este fichero: **completo** (secciones 0 a 4). Orden: 0 resumen y diagnóstico · 1 (a) lecciones y su prueba en código · 2 (b) lo no usado aún · 3 (c) las 15 referencias · 4 lo que queda abierto.

## 0. Lo que hay que saber en un minuto

1. **El archivo de X ya dijo qué hacer, y Esme lo aplicó a medias: lo funcional sí, lo visual no.** De las 30 lecciones auditadas abajo, las que están hechas son casi todas de *datos y vida de la interfaz* (código de barras del turno, prisma del chat, hoja de servicio, «Al día», historia de Uso, bichito por motor, deslizar el tiempo, movimiento con carácter). Las que siguen sin hacer son casi todas de *materia y mundo* (grano, trama de puntos, tipografía monumental, ilustración, un personaje con cuarto propio, tinta electrónica) y de *confianza visible* (conflictos, ficha de agente, trazas).
2. **Justo eso último es lo que el creador llama «pésimo» y «chimbo».** La lección central del FYP era «lo analógico vence a lo brillante». ESME.md marca la identidad «Tinta y Luz» como hecha (✅), pero en el código solo vive en islas (el atlas de Memoria, el grabado del Taller, el titular de la portada). El cuerpo de la app, lo que se ve la mayor parte del tiempo, sigue siendo una hoja de cristal con halo de cursor y un color de acento (`styles/esme.css:316-331`).
3. **Esme no tiene ni una sola imagen.** Búsqueda en el repo (fuera de `node_modules`, del cerebro empaquetado y de las salidas de compilación): los únicos ficheros de imagen propios de la app son `app/resources/esme.svg` y `app/resources/esme.png` (el icono). Las referencias que más ganan en X (#43, #178, #113, #54, #172, #80) son todas de ilustración o de personaje. «Assets reales, nunca placeholders» hoy es 0 assets.
4. **La Tienda de pieles es una sola pantalla recoloreada.** De las 12 pieles de lanzamiento (`tinta/pieles-tienda.ts`): 11 llevan un shader WebGL de fondo (el tipo de cosa «brillante» que el FYP desaconseja), 8 usan superficie de vidrio, esmerilado o neón, solo 2 usan «papel», solo 2 cambian la navegación y ninguna cambia la composición de la portada. En la captura `auditoria/05-tecla6.png` las tres primeras tarjetas son la misma maqueta (orbe + «Buenas noches.» + barra) con otro color. Una piel hoy no puede expresar ninguna de las referencias ganadoras: el tipo `Piel` (`tinta/piel.ts:36-44`) no tiene campo de textura, ilustración, marco, escala de tipografía ni mundo del personaje.
5. **Hay munición ya instalada y sin usar:**
   - `@paper-design/shaders-react@0.0.81` (instalado) trae `halftone-dots`, `halftone-cmyk`, `dithering`, `image-dithering`, `grain-gradient`, `dot-grid`, `paper-texture`, `heatmap`… y Esme solo importa `NeuroNoise` y `PaperTexture` (`shell/FondoVivo.tsx:5`).
   - `atlas/terrain.ts` ya convierte la densidad real de tus recuerdos en **altura** (relieve), y `atlas/scene.ts` lo dibuja con curvas de nivel. Ningún fichero monta `<Atlas>` ni `<CoreView>` (búsqueda en el repo): es código de la v1 aparcado. Es la materia prima de «tu mente como cordillera en trama de puntos», que nadie más puede hacer.
6. **Lo que el archivo recomienda y nadie ha empezado** (ordenado en la sección 3): textura impresa como capa de piel; la cordillera de tu mente; ilustración real firmada; el cuarto del ser que crece con el modo; los ojos del ser en las notificaciones; modo tinta electrónica; conflictos cara a cara en la memoria; ficha de agente con «lo que no puede ver»; cascada de trazas.

**Método y límites.** Leídas las 215 publicaciones de `fyp.json` (cada texto y su métrica), las 13 hojas de mosaicos (algunas recortadas y ampliadas 2× para ver detalle), las cuatro notas de síntesis y `ESME.md`. Los originales `fyp2/m/*.jpg` ya no están en disco: solo existen los mosaicos, así que las medidas de color son **muestreos aproximados del mosaico (JPEG, ±)** y las tipografías son **inferencias por la forma**, no nombres verificados. Las cifras de las publicaciones (porcentajes de TencentDB, Synara, etc.) son afirmaciones de terceros y no se han verificado. El FYP es del 12-oct (hace 6 días); la regla de ESME.md es repetirlo cada semana y aquí no se recogió de nuevo (solo lectura de lo ya guardado).

---

## 1. (a) Lecciones ya aprendidas y si están aplicadas

Leyenda: ✅ aplicada y con prueba · 🟡 a medias · ❌ no aplicada. «Prueba» = fichero:línea del repo (`app/src/renderer/…` salvo que se diga otra ruta). Las pruebas de ❌ son la búsqueda que no encontró nada.

### 1.1 Identidad visual (la más importante)

| # | Lección (fuente) | Estado | Prueba |
|---|---|---|---|
| 1 | **Lo analógico vence a lo brillante:** grabado, trama de puntos, serif gigante, fuera el cristal (#178, #43, #113, #192; biblioteca §1; ESME.md:157) | 🟡 islas sí, cuerpo no | ✅ `memoria/pintar.ts:61,74` (nombres de tema como atlas grabado en Bodoni cursiva y trama de puntos debajo); `memoria/RedNeuronal.tsx:4`; `taller/grabado.ts:1-3` y `taller/Escena.tsx:112,186` (rayado como grabado, esgrafiado de noche); `shell/FondoVivo.tsx:2-5` (papel de algodón con fibras + sol de tu hora); `marca/SelloVista.tsx:31` (sello con `feTurbulence`); `paginas/MandoVista.tsx:107` (titular serif cursivo hasta 88 px). ❌ la búsqueda de `halftone | medio tono | tramado | stipple | dither` fuera de `renderer/ui/` no da **ningún** resultado: no hay textura de trama ni de grano como capa de la app. (La «trama de puntos» de `memoria/pintar.ts:38,74` es el dibujo de cantidad de recuerdos bajo cada rótulo; y el único grano es la escena de fondo «Degradado con grano», `tinta/escenas.ts:40`, que ninguna de las 12 pieles de Tienda usa.) |
| 2 | **El cristal con malla de gradiente es tendencia, no identidad: rehacerlo** (biblioteca §1; ESME.md:157) | 🟡 | La piel de casa ya pide superficie «papel» (`tinta/piezas.ts`, `PIEZAS_BASE`) y el CSS la deja plana (`styles/esme.css:384`). Pero la regla base `.hoja` sigue siendo cristal: `backdrop-filter: blur(28px) saturate(1.6)`, brillo interior y borde de luz que sigue al cursor (`styles/esme.css:316-331`); `shell/Vidrio.tsx:1-8` aún monta `GlassSurface`. Y 8 de las 12 pieles de Tienda eligen vidrio, esmerilado o neón. |
| 3 | **La piel de la casa debería ser papel de verdad** (tinta y luz de día y de noche) | ❌ | `PIEL_BASE.fondo = 'liso'` (`tinta/piel.ts:53`): la piel «Tinta y Luz» no pinta el papel; el papel con fibras solo sale si eliges `fondo: 'papel'` (solo «Grabado» y «Editorial» en `tinta/pieles-casa.ts:10-11,22-23`). En la captura `scratchpad/tyl-1.png` la casa es azul marino plano con teal: correcto y limpio, pero sin materia. |
| 4 | **Cada diseño es una composición distinta, no un recoloreado** (#113, #118; pedido del creador «diseños completos») | ❌ | `Piel` solo decide color, letra, forma, densidad, movimiento, carácter, fondo (`liso|aurora|papel`), navegación, portada (`mando|mente`), escena, presencia y piezas (`tinta/piel.ts:32-44`). Tienda: 11/12 con shader de fondo, todas con `portada: mando`. |
| 5 | **Tipografía y cifras a escala monumental** (#43 wordmark a sangre, #198 cifras gigantes, Anatomy, Cardinal en `lenguaje-visual-v2`) | 🟡 | ✅ titulares itálicos grandes en portada (`MandoVista.tsx:107`) y en Uso (`Uso.tsx:77`). ❌ las cifras de Uso son de 30 px en peso fino (`paginas/Uso.tsx:24`; captura `auditoria/04-tecla5.png`); ningún wordmark cortado por el borde; la Prueba 0 no se enseña en cifras. |
| 6 | **Lo brillante solo donde hay vida** («la vida es luz»; ESME.md:157) | ✅ | `shell/FondoVivo.tsx:10-14` (luz bioluminiscente solo mientras la mente piensa o recuerda); `memoria/pintar.ts` (lo fresco arde; lo viejo asienta). Contradicción: la captura de hoy (`auditoria/00-tecla1.png`) lleva puesta «Arcilla», con halo violeta en cada contenedor, aunque no sea la piel de casa. |
| 7 | **Claro y oscuro gemelos, ambos legibles** (#146) | ✅ | `tinta/piel.ts` `derivarPaleta(b, 'noche'\|'dia')` y `revisarContraste` con 8 pares AA. ❌ en Tienda los previews solo se ven de noche (captura `05-tecla6.png`). |

### 1.2 El ser y el mundo del personaje

| # | Lección (fuente) | Estado | Prueba |
|---|---|---|---|
| 8 | **Una mascota distinta por motor** (#27 dsh-TUI, #54, #80) | ✅ | `marca/ser.ts:1-4` (bichito determinista nacido de la constelación de tu mente); `marca/SerVista.tsx:1,34`; usado en `paginas/Ajustes.tsx:104,159,160,170`, `taller/NuevaTarea.tsx:14`, `paginas/MandoVista.tsx:28`. Y es lo que Esme hace mejor que la referencia: nace de tu red. |
| 9 | **El entorno del personaje cuenta el estado:** cuarto vacío con poco esfuerzo, laboratorio con el máximo (#54; biblioteca §2) | ❌ | No existe la UI de modos visibles (`Explorar`, `Evolucionar`, `Sombra` no aparecen en ningún componente, solo en la fila de `ESME.md:153`). `ser.ts` no tiene entorno ni poses. Lo más cercano es el **esfuerzo del motor como `<select>` nativo** (`taller/Opciones.tsx:1-20`, «Esfuerzo: Alto»): justo lo que #54 convierte en una escena. |
| 10 | **El ser vive en los bordes, en las notificaciones y en la pantalla de bloqueo** (#172 Lupo, Notch de bookmarks) | ❌ | Las notificaciones son texto plano: `App.tsx:121` (`new Notification('esme', {body…})`) y `main/index.ts:47` (`avisar`, solo el icono de la app). Presencia solo mapea estado a orbe/cara (`shell/Presencia.tsx:13-14`). |
| 11 | **Hoja de personaje coherente en varias poses** (#80) | ❌ | `grep pose\|postura\|expresi` no da nada en `marca/`. |
| 12 | **El color reacciona a la emoción de la voz, en local** (`2026-10-11-diseno-x.md`, Jakubantalik) | ❌ | `Presencia.tsx` solo recibe nivel de voz (`nivelTu`, `nivelElla`), no emoción. |

### 1.3 Memoria y confianza

| # | Lección (fuente) | Estado | Prueba |
|---|---|---|---|
| 13 | **La mente se dibuja sola, con el tiempo deslizable** (biblioteca §1; marcadores 17-oct) | ✅ | `memoria/tiempo.ts:1`, `memoria/TiempoVista.tsx:30` (rango con histograma), `memoria/RedNeuronal.tsx:189` (la gota se seca). |
| 14 | **Conflictos entre fuentes con decisión del usuario** (#10: «Usa la de 2024 / Pregúntame cada vez / Quita la de 2022») | ❌ | `grep -i conflicto` solo encuentra `lib/cn.ts:4` (conflictos de clases de Tailwind). |
| 15 | **Paquete de contexto visible y acotado: objetivo, presupuesto de tokens, tope de sensibilidad** (#160) | ❌ | Búsqueda de `paquete de contexto\|presupuesto de tokens\|sensibilidad`: sin resultados. |
| 16 | **Memoria a corto plazo en símbolos Mermaid + largo plazo en personas y escenas** (#158 TencentDB) | ❌ | `grep mermaid`: sin resultados. ESME.md:178-183 lo lista como paso 9 pendiente. |
| 17 | **Cifras de la Prueba 0 a la vista, en grande** (#198) | ❌ | Búsqueda de `Prueba 0` en `renderer/`: no hay pantalla. El resultado (recall 0,77) solo vive en ESME.md:146. |

### 1.4 Agentes, Taller y trazas

| # | Lección (fuente) | Estado | Prueba |
|---|---|---|---|
| 18 | **Código de barras del turno** (#4) | ✅ | `taller/vista.ts:14-15` (`barrasDe`, píldoras que conservan picos); `taller/Detalle.tsx:93-96` (con sus dos orillas de tiempo); `taller/Micrografica.tsx:45`. Diferencia con el original: en #4 el **ancho** de cada píldora es la duración de un paso con nombre y se compara con la ejecución anterior («was 31s»); en Esme la altura es actividad por cubo. |
| 19 | **Cascada (waterfall) de trazas por llamada, herramienta y comprobación** (#123, #33 Charm/Rex) | ❌ | `grep cascada\|waterfall` sin resultados. |
| 20 | **Ficha del agente: autonomía, herramientas con alcance, credenciales y «lo que no puede ver»** (#122 Atlas) | 🟡 | ✅ el permiso por llamada: `main/conversacion-agente.ts:3,35-63`, `chat/PasosVivos.tsx:37` (`PidePermiso`) y `lanzador/Lanzador.tsx:10,28` (una vez / siempre / no). ❌ no hay ficha por motor con interruptores, alcance, último uso, rotación de claves ni lista de lo invisible (`grep "no puede ver"`: nada). |
| 21 | **Bandeja de borradores que esperan tu visto bueno, con el modelo junto a Enviar** (#74) | ❌ | `grep borrador\|visto bueno\|bandeja` solo da la bandeja del sistema (`main/index.ts:28-60`). |
| 22 | **Arena: mismos prompts en varios modelos, lado a lado** (#117) | ✅ | `taller/Arena.tsx:1-2`. |
| 23 | **Subagentes en un muelle lateral con paso actual, tiempo y resultado** (#198 Synara, bookmarks) | ❌ | Solo aparece «subagentes» en `main/uso/externo.ts:90` (contabilidad), no hay muelle. |
| 24 | **La interfaz generativa: el chat responde con gráficas, diagramas, mini apps** (#7, #55, #174) | ✅ | `chat/Markdown.tsx:2-13` (tablas numéricas pintan su gráfica), `chat/prisma.ts`, `chat/PrismaVista.tsx`; probado con motor real (ESME.md:189-192, 223-232). Falta: área/línea, Mermaid propio, mini apps (MCP Apps, ESME.md:135). |
| 25 | **La pantalla nace al pedirla y muere al terminar** (Agently) | ✅ | `taller/hoja.ts:1-36` (`fraseServicio`), `shell/HojasVivas.tsx:1-3` (nace en cualquier sección). |

### 1.5 Uso, lanzador, sistema

| # | Lección (fuente) | Estado | Prueba |
|---|---|---|---|
| 26 | **Uso cuenta historias, no tablas** (#105 «Where the profit went») | 🟡 | ✅ `paginas/historia-uso.ts:1-20` y `Uso.tsx:77`. ❌ sin cascada visual, sin ranking por motor ni auditoría de cambios de política (`grep ranking\|leaderboard\|auditor` en Uso: nada). KPI sin acción salvo «pon un tope →». |
| 27 | **«¿Qué me perdí hoy?»: registro como frases** (zaquatr; marcadores) | ✅ | `paginas/diario.ts` y `paginas/AlDia.tsx` (ESME.md:115). El feed único del Taller («Qwen Code terminó X en Y hace 5 min») sigue como idea. |
| 28 | **Movimiento con carácter físico (pesado, magnético, lanzado)** (diip3sh) | ✅ | `tinta/caracter.ts:1-37` (ω y ζ sobre cada muelle) y el control de Apariencia. Pendiente: vocabulario de sensación en lenguaje natural al pedir una piel. |
| 29 | **Lanzador global y ventana mínima de barra de menú** (#75; Raycast; Notch) | ✅ | `lanzador/Lanzador.tsx:1-3` (Ctrl+Mayús+Espacio, tres modos), `main/lanzador/ventana.ts`. Falta el estado vacío ilustrado de #75. |
| 30 | **Búsqueda tan rápida que se siente memoria** (#42, #149, #153) | 🟡 | `shell/Paleta.tsx:1-3` (Ctrl+K, recientes). Sin filtros, sin consultas sugeridas, sin latencia visible. |

**Recuento:** ✅ 11 · 🟡 6 · ❌ 13 de las 30 filas. Patrón: lo que se aplicó es *información* (barras, prisma, historia, frases); lo que no es *materia* (textura, ilustración, escala, mundo del ser, e-ink) y *confianza visible* (conflictos, ficha de agente, trazas).

---

## 2. (b) Lo que el archivo ofrece y Esme aún no ha usado (y debería)

Criterio: entra lo que (1) cambia lo que el creador ve el 90 % del tiempo, (2) ya está en el archivo de X, (3) Esme puede hacerlo mejor que la referencia porque tiene datos reales de una mente, y (4) respeta lo permanente (consumo casi nulo, nada de copiar interfaces ajenas, piel = solo datos). Coste: **S** ≤ 1 día · **M** 2-5 días · **L** más de una semana. Son estimaciones mías, no medidas.

### 2.1 Prioridad P0: cambia la percepción de toda la app

| # | Qué falta | Fuente | Dónde (pantallas) | Coste | Cómo lo supera Esme |
|---|---|---|---|---|---|
| B1 | **Capa de materia impresa en la piel:** grano, trama de puntos (medio tono) y tramado de grises, aplicable al fondo, a las láminas y a las barras de Uso. Ya está instalado `@paper-design/shaders-react@0.0.81` con `halftone-dots`, `halftone-cmyk`, `dithering`, `image-dithering`, `grain-gradient`, `dot-grid` y `paper-texture`; Esme solo usa `NeuroNoise` y `PaperTexture` (`shell/FondoVivo.tsx:5`) | #43, #178, #113 | Todas; sobre todo Portada, Memoria, Tienda | S-M | Nadie en el FYP tiene el sello de la propia mente: el grano de Esme cambia con la **edad de la tinta** (`tinta/trazo.ts:6-7`, `envejecimiento`: escala logarítmica, 0 hoy y 1 al año) |
| B2 | **Tu mente como cordillera:** resucitar `atlas/terrain.ts` (`heightGrid`: densidad real de recuerdos → altura, 33 líneas y con test) y dibujarla en 2D con trama de puntos, silueta crema sobre negro de noche, tinta verde sobre menta de día, con el nombre del usuario (o «esme») gigante cortado por el borde. `atlas/Atlas.tsx` y `core/CoreView.tsx` existen y no se montan en ningún sitio | #43 (silueta de puntos crema), #113 | Pie de la Portada, cabecera de Memoria, hero de Tienda, tarjeta compartible de tu mente | M | Los demás compran un paisaje; el de Esme **se calcula**: cada pico es un tema tuyo y no hay dos iguales (principio aprobado, ESME.md:34) |
| B3 | **Ilustración real, firmada y con procedencia.** Hoy hay 0 imágenes en la app (solo `resources/esme.svg|png`). Un set corto (6-8 láminas): paisaje de día, de noche, grabado botánico, interior del cuarto del ser. Vías: láminas de dominio público (grabados botánicos y paisajes de colecciones abiertas; **hipótesis a verificar lámina por lámina**, no he comprobado licencias), o generadas con las herramientas que el creador ya tiene (conectores Adobe/Canva/Figma y créditos de Higgsfield, ESME.md:97) y siempre pasadas por trama/dither para que parezcan una sola mano | #178, #113, #54, #80 | Tienda, Portada, estados vacíos, bienvenida | M | Cada lámina lleva su fuente y su licencia anotadas (regla de «nunca secretos» y de transparencia de Esme); no se «pega» ilustración: se **trata** con la trama de la piel |
| B4 | **Escala monumental:** wordmark o nombre sangrado por el borde, titulares serif de 88-140 px, cifras de 96-160 px. Esme tiene titulares grandes (`MandoVista.tsx:107`) pero KPI de 30 px (`Uso.tsx:24`) | #43, #198, #178 | Uso, Portada, Tienda, Prueba 0 | S | La cifra gigante es una medida de la propia Esme (recall 0,77; recuerda en 160-290 ms, ESME.md:144-146), con su antes y después |
| B5 | **Lenguaje de imprenta:** filetes finos, retícula de líneas verticales en el margen, marcas de registro en las esquinas (cruces «+»), etiquetas en mono con versalitas («FIG. 1», «N.º 2.346 · 17 TEMAS»). Sustituye el halo de cursor de `.hoja::before` (`styles/esme.css:323-325`) | #178 (retícula), #61 (marco con cruces) | Todas las hojas y tarjetas | S | Cada lámina de Esme se numera con datos reales de la mente (recuerdos, temas, conexiones) |

### 2.2 Prioridad P1: el ser, el consumo y la confianza visible

| # | Qué falta | Fuente | Dónde | Coste | Cómo lo supera Esme |
|---|---|---|---|---|---|
| B6 | **El cuarto del ser que crece con el modo y el esfuerzo.** Explorar = biblioteca (un libro por tema real), Construir = banco con las herramientas MCP conectadas, Evolucionar = pizarra con la curva de la Prueba 0, Sombra = cuarto a oscuras con una vela. El selector de esfuerzo (hoy un `<select>` en `taller/Opciones.tsx:5-20`; en el chat ni existe) lo gobierna. Se dibuja con la tinta de la piel, no en píxeles prestados | #54 | Conversación (selector), Portada, Taller | L | El cuarto muestra el estado verdadero (el de #54 es decorativo): los libros son tus temas, el corcho son tus tareas del Taller |
| B7 | **Los ojos en el borde y en las notificaciones:** notificación nativa con el ser en su estado, icono de bandeja que parpadea, y el ser reducido a dos óvalos como firma mínima en modo Sombra (`App.tsx:121` y `main/index.ts:47` hoy mandan texto plano) | #172, Notch (bookmarks) | Notificaciones, bandeja, lanzador | S-M | Los ojos miran hacia lo que pide atención (la tarea que falló, el permiso pendiente): «nunca finge afecto» (ESME.md:91) |
| B8 | **Modo «Papel electrónico»:** actualización por regiones con 2 fotogramas y ghosting de 4 grises + una tinta, sin blur ni sombras. Encaja con el requisito «en reposo no hace trabajo» (ESME.md:19) | #192 | Piel de Tienda y modo de ahorro; Memoria | M | La interfaz es lenta **y barata de verdad**: se mide PSS y CPU antes y después, como ya manda ESME.md:19 |
| B9 | **Conflictos cara a cara en Memoria › Absorber** («lo que encontró en 24 ficheros: 12 marcos, 8 recomendaciones…» + tarjeta de conflicto con dos citas y «Usa la de 2024 / Pregúntame cada vez / Quita la de 2022») | #10 | Memoria (panel izquierdo) | M (+ backend) | Cada cita lleva su sello de edad y su DNI por recuerdo (sistema inmune, ESME.md:41); la decisión queda como recuerdo |
| B10 | **Ficha de agente por motor:** KPI reales, pestañas Autonomía / Herramientas / Actividad / Memoria, interruptor por herramienta MCP con alcance y último uso, rotación de credenciales y la columna **«lo que X no puede ver»** (carpetas fuera del proyecto, claves del llavero, memoria de otros motores). Los datos ya existen (tareas del Taller, permisos, llavero, MCP); falta la vista | #122 | Ajustes › Motores, Taller | M | «Lo que no puede ver» es una garantía técnica (copia aislada del Taller), no un texto de marketing |
| B11 | **Cascada de trazas del turno** (petición → llamada al modelo → herramienta → comprobación de permiso, barras horizontales con sangría y registro adjunto) | #123, #33, #4 | Taller › Detalle | M | Marca los pasos que dijeron «200» y aun así fallaron la comprobación (la idea de #123) y enlaza cada fila con el recuerdo que usó |
| B12 | **Paquete de contexto visible:** al pulsar «con memoria» se ve lo que se le dio a la IA (objetivo, presupuesto de tokens, tope de sensibilidad, huella y no texto) | #160, #158 | Conversación, Taller | M | Es el Tálamo hecho visible: nadie enseña por qué esa IA acertó |
| B13 | **Bandeja de borradores que esperan tu visto bueno**, con el modelo al lado del botón Enviar | #74 | Taller / Agenda / Manos | M | Respeta «nunca enviar sin permiso» y deja ver qué modelo lo redactó y a qué precio |

### 2.3 Prioridad P2: Uso, Tienda y sistema

| # | Qué falta | Fuente | Dónde | Coste |
|---|---|---|---|---|
| B14 | **Uso como historia visual:** cascada «Dónde se fue tu dinero» (columnas que bajan con tramos de fuga en color de atención), tarjeta de insight con degradado (la única superficie luminosa que se permite), ranking por motor y auditoría de cambios de presupuesto y permisos | #105, #78, #144 | Uso | M |
| B15 | **Previews de piel como pantalla entera y gemela:** cada tarjeta de Tienda enseña la portada real partida en día y noche, y una **hoja de guía de marca** desplegable (símbolo, tipografía, color, uso) | #146, #118, #113 | Tienda | S-M |
| B16 | **Terminal fundida con el fondo** y portadas tipográficas por motor (como «DEEPSEEK HARNESS» / «CODEX HARNESS» en #27) | #69, #27, #33 | Cajón de terminales del Taller | S |
| B17 | **Paleta Ctrl+K con filtros, consultas sugeridas y latencia visible** («160 ms») | #149, #42, #153 | Paleta (`shell/Paleta.tsx`) | S |
| B18 | **Chequeo de identidad antes de vestir una piel generada** (barra anti-cliché: rechaza «violeta sobre negro con halo», exige textura, escala y una lámina). Hoy «Pídesela a Esme» valida contraste (`tinta/piel.ts` `revisarContraste`), no gusto | uizze.sh y React Bits (bookmarks-2026-10-16) | Ajustes › Apariencia | S-M |
| B19 | **Muelle de subagentes** (paso actual, tiempo y resultado; abrir, mensajar, minimizar, parar) | #198 Synara, bookmarks | Taller | M |
| B20 | **Estado vacío ilustrado y ventana mínima del lanzador** | #75 | Lanzador | S |

### 2.4 Consecuencia para el esquema de piel

Las referencias ganadoras no caben en el `Piel` actual. Propuesta **mínima, solo datos** (se validaría como el resto, con lista cerrada de valores y tope de intensidades; no se permite código ni URL):

```
textura:    { tipo: 'ninguna' | 'grano' | 'trama' | 'puntos' | 'papel', fuerza: 0–1 }
marco:      'ninguno' | 'filete' | 'registro' | 'doble'      // registro = cruces en las esquinas
reticula:   boolean                                           // líneas verticales de margen
display:    { escala: 1 | 1.6 | 2.4, sangrado: boolean }      // wordmark y cifras monumentales
ilustracion:{ id: 'cordillera' | 'paisaje' | 'botanica' | …, tratamiento: 'tal-cual' | 'trama' | 'dither' }
mundo:      'solo-bicho' | 'cuarto-por-modo' | 'ojos'
pantalla:   'viva' | 'tinta-e'
portada:    'mando' | 'mente' | 'lamina' | 'cordillera'       // hoy solo 'mando' | 'mente' (piel.ts:34)
```

Con esto, 4 de las 15 referencias de la sección 3 se convierten en pieles de verdad (#43 «Cordillera», #178 «Herbario», #54 «Cuarto», #192 «Papel electrónico») y la Tienda deja de ser una pantalla recoloreada.

### 2.5 Orden recomendado

1. **B1 + B5 + B4** (textura, imprenta, escala): S-M, se ve en todas las pantallas y no depende de assets. Resuelve «el cristal violeta».
2. **B2** (cordillera): da el primer asset real y único. Depende de B1.
3. **B3** (láminas): una vez que existe el tratamiento de B1, las láminas encajan.
4. **B9, B10, B11, B12** (confianza visible): vistas sobre datos que ya existen en gran parte.
5. **B6, B7, B8** (el ser con mundo, ojos, papel electrónico): el golpe de personalidad.

### 2.6 Lo que del archivo NO entra (y por qué)

- **Ingeniería inversa y pentesting autónomo** (REA #193, PentAGI #2/#3/#84, OrcaCyber Zero #70/#92/#143, jailbreak de PS5 #124): choca con el límite permanente de ESME.md:137 («nada de ingeniería inversa de productos ajenos»).
- **VOID de BlackBit (#61):** solo el recurso gráfico (marco con cruces, mono). El producto —un modelo sin negativas— no se copia; la regla de ESME.md:59-61 es mostrar los modelos que sí pueden y que **el usuario elija**, con transparencia.
- **Piratería, cuentas falsas, cripto, apuestas, humo de «trucos para ganar dinero»** (#23, #62, #124, #136, #137 y otros): fuera, como ya dice la biblioteca §7.
- **Las cifras de terceros** (TencentDB −61 % de tokens, Synara −27 %, PersonaMem 48→76 %): sirven como dirección, no como dato. Esme debe medir las suyas con la Prueba 0.

---

## 3. (c) Las 15 referencias visuales más potentes del material

Cómo leer cada ficha. **Número** = posición en `fyp.json` y hoja donde está el mosaico. **Se ve** = composición medida sobre el mosaico (algunos ampliados 2×). **Tipo** = por la forma; los nombres de fuente son inferencias. **Color** = muestreos aproximados (±) salvo que diga «a ojo». **Movimiento** = solo si el post es vídeo (los mosaicos de vídeo traen 6 fotogramas) o la foto lo sugiere. **Sirve a** = pantalla de Esme. **Se toma / se supera** = la idea que se absorbe y cómo Esme la hace suya (nunca copiar la interfaz: ESME.md:137).

El orden es por potencia para el problema del creador (lo visual «pésimo»), no por likes.

### R1 · #43 «Pies de página» (@TheKartikBansal) · hoja-02 · 158 ♥, 151 guardados
- **Se ve:** cuatro pies de página como franjas anchas con dos pisos. Arriba, un bloque de enlaces en columnas diminutas (Producto / Empresa / Recursos / Legal), logotipo y redes a la izquierda. Abajo, **un paisaje a sangre** que ocupa entre el 45 y el 55 % de la altura y sale por los lados y por el borde inferior; sobre él o junto a él, un **wordmark gigante cortado por el borde** («Lumen Studio» blanco sobre negro; «Nulltrace» con las letras desbordando a la derecha). Las cuatro variantes: (1) colinas lisas en degradado rosa-lila-rojo con **grano visible** sobre niebla blanca (`#baa9c4`, `#a5586d`, `#f1dfe1`); (2) fotografía borrosa de trigo con barrido de movimiento sobre cielo turquesa (`#b6d6ca`) con grotesca condensada en mayúsculas y enlaces subrayados enormes; (3) fondo casi negro (`#1e181c`) con una **silueta de montaña en crema (`#d5cfc9`) hecha de puntos que se disuelven** y el wordmark blanco encima; (4) verdes de aguada en capas (`#83a393` a `#cde3d8`) en **trama de puntos de medio tono** sobre menta casi blanca.
- **Tipo:** sans neutra pequeña para la información; el wordmark es una sans geométrica de ~1/3 de la altura del pie.
- **Movimiento:** estático.
- **Sirve a:** pie de la Portada, cabecera de Memoria, hero de Tienda, tarjeta compartible de tu mente.
- **Se toma:** paisaje de materia (grano y puntos) + nombre sangrado. **Se supera:** el paisaje es **tu cordillera** (`atlas/terrain.ts` ya convierte tus recuerdos en altura) y el nombre es el tuyo. Ningún estudio puede vender esto: no hay dos iguales.

### R2 · #178 «Lumen» (@zahragr8r) · hoja-11 · 62 ♥, 53 guardados (el diseño es «Homevio»)
- **Se ve:** una web de una sola columna sobre **papel crema** (marco exterior `#e8e7e2`, hoja interior casi blanca `#fcfdfc`) con una **retícula de filetes verticales finísimos** en los márgenes. Titular en dos líneas centradas con cada palabra capitalizada («Build Software At The Speed Of Thought.»), párrafo gris pequeño, dos botones (negro sólido y contorno). Del borde inferior asoma la captura del producto montada **sobre una lámina de grabado botánico** (hojas, flores, mariposas, en acuarela apagada). Tercer cuadro (variante oscura): negro cálido `#14130e`, titular en gris cálido, gráfico de barras en gris con la barra activa más clara, lista de atajos en mono. Cuarto: «Honest Pricing. No Surprises.» con dos tarjetas de plan sobre crema, botón negro.
- **Tipo:** serif editorial de contraste alto para titulares (de la familia de Instrument Serif o Newsreader, inferencia); sans para la interfaz; mono para teclas y código.
- **Color:** crema, negro y gris. **Un solo acento**, el verde de la flora. Cero degradados.
- **Movimiento:** en el mosaico, un cursor de texto escribe el párrafo (la frase se completa); nada más.
- **Sirve a:** Portada (hero), tarjetas de Tienda, estados vacíos, hoja «Nueva tarea».
- **Se toma:** el producto vive **sobre la lámina**, no sobre un gradiente. **Se supera:** el «herbario de tu mente»: cada tema nace como un espécimen grabado determinista a partir de su semilla (como los bichitos de `marca/ser.ts`, que ya nacen de la constelación), sin ilustraciones prestadas.

### R3 · #113 «Los diseños más queridos» (@uixhassan) · hoja-06 · 244 ♥, 194 guardados
- **Se ve:** cuatro landings con **héroe de paisaje pintado**: acantilados verdes con vegetación (`#6e745f`, `#bebda1`) que se funden en niebla blanca hacia el centro, donde va el titular; dunas de arena con la captura del producto cruzando el horizonte; una bahía turquesa entre rocas con las marcas de clientes en una banda translúcida al pie; un valle verde con un camino sinuoso (`#142410` a `#5b7649`) bajo cielo gris claro. El titular flota en el aire limpio, **entre dos masas de paisaje** («Run Your Business, Without The Busywork.», «Less Chasing. More Creating.», «Every customer leaves a trail»).
- **Tipo:** serif de peso medio en dos líneas centradas, negro; botón pill con el color de marca (azul, verde oscuro, negro).
- **Movimiento:** estático.
- **Sirve a:** bienvenida «la mente despierta», Portada en una piel «Paisaje», cabecera de Tienda.
- **Se toma:** aire + paisaje + serif; la UI entra en el paisaje. **Se supera:** el paisaje se pinta desde tus datos (R1) y cambia con la hora de tu sol (`tinta/sol.ts` ya calcula el ángulo).

### R4 · #54 «Niveles de esfuerzo de Claude» (@adocomplete) · hoja-02 · 1.062 ♥, 369 guardados, 81 mil reproducciones
- **Se ve:** seis fotogramas de una escena. Cuarto beige cálido (`#eae4d6`, suelo `#dcd4c4`) en pixel art de paleta recortada: un personaje cuadrúpedo rojo ladrillo con martillo en el lomo, una ventana con nube, una planta, un bicho rojo en el suelo. Arriba izquierda, el **nivel como palabra serif** grande («low», «medium», «xhigh», «max») con la etiqueta «EFFORT» en mono diminuto; arriba derecha, dos medidores de píldoras «DEPTH» (rojo) y «SPEED» (azul); abajo, un selector de cinco puntos y una frase explicativa. **El cuarto cambia con el nivel:** low y medium = vacío con un check verde y un botón «Replay»; xhigh = libros apilados, corcho con hilo rojo, pizarra con diagrama y una taza; max = el personaje con bata y gafas, pizarra verde con ecuaciones, osciloscopio, bobina Tesla y una prensa con franja amarilla y negra.
- **Movimiento:** al cambiar de nivel entran y salen los objetos; el personaje se anima.
- **Sirve a:** selector de esfuerzo del chat, Modos visibles (Explorar / Construir / Evolucionar / Sombra), fila de motor del Taller.
- **Se toma:** «el entorno cuenta el estado». **Se supera:** los objetos del cuarto son **datos reales** (los libros son tus temas, el corcho tus tareas, la pizarra la curva de la Prueba 0), dibujados con la tinta y la trama de la piel, no en píxeles prestados.

### R5 · #172 «Lupo» (@LexnLin, hecho con Opus 5.5 high) · hoja-11 · 260 ♥, 160 guardados
- **Se ve:** seis planos de una pieza de marca. (1) papel azul pálido con columnas de texto mono minúsculo y una cápsula amarilla con tres puntos de escritura; (2) un teléfono en perspectiva con burbujas amarillas y negras y una tarjeta de reserva; (3) **pantalla de bloqueo** azul noche con reloj enorme «6:12», una píldora amarilla «7:30» y una notificación de cristal con el icono amarillo de dos ojos («Your 8:40 to Porto got canceled… Go back to sleep.»); (4) sobre amarillo y azul claro, un billete «Coach 4 · Seat 41 · Aisle» que sale de un cuadrado amarillo con dos ojos junto al wordmark «books.» en negro grueso; (5) texto en columnas sobre azul petróleo; (6) **negro total con dos óvalos amarillos verticales**: la marca entera son dos ojos.
- **Tipo:** sans redondeada gruesa en negro + mono para listas.
- **Color:** un amarillo saturado (`#f2de84` sobre fondos azules) como único acento.
- **Movimiento:** parpadeo, texto que cae en cascada, el cuadrado amarillo se desliza; con sonido (el post dice «sfx mejorado»).
- **Sirve a:** notificaciones nativas, bandeja, píldora del lanzador, modo Sombra.
- **Se toma:** la identidad mínima (dos óvalos) que vive en los bordes y habla con voz propia («vuelve a dormir»). **Se supera:** los ojos miran **hacia lo que pide atención** y reflejan el estado real de la mente (`tinta/estado.ts`); nunca fingen afecto (ESME.md:91).

### R6 · #4 «Estado del despliegue» (@PostiauxCharles) · hoja-00 · 386 ♥, 382 guardados
- **Se ve:** tarjeta casi negra (`#111111`, esquinas redondeadas, sin sombra). Título «Update pricing page» con subtítulo gris «usuario · main / a3f91c2». A la izquierda, **tiempos en mono gris** (00:02, 00:21, 00:24, 00:25) junto a un raíl vertical de un píxel con nodos blancos; los pasos largos son una barra blanca vertical con «was 31s» debajo (comparación con la vez anterior). Vista alternativa: **una barra horizontal de ~25 píldoras verticales de anchos distintos** (el ancho es la duración; la más larga, «deploy · 18s», es un bloque blanco macizo; el primer tramo, gris), con las etiquetas «24s» y «deploy · 18s» encima y los hitos «00:24 / 00:42» debajo; en pequeño, «42s» en blanco con un punto verde «Live».
- **Tipo:** sans neutra y mono para tiempos.
- **Color:** negro, blanco, grises; el único color es el verde de «live».
- **Movimiento:** la barra se construye de izquierda a derecha y el raíl se completa.
- **Sirve a:** Detalle del Taller y hoja de servicio (ya hechos a medias: `taller/vista.ts:14`, `Detalle.tsx:93`).
- **Se toma:** el ancho como duración y la comparación «was 31s». **Se supera:** la comparación es con **la última vez que Esme hizo lo mismo** (lo sabe por la memoria) y las píldoras llevan la tinta del motor.

### R7 · #198 «Synara: cifras antes y después» (@trySynara) · hoja-12 · 38 ♥
- **Se ve:** blanco puro (89 % de la imagen). Un isotipo negro diminuto centrado; titular «Faster with Opus 5.5.» en grotesca negra de peso medio; subtítulo gris «Every fix benchmarked before and after.»; **cuatro columnas separadas por filetes verticales**, cada una con una cifra de ~96 px («27 %», «2×», «98 %», «2→1») y una etiqueta gris de dos líneas debajo.
- **Tipo:** grotesca neutra; las cifras en peso medio, apretadas.
- **Color:** ninguno.
- **Movimiento:** estático.
- **Sirve a:** cabecera de Uso, Prueba 0, cierre de una tarea del Taller.
- **Se toma:** cuatro cifras, un filete y nada más. **Se supera:** las cifras llevan su fuente y su antes y después, y son las que Esme mide de verdad (recall 0,77, recuerda en 160–290 ms: ESME.md:144-146), no las de un tercero.

### R8 · #10 «Retainr · Conocimiento» (@nizamdesign) · hoja-00 · 137 ♥, 178 guardados
- **Se ve:** chasis gris claro con tarjeta blanca; barra lateral con grupos en versalitas («BUILD», «PRACTICE»); migas de pan; botón principal **naranja-rojo cálido** a la derecha; barra de pasos 1–5 con el paso 2 en círculo naranja-rojo y los demás grises. Dos cajas: zona de soltar ficheros con borde discontinuo y «Add files», y «What the AI found in 24 files» con **cuatro cifras grandes separadas por filetes** (12 marcos, 8 recomendaciones, 34 ejemplos, 6 ignorados con punto ámbar). Pestañas con contadores, tabla con insignias verde «APPROVED» y ámbar «NEEDS REVIEW». Una fila desplegada con icono de alerta y etiqueta mono **«CONFLICT»** y dos citas en cajas grises lado a lado; abajo, tres acciones: botón relleno rosado «Use the 2024 version», botón de contorno «Ask me each time» y enlace «Remove the 2022 version».
- **Tipo:** sans neutra tipo Inter; mono para insignias.
- **Movimiento:** estático.
- **Sirve a:** Memoria › Absorber (el panel izquierdo).
- **Se toma:** el conflicto como tarjeta con dos citas y tres salidas. **Se supera:** cada cita lleva su **sello de edad** y su DNI por recuerdo (sistema inmune, ESME.md:41) y la decisión queda como recuerdo con certificado.

### R9 · #122 «Atlas: ficha de agente» (@iliasconfidency) · hoja-07 · 8 ♥
- **Se ve:** chasis gris azulado con tarjeta blanca de esquinas muy redondeadas. **Cabecera de ficha en verde bosque casi negro (`#0c2e2d`)** a todo el ancho: icono azul de camión, nombre «Atlas» con insignia «Active», y cuatro KPI en blanco a la derecha (288 tareas · 96,8 % éxito · 4,1 % pidió ayuda · 7,2 h ahorradas) con botones «Ask Atlas» y «Pause». Pestañas con contadores (Autonomía, Herramientas y acceso, Rendimiento, Actividad, Memoria). Debajo, la tabla «Tools Atlas can use» con columnas SYSTEM · ACCESS · SCOPE · LAST USED y un **interruptor teal** al final de cada fila; insignias grises («Read») y ámbar («Write holds», «Send after approval»); la última fila, «No access», atenuada con el interruptor apagado. A la derecha: «Credentials» (cada llave con «Rotates 21 Oct») y **«What Atlas cannot see»** (nóminas, números de tarjeta completos, la memoria de otros agentes, aprobaciones financieras) con candados, y una solicitud de acceso rechazada.
- **Tipo:** sans neutra ligera; cifras finas.
- **Movimiento:** estático.
- **Sirve a:** Ajustes › Motores (ficha de cada motor), Autonomía y permisos del Taller.
- **Se toma:** la ficha con interruptor por herramienta y la columna de lo invisible. **Se supera:** la ficha de Esme cuenta lo que hizo el motor en **tu** Taller (tareas, % de éxito, coste real) y «lo que no puede ver» es verdad técnica por la copia aislada.

### R10 · #123 «Trazas: sigue una petición de punta a punta» (@sergiorocaa) · hoja-07 · 97 ♥
- **Se ve:** vídeo con fondo crema y titulares en serif que cambian: «Follow one agent request, end to end.» → «Every model call, every tool call and policy check, with its logs attached.». Debajo, capturas de una UI: **cascada de barras horizontales azul cielo** sobre filas con sangría (árbol: petición, llamada al modelo, herramienta, comprobación de política), cada fila con su duración a la derecha; la fila seleccionada con borde azul y, debajo, la tabla de registros en mono. El argumento: un agente puede devolver 200 y dar una respuesta incorrecta.
- **Tipo:** serif en titulares sobre crema; sans y mono en la UI.
- **Movimiento:** la cámara hace zoom sobre la captura y va seleccionando filas.
- **Sirve a:** Taller › Detalle (la «cascada» que falta, lección 19).
- **Se toma:** el árbol con barras de duración y el registro adjunto. **Se supera:** la traza se tiñe con la tinta del motor y cada fila enlaza al recuerdo que usó; las comprobaciones de Esme marcan los «200 que mintieron».

### R11 · #78 «Actividad» (@ludvigrask_) · hoja-04 · 175 ♥, 193 guardados
- **Se ve:** negro (`#121212`–`#161616`). Pestañas grises con subrayado (Activity, Models, Providers…). Arriba a la izquierda, la cifra «$6,116.17» con delta verde; una **curva de gasto acumulado que pasa de verde a dorado**, con el punto final etiquetado «$11,436.82» y una línea discontinua de previsión; leyenda con marcas verticales (Usage · Forecast · Workspace limit). A la derecha, «Logs · Last 40 requests · 4 failed» con una **tira de barras finas como código de barras** (grises, y rosa para los fallos) y filas «200 | Kimi K3 | Just now»; «Audit · 11 changes this week» con puntos ámbar («Updated Model Policy», «Updated Jay's budget»). Abajo, tarjetas «Overview» ($249.87 con barritas verdes), «Leaderboard» (quién gasta más, con avatares) y «Billing» (barra de límite).
- **Color:** oscuro, verde apagado y dorado como únicos acentos; rosa solo para el fallo.
- **Movimiento:** estático.
- **Sirve a:** Uso (curva con previsión, ranking por motor, auditoría).
- **Se toma:** previsión discontinua, código de barras de registros y auditoría. **Se supera:** el gasto es **tuyo** (OpenRouter, suscripciones y motores del Taller) con la historia en frases (`paginas/historia-uso.ts`) y cada KPI con su acción («pon un tope»).

### R12 · #105 «Where the profit went» (@nizamdesign) · hoja-05 · 34 ♥
- **Se ve:** seis pantallas en gris claro y blanco con barra lateral y tarjetas de esquinas muy redondeadas. (1) «Overview»: cifra «34,0 %» y barras azul degradado, con una **tarjeta de insight de degradado azul-naranja desenfocado** («8.2 pts») como única superficie luminosa; (2) «Job #5819» con «12.3 %» enorme y difuminado; (3) **«Where the profit went»**: cascada de cinco columnas con degradado azul claro ($1,260 → $1,000 → $740 → $500 → $400), tramos de fuga en rosa entre columnas y cuatro tarjetas debajo (–$260, –$260, –$240, –$100) con enlace de acción; (4–5) «Why labor is leaking» con tabla de barras rosa y otra tarjeta de insight «7.8 h»; (6) «Forecast» con línea, banda de confianza azul y cuatro tarjetas «what if» con interruptor.
- **Tipo:** sans neutra; los títulos son frases-pregunta.
- **Color:** casi sin color, y rosa solo para lo que se pierde.
- **Movimiento:** las columnas caen y las fugas se resaltan al avanzar el vídeo.
- **Sirve a:** Uso › historias («Dónde se fue tu dinero esta semana», «Qué modelo te ahorró más»).
- **Se toma:** la cascada narrativa y la tarjeta luminosa **única**. **Se supera:** la cascada cuenta tokens y dinero por motor con la frase de `historia-uso.ts` como titular, y la tarjeta luminosa es el único sitio donde Esme usa luz brillante de día.

### R13 · #192 «Paperboy» (@adafruit) · hoja-12 · 9 ♥, 861 reproducciones
- **Se ve:** fotos de una consola tipo Game Boy gris con **pantalla de tinta electrónica**: fondo gris papel (`#a8a59e`) con píxeles casi negros (`#403b3c`); en seis fotogramas, un personaje y habitaciones de un juego de rol se dibujan mientras unas manos pulsan el D-pad. El titular dice 60 FPS de dibujo sin refresco completo: los sprites se mueven **sin parpadeo de pantalla entera**.
- **Color:** cuatro grises y negro.
- **Movimiento:** actualización por regiones con un tenue rastro fantasma (ghosting) tras el sprite y salto de contraste en la zona que cambia.
- **Sirve a:** piel «Papel electrónico», modo de ahorro, Memoria (la mente que se dibuja) y portada «mente».
- **Se toma:** el ghosting como estética y el refresco parcial. **Se supera:** el consumo baja **de verdad** (ESME.md:19 manda medir PSS y CPU) y no es un filtro.

### R14 · #61 «OpenAI won't. Anthropic won't.» (@BlackBit) · hoja-03 · solo el recurso gráfico
- **Se ve:** fondo negro puro con un **marco de líneas finas y cruces «+» en las cuatro esquinas** (marcas de registro de imprenta) a ~20 px del borde. Arriba, un isotipo triangular blanco; el titular en **mono de ancho fijo, mayúsculas, ~40 px**, en blanco, dos líneas; la tercera línea, en **rosa `#e41259`** entre llaves; un párrafo gris pequeño; una caja de URL con borde fino y mono; un botón relleno rosa con mono en mayúsculas; el pie con otra URL en mono diminuto. Parece una hoja técnica impresa.
- **Movimiento:** estático.
- **Sirve a:** marcos de láminas en cualquier pantalla (B5), la tarjeta compartible de tu mente, la tarjeta de una herramienta en la Tienda.
- **Se toma:** **solo** el marco con cruces y el mono en mayúsculas. **No se toma el producto:** un modelo sin negativas choca con la regla de que el usuario elija con transparencia (ESME.md:59-61).

### R15 · #72 «Aurora, agentes que trabajan mientras duermes» (@Tanjim38) · hoja-03 · 111 ♥, 146 guardados
- **Se ve:** seis fotogramas de una app oscura (`#0b0b0e` a ojo) sobre un fondo de escritorio azul medianoche con un haz de luz. Barra lateral con lista de agentes con avatar de color y estado; páginas de Proyectos, Flujos (tabla con avatares), Actividad (feed de líneas) y Ajustes (pares clave-valor); un modal «New Chat». El fotograma 5 es el que importa: **un sol amarillo pálido con cara sonriente flotando en el centro, con cuatro satélites en órbita** (caras más pequeñas en malva, azul, rojo y turquesa, cada una un agente), una barra de comando que dice que Aurora enrutó la tarea al agente correcto y cuatro sugerencias en fichas.
- **Color:** negro con **amarillo luz** como único calor; los satélites, en pastel.
- **Movimiento:** órbita lenta, el sol late, la barra escribe.
- **Sirve a:** la Portada «Mando» (ya tiene esfera viva) y la lista de motores del Taller.
- **Se toma:** el ser en el centro y los agentes en órbita. **Se supera:** los satélites son los **bichitos reales de cada motor** (`marca/ser.ts`), y su órbita y brillo salen del estado de cada tarea.

---

### Matriz: qué referencia sirve a qué pantalla de Esme

| Pantalla | Referencias | Primera acción concreta |
|---|---|---|
| **Tu mente (Portada)** | R1, R2, R3, R5, R15, R14 | Pie con la cordillera de tu mente y el nombre sangrado; titular serif sobre la lámina |
| **Conversación** | R4, R7 (cifras), R10 (trazas inline) | Selector de esfuerzo con el cuarto del ser; paquete de contexto visible |
| **Taller** | R6, R10, R9, R15, R4 | Cascada de trazas en el Detalle; ficha por motor; satélites de motores |
| **Memoria** | R1, R8, R13, R2 | Cabecera en cordillera; Absorber con conflictos cara a cara |
| **Uso** | R7, R11, R12, R6 | Cifras monumentales, curva con previsión, cascada narrativa, auditoría |
| **Tienda** | R1, R2, R3, R13, R14 | Previews de pantalla entera (día y noche) con lámina y hoja de marca |
| **Ajustes** | R9, R14, R4 | Ficha de motor con «lo que no puede ver»; piel «Papel electrónico» |
| **Notificaciones y lanzador** | R5, R14 | Ojos del ser en la notificación nativa; marco con cruces en el lanzador |

### Menciones (fuera de las 15, con uso concreto)
- **#7 gen UI de OpenCode / #55 Orca / #174 «Claude dibuja»:** la IA responde con interfaz. Ya hecho en lo básico (prisma); sigue el mini-app con MCP Apps (ESME.md:135).
- **#74 «Review»:** bandeja de borradores con el modelo junto a Enviar (B13).
- **#75 ventana de barra de menú:** pestañas «All / Captures / Exports» y estado vacío ilustrado con una flecha dibujada a mano; para el lanzador (B20).
- **#118 guía de marca «Fair»:** hoja de guía (logo, símbolo, uso, tipografía «Nohemi») para cada piel de Tienda (B15).
- **#69 Konsole fundida en el fondo y #27 dsh-TUI:** terminal sin marco y portadas tipográficas por motor (B16).
- **#146 modo claro frente a oscuro** con barra de progreso segmentada y lista de cierre con estados: previews gemelos de Tienda y la lista de «lo que falta» de una tarea.
- **#149 barra de comandos de Gr8r** con recientes, filtros y consultas sugeridas (B17).
- **#181 calculadora de costes en oscuro** (importe enorme, sliders): puede ser el control de Presupuesto en Ajustes.
- **#42 dock sobre paisajes y #130 «Iconly»** (píldora activa deslizante): la navegación `muelle` (`shell/marcos.ts`) sobre una lámina.
- **#187 «RelayGuard»** (documento con comentarios al margen): idea para comentar una revisión del Taller, hoy sin hilos de comentario (`grep comentar`: nada).
- **#95 filtrado dinámico:** filtros que se componen en una barra; para el Taller con 26 archivadas y 20 listas.

---

## 4. Qué queda abierto

1. **Recoger de nuevo el FYP** (ESME.md:164 dice «se repite cada semana»): este archivo es del 12-oct. No se hizo aquí porque la tarea era leer lo ya recogido, sin tocar la X del creador.
2. **Verificar licencias** de cualquier lámina de dominio público antes de usarla (B3). No las he comprobado.
3. **Los mosaicos son de baja resolución:** si una referencia se va a replicar en detalle (por ejemplo R2 o R3), hay que volver a abrir el post original y capturarlo a tamaño real.
4. **Medir antes y después** (consumo, CPU en reposo) cualquier capa de textura de B1 y B8: el creador pidió que Esme casi no consuma (ESME.md:19).
