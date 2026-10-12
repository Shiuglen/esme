# Lenguaje visual v2: «de otro mundo» (2026-10-12)

Sale del análisis de las 55 publicaciones del FYP (con fotogramas) y de la investigación de librerías, con versiones y licencias comprobadas en npm. La regla de fondo: **la interfaz es neutra y la vida es la aurora** (ver el concepto v3).

## Técnicas extraídas de X y dónde van en Esme
| Técnica (fuente) | Cómo es | En Esme |
|---|---|---|
| Cristal sobre fondo vivo (Agently, Lumina, «Soft light on a moving surface», Shaders, Features section) | Tarjetas oscuras translúcidas con un brillo interior de 1 px sobre una malla de gradiente que se mueve despacio | **Hecho:** `FondoVivo` (Paper MeshGradient con grano) y `.vidrio` en barra, menú, tarjetas y compositor |
| Halo que sigue al cursor (kits de componentes, Linear) | Un brillo radial enmascarado al borde | **Hecho:** `.halo`, con un solo oyente global que escribe `--mx` y `--my` |
| Barra flotante de vidrio líquido (tomchris) | Pastilla segmentada que flota con refracción | Selector de motor y modos del Taller; `liquid-glass-react` solo en 1 o 2 superficies |
| Densidad HUD (JEV decision grid, agent runtime) | Cifra grande, micrográfica, latencia y coste en el mismo bloque; metadatos en mono; trazas de neón por tipo de evento | Taller (cada fila de motor) y Red neuronal (trazas aurora por tipo de recuerdo) |
| Isometría de línea fina (Anatomy, TesterArmy, fábrica de git, agent runtime, Iso Gunship) | Máquinas o escenas isométricas en SVG; un deslizador mueve la animación | Escena del Taller (worktrees como máquinas), estados vacíos y explicaciones |
| Partículas que forman una esfera (posts de líneas radiales y esfera de puntos) | Miles de trazos que se ensamblan en un globo | «La mente» en la bienvenida y en Memoria (vista global) |
| Microinteracción con historia (botón de compartir de vibrant) | Paso a paso con confirmación en pastilla y «Deshacer» | Aprobaciones del Taller, compartir y borrar recuerdos |
| Iconos que se animan (theme toggles, lucide-animated) | El icono cuenta lo que pasa | Menú, tema y estados |
| Favicon e icono vivos (Impractical favicon) | El icono de la app cambia con el estado | Icono de ventana o bandeja que «piensa» (fase futura) |
| Efecto genio (Ksparth12) | Un panel se recoge hacia su origen | Cerrar paneles y tareas hacia su fila del Taller |
| Tarjeta holográfica (Morfe card) | Tarjeta con gradiente iridiscente que gira | «Tarjeta de tu mente» compartible (estadísticas y Señal) |
| Búsqueda con chips que se transforma (beUI) | Una barra fija que se ensancha y despliega recientes y chips | Paleta Ctrl+K: el botón de la barra se transforma en la paleta |
| PR guiada (Capy) | Overview, Guide y Diff con un diagrama antes/después | Revisión de cambios del Taller |
| Autonomía que se gana (Reeve) | Mirar, sugerir, preguntar primero o actuar con deshacer, más reglas fijas | Permisos y bienvenida |
| Cuota con proyección (theo) | Línea de lo restante, proyección discontinua y reinicios | Uso: suscripciones (hecho en parte: ventanas de 5 h y 7 d) |
| Constelación (Agently) | Personas, apps y promesas como estrellas conectadas | La mente como constelación de entidades (fase futura) |
| Tipografía editorial y cifras gigantes (Anatomy, Cardinal) | Serif con carácter y números enormes | Cabeceras de Uso y de la bienvenida (con mesura) |

## Librerías elegidas (verificadas el 12-oct)
- **Fondo vivo:** `@paper-design/shaders-react@0.0.81` (Apache-2.0, versión fijada). **Instalado.**
- **Taller:** `@xyflow/react` 12 (flujos y nodos) o `@elchininet/isometric` 4 (isometría SVG). Diffs con `@git-diff-view/react` y `shiki` 4. Terminal con `@xterm/xterm` 6 y `addon-webgl`.
- **Memoria a escala:** `@cosmos.gl/graph` 3.5 (MIT, en GPU), si se superan unos 5.000 nodos. No usar `@cosmograph/*`, que es de licencia no comercial.
- **Uso:** `@visx/visx` 4 con aurora.
- **Movimiento:** `motion` (ya instalado; última versión 14.1), `@ssgoi/react` para transiciones de página y `lucide-animated` en puntos clave.
- **Cristal líquido:** `liquid-glass-react` 1.1, con moderación porque repinta en cada frame.
- **Descartados:** gsap (licencia sin aclarar), anime.js (redundante), Monaco y ECharts (pesan demasiado).

## Orden de los pasos
1. Fondo vivo y cristal con halo. **Hecho.**
2. Paleta Ctrl+K que se transforma desde la barra, con chips y vista previa.
3. Taller como agent runtime: escena isométrica, filas HUD de motores, worktrees, revisión guiada, vista previa y arena.
4. Memoria: panel izquierdo rediseñado, trazas aurora por tipo y vista esfera.
5. Bienvenida «la mente despierta»: malla a pantalla completa, esfera de partículas, fuentes a absorber y autonomía.
6. Microinteracciones con historia, iconos vivos y la tarjeta de tu mente.
