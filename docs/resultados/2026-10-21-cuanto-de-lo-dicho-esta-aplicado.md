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
| 18 | **El manifiesto habla el formato de plugin** | El manifiesto es propio; el estándar es el de Google/MS/OpenAI/Cursor/Vercel | `@akshay_pachaar` |
| 19 | **El worktree con dueño** | Hay worktree por tarea, pero no se sabe **quién** lo tiene ni se evita el choque | Deska (`worktreeInUse`, `worktreeUsedByAnotherTask`) |
| 20 | ~~**La presión de recursos, a la vista**~~ | **Hecha** (fila 14): el medidor y la herramienta `ver_presion`. Queda la vista de proceso con los botones de parar | MonoCode 0.15 (`Resource pressure`) |
| 21 | **La sesión propia por página embebida** | El Ojo y el navegador comparten sesión | Deska (`embedSessionFor`) |
| 22 | **El inbox por demanda** | No hay bandeja que ordene por «te necesitan» | MonoCode y Deska lo tienen abierto; en X, `@mr_r0b0t` |
| 23 | **Publicar en el registro MCP** | El código y las dos entradas están hechas y validadas | **Faltan las dos cuentas del creador** — no es un límite técnico |

## 4. Lo que NO entra (y por qué)

| # | Qué | Por qué |
|---|---|---|
| 24 | **La microVM de SPACE** (Firecracker) | Es la jaula completa: no cabe junto a la app y el modelo local en 24 GB. Se absorbe el **principio** (credenciales y egreso fuera del sandbox), no el artefacto |
| 25 | **La marketplace y el directorio de agentes con wallet** | Es la escala de la cuenta: justo lo que la bets de Esme no quiere |
| 26 | **Copiar código de terceros** | Decisión del 17-oct: REA para **aprender prácticas**, nunca para copiar. Ni una línea de Deska o MonoCode entra en Esme |

## 5. Lo que falta por el camino

- **El botón en la interfaz** del «deshacer turno»: hoy está en el código, el IPC y el puente, pero
  **no hay un botón en la vista**. Es lo siguiente.
- **La medición en la app en marcha**: el arreglo del renderer y el del atlas no están medidos con
  la app real, porque **reiniciar la app termina esta sesión** (el agente del Taller cuelga de
  Electron).
- **El número de la caché**: la práctica está puesta (prefijo constante) pero **no se ha medido el
  acierto de caché** de Esme contra el proveedor. Con la cifra de X (76 % de la factura) se puede
  hacer el mismo examen que el del banco del espejo.
