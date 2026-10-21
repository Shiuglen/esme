# El espejo compara: qué cambió entre dos versiones (2026-10-21)

> Taller `qxntxkie`. Lo que faltaba del espejo: no sólo absorber un programa, sino **volver a
> mirarlo y saber qué ha cambiado**.

## 0. El encargo

El espejo (REA) mira un programa y deja en la mente lo que vio: los canales que expone, las
ventanas con sus preferencias, las funciones que más se llaman y lo que no se pudo ver. Eso ya
estaba medido (`2026-10-21-banco-del-espejo.md`: acierto 0,0000 → 0,9815).

Pero un programa **cambia**. Recompilas, actualizas una dependencia, sacas una versión nueva, y la
mente sigue con lo que vio la primera vez. No hay forma de saber qué cambió sin volver a mirar el
programo entero… y volver a mirar el programa entero es lo caro.

La pregunta: **¿puede el espejo decir qué cambió, sin volver a analizar?**

## 1. La respuesta: sí, porque guardó cada versión

El truco no es un diff de ficheros: es que **la reducción de la evidencia se guarda al lado del
informe**. Al absorber, además del informe en Markdown (lo que lee un humano), se guarda una
**versión reducida** en JSON: la superficie (canales, ventanas), las medidas y las funciones.

| | tamaño |
|---|---|
| La evidencia entera de REA | decenas de megabytes (el grafo semántico es el grueso) |
| La versión reducida | **1,4 KB** (medido: `prog-prueba`, 25 recuerdos) |

Con eso, comparar dos versiones es restar dos cosas pequeñas. No hace falta el gigabyte.

## 2. Lo que cuenta y lo que no

La comparación mira **la superficie** (lo que se ve desde fuera), no el código:

- **Canales IPC**: los que aparecen y los que se van.
- **Ventanas y sus preferencias web**: las que cambian de preferencias.
- **Ficheros**: los que aparecen y los que desaparecen.
- **Medidas**: ficheros analizados, hallazgos y nodos de AST de cada versión.
- **Funciones**: sólo las **más llamadas**, porque con nombres minificados el nombre no sobrevive a
  una compilación. El informe lo dice, para que nadie lo lea como una certeza.

Lo que la comparación **no** hace: no inventa un diff de código. Si el cambio está dentro de una
función y no mueve la superficie, no se ve. Es un límite honesto: el espejo compara lo que un
agente externo puede observar del programa, no el interior del código.

## 3. El flujo, probado de punta a punta

No es una idea: está probado con REA de verdad sobre un programa de Electron de prueba.

```bash
# 1. mirar el programa por primera vez
python -m daimon.cli rea --home /tmp/home-prueba /tmp/prog-prueba
# → 25 recuerdos · informe en home/rea/*.md · versión reducida en home/rea/*.json

# 2. cambiar el programa (un canal IPC nuevo y una función nueva)

# 3. comparar con la versión que ya estaba guardada
python -m daimon.cli rea-compara --home /tmp/home-prueba /tmp/prog-prueba
```

Lo que devolvió de verdad:

```
En una frase
  1 canal nuevo, 0 canales que se fueron, 0 funciones nuevas,
  0 funciones que desaparecieron, 0 ventanas con preferencias nuevas

Los canales IPC
  Antes: 2 · ahora: 3
  Canales nuevos: `canal:nuevo`.

Los ficheros y las medidas
  Ficheros JavaScript analizados: antes 2 · ahora 2 · hallazgos: antes 16 · ahora 18 ·
  nodos de AST: antes 121 · ahora 156.
```

Detecta el canal nuevo y el cambio en las medidas. Y lo deja en la memoria: la comparación se
ingerida como recuerdos (8 nuevos), así que la mente sabe qué cambió sin volver a mirar.

## 4. Las cuatro puertas

| Puerta | Cómo |
|---|---|
| **El CLI** | `daimon rea-compara <programa>` (con `--contra` para comparar dos rutas) |
| **El servidor** | `POST /rea/comparar` (MCP, como el resto del espejo) |
| **La app** | la herramienta `comparar_programas` que el agente puede usar por su cuenta |
| **La mente** | la comparación se ingiere: son recuerdos más, con su procedencia |

Y la comparación **no vuelve a analizar** si no hace falta: si ya hay dos versiones guardadas,
compara las dos. Sólo analiza cuando falta la versión nueva.

## 5. Por qué importa

Es lo que convierte el espejo en una **herramienta de seguimiento** y no en una foto. Sin esto,
absorber un programa era un acto único: el resultado se agingaba en cuanto el programa cambiaba. Con
esto, cada recompilación deja un rastro corto y comparable, y la mente acumula **la historia de los
cambios**, no sólo el estado final.

Es además la forma barata de lo que la Palanca 6 pide: el coste de mirar un programa una vez es de
miles de millones de tokens si se repite; el coste de comparar dos versiones guardadas es de
**unos pocos kilobytes**.
