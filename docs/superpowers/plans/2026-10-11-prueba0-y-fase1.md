# Prueba 0 + Fase 1 («Me conoce») — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** construir el banco de evaluación con las tareas reales del usuario y la primera versión de la red de Daimon (Hipocampo, Lente, Tálamo y puerta MCP), y medir si supera a todas las líneas base con el mismo presupuesto de tokens.

**Architecture:** paquete Python `daimon/` con unidades pequeñas y puras. El flujo es:
1. `immune` filtra y redacta.
2. `ingest` convierte las fuentes en eventos con procedencia.
3. `lens` los vectoriza.
4. `hippocampus` los guarda, los recupera en varios saltos y desaprende con certificado.
5. `thalamus` compone el contexto bajo presupuesto con un ranker aprendido.
6. `teachers` habla con Ollama.
7. `bench` corre las 6 variantes, juzga y reporta con IC.
8. `gate` expone la memoria a Claude Code por MCP.

**Tech Stack:**
- Python 3.14 (venv en `.venv`), numpy, model2vec (`minishlab/potion-multilingual-128M`), SQLite (stdlib), pytest, mcp (FastMCP).
- Ollama local: `qwen3.5-abliterated-truthful:9b-local` responde y un modelo de otra familia juzga.
- Sin torch: el adaptador y el ranker van en numpy.

**Spec:** `docs/superpowers/specs/2026-10-11-daimon-design.md` (§4, §5, §9, §10).

## Global Constraints

- **Privacidad y exclusiones:**
  - FirmeDigital queda fuera de todo. Se excluye cualquier fragmento que contenga (sin distinguir mayúsculas ni acentos) `firme`, `firmedigital`, `firma digital`, `FC5065AB50656CF8` o `172.20.1.101`.
  - Los secretos se reemplazan por `[SECRET_REDACTED]` antes de guardar nada.
  - Los datos personales y los ítems del examen viven en `data/` y `runs/` (en `.gitignore`); nunca en git.
  - Ningún dato privado se envía a servicios externos (DeepSeek, APIs, etc.). Solo Ollama local.
- **Presupuesto y estimación de tokens:**
  - Presupuesto de contexto por defecto: **1500 tokens**, idéntico para todas las variantes.
  - Estimación de tokens: `ceil(len(text)/4)`, la misma función para todo (`daimon.tokens.count`).
- **Generación y división del examen:**
  - Respuesta del modelo: temperatura 0, `think: false`, máximo 256 tokens de salida.
  - Examen oculto: el 30 % de los ítems, elegidos de forma estable por `sha256(item_id) % 10 < 3`. Nunca se usan para entrenar ni ajustar.
- **Criterio de éxito F1 (spec §9):** cualquiera de estas dos, siempre que la variante Daimon no empeore frente a la IA sola en más del 5 % de los ítems:
  - Daimon supera a la mejor línea base con IC 95 % *bootstrap* sin solapamiento.
  - O empata en acierto usando ≥30 % menos tokens.
- **Commits:** autor `Shiuglen` (config global), con la línea final `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Sin push.

## Review Focus

1. **Secretos en transcripciones.** Claves `sk-ant-…`, `sk-…`, `ghp_…`, `AKIA…`, «password/contraseña: …», tokens Bearer. Deben quedar redactados en el almacén, en los contextos y en los informes (test en Task 1).
2. **FirmeDigital escrito de otras formas.** «Firmé», «firma-digital», la ruta de Windows o la IP del servidor. Se excluye el fragmento entero, también en la variante `.md`, cuyas líneas se filtran igual (tests en Task 1 y Task 5).
3. **Consulta sin memoria relevante o almacén vacío.** `compose` devuelve un contexto vacío válido sin lanzar excepciones, y la respuesta se juzga igual (tests en Task 4 y Task 6).
4. **Un fragmento más largo que el presupuesto.** El empaquetado nunca supera el presupuesto: se recorta o se salta (test en Task 6).
5. **Ollama caído o lento a mitad de la corrida.**
   - Reintentos con espera.
   - Si falla, el ítem queda marcado como `error` (no como 0).
   - La corrida se reanuda desde la caché en disco sin repetir lo hecho (test en Task 7 y Task 9).

---

### Task 1: Esqueleto del paquete + Sistema inmune (redacción y exclusión)

**Files:**
- Create: `pyproject.toml`, `daimon/__init__.py`, `daimon/tokens.py`, `daimon/immune.py`
- Test: `tests/test_immune.py`, `tests/test_tokens.py`

**Interfaces:**
- Produces:
  - `daimon.tokens.count(text: str) -> int`
  - `daimon.immune.redact(text: str) -> str`
  - `daimon.immune.is_excluded(text: str) -> bool`
  - `daimon.immune.clean(text: str) -> str | None`: devuelve `None` si el fragmento está excluido y, si no, el texto redactado.
  - `daimon.immune.TRUST: dict[str, float]` = `{"user": 1.0, "file": 0.8, "ai_verified": 0.6, "ai": 0.4, "web": 0.2}`

- [ ] **Step 1: Escribir los tests que fallan**
  - `test_redacta_claves`: `redact("key sk-ant-api03-AbCdEf1234567890xyz y ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789")` no contiene `sk-ant` ni `ghp_` y contiene `[SECRET_REDACTED]` dos veces.
  - `test_redacta_password`: `"password: hunter2!"` y `"contraseña = Clave.123"` quedan sin el valor.
  - `test_excluye_firme`: `is_excluded` es True para `"Proyecto FirmeDigital"`, `"la firma digital"`, `"FIRMÉ el deploy"`, `"/run/media/sakai/FC5065AB50656CF8/x"` y `"ssh 172.20.1.101"`; es False para `"Daimon memoria"`.
  - `test_clean`: devuelve `None` para un texto excluido y el texto redactado en otro caso.
  - `test_tokens`: `count("abcd"*10) == 10`, `count("") == 0`.
- [ ] **Step 2:** `cd ~/Daimon && .venv/bin/pytest tests/test_immune.py tests/test_tokens.py -q` → FAIL (módulos inexistentes).
- [ ] **Step 3: Implementar**
  - Crear el venv: `python3 -m venv .venv && .venv/bin/pip install numpy model2vec pytest mcp`.
  - Exclusión: normalizar con `unicodedata` (NFKD, sin marcas) y pasar a minúsculas antes de buscar los patrones.
  - Redacción: patrones regex para `sk-ant-…`, `sk-[A-Za-z0-9]{20,}`, `ghp_/gho_/github_pat_`, `AKIA[0-9A-Z]{16}`, `Bearer \S{20,}`, JWT `eyJ…\.…\.…`, y `(password|passwd|contraseña|clave|token|secret)\s*[:=]\s*\S+`.
- [ ] **Step 4:** mismo comando → PASS.
- [ ] **Step 5:** commit `feat: esqueleto + sistema inmune (redacción y exclusión)`.

### Task 2: Ingesta con procedencia

**Files:**
- Create: `daimon/ingest.py`
- Test: `tests/test_ingest.py` (fixtures en `tests/fixtures/`: un `.md` pequeño y un `.jsonl` con el formato de Claude Code)

**Interfaces:**
- Consumes: `immune.clean`, `immune.TRUST`, `tokens.count`.
- Produces:
  - `@dataclass Event(id: str, text: str, source: str, kind: str, ts: str, trust: float, compartment: str, parent: str | None)`
    - `id` = `sha1(source + ":" + str(offset))[:16]`.
    - `kind` ∈ {`note`, `doc`, `user_msg`, `ai_msg`}.
  - `chunk(text: str, max_words: int = 160, overlap: int = 30) -> list[str]`
  - `from_markdown(path: Path, kind: str = "note") -> list[Event]`
  - `from_claude_jsonl(path: Path) -> list[Event]`: mensajes de usuario de texto (`type=="user"`, contenido `str` que no empieza por `<`) como `user_msg` con confianza `user`. Bloques de texto del asistente como `ai_msg` con confianza `ai`. Ignora herramientas, adjuntos y `isSidechain==True`.
  - `collect(sources: list[Path]) -> list[Event]`: recorre los `.md` y `.jsonl`, aplica `clean` (descarta lo excluido) y deduplica por texto normalizado.

- [ ] **Step 1: Tests que fallan**
  - `test_chunk_respeta_tamano`: ningún trozo pasa de 160 palabras y el solape es de 30.
  - `test_markdown_eventos`: un fixture de 2 secciones genera ≥1 evento con `source` = ruta y `kind=="note"`.
  - `test_jsonl_usuario_y_ia`: el fixture con 1 usuario, 1 asistente, 1 herramienta y 1 sidechain da exactamente 1 `user_msg` y 1 `ai_msg`.
  - `test_collect_excluye_y_redacta`: un fixture que menciona FirmeDigital no aparece y una clave queda redactada.
- [ ] **Step 2:** `pytest tests/test_ingest.py -q` → FAIL.
- [ ] **Step 3:** implementar según las interfaces. El campo `ts` sale del `timestamp` del jsonl o del `mtime` del fichero, en ISO 8601.
- [ ] **Step 4:** → PASS.
- [ ] **Step 5:** commit `feat: ingesta con procedencia`.

### Task 3: Lente (codificador + adaptador personal)

**Files:**
- Create: `daimon/lens.py`
- Test: `tests/test_lens.py`

**Interfaces:**
- Produces:
  - `class Lens(encoder: Callable[[list[str]], np.ndarray], dim: int, W: np.ndarray | None = None)`.
    - `.encode(texts) -> np.ndarray`: float32 normalizado L2. Si hay `W`, aplica `x + x @ W` (adaptador residual) y renormaliza.
    - `.train_adapter(pairs: list[tuple[str, str]], epochs: int = 30, lr: float = 0.05, tau: float = 0.05, l2: float = 1e-3) -> float`: InfoNCE en lotes con negativos del propio lote, gradiente analítico en numpy. Devuelve la pérdida final.
    - `.save(path)` / `Lens.load(path, encoder)`.
  - `def model2vec_encoder(name: str = "minishlab/potion-multilingual-128M") -> tuple[Callable, int]`

- [ ] **Step 1: Tests que fallan** (con un codificador falso determinista de dimensión 16 basado en hashing de palabras)
  - `test_normalizado`: las normas son ≈1.
  - `test_adaptador_acerca_pares`: tras `train_adapter` con 40 pares sinónimos artificiales, la similitud media de los pares sube y la pérdida baja respecto a la época 1.
  - `test_guardar_cargar`: `encode` coincide tras `save` y `load`.
- [ ] **Step 2:** → FAIL.
- [ ] **Step 3:** implementar. `W` se inicializa en ceros, de modo que sin entrenar equivale a la identidad.
- [ ] **Step 4:** → PASS.
- [ ] **Step 5:** commit `feat: lente con adaptador personal`.

### Task 4: Hipocampo (almacén, recuerdo multi-salto, dependencias, desaprendizaje)

**Files:**
- Create: `daimon/hippocampus.py`
- Test: `tests/test_hippocampus.py`

**Interfaces:**
- Consumes: `Event`, `Lens`.
- Produces:
  - `class Hippocampus(db_path: Path, lens: Lens)`
  - `.store(events: list[Event]) -> int`: inserta en SQLite (`events`, más la tabla `deps(child, parent)`) y añade los vectores a una matriz en memoria persistida en `vectors.npy` junto al `.db`. Devuelve los nuevos.
  - `.recall(query: str, k: int = 20, hops: int = 2, beta: float = 20.0) -> list[Hit]`
    - `@dataclass Hit(event: Event, score: float, hop: int)`
    - Salto 0: similitud coseno.
    - Salto h: `q ← normalize(q + 0.5 * softmax(beta * sims_topk) @ V_topk)`.
    - Se une todo, quedándose con el mejor score por id.
  - `.link(child_id: str, parent_id: str) -> None`
  - `.forget(event_id: str) -> dict`: borra el evento y, transitivamente, a sus descendientes en `deps`. Los añade a la tabla `blocklist` para que una reingesta no los reviva. Devuelve el certificado `{"forgotten": [ids], "sha256": hash_de_la_lista, "ts": iso}`.
  - `.get(event_id) -> Event | None`
  - `.__len__()`

- [ ] **Step 1: Tests que fallan**
  - `test_store_y_recall`: tras guardar 3 eventos, el más parecido a la consulta sale primero.
  - `test_recall_vacio`: con el almacén vacío, `recall` devuelve `[]`.
  - `test_multisalto`: la cadena A–B–C de vecinos semánticos con el codificador falso hace que `hops=2` recupere C para una consulta parecida a A, y `hops=0` no.
  - `test_forget_cascada`: con `link(B, A)` y `link(C, B)`, `forget(A)` borra A, B y C; el certificado lista los 3 y re-`store` de A no lo reinserta.
  - `test_persistencia`: reabrir el `.db` conserva los eventos y los vectores.
- [ ] **Step 2:** → FAIL.
- [ ] **Step 3:** implementar.
- [ ] **Step 4:** → PASS.
- [ ] **Step 5:** commit `feat: hipocampo con multisalto y desaprendizaje certificado`.

### Task 5: Léxico (BM25) y constructores de contexto de las líneas base

**Files:**
- Create: `daimon/lexical.py`, `daimon/baselines.py`
- Test: `tests/test_baselines.py`

**Interfaces:**
- Consumes: `Event`, `Hippocampus`, `tokens.count`, `immune.clean`.
- Produces:
  - `class BM25(events: list[Event], k1=1.5, b=0.75)` con `.search(query, k) -> list[tuple[Event, float]]`. Tokenizador: minúsculas, sin acentos, `\w+`, stopwords españolas e inglesas mínimas.
  - `pack(texts: list[str], budget: int) -> tuple[str, int]`: concatena con `\n---\n`, salta lo que no cabe y recorta el último trozo si sobra hueco ≥50 tokens. Nunca supera el presupuesto.
  - Constructores `(query: str, budget: int) -> tuple[str, int]`:
    - `ctx_none`: devuelve `("", 0)`.
    - `make_ctx_md(md_paths)`: concatena los .md filtrados línea a línea con `immune.clean`.
    - `make_ctx_bm25(bm25)`.
    - `make_ctx_dense(hippo)`: top-k con `hops=0`.
    - `make_ctx_long(events)`: los más recientes por `ts` hasta llenar.

- [ ] **Step 1: Tests que fallan**
  - `test_pack_no_excede` con un texto de 10 000 caracteres y `budget=100`.
  - `test_bm25_acentos`: «decisión» encuentra «decision».
  - `test_md_filtra_firme`: un .md con una línea sobre FirmeDigital no la incluye.
  - `test_ctx_none`.
- [ ] **Step 2:** → FAIL.
- [ ] **Step 3:** implementar.
- [ ] **Step 4:** → PASS.
- [ ] **Step 5:** commit `feat: BM25 y líneas base`.

### Task 6: Tálamo (ranker aprendido + empaquetado + bandido)

**Files:**
- Create: `daimon/thalamus.py`
- Test: `tests/test_thalamus.py`

**Interfaces:**
- Consumes: `Hippocampus.recall`, `BM25.search`, `pack`, `Event.trust`, `Event.ts`, `Event.kind`.
- Produces:
  - `features(query: str, cand: Event, dense: float, bm25: float, hop: int, now: datetime) -> np.ndarray`, con 10 dimensiones:
    1. `dense`
    2. `bm25` normalizado por el máximo de la consulta
    3. `hop`
    4. `trust`
    5. recencia `exp(-días/90)`
    6. `kind`=`note` (one-hot)
    7. `kind`=`doc` (one-hot)
    8. `kind`=`user_msg` (one-hot)
    9. `kind`=`ai_msg` (one-hot)
    10. `log1p(tokens)/8`
  - `class Thalamus(hippo, bm25, w: np.ndarray | None = None)`
    - `.candidates(query, k=40) -> list[tuple[Event, np.ndarray]]`: unión de denso (con `hops=2`) y BM25.
    - `.compose(query, budget) -> tuple[str, int, list[str]]`: puntúa `features @ w`, aplica MMR (λ=0.7, con los vectores de la Lente) y empaqueta. Devuelve texto, tokens e ids incluidos.
    - `.fit(examples: list[tuple[str, set[str]]], epochs=200, lr=0.1) -> float`: regresión logística por pares; positivos = ids de evidencia oro de cada pregunta.
    - `.feedback(ids: list[str], reward: float, query: str) -> None`: actualización online SGD sobre `w` (bandido con exploración ε=0.05 en `compose` si `explore=True`).
    - `.save(path)` / `.load(path)`.
  - `w` por defecto: `[1, 0.6, -0.1, 0.2, 0.1, 0, 0, 0.05, 0, -0.05]` (heurística inicial antes de entrenar).

- [ ] **Step 1: Tests que fallan**
  - `test_compose_vacio`: el almacén vacío devuelve `("", 0, [])`.
  - `test_compose_respeta_presupuesto`.
  - `test_fit_sube_oro`: en un mini-corpus sintético donde el oro siempre es `kind=="note"`, tras `fit` el oro queda en el top-3 en ≥80 % de las preguntas de test.
  - `test_feedback_mueve_pesos`.
- [ ] **Step 2:** → FAIL.
- [ ] **Step 3:** implementar.
- [ ] **Step 4:** → PASS.
- [ ] **Step 5:** commit `feat: tálamo con ranker aprendido`.

### Task 7: Profesores (cliente Ollama) + registro

**Files:**
- Create: `daimon/teachers.py`, `daimon/ledger.py`
- Test: `tests/test_teachers.py`

**Interfaces:**
- Produces:
  - `class Ollama(model: str, host="http://127.0.0.1:11434", timeout=180, retries=3)` con `.answer(system: str, prompt: str, max_tokens=256) -> str`.
    - Petición `POST /api/chat` con `stream=false`, `think=false` y `options={temperature:0, num_predict:max_tokens}`.
    - Elimina cualquier bloque `<think>…</think>` residual.
    - Espera exponencial entre reintentos; tras los reintentos lanza `TeacherError`.
  - `ledger.append(path: Path, record: dict) -> None`: JSONL *append-only* con `ts`.

- [ ] **Step 1: Tests que fallan** (servidor HTTP falso con `http.server` en un hilo)
  - `test_answer_ok`.
  - `test_quita_think`.
  - `test_reintenta_y_falla`: un servidor que devuelve 500 provoca `TeacherError` tras 3 intentos.
  - `test_ledger_append`.
- [ ] **Step 2:** → FAIL.
- [ ] **Step 3:** implementar con `urllib.request` (sin dependencias nuevas).
- [ ] **Step 4:** → PASS.
- [ ] **Step 5:** commit `feat: profesor Ollama y registro`.

### Task 8: Examen — formato, validación, división y minado de preguntas reales

**Files:**
- Create: `daimon/bench/__init__.py`, `daimon/bench/items.py`
- Test: `tests/test_items.py`

**Interfaces:**
- Produces:
  - `@dataclass Item(id: str, question: str, gold: str, key_facts: list[str], evidence: list[str], type: str, origin: str, validated: bool = False)`
    - `type` ∈ {`hecho`, `porque`, `preferencia`, `multisalto`, `temporal`, `obsoleta`}
    - `origin` ∈ {`real`, `generada`}
  - `load(path) -> list[Item]`, `save(items, path)`
  - `validate(item) -> list[str]`: lista de problemas: pregunta vacía, oro vacío, `key_facts` vacía, contenido excluido o secretos.
  - `is_hidden(item_id: str) -> bool`: `int(sha256(id).hexdigest(), 16) % 10 < 3`.
  - `mine_user_questions(jsonl_paths) -> list[dict]`: candidatos `{question, followup_ai_text, source, ts}`.
    - La pregunta termina en `?` o empieza por un interrogativo (qué, cómo, por qué, cuál, cuánto, dónde, cuándo, quién, what, how, why…).
    - Longitud entre 15 y 400 caracteres; pasa `immune.clean`.

- [ ] **Step 1: Tests que fallan**
  - `test_hidden_estable_y_30pct`: sobre 1000 ids, la fracción está entre 0,25 y 0,35 y es estable entre llamadas.
  - `test_validate_detecta_firme`.
  - `test_mine` sobre el fixture jsonl.
- [ ] **Step 2:** → FAIL.
- [ ] **Step 3:** implementar.
- [ ] **Step 4:** → PASS.
- [ ] **Step 5:** commit `feat: formato y minado del examen`.

### Task 9: Corredor de la Prueba 0, juez, métricas e informe

**Files:**
- Create: `daimon/bench/run.py`, `daimon/bench/judge.py`, `daimon/bench/metrics.py`, `daimon/bench/report.py`
- Test: `tests/test_bench.py`

**Interfaces:**
- Consumes: `Item`, constructores de contexto (Task 5), `Thalamus.compose`, `Ollama.answer`, `ledger.append`.
- Produces:
  - `run(items, variants: dict[str, Callable[[str,int], tuple[str,int]]], answerer, budget, cache_path) -> list[dict]`
    - Cada fila: `{item_id, variant, context_tokens, answer, latency_s, status}`.
    - `status` ∈ {`ok`, `error`}.
    - Caché JSONL por `(item_id, variant)` para reanudar.
  - `SYSTEM_ANSWER` (texto fijo): «Eres un asistente. Responde en español, breve y preciso. Usa el CONTEXTO si es relevante; si no sabes, di "No lo sé".»
  - `judge(item, answer, judge_model) -> float` ∈ {0, 0.5, 1}:
    - Rúbrica fija que compara con el oro y los hechos clave.
    - Parsea la primera cifra válida y, si no hay, devuelve 0.
    - También `fact_recall(item, answer) -> float`: fracción de `key_facts` presentes tras normalizar (sin acentos, minúsculas, tokens ≥3 letras; un hecho cuenta si ≥60 % de sus tokens aparecen).
  - `bootstrap_ci(values, n=2000, seed=0) -> tuple[float,float,float]`: media, límite inferior y superior al 95 %.
  - `worse_rate(a: dict[id,float], base: dict[id,float]) -> float`
  - `report(rows, items, out_md: Path) -> dict`: tabla por variante con acierto (IC), recuerdo de hechos, tokens medios, latencia y % peor que la IA sola; separada en «visible» y «oculto»; veredicto del criterio de éxito.

- [ ] **Step 1: Tests que fallan**
  - `test_cache_reanuda`: al relanzar, el respondedor falso no se llama de nuevo para lo ya hecho.
  - `test_error_no_cuenta_como_cero`: las filas `error` quedan excluidas de la media y contadas aparte.
  - `test_bootstrap_ic`: con valores constantes 1, el IC es (1, 1, 1).
  - `test_fact_recall`.
  - `test_veredicto`: un caso sintético que gana y otro que no.
- [ ] **Step 2:** → FAIL.
- [ ] **Step 3:** implementar.
- [ ] **Step 4:** → PASS.
- [ ] **Step 5:** commit `feat: corredor, juez, métricas e informe de la Prueba 0`.

### Task 10: Puerta MCP para Claude Code («adiós a los .md») + CLI

**Files:**
- Create: `daimon/gate.py`, `daimon/cli.py` (punto de entrada `daimon` en `pyproject.toml`)
- Test: `tests/test_gate.py`

**Interfaces:**
- Consumes: `Hippocampus`, `Thalamus`, `ingest.collect`.
- Produces:
  - Servidor FastMCP `daimon` con 3 herramientas:
    - `recall(query: str, budget: int = 1500) -> str`: contexto compuesto por el Tálamo, con los ids citados al final.
    - `remember(text: str, kind: str = "note") -> str`: pasa `immune.clean` y `store` con confianza `user` y devuelve el id o el motivo de rechazo.
    - `feedback(ids: list[str], useful: bool, query: str) -> str`: llama a `Thalamus.feedback`.
  - CLI:
    - `daimon ingest --sources ... --home data/`
    - `daimon bench mine|run|report`
    - `daimon serve-mcp --home data/`
  - Las funciones de las herramientas son llamables directamente para testearlas sin transporte.

- [ ] **Step 1: Tests que fallan**
  - `test_remember_y_recall` sobre un hogar temporal con el codificador falso.
  - `test_remember_rechaza_firme`.
  - `test_feedback_ok`.
- [ ] **Step 2:** → FAIL.
- [ ] **Step 3:** implementar.
- [ ] **Step 4:** → PASS, más `pytest -q` completo en verde.
- [ ] **Step 5:** commit `feat: puerta MCP y CLI`.

### Task 11: Ejecutar la Prueba 0 con los datos reales (operativo)

Nada de código nuevo salvo arreglos que salgan de aquí, cada uno con su test.

- [ ] **Step 1: Ingesta real.**
  - Fuentes: `~/Documentos/Obsidian`, `~/Sakoi/docs`, `~/Sakoi/README.md`, `~/Ingresos/**/*.md` (sin `node_modules` ni `dist`), `~/.local/share/sakoi-research/**/*.md`, y las transcripciones principales de `~/.claude/projects/*/*.jsonl` (no subagentes).
  - Hogar: `data/`.
  - Comprobar con `grep -ril` sobre la base y los vectores de texto que no hay ninguna aparición de los patrones de exclusión ni de secretos.
- [ ] **Step 2: Construir el examen.**
  - Minado de preguntas reales.
  - Generación de ítems con subagentes Claude (privado del usuario, dentro de su propio Claude; nunca DeepSeek): reciben fragmentos de `data/` y escriben ítems en el formato de Task 8, con `evidence` igual a los ids de los fragmentos.
  - Tipos: los 6 de Task 8. Objetivo: 150 ítems, ≥40 de origen `real`.
  - `validate` sobre todos y descartar los que fallen.
  - Exportar `data/bench/validar.csv` para que el usuario valide el «oro».
- [ ] **Step 3: Juez.**
  - Intentar `ollama pull gemma3:4b` (otra familia).
  - Si falla o no hay disco suficiente (se necesitan ≥5 GB libres), el juez es el mismo Qwen y se anota como limitación en el informe.
- [ ] **Step 4: Entrenar.**
  - El Tálamo se entrena con `fit` sobre los ítems **visibles** con evidencia.
  - El adaptador de la Lente se entrena con pares (pregunta del usuario → respuesta siguiente de la IA) de las transcripciones, excluyendo las fuentes de ítems ocultos.
- [ ] **Step 5: Correr las 6 variantes.**
  - Variantes: `ia_sola`, `md`, `bm25`, `rag_denso`, `contexto_largo`, `daimon`.
  - Ablaciones: `daimon_sin_adaptador`, `daimon_sin_entrenar`.
  - Presupuesto 1500. Generar `docs/resultados/2026-10-12-prueba0.md` (solo agregados; sin textos privados).
- [ ] **Step 6: Iterar honestamente sobre el split visible.**
  - Si Daimon no cumple el criterio, diagnosticar sobre el split **visible** (recall de evidencia, tipos que fallan) y mejorar. Ideas: cabezas del Tálamo, saltos, MMR.
  - Volver a medir **una sola vez** sobre el oculto al final.
  - Registrar todas las corridas en el informe, incluidas las que no ganan.
- [ ] **Step 7:** commit del informe y de los arreglos. Actualizar la especificación §13 con lo aprendido.
