# El banco del espejo: ¿de qué sirve absorber un programa? (2026-10-21)

> Taller `qxntxkie`. El número que faltaba de la Palanca 6: **la absorción sirve, y aquí está
> medido** — sin juez, sin modelo y sin excusas.

## 0. La pregunta

El espejo ya absorbía programas y la mente ya respondía sobre ellos. Pero eso era una anecdote.
La pregunta del proyecto es otra: *«toda mejora se mide contra un examen con tareas reales; si el
número no mejora, la mejora no entra»*. ¿De qué sirve absorber un programa?

**La respuesta, medida.** Mismo programa, misma mente, mismas preguntas, mismo presupuesto
(1.500 tokens); la única diferencia es si el programa se ha mirado o no:

| | Acierto (evidencia traída al contexto) | Tokens de contexto |
|---|---|---|
| **Sin mirar** (control) | **0,0000** | 982 |
| **Con el espejo** | **0,9815** | **490** |

Seis preguntas sobre la app real de Esme (`/home/sakai/Daimon/app/out`):

| Pregunta | Sin mirar | Con el espejo |
|---|---|---|
| ¿Qué canales IPC expone? | 0,00 | **0,89** |
| ¿Qué ventanas tiene y con qué preferencias web? | 0,00 | **1,00** |
| ¿Qué funciones se llaman más? | 0,00 | **1,00** |
| ¿Qué no se pudo ver? | 0,00 | **1,00** |
| ¿Cuántos ficheros se analizaron? | 0,00 | **1,00** |
| ¿Cuántos miembros expone el puente de contexto? | 0,00 | **1,00** |

Además: con el espejo la respuesta **cuesta la mitad de contexto** (490 tokens frente a 982), porque
la mente gasta lo que trae, no lo que se inventa.

**El método, sin juez:** las preguntas y sus hechos clave **se derivan de la propia evidencia de
REA** (los canales que REA vio, las ventanas con sus preferencias, las funciones que más se llaman,
las razones de lo que no se pudo ver), así que el oro es verdad por construcción. Se compone el
contexto que la IA recibiría y se mira si los hechos clave están dentro: la misma regla que el
banco de memoria contra mem0. Script: `scripts/banco_rea.py` · módulo: `daimon/bench/rea.py`.

## 1. Los tres fallos que el banco destapó (y que están arreglados)

El banco no salió bien a la primera: **0,3733**. Los tres fallos eran reales y ninguno era del
número, eran del conocimiento:

### 1.1 El conocimiento estaba troceado en pedazos que no se pueden recomponer
La pregunta «qué canales IPC expone» se llevaba **5 filas de 123**: el troceo parte el informe en
filas de tabla (a propósito: es el corte que ganó +0,750 de recall en la memoria), pero una fila
suelta («| `hilos:buscar` | handle | literal | index.js:8523 |») no sabe de qué es, y el informe
completo no cabe en el presupuesto.

**Arreglo:** el informe lleva ahora **el listado en trozos recuperables** (doce canales por trozo,
con el prefijo «Canales IPC del programa (1 de 11)» repetido). La tabla se queda para el ojo
humano; los trozos, para la mente.

### 1.2 Una lista de 123 nombres en un párrafo no la trae nadie
El primer arreglo (la lista entera en un párrafo) **empeoró** el resultado: 2.336 caracteres en un
recuerdo se le diluyen al codificador y el buscador lo penaliza por largo. Con el corte aprendido
de la mente (`max_drop` = 2,0), el trozo quedaba **2,79 puntos por debajo** del primero y se
descartaba entero.

**Arreglo:** trozos cortos (doce elementos), cada uno con su prefijo, y **uno por párrafo**: el
troceo une las líneas seguidas en un bloque, así que sin una línea en blanco entre trozos seguían
siendo uno solo (y el banco lo dejó con 1 solo trozo donde había 11).

### 1.3 El examen preguntaba por algo que el informe no afirmaba
La pregunta era «¿qué funciones se llaman más?» y el oro eran las primeras cinco funciones del
grafo (en orden de nodo, arbitrario), no las más llamadas. El examen se estaba midiendo contra una
lista distinta de la que el informe da.

**Arreglo:** el banco usa **las mismas funciones que lista el informe** (una sola implementación:
`daimon/rea.py` la calcula y el banco la toma). Un examen que no usa el mismo código que el
producto mide otra cosa.

## 2. Lo que el banco NO midió (y está dicho)

- **No hay juez de calidad**: se mide si el *contexto* trae los hechos, no si un modelo respondería
  bien con él. Es la misma regla del banco de memoria, y su límite: el contexto puede traer el
  hecho y el modelo no acertar con él.
- **Una sola app**: el número es de la app de Esme, no de un corpus. Con otro programa (más
  pequeño, más grande, de otro lenguaje) puede cambiar.
- **El control es «la misma mente sin esta absorción»**, no «una mente sin nada»: la mente ya
  sabía del proyecto por otros documentos, y aun así su acierto sobre *este* programa era 0.
- **La Comparación de versiones** (qué cambió entre dos builds) queda fuera: REA sabe, pero no
  está en el banco todavía.

## 3. Lo que sigue

1. **Un segundo programa** en el banco (uno pequeño y uno grande), para que el número no sea el de
   una sola app.
2. **Comparar dos versiones** con el mismo banco: la pregunta pasa a ser «qué cambió».
3. **La puerta en la interfaz**: un botón «Entender este programa» que enseñe el informe con sus
   luces y sus sombras.

## 4. Los ficheros

- Banco: `daimon/bench/rea.py` (preguntas derivadas de la evidencia, medición y resumen) ·
  script: `scripts/banco_rea.py` (copia la mente, absorbe, mide y deja las filas en
  `data/bench/rea-<programa>.jsonl`, que es de datos y no se versiona).
- Pruebas: `tests/test_bench_rea.py` (4) · `tests/test_rea.py` (16).
