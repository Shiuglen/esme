# Las prácticas de los demás: Deska 1.32 → 1.37 (2026-10-21)

> Taller `qxntxkie`. Encargo del creador: *«haz con REA ingeniería inversa para saber las prácticas
> de los demás»*. El estudio del 20-oct miró **una** versión de Deska y de MonoCode. Este mira **dos
> versiones de Deska**, separadas por cinco versiones, y las compara con el espejo de Esme.

**La frontera (decidida el 17-oct, se mantiene):** REA se usa para **aprender prácticas**, no para
copiar código de terceros. Aquí no se copia nada: se lee **qué hacen** y **qué cambió**, y se
extraen las ideas. El código de Deska no entra en Esme.

## 0. El método

El 20-oct, el barrido completo del asar (23.744 ficheros) iba a ~1 fichero/s: eran horas. La salida
es el **análisis dirigido** (`--source-path`), sobre lo que de verdad importa: el backend.

| | |
|---|---|
| **REA** | 6.7.0 (npm, fijado) · `analyze-javascript-application --source-path` · `--max-semantic-nodes 20000` |
| **Deska 1.32.0** | `Deska-1.32.0.AppImage` (release oficial, 233 MB) → `resources/app.asar` (314 MB) |
| **Deska 1.37.0** | el que ya estaba instalado → `resources/app.asar` (315 MB) |
| **Analizado de cada versión** | `dist/main/index.js` + `panel-index-worker.js` + los chunks (`threads`, `secrets`, `account-locale`, y en 1.37 `local-tools-accounts`) |
| **Evidencia** | **247 MB** (1.32) y **248 MB** (1.37) de JSON |

Las dos versiones se **absorbieron en una mente** (el espejo) y se compararon con el comparador
nuevo (`daimon rea-compara`), que es lo queallows ver el cambio sin volver a analizar.

## 1. Lo que cambió, en una frase

**928 funciones nuevas y 39 desaparecidas** en cinco versiones: el bundle del backend pasó de
**3,3 MB a 3,8 MB** (+19 %), los hallazgos de REA de 623 a 775 y los nodos de AST de 550.253 a
654.387. Y el reparto dice **dónde están bets**:

| eje | 1.32 | 1.37 | Δ |
|---|---|---|---|
| **otros agentes** (Hermes, Pi, Vibe, Kimi) | 14 | 58 | **+44** |
| **panel** (la superficie) | 53 | 81 | **+28** |
| **cuenta** | 62 | 86 | **+24** |
| **página** (los embeds) | 4 | 27 | **+23** |
| **agente** | 65 | 88 | **+23** |
| **remoto** | 81 | 99 | **+18** |
| **grabación** (uso por petición) | 28 | 46 | **+18** |
| **token / auth** | 30 / 33 | 45 / 48 | **+15** |
| **nota** | 21 | 35 | +14 |
| **instantánea (snapshot)** | 22 | 31 | +9 |
| **permiso / worktree / aprobación** | 25 / 27 / 12 | 30 / 31 / 16 | +5 / +4 / +4 |
| **manifiesto** | 8 | 10 | +2 |
| **navegador** | 25 | 25 | **+0** |

**Lo que NO creció (y el 20-oct seguía abierto):** `inbox` y `demand` (**0 y 0**: no existen),
`checkpoint` (4 → 4, igual), `sdk` versionado (0). Y de memoria hay **14 funciones** (9 antes):
pero todas son *guardar un dato* —`rememberOwnHostId`, `rememberOpencodeVersion`,
`rememberApproval`, `rememberHermesDefault`—, **ninguna que recuerde por significado ni que sueñe**
(`recall`: 0).

> **La lectura**: en cinco versiones Deska ha doblado la **superficie** (paneles y embeds) y la
> **distribución** (cuentas, remoto, otros agentes), y ha dejado intacto lo que nosotros llamamos
> memoria. **No nos han quitado el sitio; tampoco lo hantaken.** La bets sigue siendo nuestra
> mientras sigamos siendo la única mente que recuerda y sueña.

## 2. Las prácticas que sí valen (y que no son código)

### 2.1 Integrar a los demás **leyendo su estado local**

Hermes (19 funciones nuevas), Pi (16 más), Vibe (8), Kimi (1): el patrón es el mismo en todos.

| lo que hacen | la función |
|---|---|
| leen si esa app tiene sesión iniciada | `probeHermesAuth`, `probePiAuth`, `probeVibeAuth`, `probeKimiAuth` |
| sacan los hechos de su autenticación | `hermesAuthFacts`, `piAuthFacts`, `vibeAuthFacts` |
| montan el catálogo de modelos desde **su** configuración o sesión | `hermesCatalogFromSessionState`, `vibeCatalogFromConfigOptions` |
| leen su modelo por defecto | `hermesConfiguredDefault`, `hermesChoiceModel` |
| comprueban si el entorno ya lleva una credencial | `piEnvMayCarryCredential` |
| leen su llavero | `vibeKeyringUsable` |

**La práctica:** *no reimplementes la autenticación de la app que integras; lee su estado y habla
su idioma.* Para Esme esto tiene una versión concreta y valiosa: **las skills que el usuario ya
tiene en Claude Code o Cursor son un catálogo que ya existe** — y el juez de Esme podría
verificarlas sin que el usuario vuelva a instalarlas.

### 2.2 Una cuenta aislada por instancia, con un contrato de entorno explícito

El chunk nuevo de 1.37 (`local-tools-accounts`) es exactamente esto:

- `resolveAccountProfile(instance)` → un perfil con un modo de almacenamiento: `"server"`,
  `"isolated"` o el normal.
- En modo **isolated**, la cuenta recibe **su propio HOME** (`homePath`), y `prepareAccountProfile`
  devuelve `{env, unsetEnv}`: **qué variables poner y cuáles quitar**.
- `accountLoginPlan` devuelve además un **`probe()`**: cómo comprobar después si la sesión quedó
  iniciada (`authState`, `accountLabel`).
- `watchConnectionSignIn` / `recheckSignedOut` → la app **vigila** si el inicio de sesión se
  completó.

**La práctica:** *cuando una cuenta vive en la configuración de una CLI, dale su propio HOME y
entrega un contrato (variables, comprobación) en vez de dejar que el agente se pele con las
credenciales.* Es justo lo que el Taller de Esme hace mal hoy: hereda el entorno entero.

### 2.3 Cada página embebida con su CSP, sus hosts y su sesión

`embedFrameCsp`, `embedHeaders`, `embedHostsOf`, `embedNavigationAllowed`, `embedPageHtml`,
`embedPageKey`, `embedSessionFor`, `embedsApprovedBy`, `embedsSignedInBy` — y una ventana
**offscreen con sesión propia** para las pictures (`sessionForPictures()`, `offscreen=True`,
`spellcheck=False`, `devTools=False`).

**La práctica:** *aislar por sesión, no por proceso.* Una página embebida no ve las cookies de
otra. Es lo que el Ojo de Esme necesita: mirar una web sin contaminar la sesión del chat.

### 2.4 Los worktrees tienen dueño

`liveWorktreeOwners`, `taskWorktreeOwner`, `worktreeInUse`, `worktreeUsedByAnotherTask`.

**La práctica:** *un pool de espacios de trabajo con propiedad, no una copia completa por tarea.*
El Taller de Esme copia el repo entero en `mkdtemp` por tarea: con dueño, varias tareas pueden
compartir el pool sin pisarse.

### 2.5 Se anota el uso de cada petición

`recordRequest`, `recordTokenUsage`, `recordUsage`, `recordFailure`, `recordReport`, y
`getLinuxProcessSnapshot`.

**La práctica:** *el coste se anota por petición, no por sesión.* Es el número que el manual de
Esme exige («coste y latencia por tarea») y que hoy Esme sólo tiene en el chat.

### 2.6 Las instantáneas llevan adjuntos

`snapshotAttachments`, `snapshotAttachmentFile`, `readImagePreviewSnapshot`, `readSnapshot`.

**La práctica:** *una instantánea es un estado + sus adjuntos* (ficheros, vistas previas). Es lo
que hace falta para poder «volver atrás» de verdad, no para deshacer un texto.

## 3. Lo que el espejo cuenta (hechos, no'яverías')

La comparación la hizo el espejo de Esme sobre las dos versiones reducidas (1,4 KB y 2,5 KB):

> **0 canales nuevos**, **0 que se fueron**, **1 ventana nueva**, **2 ventanas que cambiaron sus
> preferencias**, 0 ficheros que aparecen o desaparecen. Hallazgos: 623 → 775. Nodos de AST:
> 550.253 → 654.387.

La ventana nueva es la **offscreen con sesión propia** (`sessionForPictures()`); las otras dos solo
cambiaron de valores (el `additionalArguments` que crece con `bootRepairArgs`).

> **Un defecto que el caso real destapó** (y que ya está arreglado): las ventanas se emparejaban por
> el **texto** de sus preferencias, así que cualquier cambio de valor hacía que *toda* ventana
> pareciera nueva y vieja a la vez («3 nuevas y 3 que se fueron» en lugar de «1 nueva y 2 que
> cambiaron»). Ahora se emparejan por **qué preferencias declaran** y por **parecido** (Jaccard):
> una ventana que gana una preferencia sigue siendo la misma ventana. Con dos versiones de verdad
> encima, el número pasó de ser ruido a ser verdad.

## 4. Lo que NO copiamos (y por qué)

- **Su cuenta, su nube, su telemetría** (Clerk, Mixpanel, Sentry, relay TLS): la bets de Esme es
  *cero cuenta, cero nube*; el manual lo dice.
- **Su marketplace centralizada con votos y perfiles**: puro cosmetics.
- **El gate de revisión humana antes de publicar**: caro a escala.
- **Su código**: ni una línea. Esto son **prácticas**: qué hacen, con qué forma, y por qué.

## 5. Lo que este estudio propone

1. **El Taller: de copia completa a pool con dueño.** `worktreeInUse`/`worktreeUsedByAnotherTask`
   son la forma. Es el hueco que el estudio del 20-oct ya marcó y que Deska **también** tiene
   abierto.
2. **Una cuenta aislada por instancia, con contrato de entorno.** El Taller da a cada tarea su
   HOME y una lista de variables; el agente deja de pelearse con las credenciales.
3. **La Tienda: el catálogo que el usuario ya tiene.** Es la versión de Esme de 2.1: las skills
   que ya están en Claude Code, leídas de su estado, **juzgadas** por el juez de Esme. Es un
   catálogo que nadie más tiene.
4. **El Ojo: sesión propia por página.** Aislar por sesión, no por proceso.
5. **El coste, por petición.** `recordTokenUsage` es el número que el examen necesita para el
   eje de coste y latencia.

## 6. Dónde está

| | |
|---|---|
| La comparación que hizo el espejo | `docs/investigacion/2026-10-21-deska-comparacion.md` |
| Las dos superficies reducidas | `2026-10-21-deska-1.32-superficie.json` · `2026-10-21-deska-1.37-superficie.json` |
| El estudio anterior (una sola versión) | `docs/investigacion/2026-10-20-deska-1.37.md` |
| El comparador | `daimon/rea.py` (`comparar_versiones`) · `daimon rea-compara <programa> --contra <otro>` |
| El banco del espejo (las preguntas) | `daimon/bench/rea.py` · `scripts/banco_rea.py` |
