# REA sobre el propio Esme: el espejo (2026-10-20)

> Taller `qxntxkie`. Palanca 6 de la tesis de escala («Esme aprende de sí misma: REA»).
> Lo que se hizo: **se le pasó el binario de Esme a un ingeniero inverso automático y se comprobó
> si lo entendía.** Con la evidencia delante, no con la promesa.

## 0. Por qué esto importa

La tesis de escala (Palanca 6) dice que REA —*Reverse Engineer Anything*, MCP + CLI, MIT,
`rea-agents` 6.7.0, publicado en el Registro oficial de MCP como `io.github.morluto/rea`— es la
diferencia entre «me gusta cómo funciona» y «sé cómo funciona». Aplicado a lo propio, Esme puede
entender su propio binario.

La prueba no es «REA existe»: es **«REA entiende a Esme»**. Y eso se mide contra el código fuente,
que es la verdad.

## 1. La receta (la que funciona)

```bash
npx -y rea-agents@6.7.0 analyze-javascript-application /home/sakai/Daimon/app/out --format json > rea-esme.json
```

Cuatro minutos para 75 ficheros. El `.asar` entero (20.589 ficheros, 257 MB) **no** es la vía: se
canceló a los ~50 minutos porque el resultado en Markdown no cabía en una cadena del runtime (el
propio REA lo dice: *«use --format json to stream the complete result, or narrow it with
--filter-output»*). Analizar **la carpeta que se construye** (`out/`) es lo practical: es el binario
que se ejecuta, sin las 20.000 dependencias de `node_modules`.

## 2. Lo que encontró

| | |
|---|---|
| Nodos del grafo | **510** |
| Módulos JavaScript | 221 |
| **Canales IPC** | **86** (87 nodos: 86 canales + 87 handlers) |
| Handlers en el proceso principal | 86 |
| Emisiones del renderer emparejadas | 86 de 86 (0 ambigüas, 0 sueltas) |
| Miembros expuestos por el puente de contexto | 127 |
| Ventanas | 2 (con sus `webPreferences`) |
| Preload / proceso utilitario | 1 (`preload/index.mjs`) / 1 (`main/pty-host.js`) |
| Endpoints (llamadas `fetch`) | 22 |
| Almacenes del renderer | 9 (claves `esme:proveedor`, `esme:voz-continua`…) |
| Ficheros analizados | 75 · 72 parseados · 599.084 nodos de AST · 839 hallazgos |

Lo que encontró, en concreto:

- **El puente de contexto se llama `daimon`** y expone 127 miembros (`agents`, `ajustes.alCerrar`,
  `brain`, …): la superficie exacta que el renderer puede tocar.
- **El proceso utilitario es `main/pty-host.js`**: el que hospeda la terminal.
- **Las dos `BrowserWindow`**, con su `webPreferences` literal (`contextIsolation: true`).
- **Las 9 claves de `localStorage`** que el renderer usa para recordar al usuario (proveedor, voz
  continua…).

## 3. La comprobación: contra el código fuente

Aquí está la verdad, y no es una promesa:

| | |
|---|---|
| Canales IPC que encontró REA en el binario | 86 |
| Canales IPC que registra el código fuente | 86 |
| **Falsos positivos** (REA vio lo que no existe) | **0** |
| **Falsos negativos** (REA no vio lo que existe) | **0** |

Los dos canales que no salían en la primera comparación (`agentes:actualizar`, `agentes:versiones`)
**sí están** en el código: estaban en el repositorio canónico, dos commits por delante de la copia
en la que se comparó, y el binario analizado se había construido desde ahí. Es decir: **86 de 86,
exactos**.

Un ingeniero inverso automático, sin una línea de Esme en la mano, reconstruyó la superficie IPC
completa de la app. Eso es lo que significa «Esme se entiende a sí misma».

## 4. Lo que REA dice que NO sabe (y hay que leer)

Diez limitaciones, textuales del propio REA (y esta parte es la que vale):

- «Las expresiones de canal IPC dinámicas quedan sin resolver y nunca se emparejan por parecido
  textual.»
- «Las relaciones de Electron se derivan de sintaxis inerte: el registro en tiempo de ejecución, la
  alcanzabilidad, los valores por defecto y la aplicación siguen sin probarse.»
- «La cobertura del grafo es incompleta; los hechos no disponibles quedan explícitos y no deben
  leerse como ausencia.»
- «JavaScript y HTML se parsearon como texto inerte; nunca se ejecutó el arranque del bundle.»
- **Una en la práctica**: el worker de JavaScript se quedó sin memoria al analizar
  `renderer/assets/esme-ak7CrmYn.js` (el bundle grande del renderer). Resultado: 72 de 75 ficheros
  parseados, 1 saltado, y el límite queda escrito en la evidencia.

O sea: REA es preciso sobre **lo que ve en el texto** y honesto sobre **lo que no puede ver**. Es
justo el contrato que exige el criterio de Esme: cada conclusión con su evidencia y con los límites
de esa evidencia.

## 5. La conclusión, con sus números

| Palanca | Antes | Ahora |
|---|---|---|
| 6 — Esme aprende de sí misma | idea escrita en la tesis | **medida**: 86/86 canales IPC, 0 falsos positivos, 0 falsos negativos, 4 minutos |

Y la receta queda en la Tienda: la herramienta **REA** viaja dentro de Esme (con la versión fijada en
6.7.0 y sus argumentos, que antes se perdían y hacían que el servidor arrancara en modo CLI sin
hablar MCP), y el Taller tiene la receta **«Entender un programa»** que la usa.

## 6. Lo que sigue (la cola honesta)

- Analizar el `.asar` entero con `--filter-output`: lo que se tardó 50 minutos y se canceló se puede
  acotar por fichero (`--source-path`).
- **Las dos ventanas y su `webPreferences`**, leídas por un humano: la superficie de seguridad
 no debe darse por buena porque un análisis estático la vio.
- El **`sender_validation_observations: 0`**: el análisis estático no vio validación de emisor en
  ningún canal. Puede ser que la haya (el código la tiene en algunos sitios) o puede que no: eso lo
  decide el código, no el grafo.
