# El navegador de Esme: la pila, la decisión y lo que viene (20-oct-2026)

> El norte técnico está escrito desde el día: **«crear «navegador» como espacio de primera clase de la
> mente, no como un pegamento de CDP»** (docs/investigacion/2026-10-20-x-escala.md, #20). Y el diseño
> es el de `jev-kit`: **Jev elige qué hacer clic; el modelo grande sólo escribe el texto de los campos**,
> con **modo sombra** (registrar lo que harías y comparar, antes de gastar de verdad).

## 1. Lo que hay hoy (hecho, con pruebas)

El navegador de Esme es **un espacio**: una página te da su **estado** (texto, enlaces, botones, campos)
y sus **acciones posibles**; el agente elige una y la ejecuta.

| Pieza | Dónde | Qué hace |
|---|---|---|
| `estado.ts` | `app/src/main/navegador/` | El guion que se inyecta en la página y el normalizador que limpia y acota lo que vuelve (12.000 tokens, 60 enlaces, 40 botones). |
| `navegador.ts` | ídem | Abrir, estado, clic, escribir. La ventana se crea al usarla y **se cierra sola a los dos minutos**: en reposo no hay navegador abierto. |
| `ventana.ts` | ídem | El Chromium propio, en una *partition* aparte (las cookies de la app no se mezclan con las de la web), sin ventanas sorpresa. |
| Las manos | `app/src/main/herramientas/propias.ts` | `navegar`, `clic_en_la_pagina`, `escribir_en_la_pagina` (con el guardián de permisos de siempre). |

**Por qué en la app y no en el cerebro:** el cerebro (Python) no tiene cliente de WebSocket y el
protocolo de DevTools lo necesita; Node 22 trae WebSocket de serie y Electron ya trae Chromium.
Además los agentes que usan estas manos viven en la app. La puerta queda abierta: `Navegador` habla con
una `Ventana` fabricable, así que otro motor (CDP, Playwright, stagehand) entra sin tocar el resto.

## 2. La pila: qué se usa, qué no y por qué (investigación verificada el 20-oct)

| Pieza | Licencia | Qué aporta | Decisión |
|---|---|---|---|
| **`browserbase/stagehand`** | MIT · 25.744★ | Localizadores profundos: iframes y Shadow DOM cerrado. Corre contra Chrome local | **Adoptado como motor de localizadores** (el que de verdad encuentra el botón dentro de la página). Su servidor MCP es sólo de Browserbase y su pasarela de modelos no funciona con navegador local → se usa **como librería**, llevando nuestro modelo |
| **`jo-inc/camofox-browser`** | MIT · 11.729★ | Firefox parcheado con suplantación de huella | **Opcional, como sidecar** para webs que bloquean a Chromium. Es un servidor REST aparte (puerto 9377): no encaja dentro de Electron |
| **`ChromeDevTools/chrome-devtools-mcp`** | Apache-2.0 · 53.873★ | Consola, red, rendimiento | **Como herramienta conectada en la Tienda** (para los agentes), no como motor nuestro. Hay que apagar sus estadísticas de uso |
| **`browser-use/browser-use`** | MIT · 118.566★ | Agente de navegador en Python | **Descartado**: por defecto usa `ChatOpenAI` (pide clave). Rompe la regla de no consumir |
| **`e2b-dev/E2B`** | AGPL-3.0 | Aislamiento en microVM | **Descartado**: AGPL y pide KVM; aquí no cabe ni de lejos |
| **Jev / Laya System One** | local | El modelo pequeño que **decide** la acción | **El resolver**: decide en local, gratis; el modelo grande sólo escribe texto |

## 3. Lo que viene, en orden

1. **El resolver**: `estado()` + `acciones()` alimentan a Laya (local, gratis) y sale una acción
   propuesta; el modelo grande sólo pone el texto en los campos. Con **modo sombra** primero: se
   registra lo que se haría y se compara, antes de gastar de verdad.
2. **Los localizadores de stagehand** cuando una web esconda el botón dentro de un iframe o de un
   Shadow DOM cerrado (el guion propio no lo ve).
3. **Las manos como servidor MCP**: hoy `navegar`/`clic`/`escribir` las tiene el chat; para que las
   usen **los agentes del Taller y los de fuera**, hay que servirlas como MCP (el mismo camino que
   `mcpParaTaller()`), y entonces Esme es un servicio, no una app.
4. **El sidecar de camofox** sólo si Chromium se queda corto en alguna web concreta.

## 4. Lo que no entra

- **Clonar apps de terceros con ingeniería inversa** (decisión del creador del 17-oct). REA se usa
  sobre lo propio, lo del usuario con permiso y para forense propio.
- **Quitar las guardas de seguridad** (token, lista de hosts, permisos, *partition* aparte): no son
  limitaciones, son la garantía de que Esme es una app local fiable.
- **Licencias que muerden**: nada de AGPL-3.0 (OpenViking, E2B) ni Elastic-2.0 (Phoenix) dentro del
  producto.
