# La decisión: por dónde escala Esme (2026-10-20)

> Documento del Taller `qxntxkie`, escrito después de estudiar el estado del arte, la
> auditoría de la app, la biblioteca del FYP y el archivo de X del creador, y después de
> medir lo que hay en casa. No es un plan de tareas: es **el por qué** de la siguiente
> jugada, para que se pueda discutir y corregir.

## 0. La pregunta que se puso

> «El taller en la web: ¿qué es eso? Elige tú, pero ve bien si es lo mejor para esto,
> estudia muchísimo, usa mi X, y piensa todo bien para escalar.»

Había dos opciones sobre la mesa, y las dos eran **más superficie de transporte**:

- **A. La web como ventana del Taller de escritorio** (el motor sigue en tu máquina; el
  navegador es la ventana).
- **B. El Taller mudado al servidor** (un Esme sin ventana en el 101; el navegador, el
  móvil o el equipo, clientes).

Y una tercera que no estaba en la mesa, pero que la investigación sí puso delante:

- **C. Publicar el conector**: que cualquier IA del mundo descubra y use una mente de
  Esme, instalada en un comando, en el equipo de quien la usa.

## 1. Lo que dice la evidencia

### 1.1 La escala de un producto de IA no la da el motor: la da la distribución

Los que escalaron, escalaron por cómo se reparten, no por la calidad de su motor:

| Producto | Escala (20-oct-2026) | Cómo lo repartió |
|---|---|---|
| Claude Code | 152.639★ · 16.800 M$ en el Q3 | un binario, tres superficies (terminal, web, móvil) |
| Cursor | ~4.000 M$ | nube + **workers con conexión saliente** (sin puertos abiertos) |
| Cognition (Devin) | 1.000 M$ de run-rate | nube **+** local (el 89 % del código lo commitea Devin) |
| mem0 | 67.538★ | servidor abierto **y** plataforma |
| openclaw | 392.667★ | local-first, el más popular de su categoría |

**Conclusión**: el motor de Esme ya es de primer nivel (el banco de la memoria: 0,929 de
acierto contra el 0,857 de mem0 con un 25 % menos de contexto; el informe económico: 0 $
contra 0,4996 $ por la misma noche). **El motor no es el cuello de botella. La
distribución sí.**

### 1.2 El precedente exacto: `app.ownmemory/ownmemory`

Publicado en el **Registro oficial de MCP el 17-oct-2026** (tres días antes de este
documento), con esta forma:

```json
{"name": "app.ownmemory/ownmemory",
 "remotes": [{"type": "streamable-http", "url": "https://{server_address}/mcp",
              "variables": {"server_address": {"description": "…", "isRequired": true}}}]}
```

Es decir: **el registro publica el protocolo, no los datos**. La memoria vive donde el
usuario quiere (en su Cloudflare, en su servidor) y el registro es sólo el índice. Es
exactamente el modelo de Esme, que es privado por diseño. Y hay un segundo precedente
en la misma línea: `io.github.mem0ai/mem0` (2-jul-2026), `com.letta/memory-mcp`,
`io.github.0Mattias/bettermemory` (PyPI), `io.github.renezander030/graphiti-local`.

El registro oficial, además: **es inmediato** (publicar es un comando, sin cola de
revisión), **no admite servidores privados** (lo que obliga a publicar el *conector*, no
la *mente*), y **no reparte a Smithery, Glama ni mcp.so** (hay que ir a cada uno: 5 min
en Smithery, 3 min en Glama; PulseMCP se sincroniza solo cada semana).

### 1.3 Lo que hoy impide que Esme se instale (medido en esta casa)

| Lo que hace falta | Estado real (20-oct) |
|---|---|
| El paquete en PyPI | **No existe.** El repo se llama `daimon` (que en PyPI es de otro) y la entrada del registro apunta a `daimon-esme` |
| La Lente (el modelo que codifica) | **No se bajaba nunca**: el modelo estaba en el disco de esta máquina, pero ningún código lo bajaba. Una mente nueva no podía codificar |
| `uvicorn` y `starlette` | **Sin declarar** en `pyproject.toml`: llegaban por casualidad (por `mcp`) |
| El `LICENSE` | **No existía**, y la Agent Card ya prometía MIT |
| El `mcp-name` del README | Faltaba (el registro lo exige en los paquetes de PyPI) |
| Una entrada remota (la mente en marcha) | No existía |
| Una segunda entrada en el registro | No existía (sólo el conector) |
| Que la app pueda compartir la entrada | No había forma: el token vive en el llavero y no sale del proceso principal (bien) |

### 1.4 Lo que dice el propio creador (su X, su FYP, su auditoría)

- **La brecha de primera impresión es de producto, no de pintura** (`vision/07-producto.md`):
  lo primero que ve alguien son tres «falló» en rojo; no existe el primer arranque de un
  usuario nuevo; el Taller está lleno de tareas de prueba.
- **El archivo de X del creador, prioridad P0** (`vision/03-x-archivo.md`): B1-B5 — la
  capa de materia impresa, la mente como cordillera, las láminas con procedencia, la
  escala monumental, el lenguaje de imprenta. Es un trabajo **de percepción**, y es
  *su* gusto, no el mío: necesita sus ojos, no una investigación.
- **El banco de la memoria y el informe de equivalencia** (`docs/resultados/`): el motor
  ya gana. No hay que volver a medirlo.

### 1.5 La arquitectura, tal y como está

```
app de escritorio (Electron)     ← el Taller: procesos, git, PTY, llavero
  └─ cerebro (Python)           ← la mente: HTTP + MCP + Agent Card
       └─ la puerta (HTTP)      ← lo que un agente de fuera puede usar
```

Un navegador o un servicio **no puede** hacer lo que hace la app (procesos, git, PTY,
llavero, bandeja, notificaciones). Por eso B —el Taller en el servidor— es un
refactor del proceso principal, no un arreglo de una tarde. Y por eso A (la web como
ventana) sirve a **un** usuario: el creador, que ya tiene la app en su mesa.

## 2. La decisión

> **Ni A ni B: C. Publicar el conector, y que la distribución la haga el motor que ya
> funciona. La percepción (el P0 del creador) es el acto siguiente, y necesita sus ojos.**

Por qué:

1. **Es el cuello de botella real.** El motor gana; la distribución no existe. Publicar
   el motor no escala si nadie puede obtenerlo.
2. **Es la última milla más corta.** Dos credenciales (PyPI y el token del registro) y
   todo lo demás está hoy comprobado. A y B son semanas.
3. **Es lo que el mundo ya hace con lo mejor.** `ownmemory` y `mem0` publicaron su
   conector en el registro oficial; el registro es el índice público de un producto que
   es privado por diseño.
4. **No obliga a publicly nada de la memoria del creador.** La entrada remota lleva una
   *variable*: la dirección de **tu** mente. El registro no aloja datos ni verifica nada
   de ellos.
5. **A y B siguen vivas, pero cuando haya un usuario de fuera** que las pida. Y cuando
   ese usuario exista, se sabrá qué quiere: la teléfono, el móvil, la tablet, otro
   equipo. Construir el transporte ahora es adivinar.

Lo que **no** se decide aquí: la percepción (el P0 del creador). Es el acto que sigue,
y es de los ojos de quien lo pidió, no de una investigación.

## 3. Lo que se ha hecho con esta decisión (20-oct)

- **`daimon init`**: la primera vez de una mente. Crea la carpeta, baja la Lente (316 MB,
  una vez) y dice la verdad: qué hizo, qué pesa y cómo se usa.
- **`daimon modelos`**: bajar o comprobar la Lente.
- **El paquete `daimon-esme`**: nombre el que el registro ya pedía, `LICENSE` (MIT),
  `README` nuevo (la puerta de entrada de un desconocido), `uvicorn` y `starlette`
  declarados, `model2vec` y la voz como extras, y la Lente ONNX como codificador por
  defecto (no depende de Ollama, que en algunos equipos está roto).
- **La Lente se baja sola**: `daimon/modelos.py` (el hueco que hacía imposible instalar
  Esme en un equipo limpio).
- **Dos entradas en el registro, las dos válidas**: `io.github.shiuglen/esme` (el
  conector) e `io.github.shiuglen/esme-remoto` (la mente en marcha, con variable).
- **La app copia la entrada** para dársela a otra IA: el token se compone en el proceso
  principal y va al portapapeles; **la ventana no lo ve nunca** (lo vigila el portón de
  la frontera).
- **La Agent Card declara lo que existe** (las rutas que faltaban: `/forget`, `/ingest`,
  `/rumbo`, `/repeticiones`, `/necesidad`, `/equipo`, `/memory/{id}`, `/health`,
  `/events`) y sigue sin prometer lo que no hay (encargar tareas al Taller desde fuera).

### Medido

- Rueda construida e instalada en un entorno limpio: **234 MB** de dependencias, `daimon`
  funcionando.
- `daimon init` → mente creada; `remember` y `recall` responden con la Lente ONNX.
- **Cliente MCP de verdad** (el mismo protocolo que Claude Code) hablando con la mente
  instalada desde la rueda: `recall`, `remember` y `feedback` funcionan.
- Las dos entradas del registro: **válidas** según el validador oficial.

### Lo que falta (y es del creador)

1. **PyPI**: cuenta + token → `python3 scripts/publicar.py --pypi`.
2. **El registro**: token (entrando con GitHub) → `node mcp/publicar.mjs --publicar`.
3. **Los agregadores** (el registro no los reparte): Smithery (5 min) y Glama (3 min).
4. **El repositorio, público**: hoy `Shiuglen/esme` es privado, y la entrada del registro
   lo apunta. Publicarlo es decisión del creador, no de un agente.
5. **La releasing de la app**: el AppImage ya se construye (`~/Applications/Esme.AppImage`);
   falta un sitio donde se baje y una release con su checksum.

### Lo que sigue (y por qué en este orden)

1. **La percepción** (P0 del creador: B1-B5 + la auditoría). Es lo que hace que la
   gente quiera quedarse, y necesita sus ojos.
2. **El primer arranque de verdad** (hoy la app es para el creador; un desconocido
   necesita su camino).
3. **El 101**: la mente del equipo, siempre en marcha, con la entrada remota y un túnel
   propio (Tailscale, no TLS propio: la lección de `ai-memory` es no terminar TLS en
   casa). Y con la defensa que la investigación marca como obligatoria: validar la
   cabecera `Host` (rebinding DNS: CVE-2026-35577, CVE-2025-9611) y fallar cerrado
   fuera del bucle local. Esme ya valida el `Host` y el `Origin`; queda dicho por escrito.
4. **A y B**, cuando haya un usuario de fuera que las pida.
