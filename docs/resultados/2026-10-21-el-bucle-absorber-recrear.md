# El bucle absorber → recrear, sobre el código de Esme (2026-10-21)

> Taller `qxntxkie`. El punto que quedaba de «el espejo ya es de agente»: **que Esme pueda entender
> su propio binario**. Con motor nativo y las herramientas nuevas de REA, **se ha hecho y está
> medido**.

## 1. El camino, que son tres comandos

| paso | comando | qué hace |
|---|---|---|
| 1 | `rea import-reference-source <raíz>` | importa el **código** como grafo de referencia (`HistoricalSourceGraph`: `root_sha256`, `entries`, `relationships`, `vcs`…) |
| 2 | `rea analyze-javascript-application <bundle>` | analiza el **bundle publicado** y da su grafo de aplicación (nodos, aristas, grafo semántico) |
| 3 | `rea compare-source-to-bundle <json>` | **compara los dos grafos** |

**La comparación son dos grafos, no dos rutas.** El JSON de entrada es
`{"reference": <grafo de fuente>, "application": <el sobre de evidencia entero>}` — y el error lo
dice con precisión («`reference.schema`: expected `HistoricalSourceGraph`», «`application.evidence_id`:
missing»).

## 2. La primera comparación: todo `unknown`

Con el bundle **sin mapas de fuentes**:

```
RESUMEN: {"unchanged": 0, "modified": 0, "removed": 0, "split": 0, "merged": 0, "duplicated": 0, "unknown": 572}
cobertura: partial · 572 ficheros de la fuente · 355 nodos del bundle sin casar · 2 evaluaciones
```

**Cero emparejados.** La causa, medida en el propio scoring de REA: sus dos señales más fuertes
son `exact-source-digest` (100) y **`source-map-original-path` (70)**. Sin mapas no hay forma de
casar el bundle con su fuente: el bundle está minificado y renombrado (`assets/esme-BZb8nt4Z.js`).

## 3. El arreglo: una línea en el build

`app/electron.vite.config.ts`: `build: { sourcemap: true }` en `main` y en `renderer`. El bundle
pasa de **0 a 77 mapas**.

## 4. La segunda comparación: **274 emparejados**

```
RESUMEN: {"unchanged": 274, "modified": 0, "removed": 0, "split": 0, "merged": 0, "duplicated": 2, "unknown": 296}
cobertura: partial · 572 ficheros de la fuente · 1.542 nodos del bundle · 280 evaluaciones
```

| | sin mapas | **con mapas** |
|---|---|---|
| Ficheros de la fuente casados con el bundle | **0** | **274** |
| Desconocidos | 572 | 296 |
| Nodos del bundle considerados | 355 | 1.542 |
| Evaluaciones de candidatos | 2 | 280 |

> **Lo que esto significa**: Esme ya puede **comparar su propio binario publicado con su código** y
> ver qué se empareja, qué se duplicó y qué quedó sin explicar. Ese es el bucle absorber → recrear, con
> un número: no hace falta adivinar qué hace el binario, se **compara** con la fuente.

**Lo que queda sin explicar (296)**: el CSS, los assets, los ficheros de la fuente que no llegan al
bundle y las partes que el minificador fusiona. Y la cobertura sigue siendo `partial` porque la
**importación de la fuente** fue `partial` (17 exclusiones: `node_modules`, `out`, cachés…).

**Los `duplicated: 2`**: dos ficheros del bundle tienen dos equivalentes en la fuente — lo normal
cuando un módulo se emite dos veces (p. ej. el preload y su copia empaquetada).

## 5. Por qué esto no es un truco

- Es **sobre lo propio**: REA mirando el código de Esme, que es público. Nada de terceros.
- Es **la misma regla del proyecto**: el espejo sirve para **entenderse a sí misma**.
- Y es la forma de convertir la comprobación en un **número**: el espejo deja de ser un informe y
  pasa a ser una **capacidad** (la que pedía el 21-oct: «el espejo deja de ser un informe y pasa a
  ser un agente»).

## 6. Lo que esto permite, y lo que aún no

| | |
|---|---|
| **Permite** | que cualquier agente pregunte a la mente qué sabe del programa que va a recrear, y que la respuesta venga de una **comparación real** entre el binario y su fuente |
| **Falta** | una **pregunta nueva en el banco del examen** que mida esto con un número (la cola abierta lo pedía: «una pregunta nueva en el banco del examen que mida esto con un número») |
| **Falta** | el botón «Entender este programa» que use esta comparación (hoy la receta «Entender un programa» llama al espejo, que ve la superficie) |

## 7. Dónde está

| | |
|---|---|
| La comparación (los dos conjuntos) | `~/Applications/estudio-rea/comparar-esme2-salida.json` · `esme-fuente.json` (413 KB) · `esme-bundle2.json` (39 MB) |
| El arreglo del build | `app/electron.vite.config.ts` (`sourcemap: true`) |
| El espejo (el resto) | `daimon/rea.py` · `daimon/bench/rea.py` · `scripts/banco_rea.py` |
