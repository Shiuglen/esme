# Esme

<!-- mcp-name: io.github.shiuglen/esme -->

**«Adiós a los `.md`»: cualquier IA puede acordarse de lo que sabes.**

Esme es un sistema cognitivo con red neuronal propia que envuelve a *cualquier* IA. La
memoria no es un fichero que te pegar a cada agente: es **una mente** que vive en tu equipo,
aprende de lo que le cuentas y decide, para cada IA, qué contexto darle y cuánto.

No hay cuentas, no hay nube y no hay un plan: la memoria es tuya y se va contigo.

```bash
pipx install daimon-esme      # o: uvx daimon-esme init
daimon init                    # te crea la mente y baja la lente (una vez, 316 MB)
daimon serve-mcp               # la puerta: tus IAs ya pueden acordarse
```

## La puerta: tu mente para cualquier IA

En cualquier cliente MCP (Claude Code, Codex, OpenCode, Cursor, Cline, Goose, un agente
propio…), la entrada es esta:

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

Y las herramientas son tres, las mismas que usa la app de escritorio:

| Herramienta | Qué hace |
|---|---|
| `recall(query, budget=0, motor=None)` | Devuelve el contexto más útil para esa consulta, **con los ids de lo que usó**. `motor` es el nombre de la IA: cada IA aprende su propia forma. |
| `remember(text, kind="note")` | Guarda un hecho, una decisión o una preferencia. Devuelve su id. |
| `feedback(ids, useful, query, motor=None)` | Dice si lo que te dio `recall` sirvió. La mente aprende: lo que no sirvió pesa menos la próxima vez. |

## Por qué es mejor que un fichero de memoria

La memoria de Esme no es una búsqueda de texto: es un **tálamo que aprende**. Medido con el
mismo examen, las mismas preguntas y el mismo presupuesto de contexto:

| | Acierto | Contexto usado |
|---|---|---|
| **Esme** | **0,929** | 1.124 tokens |
| mem0 (Apache-2.0, 67K★) | 0,857 | 1.499 tokens |

Siete puntos más aciertando con **un 25 % menos de contexto**, y la ventaja crece cuando la
pregunta no es literal. El detalle y el script: [`docs/resultados/2026-10-20-banco-memoria.md`](docs/resultados/2026-10-20-banco-memoria.md).

Y lo que cuesta: los 74 turnos reales de una noche costaron **0,4996 $** con las APIs de pago
de los mismos modelos y **0,0000 $** con lo local. El informe: [`docs/resultados/2026-10-20-equivalencia-economica.md`](docs/resultados/2026-10-20-equivalencia-economica.md).

## Qué hay dentro

| Pieza | Módulo | Qué hace |
|---|---|---|
| Lente | `daimon/lens.py` | Codificador propio (ONNX, CPU): nada de Ollama, nada de servidores |
| Hipocampo | `daimon/hippocampus.py` | Memoria asociativa multi-salto, sincronización por fuente y desaprendizaje en cascada con certificado |
| Tálamo | `daimon/thalamus.py` | Elige el contexto con un ranker aprendido, corte adaptativo y abstención |
| Sueño | `daimon/suenio.py` | Destila personas, escenas y tareas repetidas de lo que has vivido |
| Puerta MCP | `daimon/gate.py` | `recall`, `remember`, `feedback` para cualquier agente |
| Cerebro HTTP | `daimon/server.py` | La misma mente por HTTP, con la Agent Card y el navegador |

El diseño completo: [`docs/superpowers/specs/2026-10-11-daimon-design.md`](docs/superpowers/specs/2026-10-11-daimon-design.md).
La fuente de verdad del producto: [`docs/ESME.md`](docs/ESME.md).

## Instalación y desarrollo

```bash
git clone https://github.com/Shiuglen/esme && cd esme
python3 -m venv .venv && .venv/bin/pip install -e ".[model2vec]" pytest
.venv/bin/pytest -q
```

- La app de escritorio (Electron) vive en [`app/`](app/): `./launch-esme.sh` la abre.
- El kit público (contratos, Tienda, juez, extension host) es [`esme-platform`](https://github.com/Shiuglen/esme-platform).

## Licencia

El código es **MIT** (fichero [`LICENSE`](LICENSE)). La **Lente** (el modelo que codifica el
texto) es de Google: se baja al instalar y tiene su propia licencia, la de Gemma.

La memoria es tuya y se queda en tu equipo.
