# Esme como servidor MCP

> «Adiós a los `.md`»: cualquier IA —Claude Code, Codex, OpenCode, Cline, un agente del Taller— puede
> acordarse de lo que tú sabes sin que tengas que pegarle un fichero de memoria.

Este servidor expone **la memoria de Esme** por MCP. La memoria es una red neuronal local: no es una
búsqueda de texto, es un tálamo que aprende qué contexto darle a cada IA y cuánto.

<!-- mcp-name: io.github.shiuglen/esme -->

## Qué hay dentro

| Herramienta | Qué hace |
|---|---|
| `recall(query, budget=0, motor=None)` | Devuelve el contexto más útil para esa consulta, **con los ids de lo que usó**. `budget` son tokens (0 = el presupuesto de la mente). `motor` es el nombre de la IA: cada IA aprende su propia forma. |
| `remember(text, kind="note")` | Guarda un hecho, una decisión o una preferencia. Devuelve su id. |
| `feedback(ids, useful, query, motor=None)` | Dice si lo que te dio `recall` sirvió. La mente aprende de eso: lo que no sirvió pesa menos la próxima vez. |

## Cómo se arranca

El servidor habla por **stdio** y escribe todo en la carpeta que le indiques (tu mente):

```bash
pipx install daimon-esme            # o: pip install daimon-esme
daimon init                         # te crea la mente y baja la lente (una vez, 316 MB)
daimon serve-mcp --home ~/.esme/mente
```

En un cliente MCP, la entrada es:

```json
{
  "mcpServers": {
    "esme": {
      "command": "daimon",
      "args": ["serve-mcp", "--home", "/ruta/a/tu/mente"]
    }
  }
}
```

En la app de Esme, esto ya está hecho: Ajustes › Tu memoria conecta la mente a Claude Code, Gemini,
Codex, OpenCode y Cline, con su configuración anterior guardada por si hay que volver atrás.

## La entrada en el Registro oficial de MCP

`server.json` es la entrada del **Registro oficial de MCP** (`registry.modelcontextprotocol.io`).

Hay **dos** entradas, y no son la misma cosa:

| Entrada | Qué es | Para quién |
|---|---|---|
| `server.json` (paquete) | El **conector**: se instala y arranca en tu equipo | quien quiere su propia mente en su equipo |
| `server-remoto.json` (remoto) | La **dirección** de una mente que ya está en marcha, con la variable que la señala | quien ya tiene una mente (en su servidor, en el mío, en su nube) |

La segunda sigue el patrón de `app.ownmemory/ownmemory` (publicada el 17-oct-2026): el registro publica
el *protocolo*, no los *datos*. La memoria es privada por diseño y el registro no aloja nada privado.

Para cambiarlas:

```bash
node mcp/publicar.mjs              # valida contra el registro y dice qué falta
node mcp/publicar.mjs --publicar   # publica (necesita REGISTRY_TOKEN)
```

El token se pide al registro iniciando sesión con GitHub. **Antes de publicar la primera vez** hay que
subir el cerebro a PyPI con el nombre y la versión que dice `server.json` (`daimon-esme` 0.1.0): si el
paquete no existe, quien instale desde el registro se queda sin servidor.

## Lo que este servidor NO es

- No es una nube: no hay cuentas ni precios aquí. Publicar la memoria en un registro es **descubrirla**,
  no alojarla. Quien quiera usarla en serio, la aloja en su servidor (el mío, el suyo o su nube).
- No es una base de datos de texto: el mismo recuerdo se cuenta de otra forma según la IA que lo pida.

## Licencia

El código de Esme está en MIT (el fichero `LICENSE` del repositorio). La **Lente** (el modelo que
codifica el texto) es de Google y tiene su propia licencia: se baja al instalar, no va en el paquete.
La memoria es tuya y se va contigo.
