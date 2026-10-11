# Daimon

Sistema cognitivo con red neuronal propia que envuelve a cualquier IA: memoria que se puede borrar de verdad, atención
aprendida (qué contexto dar a cada IA y cuánto) y privacidad por diseño. Nombre en clave; el comercial se decidirá antes
del lanzamiento.

- Diseño: [`docs/superpowers/specs/2026-10-11-daimon-design.md`](docs/superpowers/specs/2026-10-11-daimon-design.md)
- Resultados: [`docs/resultados/`](docs/resultados/)

## Qué hay hoy (Fase 1, «Me conoce»)

| Pieza | Módulo | Qué hace |
|---|---|---|
| Sistema inmune | `daimon/immune.py` | Redacta secretos y excluye por texto y por ruta lo que nunca debe entrar |
| Ingesta | `daimon/ingest.py` | Notas, documentos y sesiones con IAs → recuerdos con procedencia (ids por contenido) |
| Lente | `daimon/lens.py` | Codificador local (EmbeddingGemma vía Ollama o Model2Vec) + adaptador personal |
| Hipocampo | `daimon/hippocampus.py` | Memoria asociativa multi-salto, sincronización por fuente, desaprendizaje en cascada con certificado |
| Tálamo | `daimon/thalamus.py` | Elige el contexto con un ranker aprendido, corte adaptativo y abstención |
| Puerta MCP | `daimon/gate.py` | `recall`, `remember`, `feedback` para Claude Code u otros agentes (adiós a los .md) |
| Banco de pruebas | `daimon/bench/` + `scripts/prueba0.py` | Examen con tus datos, variantes, juez, IC bootstrap, veredicto |

## Uso

```bash
python3 -m venv .venv && .venv/bin/pip install -e . pytest
ollama pull embeddinggemma
.venv/bin/pytest -q
```

- Absorber fuentes en una mente (sincroniza por fuente; lo editado se actualiza):
  `.venv/bin/daimon ingest --home data/mente_v2 ~/Documentos/Obsidian ~/Sakoi/docs`
- Conectar a Claude Code como servidor MCP (lo decide el usuario; no se registra solo):
  `claude mcp add daimon -- /home/sakai/Daimon/.venv/bin/daimon serve-mcp --home /home/sakai/Daimon/data/mente_v2`
- Demo, la misma IA sola y con Daimon:
  `.venv/bin/python scripts/demo.py "¿Qué precios le puse a las auditorías?"`

## Privacidad

- `data/` y `runs/` nunca van a git: contienen tu memoria.
- Todo corre en local (Ollama).
- La configuración de cada mente vive en `data/<mente>/config.json`.
