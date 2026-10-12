# Capa de proveedores, uso y router: plan de implementación

> Spec: `docs/superpowers/specs/2026-10-12-esme-concepto-v3.md`. Lo ejecutan agentes `ejecutor` con TDD estricto: test que falla → código mínimo → verde.

**Objetivo:** que Esme conozca muchísimos proveedores y modelos con sus precios (models.dev), registre cada consumo, avise con el presupuesto, prevea las cuotas y elija el motor de cada paso con el router en tres niveles. Debe además detectar y abrir los motores de suscripción por ACP.

**Arquitectura:** módulos TypeScript puros en el proceso main de Electron (`app/src/main/…`), sin UI. La integración con IPC y la interfaz la hace después el orquestador. Todo con inyección de dependencias (`fetch`, reloj, `which`, ficheros) para poder probarlo.

**Stack:** Electron 44, Node 24, TypeScript 5.9, vitest 3 y AI SDK `ai` 7, que ya está instalado. Tests con `npx vitest run <ruta>`. Tipos con `npx tsc --noEmit -p tsconfig.json` (desde `app/`).

## Reglas globales
- Nombres y comentarios en español, con el estilo del repo: comentario de cabecera de 1 o 2 líneas y código compacto.
- Ficheros nuevos solamente, salvo que la tarea diga lo contrario. No toques `providers.ts`, `chat.ts`, `index.ts` ni el renderer.
- Los precios de models.dev están en **USD por millón de tokens**.
- Haz commit solo de tus ficheros (`git add` con rutas concretas). Si aparece `index.lock`, espera y reintenta. Mensaje en español, estilo convencional, terminado en `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Al acabar: `npx vitest run` completo en verde y `tsc` limpio. Informa de los fallos por su nombre.

---

## Tarea A: catálogo de models.dev (`app/src/main/catalogo/modelsdev.ts`)
Formato real: descarga una vez `https://models.dev/api.json` para verlo y crea un fixture recortado en `app/src/main/catalogo/fixtures/modelsdev-muestra.json` con 4 o 5 proveedores (anthropic, openai, google, openrouter y opencode si existe) y 2 o 3 modelos de cada uno, sin tocar los campos.

```ts
export type ModeloCatalogo = { id: string; nombre: string; proveedor: string; contexto: number; salida: number
  coste: { entrada: number; salida: number; cacheLectura?: number; cacheEscritura?: number }   // USD por 1M de tokens
  herramientas: boolean; razonamiento: boolean; modalidades: string[]; pesosAbiertos: boolean; gratis: boolean }
export type ProveedorCatalogo = { id: string; nombre: string; env: string[]; npm?: string; api?: string; doc?: string; modelos: ModeloCatalogo[] }
export function parseModelsDev(json: unknown): ProveedorCatalogo[]
export async function cargarCatalogo(o: { dirCache: string; f?: typeof fetch; ahora?: () => number; maxEdadMs?: number }):
  Promise<{ proveedores: ProveedorCatalogo[]; origen: 'red' | 'cache' | 'semilla'; fecha: number }>
```
- `gratis` = coste de entrada y de salida 0, o un id que acabe en `:free`.
- Es tolerante: los campos ausentes se ponen a 0, false o []. Un proveedor sin modelos se descarta.
- `cargarCatalogo`:
  - Si la caché (`<dirCache>/catalogo-modelsdev.json`) tiene menos de `maxEdadMs` (24 h por defecto), la usa sin red.
  - Si no, descarga con un timeout de 8 s y guarda la caché.
  - Si la red falla, usa la caché aunque esté vieja. Sin caché, usa la semilla `fixtures/modelsdev-muestra.json`.

**Tests:** el parseo del fixture (número de proveedores y modelos, costes y `gratis`); un JSON malformado o vacío devuelve []; las cuatro ramas de `cargarCatalogo` (caché fresca sin llamar a `f`; red OK que escribe la caché; red caída con caché vieja; ni red ni caché, que da semilla).

## Tarea B: registro de uso, presupuesto y previsión de cuotas (`app/src/main/uso/registro.ts`)
```ts
export type Consumo = { ts: number; proveedor: string; modelo: string; entrada: number; salida: number; cacheLectura?: number; cacheEscritura?: number
  ahorradosMemoria?: number; nivel?: 'alto' | 'medio' | 'bajo'; origen: 'chat' | 'taller' | 'router' | 'arena'; tarea?: string }
export function costeDe(c: Consumo, m?: Pick<ModeloCatalogo, 'coste'>): number      // USD; sin modelo → 0
export class RegistroUso {
  constructor(archivo: string)                       // JSONL, una línea por consumo, solo se añade
  anotar(c: Consumo): void
  leer(desde?: number, hasta?: number): Consumo[]    // ignora líneas corruptas
  resumen(o: { desde: number; hasta: number; precio: (proveedor: string, modelo: string) => Pick<ModeloCatalogo, 'coste'> | undefined }): {
    costeUSD: number; tokens: number; ahorradosMemoria: number
    porModelo: { proveedor: string; modelo: string; costeUSD: number; tokens: number; llamadas: number }[]   // ordenado por coste desc
    porDia: { dia: string /* AAAA-MM-DD local */; costeUSD: number; tokens: number }[] }
}
export type Presupuesto = { diarioUSD?: number; mensualUSD?: number; avisos: number[] }   // p. ej. [0.5, 0.8, 1]
export function evaluarPresupuesto(gastoHoy: number, gastoMes: number, p: Presupuesto):
  { estado: 'ok' | 'aviso' | 'limite'; umbral?: number; cual?: 'diario' | 'mensual' }
export function preverCuota(muestras: { ts: number; restante: number /* 0..1 */ }[], reinicio?: number):
  { ritmoPorHora: number; agotaEn?: number; llegaAlReinicio: boolean }
```
- `costeDe`: `(entrada·ce + salida·cs + cacheLectura·ccl + cacheEscritura·cce) / 1e6`. Si falta un coste de caché, el de caché cuenta como entrada.
- `evaluarPresupuesto`: devuelve el umbral más alto superado entre el diario y el mensual. Si llega al 100 % o lo pasa, el estado es `limite`.
- `preverCuota`: regresión lineal (mínimos cuadrados) sobre las muestras ordenadas por `ts`, con el ritmo en fracción por hora (positivo si gasta).
  - Si el ritmo es ≤ 0 o hay menos de 2 muestras, `agotaEn` queda undefined y `llegaAlReinicio` es true.
  - `llegaAlReinicio = !agotaEn || (reinicio !== undefined && agotaEn >= reinicio)`.

**Tests:**
- Coste con y sin caché.
- Anotar y leer, con una línea corrupta ignorada.
- Resumen agrupado por modelo y por día.
- Presupuesto: ok, aviso al 80 % y límite.
- Cuota que se agota antes del reinicio, cuota que llega al reinicio y casos con 1 sola muestra.

## Tarea C: router en tres niveles con aprendizaje (`app/src/main/router/niveles.ts`)
```ts
export type Nivel = 'alto' | 'medio' | 'bajo'
export type TipoPaso = 'planificar' | 'juzgar' | 'construir' | 'escribir' | 'conversar' | 'leer' | 'ordenar' | 'condensar' | 'enrutar'
export function nivelDe(t: TipoPaso): Nivel   // planificar/juzgar→alto · construir/escribir/conversar→medio · el resto→bajo
export type Candidato = { proveedor: string; modelo: string; nivel: Nivel; costeEntrada: number; costeSalida: number; gratis: boolean
  herramientas: boolean; contexto: number; retieneDatos?: boolean }
export function clasificarModelo(m: ModeloCatalogo): Nivel
export function elegir(t: TipoPaso, cs: Candidato[], o: { preferirGratis: boolean; requiereHerramientas?: boolean; contextoMinimo?: number
  fijado?: { proveedor: string; modelo: string }; calidad?: (t: TipoPaso, c: Candidato) => number; evitarRetencion?: boolean }):
  { candidato: Candidato; nivel: Nivel; degradado: boolean; motivo: string } | null
export function escalar(e: { nivel: Nivel; confianza?: number; fallos: number; comprobacionOk?: boolean; sensible?: boolean }):
  { a: Nivel | 'persona'; motivo: string } | null
export class Aprendizaje {
  constructor(archivo?: string)   // JSON; sin archivo, solo en memoria
  registrar(t: TipoPaso, proveedor: string, modelo: string, r: 'aprobado' | 'editado' | 'rechazado'): void
  calidad(t: TipoPaso, proveedor: string, modelo: string): number   // media bayesiana Beta(2,2): (aciertos+2)/(n+4); editado = 0,5 de acierto
}
```
- `clasificarModelo`: por nombre primero.
  - `/opus|ultra|gpt-6(?!.*(mini|nano))|\bpro\b|o\d-pro|deep-?think/i` → alto.
  - `/haiku|flash-lite|mini|nano|small|lite|\b[1-9]b\b|1[0-4]b/i` → bajo.
  - Si no, por coste de salida: ≥ 10 → alto, ≤ 1,2 → bajo, el resto medio.
  - Para un modelo gratis sin pistas en el nombre → medio.
- `elegir`:
  - Si hay `fijado`, gana siempre (si existe en `cs`).
  - Si no, filtra por herramientas, contexto y retención, y busca en el nivel objetivo.
  - Si no hay, sube un nivel; si tampoco, baja. En ambos casos `degradado: true`.
  - Puntuación = `calidad` (por defecto 0,5) / (coste medio + 0,01). Con `preferirGratis`, un gratis del nivel gana a uno de pago salvo que su calidad sea al menos 0,2 menor.
  - `motivo` es una frase corta en español para la interfaz (p. ej. «bajo · gratis · el más barato que sabe condensar»).
- `escalar`:
  - `sensible` → persona («dinero, clientes, borrados o algo público»).
  - bajo con confianza < 0,7 o `comprobacionOk === false` → medio.
  - medio con fallos ≥ 2 → alto.
  - alto con fallos ≥ 2 → persona.
  - En cualquier otro caso, null.

**Tests:** cada regla de `nivelDe`, `clasificarModelo`, `elegir` y `escalar`; que el aprendizaje mueva la elección tras varios «rechazado»; y la persistencia del archivo de aprendizaje.

## Tarea D: motores por suscripción vía ACP (`app/src/main/motores/`)
Instala `@agentclientprotocol/sdk` (la versión actual; era la 1.8.0 a 11-oct). Lee sus `.d.ts` para usar la API real; no la inventes.

1. **`acp-motores.ts`**: catálogo y detección.
```ts
export type Cumplimiento = 'permitido' | 'tolerado' | 'requiere-aprobacion'
export type MotorACP = { id: string; nombre: string; binarios: string[]; args: string[]; cumplimiento: Cumplimiento; nota: string; verificado: string /* AAAA-MM-DD */; login: string }
export const MOTORES_ACP: MotorACP[]
export async function detectarMotores(which: (bin: string) => Promise<string | null>): Promise<(MotorACP & { instalado: boolean; ruta?: string })[]>
```
   - Motores: copilot (`copilot --acp`), cursor (`cursor-agent`/`agent` con `acp`), opencode (`opencode acp`), gemini, goose, kimi, qwen, vibe, cline, codex (adaptador) y claude (adaptador `@agentclientprotocol/claude-agent-acp`).
   - Confirma el subcomando o la bandera ACP de cada uno en su documentación oficial o en el `--help` del binario si está instalado. Lo que no puedas confirmar lo marcas en `nota` como «sin verificar».
   - Cumplimiento: claude = `requiere-aprobacion` (se usa con el login del propio usuario y el binario oficial, y para distribuir hay que pedir aprobación a Anthropic); codex = `tolerado`; el resto `permitido`, salvo que encuentres lo contrario.
   - `login`: frase corta de cómo inicia sesión el usuario por su cuenta (Esme nunca guarda tokens).
2. **`sesion-acp.ts`**: cliente ACP sobre stdio con `ClientSideConnection` del SDK.
```ts
export type EventoMotor =
  | { tipo: 'texto'; texto: string } | { tipo: 'pensamiento'; texto: string }
  | { tipo: 'herramienta'; id: string; titulo: string; estado: string; diff?: { ruta: string; antes?: string; despues: string }[] }
  | { tipo: 'plan'; pasos: { texto: string; estado: string }[] }
export async function abrirSesionACP(o: { comando: string; args: string[]; cwd: string; env?: Record<string, string>
  mcp?: { nombre: string; url: string; token: string }   // la mente de Esme por HTTP si el agente anuncia mcpCapabilities.http
  alEvento: (e: EventoMotor) => void
  alPedirPermiso: (p: { titulo: string; opciones: { id: string; nombre: string; tipo: string }[] }) => Promise<string /* optionId */ | 'cancelar'>
  lanzar?: typeof import('node:child_process').spawn }): Promise<{ preguntar(texto: string): Promise<string /* stopReason */>; cancelar(): Promise<void>; cerrar(): void }>
```
   - Hace `initialize`, después `newSession` con `cwd` y `mcpServers` (la mente de Esme solo si el agente la acepta por HTTP), y traduce `sessionUpdate` a `EventoMotor`.
   - **Test sin binarios reales:** un agente ACP falso escrito con el `AgentSideConnection` del mismo SDK, en un script `fixtures/agente-falso.mjs` lanzado con `node`. Debe responder texto, una llamada a herramienta con diff, un plan y una petición de permiso. El test comprueba que la sesión los traduce y que la respuesta del permiso llega al agente.

---

## Review Focus (lo que los tests deben cubrir y es fácil olvidar)
1. Sin red y sin caché, la app arranca igual (semilla) y lo dice en `origen`.
2. Un registro de uso con una línea a medio escribir (corte de luz) no rompe la lectura.
3. Precio desconocido → coste 0 y que no explote. Nunca `NaN` en la interfaz.
4. Router sin ningún candidato → `null`, no excepción. Con un solo candidato, lo usa aunque sea de otro nivel (`degradado`).
5. Si el agente ACP falso muere a mitad, la sesión rechaza `preguntar` con un error claro y no deja procesos colgados.
