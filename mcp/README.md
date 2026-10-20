# Esme como servidor MCP

> «Adiós a los `.md`»: cualquier IA —Claude Code, Codex, OpenCode, Cline, un agente del Taller— puede
> acordarse de lo que tú sabes sin que tengas que pegarle un fichero de memoria.

Este servidor expone **la memoria de Esme** por MCP. La memoria es una red neuronal local: no es una
búsqueda de texto, es un tálamo que aprende qué contexto darle a cada IA y cuánto.

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
daimon serve-mcp --home ~/.config/daimon-app/data/mente_v2
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
Qwen, Cursor y OpenCode, y el Taller le pasa la mente a los motores que abre.

## La privacidad, que no es un extra

- **Todo en tu equipo.** El servidor no manda nada a ningún sitio: la memoria es una carpeta y una red
  neuronal local.
- **Con token, si lo pones detrás de HTTP.** `daimon serve` expone además una API y MCP por HTTP
  (`/recall`, `/remember`, `/feedback`, `/memories`…) con cabecera `Authorization: Bearer <token>`;
  por defecto sólo escucha en `127.0.0.1`.
- **Lo que se recuerda se puede olvidar.** Hay un forget de verdad, no un «oculto»: el recuerdo
  desaparece de la red y queda el hueco anotado.

## Publicar o actualizar esta entrada

`server.json` es la entrada del **Registro oficial de MCP** (`registry.modelcontextprotocol.io`). Para
cambiarla:

```bash
node mcp/publicar.mjs              # valida contra el registro y dice qué falta
node mcp/publicar.mjs --publicar   # publica (necesita REGISTRY_TOKEN)
```

El token se pide al registro iniciando sesión con GitHub. **Antes de publicar la primera vez** hay que
subir el cerebro a PyPI con el nombre y la versión que dice `server.json` (`daimon-esme` 0.1.0): si el
paquete no existe, quien instale desde el registro se queda sin servidor.

## Lo que este servidor NO es

- No es una nube: no hay cuentas ni precios aquí. Publicar la memoria en un registro es **descubrirla**,
  no alojarla. Quien quiera usarla en serio, la aloja en su servidor (eso es lo que hace `cloud/`).
- No es una base de datos de texto: el mismo recuerdo se cuenta de otra forma según la IA que lo pida.

## Licencia

El código de Esme está en la licencia que el repositorio declare; la entrada del registro no cambia
nada de eso. La memoria es tuya y se va contigo.
