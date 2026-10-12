# Taller: runtime de motores (paso 3a) — Plan de implementación

> **Para agentes:** sub-skill requerida: superpowers:executing-plans (o subagent-driven-development). Pasos con casillas `- [ ]`.

**Objetivo:** el Taller ejecuta tareas reales con motores ACP (OpenCode y Cline en este equipo), cada una en su copia aislada (git worktree), con permisos, uso y cambios medidos, y lo muestra en vivo.

**Arquitectura:**
- En main hay tres módulos nuevos:
  - `taller/copias.ts`: worktrees, y cambios medidos con un índice temporal para no tocar nunca el índice real.
  - `taller/taller.ts`: el runtime, con estado de las tareas, eventos, permisos y persistencia.
  - `ipc-taller.ts`: los canales IPC.
- `motores/sesion-acp.ts` gana los eventos de uso, contexto y clase de herramienta.
- En el renderer está la página Taller, con la escena isométrica, las filas HUD y el detalle en vivo.
- El agente propio de Esme (paso 3b) se enchufará como otro `AbrirSesion`.

**Stack:** Electron 44, Node 24, git 2.53, `@agentclientprotocol/sdk` 1.8, vitest 3, React 19, Motion 14, Tailwind 4.

**Spec:** `docs/superpowers/specs/2026-10-12-esme-concepto-v3.md` (decisiones y «El Taller») y `docs/superpowers/specs/2026-10-12-lenguaje-visual-v2.md` (paso 3).

## Restricciones globales
- Código, identificadores y textos en español, con el estilo del repo: sin punto y coma, funciones cortas y comentarios solo donde aportan.
- **Nunca se modifica la carpeta del usuario.** Solo `git worktree add` (metadatos en `.git` y rama `esme/<id>`). Los cambios se miden con `GIT_INDEX_FILE` temporal, nunca con el índice de la copia.
- **Solo se borra dentro de `dirCopias`.** Antes de cualquier `rm` se comprueba la ruta con `path.relative`.
- El token del cerebro solo viaja en la cabecera MCP. Nada de secretos en logs ni en ficheros.
- Los motores se lanzan con su binario oficial sin modificar. Esme no guarda sus tokens.
- Comandos:
  - Test de un fichero: `cd app && npx vitest run <ruta>`.
  - Suite completa: `cd app && npm test`.
  - Tipos: `cd app && npm run typecheck`.
- No tocar ficheros de otras tareas. Si fallan tests ajenos (por ejemplo `src/renderer/taller/*`, que está en obras), se informa y no se arreglan.

## Foco de revisión
1. Si el motor muere a mitad, la tarea pasa a `error` con un mensaje claro y nunca se queda `trabajando`.
2. Si la app se cierra con un permiso pendiente, al volver la tarea queda `parada` y la copia intacta.
3. Si la carpeta original tiene cambios sin commitear, no viajan: la copia parte de `HEAD`. `base` lo deja registrado para avisar en la interfaz.
4. Con diffs enormes o binarios, el texto se trunca a 1.500.000 caracteres y los binarios cuentan como fichero sin líneas.
5. Dos tareas a la vez sobre el mismo repo usan ramas y carpetas distintas y no chocan.

---

### Tarea B1: copias aisladas (`app/src/main/taller/copias.ts`)

**Ficheros:** crear `app/src/main/taller/copias.ts` y su test `app/src/main/taller/copias.test.ts`. Los tests usan git real en carpetas temporales.

**Produce:**
```ts
export type Copia = { id: string; ruta: string; rama: string | null; base: string; repo: string | null }   // repo null: carpeta nueva de Esme
export type FicheroCambiado = { ruta: string; mas: number; menos: number; binario: boolean }
export type Cambios = { ficheros: number; mas: number; menos: number; lista: FicheroCambiado[] }
export type Git = (args: string[], o: { cwd: string; env?: NodeJS.ProcessEnv }) => Promise<string>
export const gitReal: Git                     // execFile('git', …, { maxBuffer: 64 MB }); si falla, rechaza con el stderr recortado
export function raizRepo(carpeta: string, git?: Git): Promise<string | null>   // rev-parse --show-toplevel; null si no es repo
export function crearCopia(o: { carpeta: string | null; id: string; dirCopias: string; git?: Git }): Promise<Copia>
export function cambiosCopia(c: Copia, git?: Git): Promise<Cambios>
export function diffCopia(c: Copia, git?: Git): Promise<{ texto: string; truncado: boolean }>
export function quitarCopia(c: Copia, o: { dirCopias: string; git?: Git }): Promise<void>
```

**Comportamiento de cada función:**
- **`crearCopia` con carpeta:**
  - Calcula la raíz. Si no es repo, lanza `«<carpeta>» no es un repositorio git. Elige uno o empieza en una carpeta nueva.`
  - Toma `base = rev-parse HEAD`. Si no hay commits, lanza `El repositorio aún no tiene commits.`
  - Ejecuta `git -C <raíz> worktree add -b esme/<id> <dirCopias>/<id> <base>`.
- **`crearCopia` sin carpeta:**
  - Crea `<dirCopias>/<id>` y hace `git init -q`.
  - Hace un commit vacío: `git -c user.name=Esme -c user.email=esme@localhost commit --allow-empty -q -m "Esme: punto de partida"`.
  - Devuelve `rama: null`, `repo: null` y como `base` el commit.
- **`cambiosCopia` y `diffCopia`** trabajan sobre un índice temporal en `os.tmpdir()`, que siempre se borra en un `finally`:
  1. `read-tree HEAD`.
  2. `add -A`.
  3. `diff --cached --no-renames --numstat <base>` o `diff --cached --no-renames --no-color <base>`.
  - En numstat, `-\t-\truta` cuenta como binario.
  - `diffCopia` corta a 1.500.000 caracteres y marca `truncado`.
- **`quitarCopia` con repo:**
  - `worktree remove --force <ruta>`. Si falla porque la carpeta ya no existe, `worktree prune`.
  - Después `branch -D <rama>`, ignorando que no exista.
- **`quitarCopia` sin repo:** `fs.rm` recursivo, pero solo si la ruta está dentro de `dirCopias`. Si no, lanza `Ruta fuera del Taller: no se borra.`

- [ ] **Test (rojo):** `crea un worktree en una rama esme/<id> desde HEAD sin tocar la carpeta original`. Comprueba:
  - existe `<dir>/<id>`;
  - `git branch --list esme/<id>` no está vacío;
  - `base` es el HEAD del repo;
  - `git status --porcelain` del original no cambia.
- [ ] **Test:** `cuenta cambios sin commitear y ficheros nuevos sin tocar el índice de la copia`. Modifica un fichero y añade otro nuevo; espera `ficheros: 2` con sus `mas` y `menos` exactos, y que el status de la copia siga mostrando `??` en el nuevo.
- [ ] **Test:** `cuenta también lo que el motor haya commiteado dentro de la copia`.
- [ ] **Test:** `el diff incluye el contenido de los ficheros nuevos`.
- [ ] **Test:** `sin carpeta crea un repo nuevo con commit de partida`.
- [ ] **Test:** `rechaza una carpeta que no es repo con un mensaje claro`.
- [ ] **Test:** `quitar borra el worktree y la rama, y se niega a borrar fuera del Taller`.
- [ ] Ver los tests en rojo, implementar, ver verde y hacer commit `feat(taller): copias aisladas con git worktree y cambios medidos con índice temporal`.

### Tarea B2: más eventos de la sesión ACP (`app/src/main/motores/sesion-acp.ts`)

**Ficheros:**
- Modificar `sesion-acp.ts`.
- Modificar `fixtures/agente-falso.mjs`: si el prompt es `uso`, emite un `usage_update` y devuelve `usage`.
- Ampliar `sesion-acp.test.ts`.

**Produce (`EventoMotor`, ampliado):**
```ts
| { tipo: 'herramienta'; id: string; titulo?: string; estado?: string; clase?: string; diff?: {…}[] }   // titulo, estado y clase solo si vienen (u.kind → clase)
| { tipo: 'contexto'; usado: number; total: number; coste?: { cantidad: number; moneda: string } }    // de sessionUpdate 'usage_update' (used, size, cost{amount,currency})
| { tipo: 'uso'; entrada: number; salida: number; pensamiento?: number; cacheLectura?: number; cacheEscritura?: number }  // de PromptResponse.usage, emitido antes de resolver preguntar()
```
- `preguntar()` sigue devolviendo el `stopReason`.
- Un `tool_call_update` sin título ya no emite `titulo: ''`.

- [ ] Tests nuevos en rojo:
  - `traduce usage_update a contexto y la usage del prompt a uso`;
  - `un tool_call_update solo con estado no trae título`.
- [ ] Implementar, ver verde (los tests anteriores también) y hacer commit `feat(motores): la sesión ACP informa de tokens, contexto, coste y clase de herramienta`.

### Tarea B3: runtime del Taller (`app/src/main/taller/taller.ts`)

**Ficheros:** crear `app/src/main/taller/taller.ts` y `app/src/main/taller/taller.test.ts`.

**Consume:** B1 (`Copia`, `Cambios`, funciones de copias) y B2 (`EventoMotor`, `abrirSesionACP`).

**Produce:**
```ts
export type EstadoTarea = 'preparando' | 'trabajando' | 'esperando' | 'lista' | 'parada' | 'error'
export type Permiso = { titulo: string; opciones: { id: string; nombre: string; tipo: string }[] }
export type UsoTarea = { entrada: number; salida: number; pensamiento: number; contextoUsado?: number; contextoTotal?: number; coste?: { cantidad: number; moneda: string } }
export type Tarea = {
  id: string; titulo: string; texto: string; motor: string; motorNombre: string; carpeta: string | null
  estado: EstadoTarea; copia: Copia | null; inicio: number; fin?: number; turnos: number
  primeraRespuestaMs?: number; herramientas: number; cambios: Cambios | null; uso: UsoTarea
  permiso: Permiso | null; error?: string
  actividad: number[]   // 40 cubos de 1,5 s con el número de eventos; el último es el cubo actual
}
export type MotorElegido = { id: string; nombre: string; comando: string; args: string[] }
export type SesionMotor = { preguntar(texto: string): Promise<string>; cancelar(): Promise<void>; cerrar(): void }
export type AbrirSesion = (o: { comando: string; args: string[]; cwd: string; mcp?: { nombre: string; url: string; token: string }
  alEvento(e: EventoMotor): void; alPedirPermiso(p: Permiso): Promise<string | 'cancelar'> }) => Promise<SesionMotor>
export type OperacionesCopia = { crear: typeof crearCopia; cambios: typeof cambiosCopia; diff: typeof diffCopia; quitar: typeof quitarCopia }
export class Taller {
  constructor(o: { dir: string; emitir(canal: 'cambio' | 'evento' | 'quitada', dato: unknown): void
    abrirSesion?: AbrirSesion; copias?: OperacionesCopia; mcp?: () => { nombre: string; url: string; token: string } | null
    resolverMotor?: (id: string) => Promise<MotorElegido | null>; ahora?: () => number })
  cargar(): Promise<void>
  crear(p: { motor: MotorElegido; carpeta: string | null; texto: string }): Tarea   // registra y arranca en segundo plano
  seguir(id: string, texto: string): Promise<void>
  responder(id: string, opcion: string | 'cancelar'): void
  parar(id: string): Promise<void>
  descartar(id: string): Promise<void>
  lista(): Tarea[]                                   // la más reciente primero
  eventos(id: string): Promise<EventoMotor[]>
  diff(id: string): Promise<{ texto: string; truncado: boolean }>
  cerrarTodo(): void
}
```

**Comportamiento de cada operación:**
- **Identificador y título:** el `id` tiene 8 caracteres `[a-z0-9]`. El `titulo` es la primera línea del texto, recortada a 120.
- **Ciclo de una tarea:**
  1. Empieza en `preparando` y se crea la copia en `<dir>/copias`.
  2. Se abre la sesión con `cwd = copia.ruta` y el `mcp()` del momento, y pasa a `trabajando`.
  3. Se llama a `preguntar(texto)`.
  4. Al acabar, el estado depende del `stopReason`:

     | `stopReason` | Estado |
     |---|---|
     | `cancelled` | `parada` |
     | cualquier otro | `lista` |

     Además `turnos++`, se fija `fin` y se calculan `cambios` (si falla, `null`).
  5. Cualquier excepción deja la tarea en `error` con `error = message` y `fin`.
- **Eventos:**
  - Cada evento se añade a la memoria (máx. 4000 por tarea) y a `<dir>/<id>.jsonl` (append en cola) y se emite como `evento` `{ id, evento }`.
  - `herramientas` cuenta los ids distintos.
  - `primeraRespuestaMs` es el tiempo hasta el primer evento del primer turno.
  - `actividad` reparte los eventos por cubos de reloj.
  - Los eventos `uso` se suman.
  - El evento `contexto` sustituye a `contextoUsado`, `contextoTotal` y `coste`.
- **Emisión de `cambio`:**
  - Se emite `cambio` con la `Tarea` como mucho cada 250 ms por tarea (con disparo final).
  - Cuando cambia el estado o el permiso, se emite al instante.
- **Permisos:**
  - Cuando el motor pide permiso, la tarea pasa a `esperando` con `permiso` relleno.
  - `responder()` resuelve la promesa, limpia el permiso y vuelve a `trabajando`.
  - `parar()` responde `cancelar` a un permiso pendiente y después llama a `sesion.cancelar()`.
- **Seguir una tarea:**
  - Con la tarea en `preparando`, `trabajando` o `esperando`, `seguir()` lanza `La tarea sigue trabajando.`
  - Si la sesión ya no existe (tras reiniciar o tras un error), se reabre en la misma copia con `resolverMotor(motor)`.
- **Persistencia:**
  - `<dir>/tareas.json` se escribe con un *debounce* de 500 ms.
  - Al cargar, las tareas que estaban en `preparando`, `trabajando` o `esperando` pasan a `parada` y se quedan sin permiso.
  - `eventos(id)` lee el `.jsonl` si la tarea no está en memoria.
- **`descartar()`:**
  1. Para la tarea si está activa y cierra la sesión.
  2. Quita la copia con `quitar(copia, { dirCopias })`. Si falla, lanza y la tarea se queda.
  3. Borra el `.jsonl`, la elimina de la lista y emite `quitada` con el `id`.
- **`cerrarTodo()`:** cierra las sesiones y escribe `tareas.json` de forma síncrona.

- [ ] Tests en rojo, con una sesión falsa en memoria y `copias` falsas inyectadas. Una sola prueba de integración usa el `agente-falso.mjs` real con `carpeta: null`.
  - `una tarea pasa de preparando a trabajando y a lista, con turnos, fin y cambios`
  - `cuenta herramientas distintas, primera respuesta y uso acumulado`
  - `un permiso pone la tarea en esperando y responder la devuelve a trabajando`
  - `parar con un permiso pendiente cancela el permiso y deja la tarea parada`
  - `si el motor no arranca, la tarea queda en error con el mensaje`
  - `seguir suma un turno y no se permite mientras trabaja`
  - `descartar quita la copia, borra los eventos y avisa con quitada`
  - `al recargar, lo que estaba en marcha queda parado y los eventos se leen del disco`
  - `integración: el agente falso trabaja de verdad en una carpeta nueva`
- [ ] Implementar, ver verde y hacer commit `feat(taller): runtime de tareas con copia aislada, permisos, uso y persistencia`.

### Tarea B4: IPC, preload y bridge

**Ficheros:**
- Crear `app/src/main/ipc-taller.ts`.
- Modificar `app/src/main/index.ts`: `registerTaller({ brainInfo: () => brain.info })` dentro de `registerIpc`, y `cerrar()` en `window-all-closed`.
- Modificar `app/src/preload/index.ts` y `app/src/renderer/lib/bridge.ts`.

**Canales IPC** (`invoke`). Todos validan la entrada:
- Ids que cumplan `^[a-z0-9]{6,16}$`.
- Texto no vacío y de 20.000 caracteres como máximo.
- Carpeta de tipo `string | null`.

| Canal | Respuesta |
|---|---|
| `taller:motores` | Lista de motores (detección de `detectarMotores`, los instalados primero), cada uno como `{ id, nombre, instalado, cumplimiento, login, nota }`. |
| `taller:lista` | `Tarea[]`. |
| `taller:eventos(id)` | `EventoMotor[]`. |
| `taller:crear({ motor, carpeta, texto })` | `{ ok: true, tarea }` o `{ ok: false, error }`. Error si el motor no está instalado: `«<nombre>» no está instalado en este equipo.` |
| `taller:seguir(id, texto)`, `taller:parar(id)`, `taller:descartar(id)` | `{ ok: true }` o `{ ok: false, error }`. |
| `taller:responder(id, opcion)` | `{ ok: true }`. |
| `taller:diff(id)` | `{ texto, truncado }`. |
| `taller:carpeta` | `dialog.showOpenDialog` con `openDirectory`; devuelve la ruta o `null`. |
| `taller:abrir(id)` | `shell.openPath(copia.ruta)`. |

- Eventos hacia todas las ventanas: `taller:cambio` (Tarea), `taller:evento` (`{ id, evento }`) y `taller:quitada` (id).
- `mcp()` devuelve `{ nombre: 'esme', url: `${info.url}/mcp`, token: info.token }`, o `null` sin cerebro.
- La carpeta de datos es `join(app.getPath('userData'), 'taller')`.

**Preload:** `taller: { motores, lista, eventos, crear, seguir, responder, parar, descartar, diff, carpeta, abrir, onCambio, onEvento, onQuitada }`, con el mismo patrón `on()` del fichero.

**Bridge:**
- Tipos con `import type` desde main: `Tarea as TareaTaller`, `EventoMotor as EventoTaller` y `MotorTaller`.
- `bridge.taller` con los mismos métodos.
- En modo web devuelve `[]`, `null`, `{ ok: false, error: 'Solo en la app de escritorio' }` y desuscripciones vacías.

- [ ] `npm run typecheck` sin errores y `npm test` en verde, salvo fallos ajenos que se informan.
- [ ] Commit `feat(taller): canales IPC del runtime y puente seguro para la interfaz`.

### Tareas F (interfaz, las hace el orquestador)
- **F1:** `taller/iso.ts` con test: proyección 2:1, caras de una caja, rutas en L sobre el plano y posiciones en anillo.
- **F2:** `taller/linea.ts` con test: pliega los eventos en una línea de tiempo (une el texto, actualiza las herramientas por id, sustituye el plan).
- **F3:** `taller/Escena.tsx`: el suelo isométrico (el plano de la Señal), el núcleo con la Señal viva, las máquinas por tarea, los conductos con impulso aurora y la baliza de permiso.
- **F4:** `taller/FilaMotor.tsx` y `Micrografica.tsx`: filas HUD con cifra grande, micrográfica y métricas.
- **F5:**
  - `taller/Detalle.tsx` (en vivo, permisos y seguir) y `taller/Cambios.tsx` (diff legible);
  - `taller/NuevaTarea.tsx`;
  - `paginas/Taller.tsx`;
  - las terminales antiguas pasan a un cajón con los colores neutros.

### Tarea B5: opciones del motor (modelo, esfuerzo, modo) — añadida tras la prueba real con OpenCode
**Por qué:**
- Al abrir la sesión, OpenCode emite un `config_option_update`, unos 100 ms después de `newSession`, que pone el modelo de la configuración del usuario (`llamacpp/ling-3.0-tiny`).
- Ese modelo local tarda minutos en procesar el system prompt de OpenCode, así que la tarea se queda colgada sin eventos.
- Desde Esme hay que ver y elegir el modelo del motor. Los de OpenCode Zen `*-free` son gratis.

**Ficheros:** `motores/sesion-acp.ts` (+ test y `fixtures/agente-falso.mjs`), `taller/taller.ts` (+ test), `ipc-taller.ts`, `preload/index.ts` y `renderer/lib/bridge.ts`.

**Produce:**
```ts
// sesion-acp.ts
export type OpcionConfig = { id: string; nombre: string; actual: string; valores: { id: string; nombre: string; descripcion?: string }[] }  // solo las de tipo 'select'
| { tipo: 'opciones'; opciones: OpcionConfig[] }      // nueva variante de EventoMotor: tras newSession (si trae configOptions) y en cada config_option_update o respuesta de setSessionConfigOption
// opción nueva de abrirSesionACP: config?: Record<string, string>   (id de opción → valor deseado)
// la sesión gana: configurar(id: string, valor: string): Promise<void>   (conn.setSessionConfigOption; actualiza la config deseada)
// taller.ts
Tarea gana: opciones: OpcionConfig[]; modelo: string | null   // modelo = nombre del valor actual de la opción 'model' (o null)
crear(p: { motor; carpeta; texto; config?: Record<string, string> })
configurar(id: string, opcion: string, valor: string): Promise<void>   // guarda la config deseada de la tarea; si hay sesión viva, la aplica ya
// ipc-taller.ts
'taller:configurar'(id, opcion, valor) → { ok } | { ok:false, error }
'taller:opcionesMotor'(motorId) → OpcionConfig[]   // sondeo: abre el motor en una carpeta temporal, recoge 'opciones' (espera 600 ms tras la última, máx. 3 s), cierra y borra la carpeta; caché en memoria por motor
'taller:crear' acepta config
```

**Reglas:**
- **Cuándo se aplica la config deseada:** justo antes de cada `preguntar()`, y solo para las opciones que existan, cuyo valor esté entre los `valores` y cuyo valor actual sea distinto. Aplicarla al abrir no basta, porque el `config_option_update` de OpenCode llega después y la pisaría.
- **Si `setSessionConfigOption` falla:** se emite `{ tipo: 'fallo', mensaje }` y la tarea sigue con el modelo que tenga. No se para.
- **Validación en IPC:** opción y valor deben ser `string` de 200 caracteres como máximo, y `config` un objeto plano de 10 claves como máximo.
- **Agente falso:**
  - `newSession` devuelve `configOptions`: model, con valores `lento` y `rapido` y actual `lento`.
  - Emite un `config_option_update` 50 ms después.
  - Acepta `setSessionConfigOption`.
  - El prompt `modelo` responde con el texto del modelo actual.

**Tests:**
- [ ] `traduce configOptions y config_option_update a opciones`
- [ ] `la config deseada se aplica antes de preguntar aunque el motor la cambie al abrir`: con el falso, `config { model: 'rapido' }` y el prompt `modelo`, el texto debe ser `rapido`.
- [ ] `configurar cambia el modelo de una sesión viva`
- [ ] `la tarea refleja opciones y modelo`

**Commit:** `feat(taller): ver y elegir el modelo, el esfuerzo y el modo de cada motor`.

### Tarea B6: llevar los cambios a casa (aplicar, deshacer, guardar en rama, exportar) y veredictos
**Por qué:** hasta ahora los cambios se quedan en la copia y no hay forma de traerlos de vuelta. Además, aplicar o descartar es la señal con la que aprenderá el router (paso 3).

**Ficheros:** `taller/copias.ts` (+ test con git real), `taller/taller.ts` (+ test), `ipc-taller.ts`, `preload/index.ts` y `renderer/lib/bridge.ts`.

**Produce:**
```ts
// copias.ts
export function parcheCopia(c: Copia, git?: Git): Promise<string>   // diff binario completo frente a base con índice temporal: `diff --cached --binary --no-renames <base>`; sin truncar
export function aplicarParche(repo: string, parche: string, o?: { inverso?: boolean; git?: Git }): Promise<{ ok: true } | { ok: false; ficheros: string[]; mensaje: string }>
export function commitCopia(c: Copia, mensaje: string, git?: Git): Promise<string | null>   // add -A + commit en la copia; null si no había nada; devuelve el sha
export function exportarCopia(c: Copia, destino: string): Promise<void>   // solo carpeta nueva (repo null)
// taller.ts
Tarea gana: aplicada?: { cuando: number; modo: 'carpeta' | 'rama' | 'exportada'; ficheros: number; destino?: string; commit?: string }
aplicar(id: string): Promise<{ ok: true; ficheros: number } | { ok: false; error: string; ficheros?: string[] }>
deshacer(id: string): Promise<{ ok: true } | { ok: false; error: string; ficheros?: string[] }>
guardarEnRama(id: string, mensaje?: string): Promise<{ ok: true; commit: string } | { ok: false; error: string }>
exportar(id: string, destino: string): Promise<{ ok: true } | { ok: false; error: string }>
veredictos(): Promise<{ ts: number; motor: string; modelo: string | null; exito: boolean }[]>
```

**Reglas de las operaciones de copia:**
- **`aplicarParche`:**
  1. Escribe el parche en un temporal (en `os.tmpdir()`, borrado en `finally`).
  2. Ejecuta `git -C repo apply --check [-R] <parche>`. Solo si pasa ejecuta `git apply [-R] <parche>`, que toca solo el árbol de trabajo, nunca el índice. Nada de `--3way` ni `--index`.
  3. Si la comprobación falla, no toca nada y devuelve las rutas que chocan, leídas de las líneas `error: patch failed: <ruta>:<n>`, `error: <ruta>: does not match index`, `error: <ruta>: already exists in working directory` y `error: <ruta>: No such file or directory`. `mensaje` es el stderr recortado.
- **`commitCopia`:**
  - Usa la identidad que tenga git. Si no hay (el commit falla por identidad), reintenta con `-c user.name=Esme -c user.email=esme@localhost`.
  - Si `git status --porcelain` está vacío, devuelve `null` y no crea ningún commit.
- **`exportarCopia`:**
  - Si `c.repo` no es `null`, lanza `Solo se exporta una tarea hecha en una carpeta nueva.`
  - Si `destino` ya existe, lanza `«<destino>» ya existe: elige otro nombre.`
  - Copia con `fs.cp(c.ruta, destino, { recursive: true, errorOnExist: true, force: false })`, incluido `.git`, para que la historia viaje.

**Reglas del runtime:**
- **`aplicar`:**
  - Errores que comprueba antes, en este orden:
    - si no hay repo: `Esta tarea está en una carpeta nueva: guárdala donde quieras.`;
    - si la tarea está activa: `Espera a que termine.`;
    - si el parche está vacío: `No hay cambios que aplicar.`;
    - si ya está aplicada en la carpeta: `Ya está aplicada.`
  - Después:
    1. Llama a `aplicarParche(repo, parche)`.
    2. Guarda el parche en `<dir>/<id>.aplicado.patch`.
    3. Fija `aplicada = { cuando, modo: 'carpeta', ficheros: cambios?.ficheros ?? n }`.
    4. Emite `cambio` y registra el veredicto con `exito: true`.
  - Si el parche no aplica: `{ ok: false, error: 'Tu carpeta ha cambiado en esos ficheros: no se aplicó nada.', ficheros }`.
- **`deshacer`:**
  - Solo si `aplicada?.modo === 'carpeta'`.
  - Llama a `aplicarParche(repo, parche, { inverso: true })`, borra el `.patch`, deja `aplicada` en `undefined` y emite.
  - No borra el veredicto.
- **`guardarEnRama`:**
  - Solo con repo y tarea no activa. Mensaje por defecto: `Esme: <titulo>`.
  - Si `commitCopia` devuelve `null`, el error es `No hay cambios que guardar.`
  - Si sale bien: `aplicada = { modo: 'rama', commit, ficheros }`, se emite y se registra el veredicto con `exito: true`.
- **`exportar`:** solo para carpeta nueva y tarea no activa. Fija `aplicada = { modo: 'exportada', destino }` y registra el veredicto con `exito: true`.
- **Veredictos:**
  - Se guardan en `<dir>/veredictos.jsonl` con `{ ts, motor, modelo, exito }`.
  - `descartar` añade uno con `exito: false`, pero solo si la tarea no estaba aplicada y tenía `turnos > 0`.
  - `veredictos()` lee el fichero e ignora las líneas rotas.

**IPC:**
- `taller:aplicar(id)`, `taller:deshacer(id)` y `taller:guardarRama(id, mensaje?)`. El mensaje es opcional, como `string` de 300 caracteres como máximo.
- `taller:exportar(id)`:
  - Abre `dialog.showSaveDialog` con `defaultPath` en `~/Documentos/<titulo-en-slug>`. Si no existe `Documentos`, usa `home`.
  - Si se cancela: `{ ok: false, error: 'cancelado' }`.
  - Si no, llama a `exportar(id, ruta)`.
- `taller:veredictos()`.
- Todo va al preload y al bridge (en modo web devuelve `SOLO_ESCRITORIO` o `[]`).

**Tests:**
- [ ] `copias`: `aplicarParche lleva cambios, ficheros nuevos, borrados y binarios al árbol de trabajo sin tocar el índice`.
- [ ] `copias`: `si tu carpeta cambió en esos ficheros, no toca nada y dice cuáles chocan`.
- [ ] `copias`: `el parche inverso deja la carpeta como estaba`.
- [ ] `copias`: `commitCopia hace un commit y devuelve null si no hay nada`.
- [ ] `copias`: `exportarCopia copia la carpeta con su historia y no pisa un destino existente`.
- [ ] `taller` (copias falsas): `aplicar guarda el parche, marca la tarea y anota un veredicto`.
- [ ] `taller`: `aplicar se niega si la tarea está en marcha o en una carpeta nueva`.
- [ ] `taller`: `deshacer revierte y quita la marca`.
- [ ] `taller`: `descartar sin aplicar anota un veredicto negativo`.
- [ ] `taller`: `guardarEnRama y exportar marcan la tarea`.

**Commit:** `feat(taller): aplicar los cambios a tu carpeta (con deshacer), guardarlos en su rama o exportarlos, y veredictos para el router`.
