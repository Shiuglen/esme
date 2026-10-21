# La memoria entra sola: `sesion` y el protocolo (2026-10-20)

> **Encargo del creador**: «con sesión dices? sigue tú en loop y decide a lo mejor, ya que
> tenemos que ser los mejores y siempre disponer en todos los sentidos de lo más nuevo».
> **Decisión**: la memoria se pone **sin proxy**, con **una llamada al empezar la sesión** y un
> **protocolo declarado** que el propio servidor MCP enseña a cada agente.

---

## 1. El problema, medido en el rival

TencentDB Agent Memory (MIT, 29,5k★) inyecta la memoria **secuestrando el tráfico del LLM**: el
cliente apunta su `baseURL` a su proxy (`:8096`) y todo lo demás pasa transparente
(`MemoryProxy/README.md:3-7`; `agents/claude-code/README.md:14-31`; `adapters/opencode/opencode.json:8`).

| | Ellos (proxy) | Nosotros (MCP) |
|---|---|---|
| La memoria entra sola | ✅ sí | ❌ el agente tenía que **preguntar** |
| Claves del proveedor | ⛔ las necesita y las intercepta | ✅ ninguna |
| El prompt de quien llama | ⛔ reescrito | ✅ intacto |
| Cualquier cliente | ✅ cualquiera OpenAI/Anthropic | ✅ cualquiera MCP |
| Coste | 🔁 todo el tráfico pasa por su proxy | 0 (127.0.0.1) |

**La casilla que nos faltaba era la primera**: que la memoria entrara sin que nadie la pidiera.

## 2. La decisión

**No copiamos el proxy.** Copiamos el efecto, con otra mecánica:

1. **El servidor MCP declara su protocolo** en las `instructions` del servidor (ya se hacía, pero era
   una línea tibia). Ahora es el protocolo entero, y los clientes MCP lo enseñan al modelo al
   inicializar: es la vía barata para que la memoria se use sola, sin tocar el tráfico de nadie.
2. **Una herramienta nueva: `sesion`.** El agente la llama **una vez al empezar**, con una frase que
   diga qué va a hacer, y recibe en una sola llamada: **el rumbo** (para qué trabaja esta mente),
   **el contexto de esa tarea** (compuesto por el tálamo, con los ids citados para poder dar
   `feedback` después) y **el protocolo**.
3. **Del lado de la app**, al conectar la mente a un agente, se escribe además en el fichero de
   instrucciones de ese agente (`.claude/CLAUDE.md`, `.gemini/GEMINI.md`, `.qwen/QWEN.md`,
   `.cursor/rules/esme.mdc`, `.config/opencode/AGENTS.md`) un bloque marcado que dice qué llamar y
   cuándo. Conectar es idempotente y desconectar deja el fichero como estaba.

**Por qué esto y no un hook de shell:** un hook depende del agente; el protocolo MCP y el bloque de
instrucciones funcionan en **cualquier** cliente MCP, los que ya están y los que vengan. Y a
diferencia del proxy, **no se necesita ninguna clave del proveedor**.

**Lo que NO se hace:** no se inyecta el contenido de la memoria sin que el agente lo pida. El
contenido llega cuando el agente llama a `sesion`; lo que se hace es que la llamada sea **la primera
y obvia**, no que el agente tenga que saber que existe.

## 3. Lo que se implementó

| Fichero | Qué |
|---|---|
| `daimon/sesion.py` (nuevo) | `pack_de_arranque()`: rumbo + contexto + protocolo. `PROTOCOLO`: el texto que el servidor declara |
| `daimon/gate.py` | La herramienta `sesion` en el servidor MCP; las `instructions` pasan a ser el protocolo |
| `app/src/main/mente/compartir.ts` | `instruccion` por agente + `conInstruccion`/`sinInstruccion`; `conectar`/`desconectar` escriben y borran el bloque |
| `tests/test_gate.py` | 4 tests: la herramienta existe, el protocolo se declara, el pack trae rumbo y contexto, y por el servidor |
| `app/src/main/mente/compartir.test.ts` | 4 tests: el bloque se escribe, no se duplica, se quita al desconectar y no rompe el resto |

**Verificado de verdad**: `initialize` del servidor MCP devuelve las `instructions` con el protocolo;
`tools/list` incluye `sesion`; la llamada devuelve el pack; **208 tests verdes**.

## 4. La consecuencia bonita

El bloque que se escribe en el fichero de instrucciones de cada agente **no es sólo para este
proyecto**: es la primera vez que Esme le explica a *otra* IA cómo se usa la mente del creador. Y el
tálamo guarda qué contexto le sirvió a cada motor, así que **cada agente que entra enseña a la mente
cómo se le habla** (`daimon/thalamus.py`).

## 5. Lo que queda abierto

- **La app todavía no llama a esta puerta**: el bloque se escribe, pero la *app* no usa `sesion` al
  hablar con sus motores. Es el siguiente pegamento.
- **El proxy como opción**: si algún día un usuario de fuera quiere que la memoria entre sola en
  Claude Code o Codex sin tocar su configuración, el proxy de estilo TencentDB sigue siendo la vía
  — pero con cuenta, claves y una cuenta de usuario. Ver `docs/investigacion/2026-10-20-tencentdb-agent-memory.md`.
- **Medir**: falta el número de «la memoria entró sola y cambió lo que hizo el agente». Es el mismo
  tipo de número que el del examen (memoria con y sin herencia), y con la misma regla: si no mejora,
  no entra.
