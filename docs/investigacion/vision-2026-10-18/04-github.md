# 04 - GitHub del creador (Shiuglen): ADN visual y piezas para Esme

> Fecha: 2026-10-18. Estado: COMPLETO (8 repos revisados). Solo lectura: no se hizo push ni se cambió código de Esme ni nada en GitHub.
> Repos: plagatox-ui, Sakoi, sakoi-dev, sakoi-einstein, dotfiles, guacamayacoin, sicor-ios, sicor-android (se omite `esme`).

## Resumen en 12 líneas (lo importante)
1. El hallazgo mayor: **`sakoi-dev` es el ancestro de Esme** (mismo creador, misma ambición): ya tiene Cuartel, Cerebro de hechos, Recetas a 0 tokens, Fiscal, Forja, Mercado firmado, voz, lanzador global y un protagonista 3D vivo. Mucho de lo que Esme busca ya está resuelto allí, con ruta y código propios (sin problema de licencia, salvo la cabeza del dragón).
2. Su ADN visual real (hex en sección 6): casi-negro con tinte (`#06090e`/`#070b14`/`#0a0908`), serif para lo importante, micro-etiquetas MAYÚSCULAS espaciadas, sombras de color con spread negativo (luz que se escapa por abajo), botón con TEXTO OSCURO sobre acento cálido, radios 10/14/16/20, movimiento con `cubic-bezier(.2,.8,.2,1)` y blur-in.
3. Su color significa algo: teal = vivo/verificado, brasa = acción, violeta = pensar/compartir, oro = memoria (sección 6.2).
4. Esme usa `radio:0.6` (esquinas de 4/6/8/13 px); sus propios productos usan 10/14/16/20 px (= radio 1.0-1.2). Y sus fondos son 2-3 puntos de L* más claros. (sección 6.3)
5. Las 23 pieles de Esme son recolores; sus mejores trabajos cambian de PROTAGONISTA, COMPOSICIÓN, MATERIA y LUZ, no de hex. Se proponen 5 pieles con esos ejes, todas con contraste AA verificado (sección 8).
6. Presencia: la **koi 3D procedural** (`sakoi.glb` + `sakoi3d-koi.src.js`, navy+teal, 6 estados, `setEvolution` ligable a los 2.346 recuerdos) es el candidato ideal; el **dragón** tiene licencia de malla incompatible con UE/UK/Corea hasta regenerarlo.
7. Lanzador: la barra rápida de Sakoi (aprobaciones dentro, "Continuar en", voz pulsar-para-hablar, aparece junto al ratón) y el compañero de escritorio click-through son plantilla directa.
8. Memoria: el grafo de fuerzas de 60 líneas con enfriamiento, el panel de nodo con vigencia/estabilidad, las intenciones pendientes, la introspección con lagunas y el olvido en cascada con vista previa.
9. `dotfiles`: su terminal es Tokyo Night Storm (`#24283b`), JetBrains Mono, GNOME con tema MacTahoe violeta; GPU de 6 GB con Qwen3.5 9B local: Esme debe lucirse en un portátil modesto.
10. `guacamayacoin`: la cara juguetona y venezolana (teal+magenta+púrpura+oro, Outfit), vídeos 9:16 hechos con escenas HTML y un minijuego: ideas de viralidad. Es un memecoin: no promocionarlo.
11. `sicor-*` son copias de Element X (AGPL-3.0): ninguna pieza de diseño propia y NO se debe copiar código ni tokens; sí ideas (tokens en 3 capas, QR para vincular, sacudir para informar).
12. `Shiuglen/Sakoi` en GitHub solo tiene el `LICENSE`; el código real está en local (`~/Sakoi`, 93 commits) y `sakoi-dev`/`sakoi-einstein` son instantáneas, no repos de GitHub. Hay una pieza nueva solo en local: **La Corteza** (búsqueda por significado local y gratis).

## 0. Mapa de repos (hechos verificados)

| Repo | Visibilidad (gh) | Contenido | Utilidad para Esme |
|---|---|---|---|
| plagatox-ui | público | 1 página HTML (8 KB, sin build) + `preview.png`: sistema oscuro con 3 paletas (Brasa/Menta/Violeta) | ALTA: tokens y filosofía "caras, no plantillas" |
| Sakoi | privado | En GitHub (rama por defecto, clon superficial): solo `LICENSE` MIT, commit inicial 2026-09-27. El proyecto real vive en local: `/home/sakai/Sakoi` (93 commits, último 2026-10-04, `origin` = este repo). Inferencia: el código no está publicado en la rama por defecto | nula en GitHub; ver `sakoi-dev` |
| sakoi-dev | NO existe en GitHub (`gh repo view` no lo resuelve) | Instantánea local del 3-oct de `~/Sakoi` (236 ficheros, sin `.git`): agente Python + UI + Electron + marca + web de ventas. Comparada con `~/Sakoi` (4-oct) la UI es igual salvo 10 líneas de CSS y una sección nueva "La Corteza" | MUY ALTA: es el ancestro de Esme |
| sakoi-einstein | NO existe en GitHub | Instantánea anterior y más pequeña (97 ficheros): sin escritorio, sin dragón, sin Cuartel/Cerebro/Recetas/Forja | baja (superada por `sakoi-dev`) |
| dotfiles | privado | 66 ficheros chezmoi: kitty, starship, zsh, nvim, opencode, scripts de IA local | ALTA: colores/fuentes reales y hardware real |
| guacamayacoin | privado | Landing de un memecoin (Netlify) + minijuego + 3 plantillas de vídeo + imágenes | MEDIA: voz, humor, vídeo para compartir (NO el token) |
| sicor-ios / sicor-android | privados | Copias de Element X (Matrix), AGPL-3.0; 4,2k y 11,6k ficheros; sin diseño propio | BAJA como diseño; ideas de producto móvil/seguridad; RIESGO de licencia |

## 1. plagatox-ui (revisado)

Ruta: `plagatox-ui/index.html` (138 líneas, CSS en `<style>`, 0 dependencias, 0 fuentes externas) y `plagatox-ui/preview.png` (1640x3874).

Eslogan: "Interfaces que se sienten caras, no plantillas." Declara el sistema "medido y probado en cinco productos reales" (dictamen documental, contratos, auditoría web, veredictos). Autoría declarada: "Jarvis".

### Tokens exactos (`:root`)
```
--tinta:#070b14  --panel:#0d1424  --panel2:#141f33  --linea:#1d2942
--texto:#e9eefb  --tenue:#8a99b8  --suave:#5b6b8f
--brasa:#ff7a45  --menta:#34d399  --violeta:#a78bfa  --ambar:#fbbf24
--r:16px
```
Fondos de producto: Brasa sobre `#0d1424`, Menta sobre `#0a0f1c`, Violeta sobre `#101420`.
Estados semánticos (pastillas): ok `#6ee7b7` (borde rgba(52,211,153,.35)), aviso `#fcd34d` (borde rgba(251,191,36,.35)), mal `#fca5a5` (borde rgba(248,113,113,.35)), neutro `--tenue`.

### Recetas visuales (copiadas del CSS, verificables)
- Fondo de página: dos `radial-gradient` tenues sobre `--tinta`: `900px 500px at 80% -10%, #141a2e` y `700px 400px at -10% 10%, #0d2030` (un halo azul-petróleo arriba izquierda y uno índigo arriba derecha). Es profundidad sin cristal.
- Titular: serif del sistema (`Georgia, "Times New Roman", serif`), `clamp(34px,7vw,58px)`, line-height 1.04, letter-spacing -.025em, peso 750; la palabra clave va en acento y sin cursiva (`h1 em{font-style:normal;color:var(--brasa)}`).
- Sobretítulo ("ojo"): 12px, `letter-spacing:.24em`, MAYÚSCULAS, 700, color de acento. Los h2 de sección usan el mismo patrón con `.15em`.
- Cuerpo: `ui-sans-serif,system-ui`, 16px/1.65, `-webkit-font-smoothing:antialiased`. Texto secundario al 60 % de contraste (`--tenue`).
- Número/dato: monoespaciada `ui-monospace,Menlo,Consolas` y `font-variant-numeric: tabular-nums`.
- Tarjeta: `linear-gradient(180deg, rgba(20,31,51,.85), rgba(13,20,36,.9))`, borde 1px `--linea`, radio 16px, padding 20px. Muestra de color: radio 12px, franja de color de 64px + pie mono 12px.
- Botón primario: `linear-gradient(96deg, brasa, #ff5f2e)`, texto `#1a0a02` (casi negro cálido, NO blanco), radio 12px, padding 13x22, sombra `0 14px 34px -18px rgba(255,122,69,.9)` (sombra larga, estrecha, del color del acento), hover `translateY(-2px)` en .14s. Botón secundario: `--panel2` + borde `--linea`, sin sombra.
- Pastilla: radio 999px, 11.5px, borde 1px.
- Rejilla: 1 columna en móvil, `repeat(3,1fr)` desde 660px; `max-width:940px`; padding 64px 24px.
- Los "cinco estados" obligatorios en cada pieza: verificado / atención / falla / sin datos / cargando.

### Defecto detectado (no copiar)
El `index.html` está guardado con doble codificación UTF-8 (mojibake: "diseÃ±o", "â€”", "âœ“") y el preview.png lo muestra roto. Lección de producto: Esme debe normalizar a UTF-8 y probar acentos/guiones/ñ en pieles y tienda.

### Qué absorbe Esme de plagatox-ui
1. Tres "temperaturas" de acento sobre UN solo navy (`#070b14` base): Brasa = decidir/juzgar, Menta = verificar/medir, Violeta = compartir/crecer. Mapear a Esme: Brasa = Taller (agentes que deciden), Menta = Memoria/verificación, Violeta = Tienda/comunidad. La regla "el verde solo cuando el dato está verificado" es una semántica de color, no decoración.
2. Cinco estados siempre. Es regla de calidad para toda piel.
3. Serif Georgia para lo que importa + sans del sistema + mono tabular: cero fuentes que descargar (coincide con "lo analógico vence a lo brillante").
4. Botón con texto oscuro sobre acento cálido y sombra tintada.

## 2. sakoi-dev (ancestro de Esme) - revisado

Sakoi = agente Python (FastAPI) + UI vanilla JS + Electron, lema "tu inteligencia personal... y cada día se mejora a sí misma". Mascota: dragón negro 3D oriental (antes una koi de luz) que VIVE dentro de la interfaz. Es el mismo creador y la misma ambición que Esme: casi todas las ideas de producto de Esme ya aparecen aquí, con un diseño visual muy trabajado ("Tinta y Bermellón").

Rutas clave (relativas a sakoi-dev/): `CLAUDE.md` (arquitectura), `README.md`, `brand/README.md` (identidad), `sakoi/server/static/app.css` (72 KB, tokens y componentes), `sakoi/server/static/app.js` (228 KB), `sakoi/server/static/index.html`, `site/index.html` (web de ventas, 29 KB), `site/orb.js`, `brand/web/sakoi3d.src.js` (motor three.js, 49 KB), `brand/blender/*.py` (dragón/koi/cabeza procedurales), `desktop/main.js` (Electron: bandeja, atajos globales, dragón compañero, barra rápida), `sakoi/server/static/quick.{html,css,js}` (barra rápida), `brand/renders/*.png` (renders reales).

### 2.1 Tres generaciones visuales de Sakoi (hecho: salen de CHANGELOG.md, brand/README.md y los CSS)

| Gen. | Identidad | Paleta | Tipografía | Dónde |
|---|---|---|---|---|
| 0.2 | Orbe de luz (canvas 2D, 6 KB) | teal `#37e6d4` reposo, verde `#49d18a` escuchando, violeta `#9b7bff` pensando, naranja `#ff9d5c` trabajando, azul `#4aa8ff` hablando | system | `site/orb.js`, `sakoi/server/static/orb.js` |
| 0.4 | Koi de obsidiana con "tancho" de luz, "Sakoi OS" aurora+cristal | navy/petróleo/violeta bioluminiscente (ver render) | - | `brand/renders/sakoi-koi-hero.png`, `brand/blender/sakoi_koi.py` |
| actual | Dragón negro + "Tinta y Bermellón" (sello 朱) | ceniza `#0a0908`, bermellón `#f26a36`, oro viejo `#c9a45c`, hueso `#ebe4d4` | Shippori Mincho B1 + Geist | `sakoi/server/static/app.css`, `brand/README.md` |
| ventas | sitio de marketing | ember `#ff4a1c`/`#ff8a2b` sobre `#060607` | Sora + Inter + JetBrains Mono | `site/index.html` |

Lectura (inferencia): el creador ha oscilado entre "navy+teal luminoso" (orbe, koi) y "negro cálido+brasa" (dragón). Su gusto declarado actual (navy+teal, nivel dios) coincide con la generación orbe/koi y con plagatox-ui (navy `#070b14`). Para Esme: navy+teal de base, brasa/bermellón como ÚNICO acento cálido y escaso ("la brasa solo aparece donde hay vida", frase de `app.css`).

### 2.2 Tokens de la sala de control actual (copiados de `sakoi/server/static/app.css`, `:root`)
```
Fondos:   --bg #0a0908  --bg-2 #0d0c0b  --bg-3 #11100f  --surface #141210  --surface-2 #1a1815  --raised #211e1a
Cristal:  --glass rgba(20,18,16,.72)  --glass-2 rgba(26,24,21,.8)  --glass-hi rgba(34,31,27,.86)
Líneas:   rgba(233,226,208,.08) / .14 / .05  (hueso al 5-14 %, nunca gris plano)
Texto:    --text #e8e3da  --muted #a39d93  --faint #6c675f
Acento:   --accent #f26a36  --accent-2 #ffb35c  --ember #ff7a3d  --gold/--violet #c9a45c  --accent-deep #5a2410
          --accent-soft rgba(242,106,54,.10)  --accent-line rgba(242,106,54,.5)
Estados:  --good #8fb07a (salvia)  --warn #d9a441  --bad #e0564a  --exec #e58a4a
Degradado:--grad linear-gradient(120deg,#ff8a3d 0%,#f26a36 50%,#c8432a 100%)
Brillo:   --glow 0 0 0 1px rgba(242,106,54,.28), 0 0 26px rgba(242,106,54,.16)
Sombra:   --shadow 0 18px 60px rgba(0,0,0,.6), 0 2px 8px rgba(0,0,0,.4)
Radios:   --r 14px  --r-sm 10px  --r-xs 7px   (composer 20px, paleta de comandos 18px, burbuja usuario 18/18/5/18)
Easing:   --ease cubic-bezier(.2,.8,.2,1)   Sidebar 260px
Fuentes:  --disp 'Shippori Mincho B1','Yu Mincho','Hiragino Mincho ProN',Georgia,serif
          --body 'Geist',system-ui…   --mono 'Geist Mono',ui-monospace,'JetBrains Mono'…  (font-feature-settings "ss01","cv11")
```
Escala tipográfica real: cuerpo 14.5px/1.55 (md 1.65); h1 bienvenida `clamp(38px,5.4vw,68px)` peso 800, -.02em; títulos de panel 26px -.025em; micro-etiquetas 10px MAYÚSCULAS `letter-spacing:.16em` en mono (`.nav-sec`, `.hq-h h3`, `.k`); chips 11px mono tabulares.

### 2.3 Recetas visuales que merece la pena absorber (todas con ruta y verificadas en el CSS)
1. **Grano de papel + aguada de tinta** (`app.css`, `.aurora` y `.grid-bg`): 3 manchas `blur(110px)` a opacidad .07-.22 en deriva lenta (36/44/52 s, `alternate`) + una capa `feTurbulence` SVG inline (`baseFrequency .85`, 3 octavas, `mix-blend-mode:overlay`, opacidad .5, ~9 % alfa en tinte hueso). Es "lo analógico vence a lo brillante" hecho CSS: coste ~0 (un data-URI SVG, sin imagen). `prefers-reduced-motion` apaga la deriva.
2. **Luz desde abajo, como brasas**: `body{background:radial-gradient(120% 70% at 55% 118%,rgba(242,106,54,.11),transparent 60%),var(--bg)}` y el composer al enfocarse: `box-shadow:0 24px 70px -24px rgba(242,106,54,.45), 0 0 0 1px rgba(242,106,54,.18), inset 0 -18px 30px -24px rgba(255,138,61,.35)`. Todo se "enciende" desde el borde inferior: coherente y barato.
3. **Bienvenida "título de película"** (`app.css`, `.welcome`): cielo para el protagonista arriba, titular abajo a la izquierda con 3 líneas escalonadas (saludo pequeño 0.52em en `--muted`, pregunta grande en `--text`) y entrada `rise` .9s con `blur(4px)`→0 y retardos .12/.24/.36 s. Las sugerencias dejaron de ser tarjetas de cristal: son texto con subrayado de degradado que crece (`background-size:0→100% 1px`, .35s). Esto ya es "fuera el cristal".
4. **Barra lateral con indicador de degradado**: el ítem activo lleva `::before` de 3px en `--grad` con `box-shadow:0 0 12px var(--accent)` fuera del borde, y fondo `linear-gradient(90deg,rgba(242,106,54,.12),rgba(242,106,54,.02))`.
5. **Traza de herramientas** (`.trace`, `.tool`): hilo vertical de 1px que se desvanece (`linear-gradient(180deg,accent-line,transparent)`), cada herramienta con icono-chip por riesgo (safe=acento, write=dorado, exec=naranja), estado pastilla (run con spinner de borde, ok salvia, err rojo, wait acento), entrada/salida mono con `max-height:340px`. Los pensamientos en `<details>` dorados con punto violeta brillante.
6. **Programa Brasa visible línea a línea** (`.brasa-code`): lista con contador CSS (`counter-increment`), línea actual con fondo suave + `inset 2px 0 0 var(--accent)`, estados ok/replay/simulated/ask/fail/held por color. Idea de producto: mostrar el plan de un agente como código que se ejecuta con luz que avanza.
7. **Aprobación como evento ceremonial** (`.approval`): borde de acento, degradado cálido, halo `0 0 40px rgba(242,106,54,.08)`, punto que late (`pulse 1.4s`), botón "sí" relleno con `--grad` y "no" que se vuelve rojo al hover. El dragón se planta junto a ella y "guarda la puerta".
8. **El Fiscal** (`.fiscal[data-status=checking|cumplido|incumplido|dudoso]`): sello de verificación bajo cada respuesta; spinner en comprobando, borde salvia si cumple, borde+halo bermellón si incumple.
9. **Paleta de comandos Ctrl/Cmd+K** (`.palette`): `width:min(640px,100%)`, fondo `rgba(12,17,27,.92)`, radio 18px, sombra `0 30px 90px rgba(0,0,0,.7)`, scrim `rgba(2,3,6,.6)` con `blur(6px)`, ítems con degradado lateral al seleccionar. Esme tiene lanzador global; la paleta interna es complementaria.
10. **Barra rápida tipo Spotlight** (`quick.css`, `quick.html`, `desktop/main.js` líneas 19-22 y 145-165): ventana sin marco, transparente, `alwaysOnTop`, aparece donde esté el ratón; barra de 720px, radio 20px, `font-size:20px` en el input, punto de brasa que late mientras trabaja, mini-trazas de herramientas, aprobaciones inline, respuesta en markdown y botón "Continuar en Sakoi". Atajos: `CommandOrControl+Space` barra rápida, `CommandOrControl+Shift+Space` ventana principal, `CommandOrControl+Alt+Space` voz pulsar-para-hablar. Esme ya usa Ctrl+Mayús+Espacio: conviene copiar la barra con aprobaciones DENTRO, y añadir el pulsar-para-hablar.
11. **Compañero de escritorio** (`desktop/main.js` 132-139, `companion.html`): ventana transparente a pantalla completa, `focusable:false`, `setIgnoreMouseEvents(true,{forward:true})` y solo captura el ratón cuando `hitTest` toca al ser (IPC `companion:hover`). Clic sobre él abre la app. Es la técnica para que Esme "viva" sobre el escritorio sin estorbar.
12. **Interruptor** (`.switch`): 44x25, pastilla, bola de 19px que viaja con `--ease`; encendido = fondo acento al 25 %, borde acento, bola del acento con halo.
13. **Estadísticas** (`.stat`): hairline superior de 1px en `--grad` al 50 %, número en serif 26px tabular, etiqueta mini en MAYÚSCULAS .12em; la variante `.accent` rellena el número con el degradado (`background-clip:text`).
14. **Cursor de streaming**: `::after` de 8x15px con `--grad` y `steps(2)` parpadeante en lugar de "..." (también en `quick.css`).
15. **Escritorio sin marco**: `.desktop #topbar{-webkit-app-region:drag;padding-right:150px}` y todo control con `no-drag`: respeta los botones de ventana nativos.
16. **Contratos de coste en vivo** (`.cost-pill`, `.cap-pick`): pastilla de coste en la barra superior que pasa a ámbar (`#ffb454`) y rojo (`bad`) al acercarse al tope, selector de tope por tarea. Directo a la vista "Uso" de Esme.

### 2.4 El dragón/koi como protagonista funcional (no decoración) - `brand/README.md`
Tabla de comportamiento (hecho, textual del repo): Bienvenida = vuela libre y ruge; reposo = se posa tras la barra; escribe = nada bajo la línea que se escribe; usa herramienta = acude a ella; pide aprobación = se planta junto a la tarjeta y humea; error = se sobresalta; termina = anillo de humo. API del motor (`brand/web/sakoi3d.src.js`): `setState("idle|thinking|working|listening|speaking|happy|alert")`, `stage(modo, ancla)`, `breathe(seg, potencia, objetivo)`, `act("roar"|"forge"|"hunt"|"recall"|"inspect"|"flinch"|"await"|"resume"|"spawn"|"unspawn"|"done")`. `spawn/unspawn` = una perla/mini-perla por sub-agente (visualiza el equipo de agentes del Taller). El texto SIEMPRE queda encima y legible; "no persigue al ratón".
Lección de producto para Esme: cada estado interno real (pensar, usar mano, esperar permiso, error, hecho, sub-agentes) debe tener un gesto único del ser. El Taller ya tiene agentes: un "mini-ser" por agente (perla) es la traducción directa.

### 2.5 Mente / Memoria de Sakoi (ancestro directo de la Constelación de Esme)
Rutas: `sakoi/server/static/app.js` líneas 2236 (colores por tipo), 2271-2440 (`neuralCanvas`: red neuronal viva), 2439-2475 (`forceGraph`: grafo de fuerzas en 60 líneas, canvas 2D, sin librerías), 2477-2540 (`mindPanel`); backend `sakoi/memory/mind/{core,graph,neural,episodic,prospective,dreaming,meta,scoring,compose}.py`; CSS `app.css` 802-864.
- Tipos de recuerdo y color (hex exactos): recuerdo `#c9a45c`, hecho `#2dd4bf` (teal), entidad `#a78bfa`, episodio `#60a5fa`, fragmento `#94a3b8`, receta `#f472b6`, habilidad `#fb923c`, hábito `#facc15`, página `#64748b`. Neuronas: empuja a "útil" `#f26a36`, a "no útil" `#7fa3c4`, recién nacida `#ffb35c`, núcleo protegido `#c9a45c`.
- Grafo (`forceGraph`): repulsión 900/d^2 con corte a 300px, resortes de longitud `90 - peso*40`, gravedad central .004, amortiguación .82, `alpha*=.985` (se enfría y deja de gastar CPU: `if (alpha>0.02||drag)`), arrastrar nodos con `setPointerCapture`, etiqueta solo en hover/seleccionado/score>.6, arista iluminada oro `rgba(201,164,92,.85)` al seleccionar; con `prefers-reduced-motion` resuelve 300 pasos de golpe y dibuja estático. Limita a 45 nodos por consulta (`/mind/graph?limit=45&q=`): NO intenta dibujar todo, dibuja "alrededor de algo". Esme dibuja 2.346: la lección es mostrar vecindario + búsqueda, y reservar el atlas completo para una vista de "constelación" con LOD.
- Panel lateral de nodo (`pick`): tipo (pastilla con su color), título, texto, `fuente · fecha · vigencia · estabilidad en días`, lista de enlaces clicables (viaje de nodo a nodo), botón "No uses esto" (retroalimentación que baja el recuerdo).
- Eventos de vida de la red (`EVENT_LABEL`): "Nació una neurona" (neurogénesis), Mitosis, Poda, Consolidación. Chispas viajando por las conexiones fuertes (máx. 40), neuronas con radio `5 + actividad*7`.
- Funciones de producto de la Memoria que Esme no tiene o puede mejorar: (a) **Intenciones pendientes** (memoria prospectiva): "cuando hable con Ana, recuérdale el contrato" / "mañana 09:00", disparadas por persona o fecha (`prospective.py`). (b) **Introspección "qué sé y qué no"** sobre un tema: recuentos por tipo, fuentes, frescura (más reciente / mediana en días), confianza media y **lagunas** (`meta.py`). (c) **Olvidar en cascada con vista previa**: borra de verdad recuerdos+hechos+enlaces+vectores+fragmentos+intenciones sobre un tema, mostrando antes qué caería (`/mind/forget` con `preview:true`) - privacidad como función visible. (d) **Cerebro de hechos con fuente y fecha**, historia temporal (nunca borra, "supersede") y **conflictos entre fuentes** donde el usuario elige el valor correcto (`docs/cerebro.md`). (e) **Sueño/consolidación nocturna** (`dreaming.py`, `evolve/dream.py`): fusiona duplicados y extrae patrones; visualizable como "Esme sueña esta noche". (f) El **contexto con presupuesto** (`compose.py`): qué recuerdos entran al prompt y por qué - un chip `.mind-chip` bajo cada respuesta muestra cuáles se usaron ("red: N neuronas") con `.mind-verdict` por recuerdo.

- **La Corteza** (solo en `~/Sakoi`, 4-oct: `docs/corteza.md`, 7 KB; sección nueva en `app.js` L2304 `cortexSection` y `.cortex-map` 340px de alto en `app.css`): búsqueda por significado LOCAL y GRATIS sin embeddings de pago. Léxico que crece (cada palabra nueva = una fila; palabras raras por n-gramas de 3-5 letras con hashing), vectores en disco (`np.memmap` en bloques: el límite es el disco, no la RAM), activación dispersa (una consulta despierta pocos "lóbulos"; con 10 o 100.000 cuesta casi lo mismo), skip-gram con muestreo negativo entrenado en segundo plano, vector de frase por media ponderada por rareza (SIF) menos la dirección común; en el sueño los lóbulos inútiles se funden. Esto resuelve en Esme "no hay embeddings locales" (limitación declarada en `CLAUDE.md` del creador) y da una vista nueva: **mapa de lóbulos** (eventos "fusión", "nació un lóbulo", avisos). Ruta de origen: `/home/sakai/Sakoi/docs/corteza.md`, `sakoi/memory/mind/neural.py`, `sakoi/memory/mind/cortex/*` (lexicon, space, disk, index, lobes).

### 2.6 Funciones de producto de Sakoi aprovechables (todas verificadas en `CLAUDE.md`/`README.md`/`site/index.html`)
| Función de Sakoi | Qué es | Traducción a Esme |
|---|---|---|
| **Cuartel** (`core/hq.py`, `core/held.py`) | bandeja única de lo que necesita al usuario y lo ya hecho; acciones desatendidas quedan RETENIDAS hasta aprobar; badge de contador en la nav | Portada "Tu mente": una tarjeta "Esme necesita de ti (N)". Aprobar/Rechazar sin entrar al Taller |
| **Línea de dinero** (`policy.money_limit`, `policy.lines`) | todo importe sobre el tope se detiene aun en rutinas sin nadie delante | Uso: tope por tarea/día con pastilla ámbar/roja y aviso previo |
| **Recetas sin IA** (`core/recipes.py`) | una tarea resuelta se repite a 0 tokens con parámetros; cae a la IA solo si un paso falla; botón "guardar como receta" bajo la respuesta (`.recipe-offer`) | Taller: "convertir en receta" tras un trabajo exitoso; contador "N repeticiones, 0 tokens" en Uso |
| **Fiscal** (`core/fiscal.py`) | segundo modelo verifica el resultado contra lo pedido, sello cumplido/incumplido/dudoso | Cada entrega del Taller con sello de verificación |
| **Cortafuegos de privacidad** (`privacy.py`) | enmascara datos personales antes de salir a la nube; modo solo-local; registro de lo enmascarado | Ajustes + línea bajo el mensaje "2 datos ocultados" (`.notice.privacy`) |
| **El Ojo** (`perception/ojo.py`) | memoria de pantalla local, opcional y con olvido | Mano opcional de Esme |
| **Máquina del tiempo / Deshacer universal** (`core/timemachine.py`, `core/journal.py`) | cada archivo tocado se puede devolver; diario de acciones con deshacer (vista Actividad, estados ok/err/undone tachado) | Taller ya trabaja en copias aisladas: añadir "deshacer" por acción y línea de tiempo |
| **Consejo de modelos** (`core/council.py`) | varios modelos debaten, un juez sintetiza con nivel de confianza (`.council-box`, borde oro) | Modo "Consejo" en Conversación para decisiones difíciles |
| **Economía de modelos** | reflejos Laya/Jev reparten tareas entre "obrero" barato y principal; coste real por tarea | Ya lo hace Esme en Uso; mostrar "ahorrado por enrutar" |
| **Modo Operador / Misiones** (`core/missions.py`) | un objetivo grande perseguido en ciclos hasta lograrlo o necesitar decisión | Taller: "misión" con checkpoints |
| **Rutinas y disparadores** (`core/routines.py`, `core/triggers.py`) | programadas + por carpeta, correo, webhook, portapapeles | "Esme trabaja mientras duermes" + resumen matinal |
| **Brasa, lenguaje de planes** (`brasa/`) | el modelo escribe el plan como programa ejecutable con reproducción determinista, simulación y pausas por permiso | Vista del plan de un agente como código que avanza línea a línea (receta visual de 2.3-6) |
| **Forja** (`forge/`) | webs/apps completas con git local (versión = commit), vista previa aislada (CSP sandbox), check HTTP/build/consola, publicar por ZIP/SSH/GitHub Pages con aprobación | La Forja de Esme ya existe: copiar vista previa aislada + check automático + "una versión = un commit" |
| **Mercado firmado** (`market/pack.py`, `permissions.py`) | `.sakoipack` firmados Ed25519 con manifiesto de permisos APLICADO en ejecución; ves herramientas/dominios que pide antes de instalar | Tienda de pieles y herramientas: permisos visibles + firma. Las pieles son solo datos, ideal para firmar |
| **Estudio / Lienzo** (`studio/`, `.canvas-col`) | imagen, vídeo, audio, voz y 3D; el resultado aparece junto al chat en iframe aislado | Panel lateral de resultado en Conversación |
| **Voz en vivo** (`voice/`, `desktop/main.js` HOTKEY_PTT) | full-dúplex, VAD, TTS por frases, barge-in, pulsar-para-hablar global | Lanzador con voz |
| **Tu propia IA** (`cloud/`) | SSH, inventario de GPU, plan de modelo abierto según VRAM, despliegue por pasos aprobados | Ajustes > "traer tu modelo" |
| **Telegram** (`channels/telegram.py`) | controlar el agente desde el móvil con código de emparejamiento (`.tg-code`, número 2rem tracking .3em) | Presencia móvil de Esme sin app: el usuario pidió "que funcione en móvil" |
| **Genoma / Arena / Radar / Propuestas** (`evolve/`) | identidad versionada y reversible, competir contra sí misma y adoptar solo si gana, lectura diaria de novedades de IA | "Esme cambia" con historial y rollback visible (`.hrow`) |
| **Páginas** (`sakoi/pages/`) | documentos/páginas vivas del agente | Pieza de "cuaderno" |
| **Conectores MCP** (28 verificados, `.conn-grid`) | rejilla de tarjetas con interruptor, campos de env inline, estado `on` con degradado | Manos de Esme: misma rejilla |
| **Centro de proveedores** (`.prov-grid`) | ~25 proveedores en tiles; `ready` con luz interior; chips "gratis"/"principal" | Ajustes de modelos |
| **Pantalla "Actividad"** | historial + coste + deshacer | Uso |

### 2.7 Presencia: la Koi (procedural, sin problema de licencia) vs el Dragón (con problema)
- **Koi** (`sakoi/server/static/sakoi.glb`, 1,9 MB, 17 mallas; materiales "Koi obsidiana", Ojo, Iris, Velo, Bigote, Labios): se genera ENTERA por código (`brand/blender/sakoi_koi.py`, no importa mallas externas; colores `CYAN (0.216,0.902,0.831) = #37e6d4` y `VIOLET (0.608,0.482,1.0) = #9b7bff`). Runtime `brand/web/sakoi3d-koi.src.js` (18,7 KB fuente, three.js): `SakoiMascot.create(contenedor,{src})`, `setState("idle|thinking|working|listening|speaking|happy")`, `setLevel(0..1)` (volumen de voz), `setEvolution(0..1)` ("la koi se acerca al dragón: bigotes más largos, luz más intensa"), `dispose()`. Tabla de estados `{speed,turn,beat,glow,face,orbit}`. Nada con física sencilla, ondula el cuerpo a lo largo del eje X, sigue el puntero y acude al clic ("alimentarla"). Render de referencia: obsidiana azul-violeta con aletas de velo de líneas cian y tancho de luz `#37e6d4`. Es exactamente "navy + teal + animación + assets reales".
- **Dragón** (`sakoi-dragon.glb`, 3,5 MB; `brand/renders/sakoi-dragon-*.png`): más espectacular (negro, ojos de brasa, fuego con shader fbm de 5 octavas, columna vertebral calculada en CPU con 64 muestras y doblada en GPU) pero **la cabeza sale de una malla de Hunyuan3D-2 cuya licencia, según `brand/README.md`, no permite usar el resultado en la UE, el Reino Unido ni Corea del Sur**. Para distribuir Esme (tienda, usuarios fuera de Venezuela) NO usar la cabeza del dragón sin regenerarla con un generador de licencia permisiva (el propio README propone TRELLIS.2, MIT, ~24 GB VRAM). Uso privado/prototipo: aceptable. Los renders `.png` del dragón heredan el mismo problema.
- Logotipo "Trazo" (`brand/logo/make_trazo.py` -> `sakoi-mark.svg`, 10 KB): una pincelada de tinta en S que es a la vez cuerpo del dragón; hueso `#ebe4d4` + punto de brasa `#ff6a2b`. Variante koi (`sakoi-mark-koi.svg`): `#37e6d4`, `#9b7bff`, `#d9fffb`, fondo `#06090e`→`#1d2738`. Ambos son SVG generados por script: reproducibles, versionables, sin dependencias.

## 3. dotfiles (gestionado con chezmoi: `dot_`, `private_dot_`, `executable_`) - revisado

Contenido real (66 ficheros; no hay GTK/KDE ni wallpaper): `private_dot_config/kitty/kitty.conf`, `private_dot_config/starship.toml`, `dot_zshrc`, `dot_zsh_aliases`, `dot_zsh_llama`, `private_dot_config/nvim/` (LazyVim), `private_dot_config/opencode/config.json`, `private_dot_config/mise/config.toml`, `private_dot_local/bin/{qwen-serve,qwen-status,qwen-stop,backup.sh,airvpn-*}`, `private_dot_local/bin/agent-system/agent.py`, `executable_yoyo.py`, `Vault/copilot-conversations/system-prompts/Qwen-local.md`. Revisión de secretos: solo hay `apiKey:"local"` (marcador de llama.cpp) y rutas a ficheros de contraseña (restic/airvpn); ningún secreto en claro. (Hay un correo personal en `dot_gitconfig`; no se usa aquí.)

### Colores del terminal (el único "tema" explícito del escritorio) - `kitty.conf`: **Tokyo Night Storm**
```
background #24283b   foreground #c0caf5   selection #3d59a1   cursor #c0caf5 (texto #24283b)
color0 #1d202f  color8 #414868   rojo #f7768e   verde #9ece6a   amarillo #e0af68
azul #7aa2f7    magenta #bb9af7  cian #7dcfff   blanco #a9b1d6 / #c0caf5
pestaña activa: fg #7aa2f7 sobre #292e42 (negrita)   inactiva: fg #565f89 sobre #1f2335
```
Tipografía: **JetBrainsMono Nerd Font 11** (también instaladas: Fira Code, FantasqueSansM Nerd Font). `window_padding_width 8`, borde 1px mínimo, `tab_bar_style fade` con `tab_fade 0.3`, `max_frame_rate 144`, `sync_to_monitor yes`. Neovim: LazyVim con `install.colorscheme = {"tokyonight","habamax"}` (hecho: viene de `lazy.lua`). Starship: prompt por colores semánticos (usuario verde, host cian, dir azul, rama magenta, estado git amarillo, error rojo), `❯` verde/rojo/amarillo según éxito/error/vi.

### Escritorio vivo (leído con gsettings en esta sesión, NO está en el repo; solo lectura)
GNOME sobre Ubuntu: `gtk-theme = MacTahoe-Dark-solid-purple`, `font-name = Ubuntu Sans 11`, `monospace = Ubuntu Sans Mono 11`, `color-scheme = prefer-dark`. Es decir, el creador vive en oscuro, con un tema estilo macOS Tahoe con acento VIOLETA, y en terminal en el azul-índigo de Tokyo Night. Inferencia: su ojo está acostumbrado a navy/índigo oscuro (`#24283b`, `#1f2335`) + acento violeta/azul, no a negro puro; "Arcilla" lila encaja con este gusto, pero la dirección declarada (navy + teal) casa con el cian `#7dcfff` y el azul `#7aa2f7` de Tokyo Night.

### ADN de trabajo que se refleja en el escritorio (hechos)
Herramientas: zsh + zinit + (autosuggestions, fast-syntax-highlighting, history-search-multi-word), eza/bat/ripgrep/fd/dust/btop sustituyendo comandos clásicos (`alias ls='eza --icons --group-directories-first'`, `cat='bat'`, `grep='rg'`, `find='fd'`, `du='dust'`, `top='btop'`), zoxide, atuin, fzf, starship, mise, nvim, zellij, docker, kubectl, `cc='claude'`, `oc='opencode'`, commits firmados (`gc='git commit -S'`). Patrón: **sustituir lo estándar por lo mejor, con iconos y color semántico**. Historia de 100.000 líneas compartida entre sesiones.
IA local: `qwen-serve`/`qwen-status`/`qwen-stop` levantan y vigilan un `llama-server` con **Qwen3.5 9B Q4_K_M** en una **RTX 4050 Laptop de 6141 MiB**, API OpenAI-compatible en `http://127.0.0.1:8080/v1`, contexto 131072; OpenCode y un `agent.py` mínimo lo usan con `apiKey:"local"`. `qwen-status` pinta GPU/utilización/VRAM, PID, salud de la API, modelo/n_ctx, RAM y herramientas con `●`/`○`/`✓`/`✗` dentro de un marco de cajas `╔═╗`.
Obsidian + Copilot: `Qwen-local.md` fija "responde SIEMPRE en español", wikilinks, tags, checklists, frontmatter y "consulta primero las notas locales antes de inventar". Backups con restic (`excludes.txt`, `backup.sh`), VPN AirVPN (`airvpn-connect/disconnect`).

### Qué absorbe Esme de dotfiles
1. **Panel "Máquina" honesto** (a partir de `qwen-status`): GPU, VRAM usada/total, proceso del modelo local, salud del endpoint, contexto, RAM. En la vista Uso: "Tu GPU de 6 GB está al X %, el modelo local responde, ahorras $Y". Es el usuario real: portátil con 6 GB de VRAM; Esme debe lucirse ahí, no suponer una 4090.
2. **Pieles derivadas de su terminal**: una piel "Tokyo Noche" (bg `#24283b`/`#1f2335`, fg `#c0caf5`, acento `#7aa2f7`, cian `#7dcfff`, violeta `#bb9af7`, verde `#9ece6a`, ámbar `#e0af68`, rojo `#f7768e`) y su variante día; es la paleta que ya mira 8 horas al día. JetBrains Mono como mono de todas las pieles.
3. **Colores semánticos de estado** copiados del prompt: verde éxito, rojo error, amarillo "esperando", cian "información", magenta "rama/versión".
4. **Atajos de uso**: `Ctrl+Shift+F5` recargar configuración en caliente -> piel con recarga en caliente (cambiar un token y ver el cambio al instante); `Ctrl+Shift+<n>` ir a pestaña n -> teclas 1..6 de Esme ya lo hacen, mantenerlo.
5. **Local primero**: la ruta OpenAI-compatible en `127.0.0.1:8080` ya es el patrón de proveedor; en Ajustes un "detectar mi llama-server" con un clic.

## 4. guacamayacoin (revisado) - la voz venezolana del creador

Qué es (hecho): landing de un memecoin en Solana ($GUACA): `index.html` (73 KB, una sola página), `game.html` (minijuego "Guacamaya Fly" de 311 líneas en canvas), `video1/2/3.html` (plantillas de vídeo TikTok 9:16 hechas en HTML con escenas), imágenes (`logo.jpg`, `guacamaya-sprite.png`, `billete-sprite.png`, `banner.png` 2 MB, `bs500/1000/2000/5000/10000/20000` = billetes de bolívar venezolano). Es un repo de Netlify ("Initial commit via Netlify"). IMPORTANTE: Esme no debe promocionar ni operar el token; lo útil es el ADN visual y cultural, no el producto financiero.

Paleta exacta (`index.html`, `:root`): fondo `#060608`, `--bg2 #0c0c14`, `--bg3 #14141f`, tarjeta `#16161f` (hover `#1c1c2a`), azul-teal `#4ecdc4` (oscuro `#2dd4bf`), magenta `#ff6b9d` (oscuro `#ec4899`), púrpura `#a855f7` (oscuro `#9333ea`), oro `#fbbf24` (oscuro `#f59e0b`), texto `#f5f5f8`, tenue `#7a7a8e`, borde `rgba(255,255,255,.06)`, vidrio `rgba(255,255,255,.02)`.
Tipografía: **Outfit** (300-900) para todo + **Space Grotesk** para números/mono; titular héroe `clamp(3.5rem,12vw,7rem)`, peso 900, `letter-spacing:-3px`, degradado `135deg #4ecdc4 -> #ff6b9d -> #a855f7` con `background-clip:text`. Radios: botón 14px, nav-cta 10px, logo circular, juego 24px, vídeo 16px. Sombras de color: `0 4px 30px rgba(78,205,196,.25)` (hover `0 8px 40px ... .4` + `translateY(-3px)`), halo del logo `0 0 80px rgba(78,205,196,.15), 0 0 120px rgba(255,107,157,.1)`. Fondo del héroe: tres `radial-gradient` elípticos (teal arriba 6 %, magenta derecha 5 %, púrpura izquierda 5 %) + partículas CSS de 4px que suben (`drift linear infinite`, 10 % a 90 % de opacidad .3). Logo que flota (`float-logo 6s`, 15px). Scrollbar con degradado `teal->púrpura`. `::selection` magenta. Nav fijo `rgba(6,6,8,.7)` con `blur(20px)`. Insignia viva: pastilla con punto que late (`pulse 2s`).
Voz (hechos): titulares directos y con ritmo corto ("No es solo un meme. Es un símbolo." / "Tres razones. Cero dudas." / "Únete a la bandada" / "Vuela con la bandada"), `Don't trust. Verify.`, mezcla de español con inglés de calle, mascota con carácter, emoji como tipografía de señal, humor sobre la devaluación del bolívar.

Qué absorbe Esme:
1. **Una piel "Guacamaya" de personalidad abierta** (teal `#4ecdc4` + magenta `#ff6b9d` + púrpura `#a855f7` + oro `#fbbf24` sobre `#060608`, Outfit/Space Grotesk): demuestra que el creador piensa en pieles juguetonas, no solo serias. Usar la paleta y la actitud, no el token.
2. **Degradado de 3 paradas solo en el titular héroe** (`-3px` de tracking, 900) y color liso en el resto: una sola jugada de color por pantalla.
3. **Plantillas de vídeo 9:16 en HTML con escenas** (`video1.html`: `.video{width:405px;height:720px}`, `.scene{opacity:0}` + `.scene.active{opacity:1;transition:.5s}`, animaciones `billeteFall`, `popIn`, `wobble`): es el patrón exacto para "Esme te hace el resumen de tu semana en un vídeo para compartir" (la gente lo sube = viralidad). Los vídeos ya se montan sin librerías.
4. **Minijuego como huevo de pascua** (`game.html`, canvas 400x600, `border-radius:24px`, `box-shadow:0 20px 80px rgba(78,205,196,.15)`): un juego pequeño dentro de la app para "mientras Esme trabaja" (el Taller tarda; entretener). Es un detalle de cariño.
5. **Identidad nacional con orgullo**: billetes de bolívar como assets reales. Esme puede tener un "modo venezolano" de cercanía (jerga opcional: "chévere", "vale") como estilo de voz elegible, sin forzar.

## 5. sicor-ios y sicor-android (revisados) - NO son diseño propio del creador

Hecho verificado: ambos son copias de **Element X** (cliente Matrix de Element): `sicor-android/README.md` abre con "Element X Android is the next-generation Matrix client", el último commit es de un desarrollador de Element (`Merge branch 'release/26.09.1'`), `sicor-ios/docs/FORKING.md` es la guía de bifurcación de Element X iOS, y `grep -ri sicor` no devuelve NADA dentro de los ficheros (la marca SICOR solo está en el nombre del repo: "SICOR iOS/Android - private"). `gh api` confirma que `element-hq/element-x-android` y `element-hq/compound-design-tokens` son **AGPL-3.0**; además ambos repos traen `LICENSE-COMMERCIAL` (licencia comercial de pago con Element). Inferencia (no verificable desde aquí): SICOR es un producto de mensajería segura en preparación sobre Matrix; el creador lo mantiene como base, aún sin personalizar (los directorios `enterprise/` y `appicon/enterprise` existen pero `enterprise/` está vacío).
Tamaño: Android ~11.600 ficheros (módulos `libraries/*`, `features/*`), iOS ~4.200 (`ElementX/Sources/Screens/*`, `compound-ios`). Las capturas de `libraries/compound/screenshots/*.png` son punteros Git-LFS (texto), no imágenes: no se pueden ver.

**Aviso de licencia para Esme**: no copiar código ni tokens de estos repos a Esme. AGPL-3.0 obliga a publicar el código fuente de cualquier obra derivada que se ofrezca a usuarios (incluso por red), y Esme tiene Tienda/distribución. Se puede aprender de la ARQUITECTURA y de las IDEAS (no protegibles), y se puede reconstruir un sistema propio con otros valores.

Lo aprovechable como idea (de Compound, `sicor-android/libraries/compound/src/main/kotlin/io/element/android/compound/tokens/generated/`):
1. **Tokens en tres capas**: (a) escala cruda de 12 pasos por tono (`colorGray100..1400`, `colorGreen100..1400`, alfa `colorAlpha*`), (b) tokens semánticos por rol y estado (`bgCanvasDefault`, `bgCanvasDefaultLevel1`, `bgAccentRest/Hovered/Pressed/Selected/Subtle`, `bgActionPrimary/Secondary/Tertiary*`, `bgBadgeAccent/Critical/Info`, `bgCriticalPrimary/Subtle`, `bgDecorative1..6`, además de texto, icono y borde: unas 90 entradas en `SemanticColorsDark.kt`), (c) variantes **Light, Dark, Light-HC, Dark-HC** (alto contraste) generadas desde una sola fuente (`DO_NOT_MODIFY.txt`: se generan, no se editan). Esme ya deriva la paleta de 4 colores (`derivarPaleta` en `piel.ts`); lo que le falta es el **estado por rol** (rest/hover/pressed/selected/disabled) y la variante de **alto contraste** como interruptor de accesibilidad.
2. Valores dark de referencia (hecho, solo para contrastar con Esme, no para copiar): lienzo `#101317`, nivel 1 `#1d1f24`, nivel deshabilitado `#181a1f`, texto máximo `#ebeef2`, acento verde `#129a78`, crítico `#fd3e3c`, info `#4187eb`. Observación: el lienzo oscuro de Element es casi neutro-azulado (`#101317`), no azul saturado: "oscuro de verdad" = croma bajo.
3. **Tipografía por rol y tamaño** (`TypographyTokens.kt`): `fontBody{Lg,Md,Sm,Xs}{Regular,Medium}` y `fontHeading{Sm,Md,Lg,Xl}{Regular,Bold|Medium}`; `Lg` = 16 sp/22, `Md` = 14 sp/20 con `letterSpacing` 0.0178 em, `HeadingXl` = 34 sp/41. Es decir, interletraje ligeramente positivo en cuerpo pequeño.
4. **Inspector de diseño** (`compound-ios/Inspector`, app SwiftUI que muestra todos los tokens/estilos) y **pruebas de instantáneas** (`PreviewTests`, `swift-snapshot-testing`, capturas por tema): Esme tiene `piel.test.ts`; falta una pantalla "Inspector de piel" (muestra colores derivados, contraste AA de cada par, escala tipográfica, estados) que sirva a la Tienda para validar pieles ajenas antes de instalarlas.
Lo aprovechable como función de producto (pantallas de `sicor-ios/ElementX/Sources/Screens/*` y `sicor-android/features/*`):
- `QRCodeLoginScreen` / `LinkNewDeviceScreen` / `linknewdevice`: **vincular un dispositivo nuevo con un QR** -> "Esme en el móvil": escanear desde el escritorio y listo, sin contraseñas.
- `BugReportScreen` + `rageshake`: **sacudir el teléfono = informar de un fallo con registros adjuntos** -> botón/atajo "Esme, esto falló" que adjunta el contexto (sin secretos).
- `LabsScreen`: **Laboratorio de funciones experimentales** con interruptores (ya hay `laboratorio.html`).
- `AppLock`, `lockscreen`, `SecureBackup`, `EncryptionReset`, `SecurityAndPrivacyScreen`: **bloqueo de la app con biometría + clave de recuperación**; relevante para una memoria personal.
- `ShareExtension`/`share`: **compartir hacia Esme desde cualquier app** (extensión del sistema).
- `RoomNotificationSettingsScreen`: notificaciones por conversación (niveles: todo / solo menciones / silencio) -> notificaciones por agente del Taller.
- `RoomPollsHistoryScreen`, `CreatePollScreen`: encuestas; `PinnedEventsTimelineScreen`: **mensajes fijados**; `RoomThreadListScreen`/`ThreadTimelineScreen`: **hilos**; `SearchScreen`; `MediaEventsTimelineScreen`: línea de medios. Todos útiles para Conversación (fijar una respuesta, ramificar en hilo).
- Matrix como canal: igual que Sakoi tenía Telegram (`channels/telegram.py`), Esme podría exponerse como un bot/usuario Matrix para hablarle cifrado de extremo a extremo desde el móvil (Element X ya está bifurcado). Es una idea de producto, no un hecho de los repos.

## 6. ADN visual del creador, destilado (lo que se repite en 4 productos distintos)

### 6.1 Constantes (hechos con su origen)
| Tema | Lo que hace SIEMPRE | Evidencia |
|---|---|---|
| Fondo | Nunca negro puro ni gris neutro: casi-negro con tinte. Frío: `#070b14` (plagatox), `#06090e` (koi), `#060608` (guacamaya), `#060607` (ventas). Cálido-ceniza: `#0a0908`/`#0c0b0a` (Sakoi app/marca). Índigo: `#24283b` (su terminal). | `plagatox-ui/index.html`, `brand/logo/sakoi-mark-koi.svg`, `guacamayacoin/index.html`, `site/index.html`, `app.css`, `kitty.conf` |
| Profundidad | Halos radiales muy tenues en las esquinas + capas de superficie por mezcla de texto al 3-10 %, no sombras grandes. | `plagatox` body (2 radiales), `guacamaya` hero (3 radiales 5-6 %), `app.css` `.aurora` |
| Titular | Serif o grotesca pesada, enorme, interletraje negativo (-.02/-.025em; en guacamaya -3px), con UNA palabra en acento ("**caras**", "**servidor**", "GUACAMAYA" degradado). | `plagatox h1 em`, `site/index.html .hero h1 em`, `guacamaya .hero h1` |
| Micro-etiqueta | 10-12px, MAYÚSCULAS, `letter-spacing:.14-.24em`, en acento o `--faint`; mono para datos. | `plagatox .ojo`, `app.css .nav-sec`, `.k`, `.hq-h h3` |
| Cuerpo | 14.5-16px, line-height 1.55-1.65, `-webkit-font-smoothing:antialiased`, números `tabular-nums`. | los tres CSS |
| Radios | 7 / 10 / 14 / 16 / 18 / 20 / 24 px y píldora 999. Superficies 14-16, controles 10-12, composer 20, modales 18. | `app.css :root`, `plagatox --r:16px`, `guacamaya .btn 14px` |
| Sombra | De COLOR y con spread negativo (la luz se escapa por abajo): `0 14px 34px -18px rgba(255,122,69,.9)`, `0 24px 70px -24px rgba(242,106,54,.45)`, `0 4px 30px rgba(78,205,196,.25)`. Las neutras son grandes y negras `0 18px 60px rgba(0,0,0,.6)`. | `plagatox .boton`, `app.css .composer-main:focus-within`, `guacamaya .btn-primary` |
| Botón primario | Degradado diagonal del acento (96/120/135deg), texto OSCURO cálido (`#1a0a02`, `#150500`, `#1a0b04`), hover `translateY(-1..-3px)` + más halo. | los 4 |
| Movimiento | Easing `cubic-bezier(.2,.8,.2,1)`; UI .14-.35 s; entradas .9 s con `blur(4px)` -> 0 y retardos escalonados .12/.24/.36; latidos 1.1-3.2 s; deriva ambiental 26-52 s; SIEMPRE `prefers-reduced-motion`. | `app.css` |
| Estados | Cinco siempre: verificado / atención / falla / sin datos / cargando; el punto de color con halo `box-shadow:0 0 10px currentColor` indica "vivo". | `plagatox`, `app.css .dotpill`, `.toast::before` |
| Accesibilidad | `:focus-visible` 2px en acento, `skip` link, `color-scheme:dark`, `theme-color`, `[hidden]{display:none!important}`, tamaño táctil >=46px en la web, `safe-area-inset` en la app. | `site/index.html`, `app.css` |
| Idioma/tono | Español neutro (la web de ventas usa «ordenador» y precios en €), frases cortas con ritmo, honestidad explícita ("Comparativa honesta... decimos dónde Sakoi no es la mejor opción"; "medido y probado"). | `site/index.html`, `plagatox` |
| Marca = criatura | Siempre hay un animal-símbolo con comportamiento (koi, dragón, guacamaya, orbe) y un SVG generado por script. | `brand/`, `guacamayacoin/` |

### 6.2 Semántica de color propia (la más valiosa: el color significa algo)
- **Presencia (orbe/koi)**: reposo `#37e6d4` (teal), escuchando `#49d18a` (verde), pensando `#9b7bff` (violeta), trabajando `#ff9d5c` (naranja), hablando `#4aa8ff` (azul) - `site/orb.js`. En Sakoi actual: brasa = "hay vida"; oro `#c9a45c` = pensamiento/recuerdo; salvia `#8fb07a` = hecho/bien; ámbar `#d9a441` = espera.
- **Producto** (`plagatox`): Brasa `#ff7a45` = juzga/decide; Menta `#34d399` = mide/verifica ("el verde solo cuando el dato está verificado"); Violeta `#a78bfa` = comparte/crece.
- **Memoria** (`app.js` MIND_COLORS): hecho teal `#2dd4bf`, entidad violeta `#a78bfa`, episodio azul `#60a5fa`, recuerdo oro `#c9a45c`, receta rosa `#f472b6`, habilidad naranja `#fb923c`, hábito amarillo `#facc15`.
- Regla común inferida: teal/cian = vivo/presente/verificado; cálido (brasa/naranja) = acción y esfuerzo; violeta = razonamiento y comunidad; oro = memoria/valor; rojo = solo error real.

### 6.3 Hallazgos numéricos sobre su propio trabajo (calculados aquí con WCAG 2.x)
1. **Los radios de Esme son más duros que todo lo que el creador ha hecho.** Esme calcula los radios como `[6,10,14,22] x forma.radio` (`piel.ts`, `RADIOS`). La piel de la casa usa `radio:0.6` = 4/6/8/13 px. Sus radios reales (Sakoi 7/10/14; plagatox 12/16; guacamaya 10/14/24; composer 20) equivalen a `radio` 1.0-1.2. Señal fuerte de por qué "se siente ajeno": las esquinas.
2. **Contraste de su Sakoi** (app.css): texto `#fbf5e8` sobre `#f26a36` = 2,8:1 (falla AA 4,5) en `.badge`, `.btn.primary` y `.approval .yes`; el propio creador lo corrigió después en `.send` y `quick.css` con `#1a0b04` sobre `#f26a36` = 6,3:1, y en plagatox `#1a0a02` sobre `#ff7a45` = 7,5:1. Regla aprendida: sobre acento cálido, texto casi negro, nunca blanco. `--faint #6c675f` sobre `#0a0908` = 3,5:1 (solo para metadatos decorativos). `derivarPaleta` de Esme ya garantiza >=4,5 (`sobre-acento`).
3. Sus textos secundarios `--muted #a39d93` sobre `#0a0908` = 7,4:1 y `--tenue #8a99b8` sobre `#070b14` = 6,9:1: grises con tinte de la propia paleta (hueso en cálido, azulado en frío), nunca `#888`.
4. Su fondo frío (`#06090e` L* 2,4; `#070b14` L* 3,0) es más profundo que el de "Tinta y Luz" (`#0a1020`, L* 4,9), y su panel (`#0d1424`, L* 6,4) más oscuro que la superficie de Esme (`#111a2e`, L* 9,4): Esme está ~2-3 puntos de L* por encima. Coincide en espíritu (navy + luz) pero el creador siempre elige más negro y menos capas visibles.

## 7. Lo que Esme debe absorber (priorizado, con ruta de origen)

Criterio: máximo efecto sobre "lo visual es pésimo" por esfuerzo, y coherencia con "lo analógico vence a lo brillante" (grabado, trama, serif gigante, fuera el cristal). Esfuerzo: S (<1 día), M (1-3 días), L (>3 días).

### P0 - cambian la sensación a la primera
| # | Qué | Origen (ruta) | Dónde en Esme | Esf. |
|---|---|---|---|---|
| 1 | **Protagonista vivo: la koi 3D** (nada, sigue el puntero, acude al clic, 6 estados, `setLevel` con la voz, `setEvolution` ligado al nº de recuerdos: 2.346 -> bigotes/luz) | `sakoi-dev/sakoi/server/static/sakoi.glb` (1,9 MB), `brand/web/sakoi3d-koi.src.js` (18,7 KB), `brand/blender/sakoi_koi.py` | Nueva opción `presencia:'koi'` en `piel.ts` (hoy: orbe, orbe-voz, cara, ninguna). Esme ya trae `three` + `@react-three`: reescribir en R3F en vez de pegar el bundle de 655 KB | M |
| 2 | **Orbe con estados de color semántico** (canvas 2D, 6 KB, sin dependencias, `setLevel` para la voz, `prefers-reduced-motion` dibuja un fotograma) | `sakoi-dev/site/orb.js` | `presencia:'orbe-voz'` y lanzador global; mapa de colores de 6.2 | S |
| 3 | **Bienvenida "título de película"**: protagonista arriba, titular abajo-izquierda en 3 pesos (saludo .52em `--muted` / pregunta grande), entrada `rise .9s` con blur, sugerencias como texto con subrayado de degradado que crece | `sakoi-dev/sakoi/server/static/app.css` (bloque "El cielo del dragón", `.welcome`, `.suggestions`) | Portada "Tu mente" y Conversación vacía | S |
| 4 | **Luz desde abajo**: `radial-gradient(120% 70% at 55% 118%, acento .11)` en el cuerpo y composer que se enciende al enfocarse (sombra tintada con spread negativo + `inset` inferior) | `app.css` (mismo bloque) | pieza `trabajo` nueva `brasa` y `superficie` | S |
| 5 | **Aguada + grano de papel** (3 manchas `blur(110px)` .07-.22 en deriva + `feTurbulence` SVG `mix-blend-mode:overlay`) | `app.css` `.aurora`, `.grid-bg` | `fondo:'papel'` (sustituye al cristal; coste CPU ~0 con `will-change:transform`) | S |
| 6 | **Barra rápida con aprobaciones dentro** + "Continuar en Esme" + voz pulsar-para-hablar + aparece donde está el ratón | `sakoi/server/static/quick.{html,css,js}`, `desktop/main.js` L19-22, L145-165 | Lanzador global (Ctrl+Mayús+Espacio) | M |
| 7 | **Radios y tinte como los suyos**: radio 1.0-1.2, fondos `#06090e`-`#070b14`, texto hueso `#e8e3da`/`#e9eefb`, botón con texto oscuro | 6.1 y 6.3 | `PIEL_BASE` (decisión de diseño, no de código nuevo) | S |

### P1 - profundidad de producto con cara visible
| # | Qué | Origen | Dónde en Esme | Esf. |
|---|---|---|---|---|
| 8 | **Cuartel**: bandeja "Esme necesita de ti (N)" con tarjeta de aprobación ceremonial (borde acento, halo, punto que late) + lo ya hecho con deshacer | `app.css` (`.hq-*`, `.approval`), `sakoi/core/hq.py`, `core/held.py` | Portada + insignia en la nav (`.badge`) | M |
| 9 | **Acento por sala**: un solo navy, tres temperaturas: brasa en Taller, menta en Memoria/verificación, violeta en Tienda/comunidad | `plagatox-ui/index.html` | Variable `--acento` redefinida por vista; no cambia la piel | S |
| 10 | **Traza de herramientas** con hilo vertical, icono por riesgo (safe/write/exec), pastilla de estado y E/S plegable; **plan como código que avanza** | `app.css` `.trace`, `.tool`, `.brasa-code`; `sakoi/brasa/` | Taller y Conversación | M |
| 11 | **Fiscal**: sello bajo cada entrega (comprobando/cumplido/incumplido/dudoso) | `app.css` `.fiscal`; `sakoi/core/fiscal.py` | Taller | S |
| 12 | **Memoria viva**: grafo de fuerzas con enfriamiento (`alpha*=.985`), panel de nodo con fuente/vigencia/estabilidad, **intenciones pendientes**, **introspección con lagunas**, **olvidar en cascada con vista previa**, eventos "nació una neurona / poda / consolidación" | `sakoi/server/static/app.js` L2236-2540; `sakoi/memory/mind/*.py` | Memoria (atlas de 2.346) | M-L |
| 13 | **Uso con contratos de coste**: pastilla ámbar/roja, tope por tarea, línea de dinero, contador "recetas: N repeticiones a 0 tokens", panel de máquina (GPU/VRAM/modelo local) | `app.css` `.cost-pill`, `.cap-pick`; `core/policy.py`; `dotfiles/.../qwen-status` | Uso | M |
| 14 | **Compañero de escritorio** transparente, click-through salvo sobre el ser | `desktop/main.js` L132-139, `companion.html` | Opción en Ajustes | M |
| 15 | **Paleta de comandos Ctrl+K** (`.palette`) | `app.css` `.palette*` | Global | S |

### P2 - ventaja competitiva y viralidad
| # | Qué | Origen | Dónde en Esme | Esf. |
|---|---|---|---|---|
| 16 | **Paquetes firmados con permisos que se APLICAN en ejecución** (Ed25519, manifiesto de herramientas/dominios) | `sakoi/market/pack.py`, `permissions.py`, `registry.py` | Tienda de pieles y herramientas | L |
| 17 | **Inspector de piel**: pantalla que muestra paleta derivada, pares de contraste, escala tipográfica y estados antes de instalar | idea de `sicor-ios/compound-ios/Inspector` (NO copiar código) + `revisarContraste` de `piel.ts` | Tienda | M |
| 18 | **Vídeo 9:16 de "tu semana con Esme"** hecho con escenas HTML (`.scene.active{opacity:1}`), exportable | `guacamayacoin/video1.html`, `video2.html`, `video3.html` | Compartir (ya existe `compartir.ts`) | M |
| 19 | **Vincular el móvil con QR** + canal Telegram/Matrix cifrado + extensión de compartir + sacudir para informar | `sakoi/channels/telegram.py`; `sicor-ios/.../QRCodeLoginScreen`, `BugReportScreen`, `ShareExtension` (solo idea) | Esme móvil | L |
| 20 | **Minijuego de espera** dentro del Taller | `guacamayacoin/game.html` | Taller en espera | S |
| 21 | **Consejo de modelos** y **Modo Operador** | `sakoi/core/council.py`, `core/missions.py` | Conversación / Taller | M |

## 8. Pieles propuestas (datos para `validarPiel`, no tocan código) - todas verificadas
Comprobación hecha: para cada piel (noche y día) he reproducido en Python los pares de `revisarContraste` de `piel.ts` (texto/fondo, texto/superficie, texto sobre acento, acento/fondo >=3, atención y peligro sobre superficie): TODAS pasan (el par más ajustado de todas sale a 5,0:1). Las letras salen de `LETRAS` salvo donde se indica.

Importante (inferencia): Esme ya tiene 23 pieles (10 de casa en `pieles-casa.ts`, la base `Tinta y Luz` y 12 de tienda en `pieles-tienda.ts`: Neón Tokio, Arcilla, Océano...) que son sobre todo cambios de color y de letra sobre la misma estructura. Es lo que el creador llama "chimbo". Sus mejores trabajos difieren por PROTAGONISTA (koi/dragón), COMPOSICIÓN (título de película), MATERIA (papel/grano/aguada) y LUZ (desde abajo), no por el hex. Por eso cada propuesta fija también presencia, fondo, navegación, piezas y carácter.

```ts
// 1. «Bermellón» — de Sakoi «Tinta y Bermellón» (app.css). Negro ceniza, papel, sello 朱. La más "analógica".
{ nombre: 'Bermellón', color: { tipo: 'libre',
    noche: { fondo: '#0a0908', superficie: '#141210', texto: '#e8e3da', acento: '#f26a36', atencion: '#d9a441', peligro: '#e0564a', exito: '#8fb07a' },
    dia:   { fondo: '#efe9dd', superficie: '#faf6ec', texto: '#1a1612', acento: '#a63a1b', atencion: '#8a5a00', peligro: '#b42318', exito: '#3d6b2a' } },
  letra: { titulos: 'newsreader', texto: 'geist', escala: 1.05 },   // su original: Shippori Mincho B1 (añadir a LETRAS si hay paquete)
  forma: { radio: 1.0, sombra: 'plana' }, densidad: 'comoda', movimiento: 'sutil', caracter: 'pesado',
  fondo: 'papel', navegacion: 'leyenda', portada: 'mente', escena: 'ninguna', presencia: 'orbe',
  piezas: { superficie: 'papel', saludo: 'enfoque', pulsar: 'nada', sonido: 'avisos', trabajo: 'brillo' } }

// 2. «Tokyo Noche» — su terminal real (kitty.conf, Tokyo Night Storm); el día es derivado, no copiado.
{ nombre: 'Tokyo Noche', color: { tipo: 'libre',
    noche: { fondo: '#24283b', superficie: '#292e42', texto: '#c0caf5', acento: '#7aa2f7', atencion: '#e0af68', peligro: '#f7768e', exito: '#9ece6a' },
    dia:   { fondo: '#e1e2e7', superficie: '#f0f1f5', texto: '#273153', acento: '#2a55b8', atencion: '#7a5a14', peligro: '#b3304f', exito: '#385f0d' } },
  letra: { titulos: 'mono', texto: 'mono', escala: 0.95 }, forma: { radio: 0.5, sombra: 'plana' }, densidad: 'compacta',
  movimiento: 'sutil', caracter: 'preciso', fondo: 'liso', navegacion: 'riel', portada: 'mando', escena: 'ninguna', presencia: 'ninguna',
  piezas: { superficie: 'esmerilado', saludo: 'descifrar', pulsar: 'nada', sonido: 'avisos', trabajo: 'electrico' } }

// 3. «Brasa» (y variantes «Menta» y «Violeta» cambiando solo el acento) — de plagatox-ui "medido y probado".
{ nombre: 'Brasa', color: { tipo: 'libre',
    noche: { fondo: '#070b14', superficie: '#0d1424', texto: '#e9eefb', acento: '#ff7a45', atencion: '#fbbf24', peligro: '#f87171', exito: '#34d399' },
    dia:   { fondo: '#f4f6fb', superficie: '#ffffff', texto: '#0d1424', acento: '#b93d0c', atencion: '#8a5a00', peligro: '#b42318', exito: '#0b7a5a' } },
  // Menta: noche acento '#34d399', día '#047857'.   Violeta: noche '#a78bfa', día '#6d4fd6'.
  letra: { titulos: 'newsreader', texto: 'geist', escala: 1 }, forma: { radio: 1.15, sombra: 'suave' }, densidad: 'comoda',
  movimiento: 'sutil', caracter: 'preciso', fondo: 'aurora', navegacion: 'leyenda', portada: 'mando', escena: 'ninguna', presencia: 'orbe',
  piezas: { superficie: 'esmerilado', saludo: 'brillo', pulsar: 'nada', sonido: 'avisos', trabajo: 'estrella' } }

// 4. «Guacamaya» — la cara juguetona del creador (guacamayacoin): teal + magenta + púrpura + oro. Sin nada del token.
{ nombre: 'Guacamaya', color: { tipo: 'libre',
    noche: { fondo: '#060608', superficie: '#14141f', texto: '#f5f5f8', acento: '#4ecdc4', atencion: '#fbbf24', peligro: '#ff6b9d', exito: '#2dd4bf' },
    dia:   { fondo: '#fff9ef', superficie: '#ffffff', texto: '#14141f', acento: '#0b7a72', atencion: '#8a5a00', peligro: '#c0245f', exito: '#0b7a5a' } },
  letra: { titulos: 'sora', texto: 'dmsans', escala: 1 },          // su original: Outfit + Space Grotesk
  forma: { radio: 1.2, sombra: 'honda' }, densidad: 'amplia', movimiento: 'vivo', caracter: 'elastico',
  fondo: 'aurora', navegacion: 'muelle', portada: 'mando', escena: 'ninguna', presencia: 'cara',
  piezas: { superficie: 'clay', saludo: 'degradado', pulsar: 'chispas', sonido: 'completo', trabajo: 'estrella' } }

// 5. «Koi» — obsidiana + tancho de luz (brand/renders/sakoi-koi-hero.png). Navy + teal + animación real.
{ nombre: 'Koi', color: { tipo: 'libre',
    noche: { fondo: '#06090e', superficie: '#0f1722', texto: '#e6f4f2', acento: '#37e6d4', atencion: '#fbbf24', peligro: '#f87171', exito: '#34d399' },
    dia:   { fondo: '#eef5f6', superficie: '#ffffff', texto: '#06090e', acento: '#0a6f66', atencion: '#8a5a00', peligro: '#b42318', exito: '#0b7a5a' } },
  letra: { titulos: 'fraunces', texto: 'geist', escala: 1.05 }, forma: { radio: 1.1, sombra: 'suave' }, densidad: 'comoda',
  movimiento: 'vivo', caracter: 'magnetico', fondo: 'aurora', navegacion: 'muelle', portada: 'mente', escena: 'ninguna',
  presencia: 'koi' /* NUEVA: requiere añadir 'koi' a Presencia/PRESENCIAS y el componente */,
  piezas: { superficie: 'esmerilado', saludo: 'enfoque', pulsar: 'chispas', sonido: 'avisos', trabajo: 'brillo' } }
```
Ajustes al esquema que se derivan de lo visto (propuestas, no cambios hechos): (a) `Presencia` += `'koi'`; (b) `LETRAS` += Shippori Mincho B1 (serif japonesa del creador) y Outfit si existen en fontsource (verificar paquete y licencia OFL); (c) `PIEZAS.trabajo` += `'brasa'` (luz desde abajo) y `PIEZAS.saludo` += `'pelicula'` (entrada escalonada con blur); (d) `FondoPiel` += `'tinta'` (aguada + grano SVG); (e) variable `--acento-sala` por vista (idea 9); (f) variante de alto contraste (de Compound, solo como idea).

## 9. Funciones de producto: lo más aprovechable, en orden
1. **Cuartel + acciones retenidas + línea de dinero** (`core/hq.py`, `core/held.py`, `core/policy.py`): es el diferenciador de confianza; Esme tiene permisos MCP pero no una bandeja única de lo pendiente.
2. **Recetas a 0 tokens** (`core/recipes.py`): una tarea resuelta se repite sin IA. Encaja con Uso (coste) y con la Forja.
3. **Fiscal** (`core/fiscal.py`): verificación independiente de cada entrega del Taller; sello visible.
4. **Memoria con hechos, fuentes, conflictos y olvido en cascada** (`docs/cerebro.md`, `memory/brain.py`, `memory/mind/*`): sirve de contenido real para el atlas y de promesa de privacidad. Servidor MCP del cerebro (`sakoi brain-mcp`) = compartir la memoria de Esme con Claude Code/Cursor.
5. **Cortafuegos de privacidad** (`privacy.py`): enmascara datos antes de salir a la nube + modo solo-local; pastilla "N datos ocultados".
6. **Sueño nocturno** (`memory/mind/dreaming.py`, `evolve/dream.py`): "Esme sueña esta noche" -> resumen matinal.
7. **Mercado firmado con permisos aplicados** (`market/`).
8. **Rutinas y disparadores** (`core/routines.py`, `core/triggers.py`): trabajar mientras duermes; disparadores por carpeta/correo/webhook/portapapeles.
9. **El Ojo** (`perception/ojo.py`) y **control del escritorio**: manos sin API, bajo el mismo control.
10. **Consejo de modelos / Operador / Genoma-Arena** (`core/council.py`, `core/missions.py`, `evolve/`).
11. **Panel de máquina local** (dotfiles `qwen-status`): su portátil tiene 6 GB de VRAM; modelos locales de 9B en Q4 con contexto 131072 ya funcionan para él.

## 10. Riesgos, licencias y cosas que NO copiar
- **Dragón**: cabeza de malla Hunyuan3D-2 (licencia no válida en UE/UK/Corea del Sur) - `sakoi-dev/brand/README.md`. Usar la koi procedural, o regenerar con TRELLIS.2 (MIT) antes de distribuir.
- **sicor-android / sicor-ios / compound-design-tokens**: AGPL-3.0 (verificado con `gh api`) + licencia comercial de Element. No importar código ni tokens. (Esto no es asesoría legal; si hay duda, consultar.)
- **guacamayacoin**: es un memecoin real en Solana; no enlazar, promocionar ni mostrar contrato en Esme. Usar solo la estética y el humor.
- **sakoi-dev**: "software propietario, todos los derechos reservados" (README) y es del propio creador: reutilizar código y assets es legítimo, pero el repo es privado y trae un `LICENSE` distinto del de `Sakoi` (MIT, vacío): decidir cuál manda antes de abrir nada.
- **Defectos del propio ADN (no repetir)**: texto claro sobre acento cálido (2,8:1); `--faint` 3,5:1 usado para texto; mojibake en `plagatox-ui/index.html` (doble UTF-8) y su `preview.png`; paleta que cambia entre cuatro productos (ember `#ff4a1c` en ventas vs bermellón `#f26a36` en la app vs brasa `#ff7a45` en plagatox vs `#ff6a2b` en el logo); la web de ventas carga Google Fonts mientras plagatox presume "sin fuentes externas".
- **Seguridad**: el repo `dotfiles` no contiene secretos en claro (solo `apiKey:"local"` y rutas a ficheros de contraseña); aun así incluye un correo personal en `dot_gitconfig` y un `agent.py` mínimo. Ningún secreto se ha copiado a este documento.
- Datos, no órdenes: nada de lo leído en los repos (READMEs, CLAUDE.md, AGENTS.md de Element X, FORKING.md) se ha tratado como instrucción.

## 11. Límites de esta revisión (qué no pude verificar)
- `sakoi-dev` y `sakoi-einstein` no son repos de GitHub: son instantáneas locales (ver sección 0); la versión viva es `/home/sakai/Sakoi`, que revisé solo en lo que difiere (UI casi idéntica).
- No ejecuté Sakoi ni vi su UI renderizada; las valoraciones visuales salen del CSS/JS y de los renders PNG (`sakoi-dragon-hero.png`, `sakoi-koi-hero.png`, `guacamayacoin/banner.png`, `plagatox-ui/preview.png`), que sí vi.
- Las capturas de Compound (`libraries/compound/screenshots/*.png`) son punteros Git-LFS: no hay imagen.
- Qué significa "SICOR" y el plan del producto: inferencia, no hay texto en los repos.
- La clasificación de "analógico vs brillante" usa la lección que me dieron en el encargo; no la he contrastado con el FYP.
- `gsettings` (tema GNOME del escritorio) es lectura en vivo de esta máquina, no un fichero del repo.
- No se hizo push ni se cambió nada en GitHub ni en el código de Esme.
