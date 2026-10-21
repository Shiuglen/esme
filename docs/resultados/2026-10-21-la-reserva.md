# La reserva: por qué Esme se comía la memoria (2026-10-21)

> Taller `qxntxkie`. El creador: *«mira que no se consuma tanto pq te cierras»*. Aquí está lo que
> se consume, de dónde viene y qué se ha hecho con ello.

## 0. La pregunta

La app se cerraba. No por un fallo: por **memoria**. En la máquina del creador el **swap estaba al
100 %** (8 G de 8 G, 352 KB libres) y el equipo iba a trompicones.

Antes de tocar nada, la regla del proyecto: *«se mide antes y después de cada cambio»*. La
herramienta ya existía (`scripts/medir_reposo.py`): la suma del PSS —la memoria justa— de cada
proceso de la app y del cerebro, y el CPU en reposo.

## 1. Lo que Esme consume en reposo (medido)

```
reposo de 6 s · 16 núcleos
rol           procesos        PSS      CPU
cerebro              1      1748 M    0.01 %
gpu                  1       128 M    3.56 %
principal            2       180 M    0.19 %
renderer             1      2732 M    7.74 %
utilidad             3        76 M    0.00 %
zygote               2        27 M    0.00 %
TOTAL               10      4890 M   11.50 %
```

**4.890 M** para una app que, según su propio manual, debe pesar «prácticamente nada». El swap
lleno es la consecuencia, no la causa.

Y el detalle que duele: **el renderer no baja nunca**. El cerebro sí (217 M cuando lleva un rato
sin que nadie le pida nada, porque suelta la lente tras 60 s), pero el renderer se queda en
**2,7 GB con la app abierta y quieta**, y además gasta un 8 % de CPU en hacerlo.

## 2. El renderer: 2,77 GB de montón de JavaScript

Con `/proc/<pid>/smaps_rollup` se ve que no es «la app es grande»:

```
Pss_Anon:  2768632 kB      ← 2,77 GB de montón de JavaScript
```

Y en el mapa de memoria, casi todo son bloques `[anon:v8]`: 895 MB, 507 MB, 395 MB, 174 MB… Es un
**montón de JavaScript que crece**, no una foto, ni un vídeo, ni la caché de un vídeo.

### 2.1 La causa: copiar la línea entera por cada evento

El Taller pliega la ráfaga de eventos del motor en la línea de tiempo que se pinta. La función que
lo hace (`app/src/renderer/taller/linea.ts`) **copiaba la línea entera en cada evento**:

```ts
const i = l.findIndex((x) => x.tipo === 'herramienta' && x.id === e.id)
if (i < 0) return [...l, { ... }]
```

Con la sesión real del 21-oct: **78.134 eventos** (16.746 de herramientas, 53.657 de pensamiento) y
una línea de **9.007 elementos**. Aplicarlos de uno en uno son **78.134 × 9.007 = 700 millones de
copias**. Medido sobre el registro real:

| | tiempo | elementos |
|---|---|---|
| **uno a uno** (como estaba) | **13.586 ms** | 9.007 |
| **en lote** (como ahora) | **23 ms** | 9.007 |
| | **579× más rápido** | idéntico |

**13,6 segundos de CPU por un solo vaciado.** Y como la línea se volcaba en cada ráfaga de eventos,
ahí estaba el núcleo quemado y los 2,77 GB: cada copia es basura que V8 tiene que recoger, y el
montón crece paraucolectarla.

### 2.2 La segunda causa: la cola que crecía sin límite

Los eventos llegaban uno a uno a una cola que se drenaba **una vez por fotograma**:

```ts
cola.current.push({ id, e })
if (!fotograma.current) fotograma.current = requestAnimationFrame(vaciar)
```

**`requestAnimationFrame` no dispara cuando la ventana está oculta**, tapada o minimizada. Con el
taller en segundo plano —que es lo normal mientras se trabaja en otra cosa— la cola **crecía sin
límite**: cada evento de cada tarea se quedaba esperando a un fotograma que no llegaba.

Y no es una suposición: el propio repo lo avisa (`CLAUDE.md`): *«la ventana de Electron tapada en el
escritorio no recibe fotogramas (Wayland)»*. La app se usa en el escritorio, con la ventana al lado
—o tapada—, así que el caso no es raro: es el normal.

La prueba está en el disco: el registro de la sesión viva pesa **12 MB** en JSONL
(`~/.config/daimon-app/taller/qxntxkie.jsonl`), y el taller entero, **305 MB**.

## 3. El cerebro: la reserva de ONNX Runtime

El cerebro guarda la lente (el codificador) dentro del proceso. Medido con la herramienta nueva
(`scripts/medir_cerebro.py`), **trozo a trozo**:

| trozo | RSS |
|---|---|
| python + numpy | +17 M |
| **el codificador (modelo cargado)** | **+318 M** |
| la mente (hipocampo, tálamo, léxico) | +19 M |
| **total arrancando** | **369 M** |

Y al codificar (como al absorber un programa), el proceso se dispara. Con la segunda herramienta
(`scripts/medir_lente.py`, que mide **el código de producción**, no una imitación):

| variante | tras codificar | delta | codificar (mínimo de 3) |
|---|---|---|---|
| `normal` (la de ONNX) | 1526 M | 1494 M | 38,55 s |
| `entorno` (allocators del sistema) | 1526 M | 1495 M | 36,60 s |
| **`sin-arena`** | **670 M** | **638 M** | **41,66 s** |

El culpable es la **reserva del allocator de ONNX Runtime**: crece por potencias de dos y no
devuelve lo que sobra. Tres formas de montarlo, tres conclusiones:

- **La arena no es del tamaño del lote**: da lo mismo con lotes de 2048, 1024 y 512 tokens.
- **Que la arena crezca «justo»** (`kSameAsRequested`) **no cambia nada**: 1526 M, igual.
- **Quitarla** (`enable_cpu_mem_arena = False`) **ahorra 856 M (−57 %)** por **+8 % de tiempo**
  (el +8 % es el mínimo de tres medidas alternadas; en la primera medición salía +52 %, que era
  ruido del equipo ocupado).

Y el ciclo completo del cerebro, que es lo que de verdad pasa:

| reserva | arrancar | **pico** | reposo |
|---|---|---|---|
| normal | 369 M | **1568 M** | 217 M |
| **sin-arena** | 369 M | **719 M** | 216 M |

**El pico se reduce a la mitad sin coste en reposo.** Y el round-trip: sin arena, lo que ONNX suelta
vuelve al sistema.

### 3.1 La cola de los lectores del cerebro

El bus de eventos (el Atlas en vivo) guarda 2.000 eventos en su historial —acotado— pero la cola
de cada lector era **sin límite**: si la ventana iba lenta (que iba), se acumulaban **recuerdos
enteros** (hasta 1.500 tokens cada uno) sin que nadie los pidiera. Ahora la cola tiene tope (200) y
suelta lo viejo: en un feed en vivo interesa lo último, no lo completo.

## 4. Lo que se ha hecho

| | |
|---|---|
| **La línea se aplica en lote** (`linea.ts`) | una sola copia por lote y cada evento en el sitio, con índice de herramientas: **579×** más rápido sobre el registro real |
| **La cola del Taller tiene tres reglas** (`cola.ts`) | fotograma · **reloj de respaldo** si la ventana está oculta (250 ms) · **tope de 2.000** |
| **El cerebro no guarda la reserva de ONNX** (`lens.py`, `home.py`) | `reserva` en la configuración de la mente, `sin-arena` por defecto: el pico de 1568 M a **719 M** |
| **Lo que se suelta, vuelve al sistema** (`rea.py`) | tras absorber o comparar: `gc.collect()` + `malloc_trim(0)` |
| **La cola de los lectores tiene tope** (`server.py`) | 200 eventos; lo que no cabe, se suelta lo viejo |

Las tres reglas de la cola y el lote salen a módulos con pruebas (`cola.test.ts`, `linea.test.ts`),
porque lo que se comprueba no es la forma del código sino el comportamiento: *«la suelta aunque no
llegue ningún fotograma»*, *«no crece sin límite»*, *«el lote da lo mismo que ir de uno en uno»*.

## 5. Lo que no se ha podido medir

- **El arreglo del renderer no está medido en la app en marcha**: medirlo exigiría reiniciar la app,
  y la app es el padre del agente que está haciendo esta sesión (reiniciarla se lleva la sesión por
  delante). Lo que sí está es la **causa** medida (`smaps_rollup`, 2,77 GB de `[anon:v8]`; el
  registro real, 78.134 eventos), el **cambio** medido sobre ese registro real (13.586 ms → 23 ms) y
  el **comportamiento** probado.
- **La primera medición del tiempo fue engañosa** (+52 % para `sin-arena`): el equipo estaba
  ocupado. La cifra honesta es +8 %, y sale de alternar las variantes y quedarse con la más rápida.
  Sin eso, se habría descartado una mejora de 856 M por un número inventado.

## 6. La herramientas

| | |
|---|---|
| `scripts/medir_lente.py` | la reserva de ONNX: memoria y tiempo, por variante, sobre el código real |
| `scripts/medir_cerebro.py` | la memoria del cerebro, trozo a trozo, y su ciclo: arrancar → pico → reposo |
| `scripts/medir_reposo.py` | lo que Esme consume cuando no hace nada (ya existía) |

Las tres se pueden volver a correr: un número que no se puede repetir no es un número.
