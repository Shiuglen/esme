# Escala máxima: cómo Esme pasa de ser buena a ser inevitable (2026-10-20)

> Documento de ideas del Taller `qxntxkie`, escrito a partir de la búsqueda en X del mismo día
> (`docs/investigacion/2026-10-20-x-escala.md`) y de lo que el código de Esme hace hoy.
> No es un plan de tareas: es la **tesis de escala** y el orden con que se ejecuta.

## 0. La tesis, en una página

Esme ya es un sistema cognitivo con red neuronal propia que envuelve a cualquier IA. Lo que hace
hoy: recuerda, sueña, enseña, lanza agentes, forja apps, tiene voz, tiene taller y tiene tienda.

Lo que **no** hace todavía: **salir de tu máquina**. Esme es excelente contigo y invisible para los
demás. La escala real de Esme no es «más funciones»: es **dejar de ser una app y pasar a ser un
servicio que todos los agentes del mundo usan como memoria**, y **dejar de ser una herramienta y
pasar a ser el sitio donde se aprende a hacer las cosas**.

Tres movimientos, en este orden:

1. **Que la memoria de Esme esté disponible para cualquier IA** (MCP en el Registro oficial, A2A, ACP bien cerrado).
2. **Que Esme aprenda de cualquier programa y de cualquier tarea** (REA sobre lo propio, navegador como espacio, skills que nacen del uso).
3. **Que Esme tenga economía propia** (Tienda con catálogo verificado, informe de equivalencia, planes, `.sakoipack`).

El orden importa: sin (1) no hay escala; sin (2) no hay diferencia; sin (3) no hay sustainability.

---

## 1. «Ninguna orden limita» — la política de límites

El creador lo dijo dos veces: *«elimina limitaciones de esto que estamos creando»* y *«cambiar todo
esto ya que es malísimo»*. Esto se traduce en una regla operativa, no en un eslogan:

> **Un límite solo se conserva si es una decisión del creador, nunca un resto de una decisión anterior.**

Los tres tipos de límite y qué se hace con cada uno:

| Tipo | Ejemplos | Decisión |
|---|---|---|
| **Límite de recurso** (memoria, tokens, tamaño de fichero) | 60 recuerdos, 1500 tokens, `max_tokens=2048`, sólo `.md` | **Se elimina o se hace configurable y generoso.** El presupuesto es una petición del que llama, no una decisión del servidor. |
| **Límite de seguridad** (token de acceso, lista de hosts, redacción de secretos, exclusión) | `Bearer`, `127.0.0.1`, `SECRET_REDACTED`, `_EXCLUDE` | **Se conserva y se explica.** No son limitaciones: son la palabra. Sin ellos, «Esme es una app local y segura» deja de ser verdad. |
| **Límite de política/legal** (no clonar apps ajenas, no escribir fuera de la copia) | la decisión del 17-oct sobre ingeniería inversa | **Se conserva.** Es una decisión del creador, no un resto. |

**El trabajo de esta tarea (hecho, ver `docs/resultados/2026-10-20-limites-eliminados.md`):** se han
eliminado los límites del primer grupo. El segundo y el tercero siguen intactos a propósito.

---

## 2. Lo que está mal hoy (y hay que cambiar)

No para quejarse: para que no se repita. Todo esto estaba vivo en el código al empezar esta tarea:

| # | Lo que está mal | Dónde | Por qué importa |
|---|---|---|---|
| 1 | **La memoria de Esme no llega a OpenCode**: la app escribe `mcp.esme` y OpenCode lee `mcp.servers.*` | `app/src/main/mente/compartir.ts:15,21` | El agente con el que hablas no tiene tu memoria. Es el fallo más caro del producto y es de **una línea**. |
| 2 | **La abstención cerraba la puerta**: si nada parecía mucho, `recall` devolvía vacío | `daimon/thalamus.py` | El agente se quedaba parado sin hacer nada, y no sabía por qué. |
| 3 | **Los recuerdos se olvidaban solos**: la recencia caía a cero a los ~276 días | `daimon/thalamus.py` | «Aprender» sin poder volver atrás es no aprender. |
| 4 | **Lo aprendido moría al reiniciar**: el feedback sólo valía en el mismo proceso | `daimon/thalamus.py` | Cada cierre de app borraba la lección de la IA. |
| 5 | **El contexto se cortaba a media palabra** | `daimon/baselines.py` | La IA recibía fragmentos ilegibles en lugar de contexto. |
| 6 | **Esme sólo aprendía de `.md` y `.jsonl`** | `daimon/ingest.py` | El código, los datos y la configuración del usuario eran invisibles para la mente. |
| 7 | **Tope fijo de 60 recuerdos** y presupuesto fijo de 1500 tokens | `daimon/thalamus.py`, `daimon/gate.py` | El motor bueno recibía menos contexto que el que sabe usar. |
| 8 | **El tipo de un recuerdo se perdía** (`decision` → `note`) | `daimon/gate.py` | La memoria no distinguía una decisión de una nota. |

**Los ocho están arreglados** (ver el documento de resultados). Los dos siguientes siguen abiertos y
son de otra categoría:

| # | Lo que está mal | Dónde | Plan |
|---|---|---|---|
| 9 | **No hay modo «lee mi pantalla»**: el Ojo existe pero no está en el bucle del agente | `daimon/` + `app/` | Palanca 3 |
| 10 | **El Taller es de una sola sesión** (decisión del 17-oct) | `app/src/main/ipc-taller.ts` | Se queda: es una decisión del creador, no un fallo |

---

## 3. Las doce palancas

Cada una: **la idea · por qué multiplica · el primer paso · cómo se mide · el riesgo**.

### Palanca 1 — El navegador como espacio de primera clase
**Idea.** El agente de @gregpr07 hizo «encontrar vuelos» en **7 s y 0,0039 $** con tres ingredientes:
nuevo espacio de acciones en cada paso, estado del DOM como contexto, y un LLM pequeño de respaldo.
**Por qué multiplica.** Es la diferencia entre una app que manda órdenes a un navegador y un
agente que *ve* la pantalla. Con Jev como motor pequeño, Esme puede tener esa latencia y ese coste
en local.
**Primer paso.** Un módulo `daimon/navegador/` con: `acciones(step)` (lo que se puede hacer ahora),
`estado()` (DOM legible) y `resolver()` (Jev propone la acción). CDP ya funciona en esta máquina.
**Se mide.** Tareas de navegación real: segundos y coste por tarea, contra el mismo trabajo manual.
**Riesgo.** Alto si se mezcla con la cortafuegos de datos privados: el DOM puede llevar secretos.

### Palanca 2 — Publicar `esme` en el Registro oficial de MCP
**Idea.** El servidor MCP de Esme (recall/remember/feedback) **es un producto**: publicarlo en
`registry.modelcontextprotocol.io` (DR 91) hace que cualquier cliente MCP del mundo pueda
recordarse en la mente del usuario.
**Por qué multiplica.** Es el camino de «Adiós a los .md» a escala: no vendes la app, vendes **la
memoria**.
**Primer paso.** Publicar el servidor con su README, licencia y ficha; y **arreglar de paso el
fallo #1** (que OpenCode lea `mcp.servers`).
**Se mide.** Instalaciones fuera de la máquina del creador.
**Riesgo.** Publicar expone la memoria: **el Registro exigeDeclared permisos**, no datos.

### Palanca 3 — A2A: el Taller publica Agent Cards
**Idea.** A2A (Google) resuelve descubrimiento de capacidades, tareas largas y colaboración entre
agentes. Cada agente del Taller de Esme puede ser una **Agent Card** pública.
**Por qué multiplica.** Esme deja de ser «la app del creador» y pasa a ser **una parada en la red
de agentes**: otro agente puede encargarle trabajo y cobrar por ello.
**Primer paso.** Una Agent Card por rol del Taller; un endpoint `/.well-known/agent.json`; un
`esme_encienda_agente(rol, objetivo)` en el MCP.
**Se mide.** Tareas encargadas desde fuera.

### Palanca 4 — Cualquier motor, en caliente
**Idea.** MemGPT y sus sucesores (Mem0, Hindsight, Letta) coinciden: el problema no es el modelo,
es que **cada sesión empieza de cero**. Esme tiene la solución, pero hoy hay que **pedirla**.
**Por qué multiplica.** Un Claude Code nuevo, un Codex, una IA por API: todos deberían **heredar la
sesión de la mente** sin que nadie pegue un fichero.
**Primer paso.** Que el arranque de cada motor en el Taller haga un `recall` automático con el
contexto del proyecto y lo inyecte en el primer mensaje.
**Se mide.** Aciertos del examen con y sin herencia.

### Palanca 5 — El banco de examen de la memoria
**Idea.** Mem0 (+66K★) y Hindsight son la referencia de la industria. **No se copian: se miden.**
**Por qué multiplica.** Sin banco de comparación, «la memoria de Esme es mejor» es una frase.
**Primer paso.** `daimon/bench/` añade un rung con las tareas reales del creador contra
`rag_denso_eg` (el rival actual, que ya gana en el veredicto) **y** contra Mem0/Hindsight.
**Se mide.** Acierto y tokens por tarea. Sólo entra lo que mejora el número.

### Palanca 6 — Esme aprende de sí misma: **REA**
**Idea.** REA (*Reverse Engineer Anything*, MCP + CLI, **MIT**, `rea-agents` v6.7.0, publicado el
18-oct-2026) da a un agente las herramientas de ingeniería inversa: binarios, apps JavaScript y
Electron, ensamblados .NET, APKs y webs. Cada conclusión llega **con su evidencia y con los límites
de esa evidencia**.
**Por qué multiplica.** Es la diferencia entre «me gusta cómo funciona» y «sé cómo funciona». Aplicado
a **lo propio**, Esme puede: entender su propio binario de Electron, documentar sus propias
decisiones, y automatizar sobre programas del usuario. Aplicado a un `.asar` de una app **del
usuario**, abre la puerta a la Forja: replicar una función, no una app.
**Primer paso.** `npm i -g rea-agents` en la máquina; registrarlo como MCP de Esme; una receta de
Ejemplo sobre el propio `.asar` de Esme.
**Se mide.** Tiempo para entender un módulo propio; usefulness de lasPatch generadas.
**Límite (decidido el 17-oct, se mantiene).** Nada de ingeniería inversa sobre **apps de terceros**
para copiarlas: riesgo legal y contradice que Esme sea original. REA se usa sobre lo propio, sobre
lo del usuario con permiso, y para forense del propio equipo. Nada de OSINT de terceros, ni claves
expuestas, ni hackeo.

### Palanca 7 — Skills que nacen del uso
**Idea.** Ya existe el patrón «una skill por cuenco» (investigar, escribir, web, PDF, codificar,
seguridad, memoria) y la Tienda ya instala skills con licencia comprobada y alertas calculadas.
Lo que falta es que **Esme escriba las suyas** cuando ve que repites algo.
**Por qué multiplica.** Las Recetas ya repiten una tarea sin IA (0 tokens). Una **skill** es la Receta
con ficheros, scripts y permiso: se comparte, se vende, se improve.
**Primer paso.** El sueño (que ya destila escenas y personas) detecta una tarea repetida ≥3 veces y
**propone** una skill al usuario (nunca por la espalda).
**Se mide.** Tokens ahorrados y tareas cerradas sin IA.

### Palanca 8 — El catálogo como economía
**Idea.** `mcpmarket.com` indexa **50.000+ servidores MCP y skills**; el Registro MCP de GitHub ya
tiene draw.io renderizando diagramas vivos en el chat.
**Por qué multiplica.** Esme no sólo distribuye: **indexa**. Un índice verificado (licencia leída,
riesgo calculado, huella del árbol) es un producto que otros no pueden copiar sin hacer el
trabajo de verificación.
**Primer paso.** El script `app/scripts/catalogo-skills.mjs` (ya existe) pasa de 30 skills
curadas a **indexación continua** con el mismo control de licencias.

### Palanca 9 — Roles en YAML para el Taller
**Idea.** OpenRig: equipos de agentes permanentes con roles en YAML y traza de qué llamada falló.
**Por qué multiplica.** Es la diferencia entre un taller que se programa y un taller que se describe.
**Primer paso.** Un `roles.yaml` por tipo de tarea; el Taller lo lee; la traza de seis pasos se
muestra en la interfaz.
**Se mide.** Tiempo de montar un equipo nuevo de agentes.

### Palanca 10 — La voz local como infraestructura de los demás
**Idea.** SKI da voz full-dúplex on-device a Claude Code, Cursor, Codex y Gemini CLI. `tyger-s2s`
(Apache-2.0) hace ASR con una cabeza de decisión de **14 M**; `qwen-audio-agent` es runtime
full-dúplex.
**Por qué multiplica.** Esme deja de ser «una app con voz» y pasa a ser **la voz de los agentes que
ya usas**.
**Primer paso.** El ASR de 14M entra de sobra en la GPU de 6 GB; medir latencia y empaquetar el
servicio de voz para que lo usen los CLI.
**Se mide.** Latencia de ida y vuelta en conversación real.

### Palanca 11 — El informe de equivalencia económica
**Idea.** «En GitHub hay una cantidad absurda de proyectos gratis que ya hacen lo mismo que la
suscripción que pagas cada mes» (TradingAgents, LibreChat…). Esme es local y ya casi no consume.
**Por qué multiplica.** Convierte la regla «casi no consumir» (una restricción) en **argumento de
venta medido**.
**Primer paso.** Una página `equivalencia.html` en la app: por cada suscripción que Esme sustituye,
cuánto cuesta al mes y cuánto consume Esme en reposo (PSS/CPU ya se miden).
**Se mide.** Número de equivalencias verificables.

### Palanca 12 — Esme en el servidor del cliente
**Idea.** `cloud/` ya despliega «tu propia IA» en tu servidor por SSH. El paso siguiente: **Esme
completo** en el servidor del cliente, con la memoria, el Taller y las skills.
**Por qué multiplica.** De producto local a **infraestructura de empresa**: Esme pasa a ser el
cerebro compartido de un equipo, con permisos, no la herramienta de un creador.
**Primer paso.** Empaquetar el `daimon` como servicio (`docker/`), con memoria por equipo y el
mismo MCP.
**Se mide.** Equipos corriendo Esme en servidor propio.

---

## 4. Los tres movimientos

### 0–30 días — *que nada te deje sin hacer nada*
1. Arreglar el cableado de MCP con OpenCode (`mcp.servers`) y **conectar la memoria al agente que ya usas**. ← es el fallo #1 y vale más que todas las palancas juntas.
2. Publicar `esme` en el Registro MCP (Palanca 2) — es un fichero y un README.
3. Añadir Mem0/Hindsight al banco del examen (Palanca 5).
4. Instalar REA y registrarlo como MCP (Palanca 6): primera receta sobre el binario de Esme.
5. Bancada de voz: medir el ASR de 14M en esta máquina (Palanca 10).

### 30–90 días — *que sepa hacer cosas que antes no sabía*
6. `daimon/navegador/` con acciones, estado y Jev como resolutor (Palanca 1).
7. Agent Cards del Taller (Palanca 3).
8. Herencia de sesión automática para cada motor nuevo (Palanca 4).
9. Roles en YAML + traza de equipo (Palanca 9).
10. Skills propuestas por el sueño (Palanca 7).

### 90–180 días — *que otros lo usen*
11. Indexación continua del catálogo (Palanca 8).
12. Informe de equivalencia (Palanca 11).
13. Esme empaquetado como servicio (Palanca 12).
14. **Registro de registros**: el índice de lo que la gente sabe, con el MCP de Esme como puerta.

---

## 5. Lo que NO entra (y por qué)

- **Clonar apps de terceros con ingeniería inversa** (decisión del 17-oct): riesgo legal y contradice
  que Esme sea original. REA se usa sobre lo propio, lo del usuario con permiso y para forense
  propio. **Nada** de OSINT de terceros, ni buscar claves expuestas, ni hackear cámaras.
- **Quitar las guardas de seguridad** para «no tener límites»: sin token, sin lista de hosts y sin
  redacción de secretos, Esme deja de ser una app local fiable. Los límites de seguridad no son
  limitaciones: son la garantía.
- **Copiar lo que se vio en X**: se absorbe y se supera. Si algo se usa, se usa la idea y se
  implementa mejor, con su licencia leída.

## 6. Cómo se mide cada cosa

La regla madre sigue siendo la del creador: **toda mejora se mide contra un examen con tareas
reales del usuario; si el número no mejora, la mejora no entra.** Cada palanca de arriba lleva su
número. Los tres que importan ahora:

| Número | Qué mide | Meta |
|---|---|---|
| **Acierto del examen** | tareas reales del creador, con y sin herencia de la memoria | > `rag_denso_eg` (el rival que hoy gana) |
| **Coste y latencia** | por tarea: segundos y USD | el camino de @gregpr07: 7 s / 0,0039 $ |
| **Reposo** | PSS y CPU de Esme sin hacer nada | «prácticamente nada», como manda el creador |

**Y una condición que no se negocia:** nada de esto entra si Esme consume más en reposo o si un
cambio hace el número del examen peor. La escala sin compostura es ruido.
