# Sin límites: lo que se ha quitado de la mente de Esme (2026-10-20)

> Taller `qxntxkie`. Encargo: «recuerda eliminar cualquier cosa que limite hacer algo y también
> elimínalo de esme ya que esto debe ser lo mejor».
> Rama: `esme/qxntxkie`. **Nada de esto se ha conectado todavía a la app en marcha**: son cambios
> en la copia, con sus pruebas.

## 0. La regla que se aplicó

El creador lo dijo dos veces: *«elimina limitaciones»* y *«cambiar todo esto ya que es malísimo»*.
Eso se aplicó con una regla operativa, para no confundir «limitación» con «seguridad»:

| Tipo de límite | Qué es | Qué se hizo |
|---|---|---|
| **De recurso** | topes de memoria, tokens, tamaño de fichero, número de elementos | **Fuera** o **configurable y generoso**. El presupuesto es una petición de quien llama, nunca una decisión del servidor. |
| **De seguridad** | token de acceso, lista de hosts, `Origin`, redacción de secretos, exclusión de contenido | **Intactos, a propósito.** No son limitaciones: son la palabra de que Esme es local y fiable. |
| **De política** | no clonar apps de terceros, no escribir fuera de la copia | **Intactos.** Son decisiones del creador, no restos. |

## 1. Lo que se ha quitado (el cerebro, `daimon/`)

| # | Limitación | Antes | Ahora | Prueba |
|---|---|---|---|---|
| 1 | **La puerta se cerraba** | `min_dense` hacía que `recall` devolviera **vacío**: el agente se quedaba parado sin saber por qué | devuelve lo mejor que hay y lo marca `[contexto débil: …]`. La opción sigue existiendo, pero ya no bloquea | `tests/test_thalamus.py::test_no_se_abstiene_ante_pregunta_ajena` |
| 2 | **Los recuerdos se olvidaban solos** | la recencia caía con vida media de **90 días** (a los ~276 días pesaba 0,05) | vida media de **3650 días** y configurable (`recencia_dias`): lo viejo se atenúa, no se amputa | `daimon/thalamus.py` (`features`, `Thalamus.__init__`) |
| 3 | **Lo aprendido moría al reiniciar** | el feedback sólo valía si recall y feedback-passaban en el **mismo proceso**: al cerrar la app se perdía la lección de cada IA | las consultas compuestas se guardan en `ultimas.json` y se recuperan al arrancar: **el feedback sobrevive al reinicio** | `tests/test_thalamus.py::test_el_feedback_sobrevive_al_reinicio` |
| 4 | **El contexto se cortaba a media palabra** | `pack()` recortaba a caracteres crudos y la garantía dura quitaba **de cuatro en cuatro** | recorta **al final de una palabra** y marca con «…»; nunca se parte una palabra | `tests/test_baselines.py::test_pack_no_corta_palabras_por_la_mitad` |
| 5 | **Tope de 60 recuerdos** | `while left and len(chosen) < 60` | **no hay tope**: manda el presupuesto (y `budget=0` = sin límite) | `tests/test_thalamus.py::test_el_presupuesto_manda_y_no_hay_tope_de_60` |
| 6 | **Presupuesto fijo de 1500 tokens** | el MCP pedía 1500 y no había cómo pedir más sin calling interno | `budget` en la herramienta MCP: `0` = el de la mente, y el de la mente es configurable (`presupuesto`, por defecto **4000**); `0` en config = **sin límite** | `tests/test_gate.py::test_recall_toma_el_presupuesto_de_la_mente` |
| 7 | **Los recuerdos truncados desaparecían sin aviso** | los ids citados eran sólo los que sobrevivían al recorte | se citan **los que entraron de verdad** (`pack` devuelve `incluidos`) | `daimon/thalamus.py::compose` |
| 8 | **El tipo de un recuerdo se perdía** | `kind` fuera de los cuatro conocidos se forzaba a `note` | se guarda **tal cual** (`decision`, `preferencia`, lo que sea) | `tests/test_gate.py::test_remember_conserva_el_tipo` |
| 9 | **La memoria se llenaba de gemelos** | el id era el hash del texto **exacto**: la misma frase con otros espacios creaba un recuerdo nuevo | id por **contenido normalizado** (igual que la ingesta): la misma idea no se guarda dos veces | `tests/test_gate.py::test_remember_no_duplica_variantes` |
| 10 | **Esme sólo aprendía de `.md` y `.jsonl`** | el código, la configuración, los datos y el texto del usuario eran **invisibles** para la mente | **26 formatos** (`.py .ts .tsx .js .json .toml .yaml .yml .csv .sql .sh .txt .rst .org .html .css .ipynb …`), con salto de lo que pase de 2 MiB | `tests/test_ingest.py` |
| 11 | **Una nota con un fragmento excluido se tiraba entera** | un solo trozo prohibido descartaba **toda** la nota | cae **sólo** el fragmento culpable; el resto entra | `tests/test_ingest.py` |
| 12 | **Pocos candidatos** | `k=40` candidatos, `recall(k=20, hops=2)` | `k=120`, `recall(k=60, hops=3)`: más vecinos de la red neuronal llegan al tálamo | `tests/test_hippocampus.py` |
| 13 | **La lente cortaba a 2048 tokens** | `max_tokens=2048` fijo | hasta **8192**, recortado a la ventana que declara el modelo (`max_position_embeddings`) y con red de seguridad | `tests/test_lens.py` |
| 14 | **Pocas memorias por página** | `/memories` devolvía 20 | **200** | `tests/test_server.py` |
| 15 | **La voz se cortaba** | texto de voz a 4000 caracteres; audio > 3 min → 413 | **20 000 caracteres**; audio hasta **15 minutos** (la guarda sigue viva: a 16 min, 413) | `tests/test_server.py`, `tests/test_voz.py` |
| 16 | **Se olvidaban los eventos en vivo** | historial SSE de 200 | **2000** | `tests/test_server.py` |

## 2. Lo que se ha quitado (el cableado, `app/`)

| # | Limitación | Antes | Ahora | Prueba |
|---|---|---|---|---|
| 17 | **La memoria no llegaba a OpenCode por su configuración** | Esme escribía `mcp.esme`: la forma **plana**, que el esquema de OpenCode marca como *deprecada* (`additionalProperties` con `"deprecated": true`) | se escribe en **`mcp.servers.esme`** (la forma moderna del esquema) y, al conectar, se **retira** la plana que hubiera quedado de antes | `app/src/main/mente/compartir.test.ts` (9 pruebas) |

> **Por qué esto es el más caro de todos:** sin esto, la memoria de Esme llega a las sesiones que
> abre la app (por ACP, `sesion-acp.ts`) pero **no** a un OpenCode que abras tú a mano. Y cuando
> OpenCode retire la forma plana, deja de llegar del todo. Una línea de configuración; el fallo más
> caro del producto.

## 3. Lo que NO se ha tocado (y por qué)

- **Seguridad:** el token `Bearer`, la lista de hosts (`127.0.0.1`/`localhost`), la comprobación de
  `Origin`, la redacción de secretos (`[SECRET_REDACTED]`) y la lista de exclusión (`immune.py`)
  siguen exactamente como estaban. Sin ellos, «Esme es local y seguro» sería falso.
- **`chunk` a 160 palabras**, la deduplicación por texto normalizado, `tokens_por_lote=2048` y
  `cache=4096` de la lente: son memoria y velocidad, no topes de aprendizaje.
- **El modo «una sola sesión» del Taller**: es una decisión del creador (17-oct), no un resto.

## 4. Cómo se ha comprobado

```
daimon (Python):  136 pruebas en verde   (antes: 120)
app (TypeScript): 644 pruebas en verde   (104 ficheros)
typecheck:        tsc --noEmit sin errores
```

Y el examen de verdad (el del creador) está **pendiente de medir**: este cambio toca el contexto que
recibe la IA, así que hay que volver a pasar `daimon/bench/` contra `rag_denso_eg` antes de darlo
por bueno. **Si el número no mejora, esto no entra** — es la regla madre.

## 5. Lo que queda abierto (propuesta, no hecho)

1. **Medir el examen** con el contexto nuevo (esto es lo primero: sin número, esto es unaopinion).
2. **`/recall` por HTTP** sigue con su presupuesto por defecto viejo (1500): debe leer el de la mente.
3. **La Herencia**: que todo motor nuevo arranque con la sesión de la mente, sin pedirla.
4. El **informe de equivalencia económica** (lo que Esme sustituye por 0 €).
