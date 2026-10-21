# Cuánto de lo dicho está aplicado (2026-10-21)

> Taller `qxntxkie`. Pregunta del creador: *«y aplicaste ya todo lo que has dicho en toda la
> conversación?»*. Respuesta: **no, y esta es la cuenta exacta** —lo que está en el código, lo que
> está identificado con su sitio exacto, y lo que no entra*.

## 1. Aplicado (está en el código, con prueba)

| # | Qué | Dónde | La prueba |
|---|---|---|---|
| 1 | **La línea del Taller se aplica en lote** | `app/src/renderer/taller/linea.ts` | 13.586 ms → **23 ms** sobre el registro real (78.134 eventos) · **579×** |
| 2 | **La cola del Taller tiene reloj de respaldo y tope** | `app/src/renderer/taller/cola.ts` | 5 pruebas: «la suelta aunque no llegue ningún fotograma» |
| 3 | **El chat pinta una vez por fotograma** | `app/src/renderer/panels/ChatPanel.tsx` | antes repintaba toda la conversación por cada trozo |
| 4 | **El cerebro no guarda la reserva de ONNX** | `daimon/lens.py`, `daimon/home.py` | pico **1568 M → 719 M**, sin coste en reposo |
| 5 | **Lo que se suelta, vuelve al sistema** | `daimon/rea.py` | RSS 1426 M → 482 M tras absorber |
| 6 | **La cola de los lectores del Atlas tiene tope** | `daimon/server.py` | 200 eventos; lo viejo se suelta |
| 7 | **El atlas no revienta la memoria** | `daimon/atlas.py` | el tensor n×n×2 (693 MB) → por bloques: **1 s y nada** |
| 8 | **El atlas no se recalcula delante de quien lo pide** | `daimon/atlas.py` | se sirve el viejo; el nuevo va por detrás, con tope de frecuencia |
| 9 | **El comparador empareja las ventanas por parecido** | `daimon/rea.py` | «3 nuevas y 3 que se fueron» → «**1 nueva y 2 que cambiaron**» (la verdad) |
| 10 | **La memoria no se llena de boilerplate** | `daimon/ingest.py` | 59 → 44 trozos; la puerta es por fuente |
| 11 | **El checkpoint por turno** (el hueco que tenía MonoCode, MIT) | `app/src/main/taller/copias.ts`, `taller.ts` | 3 pruebas: el punto es un commit; volver **sólo** toca la copia |
| 12 | **La jaula: el agente ya no hereda tus credenciales** | `app/src/main/motores/jaula.ts`, `sesion-acp.ts`, `pty-host.ts`, `taller.ts` | 8 pruebas: se esconden las que tienen forma de credencial; **pasan** las llaves del motor y las que la tarea declara; PATH y HOME intactos |
| 13 | **El veredicto envejece (la skill con caducidad)** | `app/src/main/skills/veredicto.ts`, `ipc.ts` | 2 pruebas: a los 90 días se marca caducado y **sigue valiendo** («el juez pone el listón, nunca lo quita») |
| 14 | **La presión de recursos se ve** (lo que faltó cuando la app murió de memoria) | `app/src/main/uso/presion.ts`, `chat.ts` | 5 pruebas: los roles, la suma, el aviso del swap · y la herramienta `ver_presion` en manos del agente |
| 15 | **Lo visual, por fin** (hasta aquí todo era de dentro: al reiniciar, la app se veía igual porque no había cambiado ni un píxel) | `app/src/renderer/paginas/Apariencia.tsx`, `MandoVista.tsx` | el muro de escenas: la miniatura con su nombre **debajo** y la marca en la elegida (antes el rótulo tapaba la imagen); las piezas se ven **sobre un fondo** (el vidrio y el papel ya se distinguen); los grupos de opciones son un grupo de botones, no una barra rota; «Mi ecuación» → «A tu gusto»; en el Mando la presencia de Esme es el punto final del saludo y el saludo baja a tamaño legible |
| 16 | **El renderer deja de comerse la memoria** (la app moría de memoria: el plan no era el bug) | `app/src/renderer/taller/ventana.ts`, `taller/Detalle.tsx` | medido: **2,6 GB en 5 min** y 119 % de CPU · ahora se pinta una ventana de 250 elementos (de 17.000) y `Item` es `memo` · 5 pruebas · en la app reiniciada (13:55): **491–680 MB y bajando, 8 % de CPU** |
| 17 | **La jaula no rompe al motor** (la bookkeeping de npm no es una credencial) | `app/src/main/motores/jaula.ts`, `taller/taller.ts` | 22 variables `npm_*` dejan de tragarse; las llaves de npm sí se esconden; el error del motor no se llena de ruido |
| 18 | **Deshacer un turno, en la vista** (el botón que faltaba) | `app/src/renderer/taller/Revision.tsx`, `Detalle.tsx`, `app/src/main/taller/turnos.ts` | el punto de cada turno sale del **mensaje** del commit (`Esme: turno N`), no de contar commits · la Revisión lista los turnos y vuelve a cualquiera con un segundo clic que dice exactamente qué pasa · en la cabecera, «Deshacer el último turno» · 9 pruebas |

## 2. Ya estaba aplicado (y el estudio se equivocó)

| # | Qué | Dónde | La prueba |
|---|---|---|---|
| 12 | **Worktree por tarea** | `app/src/main/taller/copias.ts` | `git worktree add -b esme/<id>` — el estudio del 20-oct decía «copia el repo entero en mkdtemp» |
| 13 | **El prefijo constante para la caché** | `app/src/main/providers.ts` | `buildSystem` pone lo variable (panorama, memoria) **al final**; lo constante, al principio |

## 3. Identificado, con el sitio exacto (lo que falta)

| # | Qué | El hueco, en una línea | De dónde sale |
|---|---|---|---|
| 14 | ~~**La jaula: la credencial a petición**~~ | **Hecha** (fila 12). Queda el botón en la interfaz para declararlas | SPACE (Perplexity, Apache 2.0) · `@Arindam_1729` (`--pass-env`) · Deska 1.37 (cuentas aisladas) |
| 15 | **El coste por petición** | El Taller anota el uso **por turno**; lo que falta es por petición y que se pueda consultar | Deska (`recordTokenUsage`) |
| 16 | ~~**La skill con dueño y con caducidad**~~ | **La caducidad, hecha** (fila 13). Queda el *dueño*: el catálogo ya trae `autor` y el veredicto, `firmante`; falta juntarlos en la vista | `@mem0ai` (skill drift) · `@KanikaBK` (revisar permisos cada mes) |
| 17 | **Los permisos se re-preguntan al cambiar** | La Tienda compara huellas (ya está); falta **preguntar** cuando una skill trae permisos nuevos | Deska 1.33: «an update adding one asks again» |
| 19 | **El manifiesto habla el formato de plugin** | El manifiesto es propio; el estándar es el de Google/MS/OpenAI/Cursor/Vercel | `@akshay_pachaar` |
| 20 | **El worktree con dueño** | Hay worktree por tarea, pero no se sabe **quién** lo tiene ni se evita el choque | Deska (`worktreeInUse`, `worktreeUsedByAnotherTask`) |
| 21 | ~~**La presión de recursos, a la vista**~~ | **Hecha** (fila 14): el medidor y la herramienta `ver_presion`. Queda la vista de proceso con los botones de parar | MonoCode 0.15 (`Resource pressure`) |
| 22 | **La sesión propia por página embebida** | El Ojo y el navegador comparten sesión | Deska (`embedSessionFor`) |
| 23 | **El inbox por demanda** | No hay bandeja que ordene por «te necesitan» | MonoCode y Deska lo tienen abierto; en X, `@mr_r0b0t` |
| 24 | **Publicar en el registro MCP** | El código y las dos entradas están hechas y validadas | **Faltan las dos cuentas del creador** — no es un límite técnico |

## 4. Lo que NO entra (y por qué)

| # | Qué | Por qué |
|---|---|---|
| 25 | **La microVM de SPACE** (Firecracker) | Es la jaula completa: no cabe junto a la app y el modelo local en 24 GB. Se absorbe el **principio** (credenciales y egreso fuera del sandbox), no el artefacto |
| 26 | **La marketplace y el directorio de agentes con wallet** | Es la escala de la cuenta: justo lo que la bets de Esme no quiere |
| 27 | **Copiar código de terceros** | Decisión del 17-oct: REA para **aprender prácticas**, nunca para copiar. Ni una línea de Deska o MonoCode entra en Esme |

## 5. Lo que falta por el camino

- ~~**El botón en la interfaz** del «deshacer turno»~~: **hecho** (fila 18). En la Revisión está la
  lista de turnos y se vuelve a cualquiera; en la cabecera, «Deshacer el último turno».
- **La medición en la app en marcha**: hecha dos veces (21-oct, 12:54 y 21-oct, 13:55).
  La primera **salió mal**: el renderer subía a **2,6 GB en cinco minutos** (RSS del proceso
  `--type=renderer`), a **119 % de CPU**, y seguía subiendo. Reiniciar no lo arregla: el plan no
  era el bug, era el síntoma. **Ya está arreglado** (fila 16): la línea en vivo pintaba **entera**
  —17.000 elementos por fotograma—; ahora pinta una ventana de 250 y se para si quien mira sube
  a leer.
  **La segunda, con la app reiniciada y el código de casa ya dentro (13:55)**: el renderer se
  queda en **491–680 MB y baja** (nunca hacia arriba), a **8 % de un núcleo** — antes: 2,6 GB
  subiendo y 119 %. El cerebro, con la arena de ONNX apagada: **1325 M → 718 M** al absorber y se
  queda plano. *Lo que quedaba por medir, medido.*
- **El número de la caché**: la práctica está puesta (prefijo constante) pero **no se ha medido el
  acierto de caché** de Esme contra el proveedor. Con la cifra de X (76 % de la factura) se puede
  hacer el mismo examen que el del banco del espejo.
