# TencentDB Agent Memory — el competidor de memoria que se acerca (2026-10-20)

> **Método**: lectura de **código**, no de README. Repo clonado en
> `~/Daimon/runs/competidores/TencentDB-Agent-Memory` (MIT, TencentCloud, **29,5k★**), y el
> subagente leyó `MemoryCore/`, `MemoryKnowledge/`, `MemoryPanel/`, `MemoryProxy/`, `adapters/`,
> `agents/` y `deploy/`. Todas las citas son `archivo:línea` del repo.
> **Por qué importa**: Esme ya se midió contra **mem0** (0,929 de acierto con 1.124 tokens frente a
> mem0 0,857 con 1.499). Este es el rival **nuevo** y **más parecido**: memoria local, por capas, para
> agentes, con el mismo diálogo «conversación → hechos → escenas → persona».

---

## 1. Las cuatro capas (lo que corre y quién habla con quién)

| Capa | Puerto | Qué es | Proceso |
|---|---|---|---|
| **MemoryCore** | `:8420` | Motor de memoria: tubería L0→L3, skills, ACL, auditoría. Tipos host-neutral (`src/core/types.ts:1-11`) | Node propio, SQLite + ficheros |
| **MemoryKnowledge** | `:8421` | Wiki (FTS5 + grafo de enlaces) y CodeGraph (símbolos/llamadas) | Node/Hono, SQLite+Drizzle |
| **MemoryPanel** | `:8125` | Consola web React+Vite, **sin estado** (`README.md:3-14`) | Node |
| **MemoryProxy** | `:8096` | **Proxy LLM transparente**: intercepta `/v1/chat/completions` y `/v1/messages` y mete sesión+memoria+write-back alrededor (`README.md:3-7`) | Node |

`Proxy → Core` por HTTP (`MemoryProxy/README.md:19`); Redis es **opcional y solo en el proxy** (5
backends: Redis/COS/SQLite/FS/Memory, `MemoryProxy/README.md:33`); el Core en modo standalone va
**sin Redis ni nada externo** (`MemoryCore/tdai-gateway.standalone.yaml:1-9`).

## 2. La tubería de memoria

Cuatro capas progresivas (**L0** conversación cruda → **L1** átomos → **L2** escenas → **L3** persona)
más **Skill** = experiencia ejecutable extraída de la conversación
(`src/core/skill/skill-extractor.ts:1-10`).

- **Extracción L1**: *una* llamada LLM que segmenta escenas y extrae a la vez
  (`src/core/prompts/l1-extraction.ts:15-25`). Tipos: `persona, episodic, instruction, work_fact,
  work_task, work_method, work_artifact` (`l1-extractor.ts:808`).
- **Dedup en lote**: recall top-5 candidatos y **una sola llamada LLM** decide `skip/update/merge/store`
  (`src/core/record/l1-dedup.ts:1-15`).
- **L2 escenas** = ficheros Markdown con `META{created,updated,summary,heat}` (`scene-format.ts:5-19`),
  escritos por un LLM con **herramientas de fichero sandboxeadas a `scene_blocks/`**
  (`scene-extractor.ts:1-17`). `heat` = saliencia: nuevo=1, actualizado=+1, fusionado=+1+1
  (`scene-extraction.ts:183-185`); **las escenas de `heat` más bajo se fusionan o se borran**
  (`scene-extraction.ts:130`, `:363`).
- **L3 persona** = `persona.md` reescrito incrementalmente, **tope duro de 2.000 caracteres**, y
  contenido **solo derivable de las escenas** (`persona-generation.ts:37-55`).
- **JEV gate (lo más interesante)**: antes de reescribir L3, un juez LLM clasifica el *delta* contra la
  persona actual como `conflict | boundary_change | new_rule | reinforcement | none`, y **solo
  `conflict/boundary_change/new_rule` disparan reescritura inmediata**
  (`src/core/persona/jev-gate.ts:15-30`, `:62-67`).
- **Recuperación**: híbrido FTS5-BM25 ∥ vector con RRF (`src/core/hooks/auto-recall.ts:5-10`),
  `maxResults:5`, `scoreThreshold:0.3`. **L2 se inyecta solo como índice** (paths+summary) y el LLM
  tira del texto con herramienta (`tdai-profile-memory-injector.ts:11-19`).
- **Olvido**: **solo TTL** de L0/L1 (`retentionDays`, con guardas `MIN_RETAIN_L0=50` / `MIN_RETAIN_L1=20`,
  `src/utils/memory-cleaner.ts:27-29`). **No hay borrado en cascada a L2/L3**: los scene blocks no
  guardan el `record_id` de L1 → **se pierde la trazabilidad**.

## 3. Almacenamiento y arranque

**SQLite + sqlite-vec (`vec0`) + FTS5** (`src/core/store/factory.ts:6`; tablas `l1_records`, `l1_vec`,
`l1_fts`, `entity_*`, `memory_audit` en `sqlite/memory-store.ts`). Alternativas: TCVDB y MongoDB
(experimental). L2/L3 = **Markdown en disco**.

**Requisitos**: Node ≥22.16, npm y **una API LLM OpenAI-compatible** (obligatoria:
`MemoryCore/README.md:50-55`). Aviso real: **FTS5 no está en los binarios oficiales de Node** → sin
FTS5 el recall degrada a solo-embedding, y por defecto `embedding.provider: "none"` deja **solo BM25,
ningún vector** (`tdai-gateway.standalone.yaml:127-134`).

**¿Correría aquí?** El **MemoryCore solo, desde código fuente: sí** (sin Docker ni Redis). El stack de
3 contenedores **exige Docker** y **dos grupos de claves LLM** (`deploy/global-images/.env.example:34-39`).
**En esta máquina no hay Docker**, así que queda leído y medido, no ejecutado.

## 4. El modelo de distribución (aquí son mejores que nosotros)

**No es MCP: es un proxy LLM.** El cliente apunta su `baseURL` al proxy y todo pasa transparente:

- Claude Code: `ANTHROPIC_BASE_URL=http://127.0.0.1:8096/claude-code/default` + token
  (`agents/claude-code/README.md:14-31`).
- OpenCode: provider `openai-compatible` con `baseURL: .../opencode/default/v1`
  (`adapters/opencode/opencode.json:8`); **el prefijo de ruta es el `agentSource`**
  (`adapters/opencode/validate.js:34-39`).
- Agentes: `claude-code, codebuddy, codex, workbuddy, dsh, opencode, pi, hermes, openclaw`
  (`MemoryProxy/src/supported-agents.ts:44-60`).
- Captura: al cerrar cada turno humano → write-back a Core (`MemoryProxy/README.md:29`).

**Ellos ganan**: cobertura de *cualquier* cliente OpenAI/Anthropic sin plugin, **inyección proactiva**
(la memoria entra sola, sin que el agente pregunte) y captura automática. **Coste**: el proxy
**secuestra todo el tráfico LLM**, necesita clave del upstream y el `models.<id>` debe coincidir con
`PROXY_UPSTREAM_MODEL` (`adapters/opencode/README.md:90-100`).

**Nosotros ganamos**: cero proxy, cero clave upstream, codificadores **locales** (ellos por defecto son
BM25 puro), el agente **paga tokens solo cuando decide buscar**, y **olvido en cascada determinista**
(ellos solo TTL plano y pierden L1→L2).

## 5. Qué mide

**Un único número publicado**: PersonaMem 48 % → 76 % (+59 %) (`README.md:273-277`). **No hay banco de
pruebas en el repo**: los `scripts/bench-l0-mongo/` son *throughput*, no acierto. No publica coste en
tokens ni comparación con mem0.

## 6. Veredicto

**Lo suyo mejor que lo nuestro (3 ideas, todas baratas):**
1. **El gate JEV** — un juez que decide si el delta cambia algo de verdad antes de reescribir lo
   largo plazo. **Encaja de lleno con nuestro `suenio.py`**: hoy reescribimos tarjetas cada vez.
2. **`heat` como saliencia explícita** que sobrevive a las fusiones, con regla de «fusiona o borra las
   de menor heat».
3. **Dedup en lote**: N memorias, una llamada LLM.

**Lo nuestro mejor (4 cosas):** codificadores locales · sin proxy ni MITM · **olvido en cascada con
certificado** (ellos pierden la procedencia al pasar a L2/L3) · **banco reproducible** con acierto y
tokens (su 48→76 % no se puede reproducir; el nuestro sí).

**Lo que copiaría (3):** el gate tipo JEV en el sueño · `heat` como saliencia · **inyectar el resumen
en vez del texto** (L2 como índice y el LLM tira del texto con herramienta), que es lo mismo que
persigue nuestro tálamo con otro mecanismo.

**Lo que NO copiaría (ruido para Esme):** el proxy (secuestra el tráfico y necesita claves) · el panel
web React · Docker/COS/Redis/Mongo/TCVDB · ClickHouse/Langfuse/Opik · el modelo de assets/ACL/equipos ·
el Wiki+CodeGraph (salvo que queramos memoria de código).

**El hueco real que nos abren:** nuestro MCP es **pull** — el agente tiene que **preguntar**. Si un
usuario ya usa Claude Code/Codex y quiere que la memoria entre **sola**, hoy no lo tiene. Se puede
aproximar **sin reimplementar un proxy**: un *preamble*/hook barato que inyecte el recall al abrir
sesión. **Es una decisión de producto, no de ingeniería** — y es la casilla que más se les acerca.

**Lo que no se pudo verificar:** el número de PersonaMem (sin harness), el mínimo de RAM (no
documentado) y si hay algún otro camino de borrado de L2/L3 aparte del TTL y del borrado suave que
dirige el LLM.
