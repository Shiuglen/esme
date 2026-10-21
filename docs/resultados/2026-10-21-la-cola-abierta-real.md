# La cola abierta, de verdad (2026-10-21)

> Taller `qxntxkie`. La «Cola abierta» de `docs/ESME.md` lista cosas que **ya están hechas**: la
> fuente de verdad se quedó atrás. Esto es la auditoría, con **la prueba en el código** de cada
> punto. Sirve para que nadie repita trabajo y para que lo que queda abierto de verdad, quede
> abierto.

> **La regla del proyecto**: *«si algo contradice a este fichero, gana este fichero»*. Por eso un
> fichero que se quedó atrás hay que **arreglarlo**, no sortearlo.

## 1. Lo que la cola daba por abierto y **ya está hecho**

| # | Lo que decía la cola | La prueba |
|---|---|---|
| 1 | «el Taller copia el repo entero en `mkdtemp`» (hueco: worktree por tarea) | **Falso**: `app/src/main/taller/copias.ts:41` — `git worktree add -b esme/<id> <ruta> <base>`. Una rama y un worktree por tarea |
| 2 | «que la Forja pida a la mente lo que sabe del programa que va a recrear» | **Hecho**: `app/src/main/forja-ipc.ts:22-46` — `loQueSabe` (la memoria) + `loQueSabeDe` (los recuerdos del programa, vía el espejo), y el encargo lo lleva: `forja.ts:12-16` |
| 3 | «un botón «Entender este programa» en la interfaz» | **Hecho**: `app/src/renderer/taller/recetas.ts:27` — la receta «Entender un programa», categoría «Entender»: «ingeniería inversa con evidencia» |
| 4 | «falta que la propuesta del sueño sea una skill de verdad, con fichero y permiso» | **Hecho**: `app/src/main/skills/propuesta.ts:37-57` — `instalarPropuesta` escribe el `SKILL.md` (`escribirSkillMd`) y devuelve los ficheros |
| 5 | «la Agent Card del Taller (A2A)» | **Hecho**: `daimon/agent_card.py` + `daimon/server.py:365` — `/.well-known/agent-card.json` |
| 6 | «el informe de equivalencia (lo que Esme sustituye por 0 €)» | **Hecho**: `docs/investigacion/2026-10-20-equivalencia-economica.md` + `scripts/equivalencia.py` |
| 7 | «la caché de contexto: la siguiente palanca del gasto» (en la cola, sin medir) | **La forma ya está puesta**: `app/src/main/providers.ts:83-98` — `buildSystem` deja lo constante (identidad, herramientas) **al principio** y lo variable (panorama, memoria) **al final**. Falta el **número** |

## 2. Lo que **de verdad** queda abierto

| # | Qué | Por qué sigue abierto | Dónde tocar |
|---|---|---|---|
| 8 | **El número de la caché** | La forma está puesta; falta medir el acierto de caché contra el proveedor. Con la cifra de X (76 % de la factura fueron lecturas de caché, TTL de 5 minutos, un fallo cuesta 12,5×) se puede hacer el mismo examen que el del banco | `scripts/banco_memoria.py` |
| 9 | **Reiniciar la app** | Los arreglos del renderer, del atlas y de la jaula están en el código pero la app que corre es la de antes. Y reiniciar **termina la sesión del agente** (el Taller cuelga de Electron) | lo decide el creador |
| 10 | **El botón de «deshacer turno»** | El checkpoint por turno está en el código, en el IPC y en el puente; **no hay botón en la vista** | `app/src/renderer/taller/Detalle.tsx` |
| 11 | **La medición en la app en marcha** | Los números del renderer y del atlas están medidos en su código, no con la app real corriendo | depende del 9 |
| 12 | **Publicar en el registro MCP** | El código y las dos entradas están hechas y validadas | **Bloqueado por las dos cuentas del creador** |
| 13 | **El inbox por demanda** | Ni Deska ni MonoCode lo tienen; en X, `@mr_r0b0t` lo describe («lo difícil es saber cuándo el agente te necesita») | `app/src/renderer/panels/` |
| 14 | **La sesión propia por página embebida** | El Ojo y el navegador comparten sesión | `app/src/main/navegador/` |
| 15 | **El worktree con dueño** | Hay worktree por tarea, pero no se sabe **quién** tiene cada uno | `app/src/main/taller/copias.ts` |
| 16 | **Los permisos que se re-preguntan al cambiar** | La Tienda compara huellas; falta **preguntar** cuando una skill trae permisos nuevos (Deska 1.33: «an update adding one asks again») | `app/src/main/skills/` |
| 17 | **El formato de plugin** | El manifiesto es propio; el estándar es el de Google/MS/OpenAI/Cursor/Vercel | `app/src/main/tienda/catalogo.ts` |
| 18 | **El coste por petición** | El Taller anota el uso **por turno**; falta por petición | `app/src/main/taller/taller.ts` |

## 3. Una limitación que se ha medido (y que cambia el plan)

**El espejo ve la superficie, no el interior.** Del bundle minificado de Deska 1.37 (3,8 MB, un
solo bundle) el espejo sacó **4 ventanas con sus preferencias** y **0 canales IPC** y **0 funciones**;
del código de la app (el mismo, en el repo) el estudio del 20-oct sacó **86 canales** y **357
hallazgos**.

| artefacto | canales | ventanas | funciones |
|---|---|---|---|
| **el bundle publicado** (minificado) | 0 | 4 | 0 |
| **el código** (los mismos ficheros, con nombres) | 86 | — | 357 |

> **La consecuencia para el bucle absorber → recrear**: recrear un programa exige **el código**, no
> el binario publicado. Por eso el espejo tiene que poder mirar **las fuentes** (que es justo lo que
> hacen las skills «Entender un programa», y lo que REA acaba de ganar con `import-reference-source`
> + `compare-source-to-bundle`).

## 4. Lo que REA puede ahora (con motor nativo)

| | |
|---|---|
| **Instalado** | Ghidra 12.1.4 + JDK 21 + `pwntools@4.15.0;pyelftools@0.33;unicorn@2.1.2` (las versiones exactas que REA pide) |
| **`rea doctor`** | de `missing_analysis_engine` a **healthy** |
| **Primer análisis nativo** | el ELF de MonoCode: x86_64 ET_DYN, 18.946.552 bytes, entrada `0x2ae87`, secciones `.appimage`/`.static`/`.text`…, y **12 limitaciones** declaradas por REA |
| **El tope** | un artefacto no pasa de **33.554.432 bytes (32 MiB)**. El binario de la app de MonoCode son 52 MB: `out_of_range` |
| **El bucle de la recreación** | `import-reference-source <raíz>` → el grafo de la fuente; `analyze-javascript-application <app>` → el grafo del bundle; `compare-source-to-bundle` → la comparación. **La comparación son dos grafos**, no dos rutas: `reference` (HistoricalSourceGraph: `root_sha256`, `entries`, `relationships`…) y `application` |

## 5. La regla que queda, escrita

> **Lo que está en la cola hay que comprobarlo antes de hacerlo.**
> Esta auditoría encontró **7 puntos ya hechos** (y uno, el worktree, **dicho mal**). Una cola sin
> verificar es una lista de trabajo repetido.
