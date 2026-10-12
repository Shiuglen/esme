# Daimon — especificación de diseño

- **Fecha:** 2026-10-11
- **Estado:** borrador para revisión del usuario.
- **Nombre:** «Daimon» es el nombre en clave. El nombre comercial se decide antes del lanzamiento. Reglas: nada con «ai», que sea propio y sofisticado, y comprobado por RDAP y en registros de marcas.
- **Fuentes de esta especificación:** las conversaciones de diseño del 2026-10-11, más el registro de decisiones e investigación en `~/.local/share/sakoi-research/v2/00-hallazgos.md`.

---

## 0. Resumen en una página

Daimon no es otro agente. Es un **sistema cognitivo con red neuronal propia** que envuelve a *cualquier* IA (Claude, GPT, Gemini, DeepSeek, Qwen local…) y la hace rendir más.

Las IAs ponen el lenguaje y el conocimiento general. Daimon pone lo que les falta:
- memoria que crece y se puede borrar de verdad;
- atención aprendida (qué contexto darle a cada IA y cuánto);
- saber cuándo duda y cuándo verificar;
- conocer a cada modelo y a cada persona;
- aprender de los resultados mientras el usuario trabaja y mientras el PC está ocioso.

**Regla de oro.** Toda mejora se mide contra un examen con tareas reales del usuario. Si el número no mejora, la mejora no entra.

**Cuña de producto y primeros ingresos.** «Adiós a los .md»: Daimon sustituye los ficheros de memoria estáticos (CLAUDE.md, AGENTS.md, memorias) de los agentes de código por contexto vivo y medido. Se vende a desarrolladores en cuanto la Prueba 0 demuestre la mejora. El resto de la super app se construye sobre ese núcleo.

---

## 1. Principios (no negociables)

1. **Superior a un agente.** Un agente espera órdenes y olvida. Daimon recuerda, aprende, se anticipa y sabe cuándo no sabe.
2. **Medir antes de creer.** Cada pieza tiene un experimento con su métrica antes de darse por buena, y la Prueba 0 va primero.
3. **Paso a paso.** Una pieza cada vez: diseño, prueba, medición y aprobación del usuario.
4. **Nunca romper el PC.** La red es el proceso más ligero del equipo. Aprende cuando el PC está ocioso y se aparta cuando el usuario lo necesita.
5. **Privado por diseño.** Los datos viven en el equipo del usuario, el Alma está cifrada con la llave del usuario y nada sale sin permiso.
6. **Nunca perder nada.** Nada se sobrescribe: se versiona. Las ideas descartadas quedan registradas.
7. **Agnóstico de modelos y de proveedores.** Ninguna pieza externa es imprescindible.
8. **Honestidad.** Se separan hechos, afirmaciones de terceros e hipótesis. No se inventan cifras.
9. **La belleza sigue a la sustancia.** La parte visual muestra la red real y se diseña después de que la red funcione.
10. **El proyecto de la empresa del creador queda fuera de todo (nombre en la configuración global del agente)**: datos, ejemplos, pruebas y documentación.

---

## 2. Descomposición en subproyectos (hoja de ruta viva)

Cada fase tiene su propia especificación detallada, su plan y su implementación. **Esta especificación fija la arquitectura completa y detalla las fases 0 y 1.**

| Fase | Subproyecto | Entregable medible |
|---|---|---|
| **F0** | Banco de evaluación (Prueba 0) | 100–200 tareas reales con respuestas validadas; líneas base medidas |
| **F1** | «Me conoce»: Hipocampo + Lente personal + Tálamo + conector Claude Code (adiós .md) | Supera a todas las líneas base de la Prueba 0 con igual o menor presupuesto de tokens |
| F2 | Investiga gratis por mí: reflejos y herramientas propias sin tokens + Curiosidad | Informe diario útil con menos del 5 % de tokens frente a hacerlo con la IA |
| F3 | Teoría de la mente de las IAs: perfiles, selector, cambio en caliente («nunca más límites») | El enrutado aprendido supera al modelo fijo en acierto/coste; el cambio de modelo a mitad de tarea no pierde contexto |
| F4 | Prefrontal: incertidumbre, verificación, Parlamento | Calibración (ECE); menos errores sin pedir verificación en todo |
| F5 | Corteza (lóbulos) + Sueño + desaprendizaje con certificado | Aprende hechos nuevos con olvido mínimo; el borrado se verifica |
| F6 | Modelo del usuario, Saliencia, Historia del pensamiento, Simulador de ti | El simulador predice qué acepta el usuario mejor que el azar y que la línea base |
| F7 | Taller: auto-mejora segura (modo sombra, examen oculto, evolución acotada) | Las mejoras ganan en el examen oculto; cero regresiones promovidas |
| F8 | Profesores completos y tienda con escudo (modelos, MCP, skills; «¿cabe en tu PC?») | Instalación segura, verificada y con permisos |
| F9 | Ventana (super app) y Puertas (voz, móvil, WhatsApp, Telegram, pop-ups) | La interfaz muestra la red real; menos de 100 ms por interacción |
| F10 | Colaboradores y servicio: red general + delta personal, federado, tienda de lóbulos, enjambre, cobro | Primeros clientes de pago; privacidad verificable |

---

## 3. Arquitectura: las 10 partes

```
 Puertas ──► ┌────────────────────── Mente (un solo tejido) ──────────────────────┐
 (app, CLI,  │ Lente personal → Hipocampo ⇄ Corteza(lóbulos) → Tálamo → Prefrontal │ ──► Profesores
  MCP, voz,  │        ▲              ▲  Sistema inmune (procedencia, confianza)    │     (cualquier IA)
  móvil…)    └────────┼──────────────┼──────────────────────────────────────────────┘
                      │              │
             Propósito (metas, tiempo, compromisos)      Manos (ordenador aislado, herramientas)
             Taller (sueño, exámenes, evolución)         Cuerpo (gobernador, nube elástica)
             Alma (cifrado, versiones, respaldo)         Ventana (super app, Red visible)
```

| Parte | Responsabilidad | Depende de |
|---|---|---|
| **Puertas** | Todas las entradas y salidas (super app, Claude Code vía MCP/hooks, CLI, después voz, móvil y mensajería). Todas llegan a la misma Mente | Mente |
| **Mente** | Percibir, recordar, generalizar, seleccionar contexto, dudar y responder sola cuando ya sabe | Sistema inmune, Cuerpo |
| **Propósito** | Metas en niveles, tiempo, compromisos, conflictos entre metas, informe al despertar, presupuesto de interrupciones aprendido | Mente |
| **Manos** | Ordenador aislado propio (navegador, terminal, archivos), rebobinado por instantáneas, bóveda de llaves (la mente nunca ve secretos) | Cuerpo, Sistema inmune |
| **Profesores** | Adaptador universal de modelos; selector; tienda con escudo; gestión de negativas (el usuario elige) | Prefrontal |
| **Sistema inmune** | Procedencia y confianza por recuerdo, cuarentena, compartimentos (integridad contextual), desaprendizaje en cascada, vacunas, inmunidad de rebaño | — |
| **Cuerpo** | Gobernador de CPU/GPU/RAM/batería; nube elástica confidencial con tope de gasto; enjambre (más adelante) | — |
| **Taller** | Sueño y siestas, exámenes ocultos, modo sombra, evolución acotada, tubería de ideas (el usuario aprueba) | Mente, Alma |
| **Alma** | Estado de la mente cifrado y versionado (máquina del tiempo), portátil, recuperación social de la llave (Shamir 3-de-5 + frase en papel) | — |
| **Ventana** | Super app; la sección Red muestra la red real en vivo; modos visibles | Todo |

**Un solo tejido.** Comprensión, Imaginación, Curiosidad, Saliencia y Simulador de ti no son programas aparte. Son procesos sobre los mismos almacenes y la misma red, de modo que lo que aprende una pieza lo aprovechan todas.

---

## 4. La Red neuronal (el corazón)

### 4.1 Piezas, técnica elegida y coste

| Pieza | Qué hace | Técnica (estado del arte 2025–2026) | Coste aproximado | Métrica |
|---|---|---|---|---|
| **Lente personal** | Vector de significado de cualquier evento, doblado a la forma de pensar del usuario | Codificador estático multilingüe en CPU (familia Model2Vec, *potion-multilingual*) + **adaptador** contrastivo entrenado con co-uso, correcciones y aceptaciones (negativos difíciles). Reutiliza los embeddings del LLM local si ya está cargado | CPU; microsegundos por texto; el adaptador se entrena en minutos | recall@k en preguntas retenidas, frente al codificador sin adaptar |
| **Hipocampo** | Guarda cada experiencia al instante con procedencia, fecha y confianza; completa patrones y encadena asociaciones | Almacén exacto (SQLite) + índice vectorial + **recuperación iterativa tipo Hopfield moderna** (softmax con temperatura, varios saltos) + **grafo de dependencias** (recuerdo → resumen → reflexión → lóbulo) | RAM; milisegundos hasta ~10⁶ recuerdos | recall@k, acierto multi-salto |
| **Corteza** | Generaliza y responde lo que nunca se dijo literalmente; crece sin límite | **Lóbulos** (expertos dispersos que nacen, se dividen y se funden); cada uno es una **memoria matricial con regla delta y olvido** (familia Gated DeltaNet / test-time regression), que pasa a memoria profunda tipo Titans solo si se satura. Bloques con **relojes** distintos (trabajo / días / años, como el Continuum Memory System de Nested Learning) | 1–4 MB por lóbulo; actualización en ms en CPU; *replay* en GPU por ráfagas | Acierto en hechos nuevos y olvido de los viejos |
| **Tálamo** | Decide qué entra en el mensaje a la IA, en qué orden y formato, con qué presupuesto de tokens | Escalón 1: **reranker + bandido contextual** que aprende de resultados. Escalón 2: **RL estilo Memory-R1** (aprende con ~150 ejemplos). Escalón 3: **manuales vivos** por tipo de tarea (GEPA/ACE). Registro contrafactual de qué se incluyó | CPU | Acierto de la IA y tokens frente a top-k ingenuo con el mismo presupuesto |
| **Prefrontal** | Probabilidad de acierto por modelo y tarea, incertidumbre, decisión de verificar o convocar el Parlamento | Clasificadores calibrados sobre el historial; con modelos locales, *probes* de entropía semántica sobre estados ocultos | CPU | ECE, errores evitados, ahorro al enrutar |
| **Reflejos** | Lo repetido se compila en herramientas propias que corren sin tokens | Ciclo de vida: proponer → probar A/B → promover → retirar (SkillsBench: las skills sin curar dan +0) | Casi nulo | % de tareas resueltas sin LLM; tokens ahorrados |
| **Núcleo predictivo** | Predecir el siguiente evento como señal auxiliar | Objetivo autosupervisado auxiliar. **Hipótesis sin evidencia todavía**: se prueba en F6/F7 | Bajo | Solo entra si mejora el examen oculto |

### 4.2 Mejoras sobre el estado del arte (lo que nos hace únicos)

1. **Verificador antes de consolidar.** Nada pasa del Hipocampo a la Corteza sin una señal externa: test que pasa, aceptación del usuario o fuente de confianza alta. Así se evita la «confianza fabricada» (repetición convertida en certeza).
2. **Lóbulos como unidades de desaprendizaje.** Cada lóbulo registra qué recuerdos lo entrenaron, al estilo SISA. Borrar es reentrenar ese lóbulo sin ellos y emitir un **certificado de borrado** verificable. El Hipocampo propaga el borrado por el grafo de dependencias (Agentic Unlearning, 2602.17692).
3. **Consolidación dispersa.** En el sueño solo se actualizan las «casillas» que el recuerdo nuevo activa con fuerza frente a su uso previo. Sparse Memory Finetuning (2510.15103) reporta un olvido del 11 % frente al 89 % del ajuste completo.
4. **Caducidad.** La confianza de cada recuerdo decae y se refuerza al confirmarse, y se evalúa con FAMA (penaliza usar memoria obsoleta).
5. **La confianza modula el aprendizaje.** El Sistema inmune escala la tasa de aprendizaje por procedencia: lo que dice el usuario pesa más que lo verificado por una IA, y esto más que lo leído en la web.
6. **Examen oculto permanente.** Tareas reales congeladas que ninguna pieza (Tálamo, Taller, evolución) puede ver ni tocar.
7. **Registro reproducible.** Cada respuesta guarda contexto, lóbulos, versión y modelo. Sirve para auditar y para entrenar.
8. **Memoria en vectores para modelos locales.** Con Qwen u otros modelos locales, la memoria puede inyectarse como vectores (familia xRAG/ICAE) para ahorrar tokens. Con modelos por API, siempre texto.

### 4.3 Señales de aprendizaje

| Señal | Origen | Qué entrena |
|---|---|---|
| Resultado verificable | Tests, comandos que funcionan, respuesta correcta en el examen | Tálamo, Prefrontal, consolidación |
| Aceptación / corrección del usuario | Puertas | Tálamo, Lente, modelo del usuario, Saliencia |
| Co-uso | Qué se consulta junto | Lente personal |
| Respuestas verificadas de las IAs | Profesores (respetando sus condiciones de uso) | Corteza (memoria y enrutado; **no** un LLM competidor) |
| Error de predicción | Núcleo predictivo | Auxiliar (hipótesis) |

### 4.4 Flujo de una pregunta

1. Entra por una Puerta. El Sistema inmune le asigna un compartimento.
2. La Lente la convierte en vector. El **camino rápido** comprueba si un reflejo o la Corteza ya saben responder con confianza alta; si es así, responde sin LLM y lo indica.
3. Si no, el Hipocampo recupera candidatos (varios saltos) y la Corteza aporta generalización.
4. El Tálamo compone el contexto para el modelo elegido por el Prefrontal, dentro del presupuesto.
5. El Profesor responde. El Prefrontal evalúa la duda y, si hace falta, verifica o convoca el Parlamento.
6. Se responde al usuario. Todo queda en el registro y en el Hipocampo con procedencia. Los resultados alimentan el aprendizaje.

### 4.5 El Sueño (y las siestas)

Se activa cuando el gobernador detecta el PC ocioso (y enchufado si es portátil). Pasos:
1. Verificar candidatos.
2. Consolidar de forma dispersa del Hipocampo a la Corteza.
3. Exámenes ocultos.
4. Vacunas (auto-ataque).
5. Ciclo de vida de reflejos.
6. Mitosis y fusión de lóbulos.
7. Desaprendizajes pendientes.
8. Informe «esta semana aprendí».

Cualquier cambio de la propia mente pasa por modo sombra y por el guardián de integridad.

---

## 5. Sistema inmune y privacidad

- **DNI por recuerdo:** origen, fecha, cadena de derivación, confianza y compartimento.
- **Jerarquía de confianza:** usuario > sus archivos > IA verificada > web. Lo externo entra en **cuarentena** hasta verificarse.
- **Filtro de trampas (inyección):** **Laya por defecto** (gratis y local), con motores enchufables (Clef de Cloudflare, Jev, otros). Laya solo funciona en inglés y no es fiable para decisiones de riesgo, así que la seguridad se combina con reglas propias y nunca depende de un solo clasificador.
- **Compartimentos (integridad contextual):** trabajo, personal y cada cliente por separado. Lo que se dice en un sitio no aparece en otro.
- **Secretos:** se redactan antes de guardar (`[SECRET_REDACTED]`) y la bóveda de llaves usa permisos limitados. La mente nunca ve contraseñas.
- **Datos que salen a la nube:** se sustituyen los datos sensibles por marcadores tipados antes de enviar y se restauran en local (MemPrivacy, 2605.09530).
- **Vacunas e inmunidad de rebaño:** firmas de ataque compartidas entre usuarios, nunca datos (F10).

---

## 6. Profesores, Cuerpo y Alma

- **Adaptador universal:** API nativas, compatibles con OpenAI, OpenRouter, Ollama, LM Studio, vLLM y Hugging Face, y las suscripciones del usuario mediante sus herramientas oficiales, respetando las condiciones de cada proveedor.
- **Negativas:** si un modelo no lo hace, se le muestran al usuario los modelos instalados que sí, y **el usuario elige**. No hay desvío automático de negativas de seguridad.
- **«¿Cabe en tu PC?»:** antes de descargar un modelo se estiman RAM/VRAM, velocidad y disco. Solo se aceptan formatos seguros (safetensors).
- **Gobernador:** prioridad mínima del sistema (nice/cgroups) y pausa cuando el usuario usa GPU, juega o ejecuta su modelo local.
- **Nube elástica:** opcional, con tope de gasto fijado por el usuario (0 $ por defecto) y GPU confidencial (TEE).
- **Alma:** estado cifrado con la llave del usuario (*zero-knowledge*), versiones con máquina del tiempo, respaldo local y, opcionalmente, en un relevo cifrado en los servidores propios del usuario (nunca el servidor de la empresa del creador), exportable, y recuperación social Shamir 3-de-5.

---

## 7. Ventana y Puertas (dirección; detalle en F9)

- **Super app**, no «app 2D». La **mente se muestra como la red real**: su forma sale de proyectar los vectores verdaderos. Se diseña después de que la red funcione.
- **Principios aprobados:**
  - La Red es el menú.
  - UI generativa con catálogo propio (familia A2UI / OpenUI).
  - La interfaz respira con el estado de la mente.
  - No hay dos iguales.
  - Deslizar el tiempo.
  - Pensar juntos en vivo.
  - Ver el Parlamento.
  - La mente anima sus propias explicaciones.
  - La interfaz siente la voz (emoción detectada en local).
  - Física con peso.
  - Velocidad (<100 ms).
  - Accesible.
  - Cada efecto tiene interruptor.
  - Nunca fingir afecto.
- **Identidad candidata:** «Tinta y Luz» (tinta de día, luz de noche). Los bocetos 1–4 se descartaron; la estética definitiva se decide en F9 con la red real.
- **Armazón:** Electron + WebGPU (3D fiable en Linux/Windows/Mac). Primero Linux.
- **Puertas F1:** MCP y hooks de Claude Code más una CLI. Después Codex, Cursor, extensión de navegador, voz, móvil, WhatsApp y Telegram (vías oficiales).

---

## 8. Cómo genera dinero

> Todas las cifras de precio son **hipótesis** que se validan con usuarios reales; no son datos.

| Etapa | Producto | Quién paga | Por qué paga |
|---|---|---|---|
| **M1 (tras F1)** | **Daimon Memory para agentes de código**: sustituye CLAUDE.md, AGENTS.md y memorias por contexto vivo; plugin MCP para Claude Code, Codex y Cursor | Desarrolladores que usan agentes a diario | Resultados medidos en la Prueba 0 (+acierto, −tokens) y «nunca más límites» (F3). Gratis en local; Pro (sincronización, Tálamo avanzado, varios equipos) por suscripción mensual baja |
| M2 (F2–F4) | Investigador personal y enrutado inteligente | Profesionales y creadores | Ahorro de tokens y de dinero en APIs (gasto con objetivo) más informes diarios |
| M3 (F5) | **Privacidad verificable para empresas**: certificados de borrado, compartimentos, despliegue local | Pymes y empresas con datos sensibles | Cumplimiento (RGPD y similares) que las memorias neuronales actuales no pueden dar |
| M4 (F8–F10) | **Tienda** de lóbulos, skills y MCP con escudo; equipos (cerebro compartido); enjambre | Creadores (venden) y usuarios (compran) | Comisión por venta; plan de equipo por usuario |

**Distribución** (sin publicar en la cuenta personal de X del usuario):
1. Los números de la Prueba 0 como demostración pública.
2. Repositorio gratuito con la versión local.
3. Comunidad de desarrolladores hispanohablantes, aprovechando el kit de Claude Code ya creado.
4. Una cuenta de marca propia, cuando el usuario la cree.

---

## 9. F0 — Prueba 0 (banco de evaluación) en detalle

**Objetivo:** medir de forma justa si una capa de memoria mejora a la IA con las tareas reales del usuario.

**Fuentes de datos (todas locales):**
1. Las transcripciones de Claude Code del usuario (`~/.claude/projects/**/*.jsonl`).
2. El vault de Obsidian (`~/Documentos/Obsidian/`).
3. Las documentaciones de `~/Sakoi` y `~/Ingresos`.
4. La investigación en `~/.local/share/sakoi-research/`.

**Filtros obligatorios:**
- Redacción de secretos.
- **Exclusión total de cualquier fragmento que mencione el proyecto de la empresa del creador** o su ruta.
- Exclusión de datos de terceros.

**Construcción del examen:**
- **Preguntas reales:** las que el usuario hizo a las IAs en sus sesiones. La respuesta correcta se propone a partir de lo que pasó después en esa misma sesión.
- **Preguntas generadas:** para dar volumen (hechos, decisiones y su *por qué*, preferencias, multi-salto, temporales tipo «¿qué decidimos antes/después de X?», y obsoletas tipo «¿sigue vigente X?»).
- **Validación humana:** el usuario valida rápidamente un subconjunto de 30–50 preguntas («oro»). El resto se marca como «generado».
- **Tamaño objetivo:** 100–200 tareas. Un 30 % queda **congelado como examen oculto** y nunca se usa para ajustar nada.

**Variantes comparadas (mismo modelo, mismas tareas, mismo presupuesto de tokens):**
1. IA sola.
2. IA + .md (el CLAUDE.md y las memorias reales del usuario).
3. Búsqueda léxica (BM25).
4. RAG por vectores top-k (estilo Mem0 ingenuo).
5. Contexto largo (todo lo que quepa en el presupuesto).
6. **IA + Daimon** (a partir de F1).

**Modelos que responden:**
- Qwen local en Ollama (gratis).
- Un modelo de frontera disponible para el usuario, para una muestra.

El juez es un modelo distinto del que responde, con rúbrica. Una muestra se revisa a mano para calibrar al juez.

**Métricas:**
- Acierto, con intervalo de confianza del 95 % por *bootstrap*.
- Tokens de entrada.
- Latencia.
- % de casos en que empeora respecto a la IA sola.
- FAMA en preguntas obsoletas.

**Criterio de éxito de F1:** Daimon supera a la **mejor** línea base con un IC del 95 % que no se solape, **o** empata en acierto usando ≥30 % menos tokens. Además, no empeora en más del 5 % de los casos.

---

## 10. F1 — «Me conoce» en detalle

**Componentes y límites:**

| Unidad | Hace | Interfaz | Depende de |
|---|---|---|---|
| `ingest` | Lee fuentes, redacta secretos, excluye el proyecto de la empresa, trocea y asigna procedencia | `ingest(fuente) -> [Evento]` | `immune.redact`, `immune.exclude` |
| `immune` | Redacción, exclusiones, confianza, compartimentos | Funciones puras + reglas | — |
| `lens` | Codificador + adaptador personal | `encode(textos) -> vectores`; `train_adapter(pares)` | modelo estático local |
| `hippocampus` | Almacén exacto, índice, recuperación iterativa, grafo de dependencias, borrado propagado | `store(evento)`, `recall(consulta, k, saltos)`, `forget(id) -> certificado` | `lens`, SQLite |
| `thalamus` | Selección y composición de contexto con presupuesto; bandido contextual | `compose(consulta, candidatos, modelo, presupuesto) -> contexto`; `feedback(id, resultado)` | `hippocampus` |
| `teachers` | Adaptador de modelos (F1: Ollama + uno de frontera) | `answer(modelo, prompt) -> respuesta` | — |
| `bench` | Prueba 0: construcción, variantes, juez, métricas | CLI `daimon bench ...` | todo lo anterior |
| `gate` (puerta) | Servidor MCP + hooks para Claude Code (sustituye los .md) | herramientas MCP `recall`, `remember`, `feedback` | `thalamus`, `hippocampus` |
| `ledger` | Registro reproducible de cada decisión | eventos *append-only* | — |

**Tecnología del núcleo (F0–F1):**
- Python 3.12 con `uv`, numpy, SQLite e índice vectorial plano o HNSW.
- PyTorch solo para entrenar el adaptador y, más adelante, la Corteza.
- Proceso local (`daimond`) con una API local. Servidor MCP para Claude Code.
- Electron llega en F9.
- **Disco:** quedan ~19 GB libres. El codificador estático multilingüe ocupa unos cientos de MB, y se comprueba el espacio antes de descargar.

**Pruebas:** TDD por unidad, más la Prueba 0 como prueba de aceptación.

**Fuera de F1:** Corteza (F5), Prefrontal completo (F4), interfaz (F9) y todo lo de la nube.

---

## 11. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Hacer trampa con el examen (Goodhart) | Examen oculto congelado más señales reales; el guardián de integridad del Sakoi v1 se reutiliza como idea |
| Confianza fabricada al consolidar | Verificador antes de consolidar; caducidad |
| Envenenamiento por fuentes externas | Cuarentena, procedencia, desaprender en cascada, filtro de inyección |
| Pocos datos personales para entrenar | Métodos que aprenden con poco (bandido, Memory-R1, adaptadores pequeños) y datos generados validados |
| Condiciones de uso de proveedores (destilación) | Usar salidas para memoria y enrutado propios, no para entrenar un LLM competidor; la «voz propia» se destila de modelos abiertos que lo permitan |
| Consumo y disco | Gobernador, CPU primero, comprobación de espacio, aprendizaje solo en ocioso |
| Alcance enorme | Fases con criterio de éxito y aprobación del usuario en cada paso |
| Juez LLM sesgado | Juez distinto del que responde, calibración manual e intervalos de confianza |

## 12. Lo que se conserva del Sakoi v1 (lecciones, no código)

- Guardián de integridad contra pruebas relajadas.
- Medir con honestidad (por ejemplo, el +0,025 del autoexamen se reportó tal cual).
- Arreglo del gradiente de subpalabras.
- Resultado negativo de la plasticidad de lóbulos: la neurogénesis y la mitosis cubren mejor la novedad que reiniciar pesos.

## 13. Decisiones pendientes

- Nombre comercial.
- Uso de los servidores del usuario (confirmar que son personales).
- Modelo de frontera concreto para la Prueba 0 (según el acceso del usuario).
- Precios de M1, que se validan con usuarios.

## 13 bis. Lo aprendido en la Prueba 0 (2026-10-11)

- **Privacidad:**
  - Excluir por texto no basta. Hay que excluir también por **ruta** y descartar **la nota entera** si una parte toca lo excluido.
  - Hay que redactar **antes** de trocear, porque un secreto puede quedar partido entre dos fragmentos.
- **Lente:**
  - El codificador estático (Model2Vec) es débil para la memoria personal: recall denso 0,47.
  - **EmbeddingGemma**, local vía Ollama y con prefijos de consulta y documento, sube a 0,77 y pasa a ser la Lente por defecto.
  - El adaptador personal necesita más que 47 pares: queda latente hasta que haya feedback real.
- **Líneas base:**
  - Los **.md estáticos y el «contexto largo» no recuperan la evidencia** (recall 0).
  - BM25 es un rival muy fuerte si la pregunta repite las palabras de la memoria, pero se hunde con paráfrasis.
- **Tálamo:**
  - Un ranker entrenado solo con preguntas literales **aprende el sesgo léxico**.
  - Debe entrenarse con paráfrasis y llevar rasgos de fuerza léxica absoluta y de rango semántico.
  - El **corte adaptativo** ahorra contexto sin perder recall.
  - La **abstención** (umbral de significado calibrado) evita meter ruido en preguntas ajenas.
- **Memoria:**
  - Ids por **contenido** (lo olvidado no revive al editar o mover).
  - Sincronización por fuente (lo editado se actualiza).
  - Borrado seguro en disco y escritura atómica.
- **Puerta MCP:**
  - El servidor ejecuta herramientas en hilos: la memoria debe ser segura entre hilos.
  - El hogar guarda su configuración, para que lo que se sirve sea lo que se midió.
- **Examen:**
  - El usuario casi no pregunta, da órdenes: el examen «real» se construye sobre sus mensajes y decisiones.
  - Hacen falta paráfrasis, preguntas sin respuesta en memoria y validación humana del oro.

## 14. Fuentes principales

- Titans 2501.00663
- MIRAS 2504.13173
- Nested Learning 2512.24695
- Test-Time Regression 2501.12352
- Sparse Memory Finetuning 2510.15103
- LMs Need Sleep 2605.26099
- Agentic Unlearning 2602.17692
- Memory-R1 2508.19828
- GEPA 2507.19457
- ACE 2510.04618
- SkillsBench 2602.12670
- MemPrivacy 2605.09530
- Hyperagents 2603.19461
- Survey de memoria 2512.13564
- RouteLLM, LLMRouter 2608.06867, Model2Vec

Detalle y matices (qué está verificado y qué no) en `~/.local/share/sakoi-research/v2/00-hallazgos.md`.
