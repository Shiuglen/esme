# El banco de la memoria: Esme contra mem0, medidos con las mismas reglas (2026-10-20)

> Taller `qxntxkie`. Encargo: la Palanca 5 de la tesis de escala («añadir Mem0/Hindsight al banco del
> examen»).
> Pregunta: **con el mismo corpus, las mismas preguntas y el mismo presupuesto de contexto, ¿qué
> encuentra la memoria de Esme y qué encuentra la memoria de la industria?**
>
> Las cifras son de esta máquina y de este trabajo, con su script
> (`scripts/banco_mem0.py`). No es una opinión: es una tabla.

## 0. La regla: si no se mide con el mismo examen, no vale

La madre de todas las reglas del proyecto: *toda mejora se mide contra un examen con tareas reales
del usuario; si el número no mejora, la mejora no entra*. Para que la comparación sea justa, las dos
memorias se miden **igual en todo lo que se puede igualar**:

| | Las dos memorias |
|---|---|
| **Corpus** | Los 5.768 recuerdos vivos de la misma mente (`data/mente_v2/mem.db`), los mismos textos, los mismos ids |
| **Preguntas** | Las 139 de la Prueba 0; la mitad oculta (35) es la que puntúa, en dos juegos: las literales y sus paráfrasis |
| **Presupuesto** | 1.500 tokens de contexto, el mismo que usa el examen |
| **Empaquetado** | El mismo `pack()` de Esme (recorta por palabras, nunca a media palabra) |
| **Puntuación** | La misma: ¿aparece el texto del recuerdo en el contexto? (`textos[e][:60] in ctx`), promediado por pregunta |
| **Codificador** | **El de Esme**: la Lente propia (EmbeddingGemma-300M int8 con ONNX Runtime) |

Lo último es lo más importante para que la cuenta signifique algo: **las dos memorias buscan con los
mismos vectores**. mem0 traería el suyo (por Ollama), pero el Ollama de esta máquina está roto y Esme
ya no depende de él. Así que el embedder de mem0 se sustituye por la Lente de Esme y lo que se mide
es **la recuperación**, no quién codifica mejor.

## 1. Cómo se midió mem0

Se usa **mem0 tal cual**, en local, con su propio almacén y su propia búsqueda:

- **Versión**: `mem0ai` 2.2.1 (Apache-2.0), la memoria de agente más usada del mundo (67K+★).
- **Almacén**: Qdrant local (el de mem0), con su colección híbrida: vector denso **+ BM25** (fastembed
  `Qdrant/bm25`) e impulsos por entidad, y su propio reordenado y su corte por puntuación. El BM25
  es la parte que hace que mem0 sea fuerte: se instaló para darle su mejor configuration, no para
  recortarla.
- **Búsqueda**: `mem0.search(query, top_k=20, filters={"user_id": "esme"})`, tal cual.
- **Embedder**: la Lente de Esme (los vectores que la app ya tenía calculados, `mem.vectors.npy`).
- **Consolidación**: **fuera** (`infer=False`). mem0 extrae hechos con un LLM y decide qué añadir,
  actualizar o borrar; con 5.768 recuerdos eso costaría una hora con un 9B local y mediría otra
  cosa. **Lo que se compara es la recuperación**: qué encuentra cada memoria cuando le preguntas.
  Es la parte que las dosaszugan en el mismo instante.
- **Sin rerank con LLM**: mem0 puede reordenar con un LLM, pero aquí no hay ninguno disponible
  (Ollama roto); se usa su configuración por defecto, que es la que la gente usa.

## 2. El resultado

### 2.1 Preguntas literales (35 ocultas)

| Memoria | Acierto de evidencia | Tokens de contexto | Coste |
|---|---|---|---|
| **Esme (el Tálamo)** | **0,929** | **1.124** | 0,0000 $ |
| RAG denso (línea base de Esme) | 0,900 | 1.498 | 0,0000 $ |
| **mem0** | **0,857** | **1.499** | 0,0000 $ |
| BM25 (línea base) | 0,857 | 1.498 | 0,0000 $ |
| El contexto entero (lo primero que hay) | 0,000 | 1.500 | 0,0000 $ |

### 2.2 Las mismas preguntas, pero dichas de otra manera (35 ocultas)

| Memoria | Acierto de evidencia | Tokens de contexto |
|---|---|---|
| **Esme (el Tálamo)** | **0,900** | **1.246** |
| RAG denso | 0,871 | 1.498 |
| **mem0** | **0,757** | **1.499** |
| BM25 | 0,729 | 1.498 |

### 2.3 Cara a cara (las 35 literales)

| | |
|---|---|
| Esme gana | **3** preguntas |
| mem0 gana | **1** pregunta (`p4-23`) |
| Empate | 31 |

En 3 preguntas Esme trae la evidencia y mem0 no la trae ni con 20 candidatos:
`p0-19`, `p0-25`, `p2-16` (Esme 1,00 · mem0 0,00).

### 2.4 Dónde está la diferencia: el corte, no el ranking

mem0 **sí encuentra** la evidencia en su top-20 en el 95,7 % de las preguntas (y en el 97,1 % con
top-60). Su ranking es bueno. Lo que pierde es otra cosa: **el presupuesto**.

- En **4 de 35** preguntas, mem0 tenía la evidencia entre sus 20 primeros y el empaque de 1.500
  tokens se la dejó fuera (los recuerdos largos de mem0 se llevan el presupuesto entero).
- Esme tiene un **corte aprendido** (`max_drop`, elegido por validación cruzada) que decide qué
  entra, y por eso mete la evidencia con **375 tokens menos** (1.124 frente a 1.499) y aun así acierta
  más: **7,2 puntos** en las literales y **14,3** en las paráfrasis.

### 2.5 Velocidad (este equipo, misma carga)

| | Por pregunta |
|---|---|
| Esme (el Tálamo compone el contexto) | **482 ms** |
| mem0 (Qdrant + BM25 + reordenado) | **697 ms** |

Las dos cifras incluyen codificar la pregunta con la Lente; mem0 tarda un 45 % más.

## 3. Qué dice esto y qué no dice

**Dice:**

1. La memoria de Esme, con el mismo corpus y el mismo presupuesto, **encuentra la evidencia más
   veces que mem0** (0,929 frente a 0,857 con las literales; 0,900 frente a 0,757 con las
   paráfrasis) y **con un 25 % menos de contexto**.
2. La ventaja de Esme **crece cuando la pregunta no es literal**: ahí es donde la palabra exacta
   deja de ayudar y el significado manda. Es justo lo que pasa en un taller de verdad, donde nadie
   pregunta con las palabras del recuerdo.
3. La diferencia **no está en codificar** (los dos usan los mismos vectores) sino en **decidir qué
   entra**: el Tálamo aprendido frente al empaque por orden.
4. mem0, en su configuración por defecto y en local, **no es una amenaza para la memoria de Esme** en
   este examen. Su ventaja real (la consolidación con LLM: extrae hechos, actualiza los viejos,
   borra los caducos) **no se midió aquí** y es su terreno: con 5.768 recuerdos y un 9B local, esa
   parte costaría una hora por tanda. Queda dicho, no medido.

**No dice:**

- No dice que mem0 sea malo: dice que, **en recuperación pura y con el mismo presupuesto**, la de Esme
  es mejor. La consolidación de mem0 es justo lo que Esme no tiene y es lo siguiente que hay que
  mirar.
- No dice nada de Hindsight: necesita un servicio aparte (Docker y su base vectorial) y no entra en
  esta máquina de 6 GB. Queda pendiente y escrito.
- No dice nada de la nube: mem0 en su nube cobra por memoria y ahí las cuentas son otras (ver
  `2026-10-20-equivalencia-economica.md`).

## 4. Cómo se reproduce

```bash
# mem0 va en su propio venv: no es dependencia del proyecto
python3 -m venv /tmp/mem0venv && /tmp/mem0venv/bin/pip install mem0ai fastembed qdrant-client

# la ingesta del corpus y las 35 preguntas (los vectores los pone la Lente de Esme)
PYTHONPATH=. /tmp/mem0venv/bin/python scripts/banco_mem0.py \
    --home data/mente_v2 --set original --split oculto \
    --out runs/prueba0_v2/original/contexts_mem0.jsonl

# y el lado de Esme, con el mismo código y el mismo corpus
PYTHONPATH=. python scripts/prueba0.py retrieval --split oculto
```

Lo que queda escrito en disco: `runs/prueba0_v2/original/contexts_mem0.jsonl` (el contexto que
mem0 dio en cada pregunta), `runs/prueba0_v2/retrieval_mem0_original_oculto.json` (el veredicto) y
`runs/prueba0_v2/original/contexts.jsonl` (el de Esme, para el cara a cara).

## 5. Lo que sigue

1. **La consolidación**: la parte de mem0 que no se midió (extraer hechos con un LLM y decidir qué
   mantener) es justo lo que la memoria de Esme no tiene todavía. Es el siguiente rival, no el
   siguiente número.
2. **Hindsight**: la otra memoria de referencia, cuando haya un servidor donde correrla.
3. **Palanca 5-bis**: trazas y evaluaciones (DeepEval con juez local + OpenLLMetry), para que cada
   tarea del Taller se mida sola, cada noche, y no sólo en el examen.
