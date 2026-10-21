# MonoCode con REA: lo que se puede y lo que no (2026-10-21)

> Taller `qxntxkie`. Encargo: *«también sacaste de monocode con REA»*. Respuesta corta: **sí se ha
> intentado con REA, y REA no puede con este objetivo**. Lo que sí se ha sacado —del binario que
> se instaló, del CHANGELOG y del código MIT— es más útil que lo que habría dado REA.

## 1. Qué es MonoCode

- **Una GUI para los agentes de código que ya tienes**: corre los CLI de Claude Code, Codex,
  Cursor, Grok Build, OpenCode, Antigravity, Pi, omp, fx, Hermes y Devin. No vende tokens.
- **Tauri 2** (Rust) + React 19. Un binario de **50 MB** con el frontend embebido.
- **MIT**, un solo mantenedor, publica casi a diario (`CHANGELOG.md` con **74 versiones**).
- El estudio del **19-oct** (45 KB, leyendo el código de verdad) ya lo había desmontado: `src/`,
  `src-tauri/`, `host/`, 527 ficheros de test.

## 2. Lo que se intentó con REA, y por qué no sale

| intento | resultado |
|---|---|
| `rea analyze-javascript-application` sobre el binario | **Rechazado**: el analizador de JS sólo acepta un **directorio** o un **.asar**. `unsupported_target` |
| `rea doctor` (motores nativos) | **Faltan Ghidra, Hopper e IDA**: `missing_analysis_engine`. Sin ellos, el análisis nativo de un binario Rust no es posible |
| `rea inspect_binary_layout` y las demás herramientas de binario | Dependen del motor nativo: sin él, no hay estructura de funciones que leer |

**La limitación, escrita** (el manual pide que las limitaciones se declaren): *un Tauri de un solo
binario Rust es, hoy, el punto ciego de REA sin motores nativos*. El caso de Deska era al revés: un
Electron con su `.asar` es justo lo que REA mejor come.

> **Actualización (con el permiso del creador: *«no te rindas, no te limites»*)**: **Ghidra 12.1.4 + JDK 21
> instalados** → `rea doctor` pasa de `missing_analysis_engine` a **healthy**. Y
> `inspect-binary-layout` pide además **pwntools 4.15.0, pyelftools 0.33 y unicorn 2.1.2** en un
> Python que le pases tú (`REA_PWNTOOLS_PYTHON`; REA no instala nunca paquetes). Instalados en un
> venv propio. Con eso, **REA ya puede con el binario Rust** — que era el punto ciego.

## 3. Lo que sí se ha sacado del binario instalado (con `strings`)

Los símbolos del binario **dicen qué subsistemas trae de verdad**, que es lo que importa:

**El checkpoint por turno** (¡la referencia MIT del hueco de Esme!):

```
checkpoint_begin_turn      checkpoint_finish_turn     checkpoint_capture
checkpoint_apply           checkpoint_undo             checkpoint_file_diff
checkpoint_forget          checkpoint_cleanup_safe     checkpoint_fullfsync
checkpoint_ensure          checkpoint_status          checkpoint_keep
session_checkpoint_ensure  session_checkpoint_prepare  session_checkpoint_finish_turn
session_checkpoint_undo    session_checkpoint_file_diff session_checkpoint_forget
session_checkpoint_cleanup_safe session_checkpoint_status
```

Nombres que hablan solos: **begin_turn / finish_turn** (el punto del turno), **undo** (deshacer un
turno), **file_diff** (el diff del punto), **forget** (olvidar un punto), **cleanup_safe** (« sólo
se borra lo que se puede rehacer» — la misma regla que escribió Deska), **fullfsync** (el punto no
se pierde).

**Los worktrees y la orquestación de git**:

```
git_worktree_create  git_worktree_remove  git_worktree_rename_branch  git_worktrees
git_orchestration_worktree_create  git_orchestration_worktree_remove
git_stash  git_create_branch  git_checkout  git_status
```

**Las cuentas, la sesión y el móvil**: `provider_account_id`, `account_id`, `remote_ssh_answer`,
`mobile_push`, `mobile_publish`, `mobile_link`, `session_list`, `provider_session_id`,
`catalog…`.

> **Conclusión**: lo que el estudio del 19-oct leyó en el código **está en el binario que se
> instaló**. Es la comprobación que faltaba: no es que el repositorio prometa, es que la app que
> tienes en el disco lo trae.

## 4. Lo que dice el CHANGELOG (74 versiones, y es público)

El CHANGELOG es el mismo tipo de registro que el de Deska, y también **absorbido en la mente de
estudio**. Lo que enseña de verdad:

| # | Lo que dice | La práctica |
|---|---|---|
| 1 | *«Un **indicador de presión de recursos** en el pie abre una vista de proceso con CPU y memoria, con controles para **parar agentes y sesiones**, y para parar herramientas sueltas»* | **Ver la presión es una función**, no un allevio. Es lo que a Esme le falta: el Taller no tiene ni un medidor de presión |
| 2 | *«El trabajo de git en segundo plano y los procesos de las herramientas **reciben menor prioridad** cuando el sistema lo permite. La presión de recursos **reduce la memoria de las transcripciones** conservando el historial»* | **La memoria que se suelta es la de las transcripciones**, no la del historial. Es exactamente lo que hace Esme mal hoy: guarda la transcripción entera |
| 3 | *«Una sesión que llega a un límite de uso puede **continuar en otra cuenta**: las conversaciones se **copian** a la cuenta elegida; si la copia falla, continúa desde un **resumen de traspaso**» | El **handoff summary** como plan B: si no puedes mover la sesión, la resumes |
| 4 | *«Una sesión cuyo worktree se borró fuera de la app puede elegir otro checkout»* | La app sobrevive a que el mundo cambie debajo |
| 5 | *«El descubrimiento de modelos de Cursor **usa las credenciales de la CLI existentes** sin abrir el flujo de login. Si faltan credenciales o falla el ACP, **cae al descubrimiento por CLI** y luego al catálogo incluido» | La **cadena de repliegue**: leer el estado → la CLI → el catálogo. Es la práctica de «integrar leyendo su estado», con el plan B escrito |
| 6 | *«Los commits de Mono usan ahora el **índice de staging real del repositorio**, compartido con el panel de cambios»* | El staging es del usuario, no un índice aparte: lo que el agente prepara, el usuario lo ve |

## 5. Lo que se ha aplicado de esto (y es lo que faltaba)

**El checkpoint por turno, en el Taller de Esme.** Es el hueco que el estudio del 20-oct marcó
(«Alto» de esfuerzo) y que MonoCode resuelve en MIT. Como la copia del Taller **ya es un worktree
de git con su propia rama**, el punto de un turno es **un commit**: no hay estado nuevo que
guardar.

| | |
|---|---|
| `app/src/main/taller/copias.ts` | `puntosCopia` (los commits de la rama, del primero al último) · `volverAlPunto` (`reset --hard` **sólo en la copia**: la carpeta del usuario no se toca) |
| `app/src/main/taller/taller.ts` | al acabar cada turno, un punto (`Esme: turno N`) · `puntos(id)` · `deshacerTurno(id, sha)` |
| IPC + preload + bridge | `taller:puntos` · `taller:deshacerTurno` |

**Y una corrección al estudio del 20-oct**: el Taller **no copia el repo entero** — `crearCopia`
hace `git worktree add -b esme/<id>`. Ese hueco ya estaba cerrado; el estudio se equivocó.

## 6. Lo que queda de MonoCode (y es mucho)

Su escala viene de lo que Esme no quiere: **iPhone (TestFlight), SSH remoto, catálogo, cuenta,
hábits (automatizaciones), monos**. Y **su memoria no es la nuestra**: su *Memory* es un módulo de
ajustes (se ve en el CHANGELOG: «Mono settings … with General, Soul, and Memory sections»).

## 7. Dónde está

| | |
|---|---|
| El estudio del 19-oct (el código, 45 KB) | `docs/investigacion/2026-10-19-monocode.md` |
| El CHANGELOG (74 versiones) | `docs/investigacion/2026-10-21-monocode-changelog.md` |
| La comparación con Deska | `docs/investigacion/2026-10-21-las-practicas-de-los-demas.md` |
| Lo que está aplicado y lo que no | `docs/resultados/2026-10-21-cuanto-de-lo-dicho-esta-aplicado.md` |
