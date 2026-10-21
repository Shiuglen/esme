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

Y el detalle que duele: **el renderer no baja nunca**. El cerebro sí (711 M cuando lleva un rato
sin que nadie le pida nada, porque sueltan la lente tras 60 s), pero el renderer se queda en
2,7 GB **con la app abierta y quieta**, y además gasta un 8 % de CPU en hacerlo.

## 2. De dónde viene la memoria del renderer

Con `/proc/<pid>/smaps_rollup` se ve que no es «la app es grande»:

```
Pss_Anon:  2768632 kB      ← 2,77 GB de montón de JavaScript
```

Y en el mapa de memoria, casi todo son bloques `[anon:v8]`: 895 MB, 507 MB, 395 MB, 174 MB… Es un
**montón de JavaScript que crece**, no una foto, ni un vídeo, ni la caché de un vídeo.

### 2.1 La cola que crecía sin límite

La causa está en `app/src/renderer/taller/useTaller.ts`: los eventos del agente (que son, entre
otros, la salida de cada herramienta) llegan uno a uno y se meten en una cola que se drena **una
vez por fotograma**:

```ts
cola.current.push({ id, e })
if (!fotograma.current) fotograma.current = requestAnimationFrame(vaciar)
```

**`requestAnimationFrame` no dispara cuando la ventana está oculta**, tapada o minimizada. Si
taller está en segundo plano —que es lo normal mientras se trabaja en otra cosa— la cola **crecía
sin límite**: cada evento de cada tarea se quedaba esperando a un fotograma que no llegaba.

La prueba está en el disco: el registro de la sesión viva pesa **12 MB** en JSONL
(`~/.config/daimon-app/taller/qxntxkie.jsonl`), y el taller entero, **305 MB**. Todo eso vive en
el estado de React del renderer.

## 3. De dónde viene la memoria del cerebro

El cerebro guarda la lente (el codificador) dentro del proceso. En reposo, con el modelo cargado,
son ~360 MB. Pero **tras absorber** el mismo proceso pesaba **1,5 GB más**, y el propio código lo
confesaba (`daimon/lens.py`): *«~1,5 GB tras absorber, por la reserva de ONNX Runtime»*.

Medido con la herramienta nueva (`scripts/medir_lente.py`, que mide **el código de producción**,
no una imitación):

| variante | tras codificar | delta | codificar (mínimo de 3) |
|---|---|---|---|
| `normal` (la de ONNX) | 1526 M | 1494 M | 38,55 s |
| `entorno` (allocators del sistema) | 1526 M | 1495 M | 36,60 s |
| **`sin-arena`** | **670 M** | **638 M** | **41,66 s** |

El culpable es la **reserva del allocator de ONNX Runtime**: crece por potencias de dos y no
devuelve lo que sobra. Tres formas de montarlo, dos conclusions:

- **La arena no es del tamaño del lote**: da lo mismo con lotes de 2048, 1024 y 512 tokens.
- **Que la arena crezca «justo»** (`kSameAsRequested`) **no cambia nada**: 1526 M, igual.
- **Quitarla** (`enable_cpu_mem_arena = False`) **ahorra 856 M (−57 %)** por **+8 % de tiempo**
  (el +8 % es el mínimo de tres medidas alternadas; en la primera medición salía +52 %, que era
  ruido del equipo ocupado).

Y el round-trip: sin arena, **lo que ONNX suelta vuelve al sistema**. Con arena, se queda.

## 4. Lo que se ha hecho

### 4.1 La cola del Taller deja de crecer sin límite

`app/src/renderer/taller/cola.ts` (nuevo, con sus pruebas): la cola tiene tres reglas.

1. Se suelta en cuanto llega el fotograma.
2. **Si el fotograma no llega, lo suelta un reloj** (250 ms): una ventana oculta no da fotogramas,
   pero sí tiempo.
3. **La cola nunca pasa del tope** (2000 eventos): si lo pasa, se suelta ya.

La lógica sale del hook a un módulo con pruebas (`cola.test.ts`), porque lo que se comprueba no es
la forma del código sino el comportamiento: *«la suelta aunque no llegue ningún fotograma»*,
*«no crece sin límite»*.

### 4.2 El cerebro no guarda la reserva de ONNX

`daimon/lens.py`: `onnx_encoder` acepta `reserva` (`normal`, `entorno`, `sin-arena`) y
`daimon/home.py` la lee de la configuración de la mente (`config.json`), con **`sin-arena` por
defecto**. 856 M menos en el proceso que sostiene la memoria.

### 4.3 Lo que se suelta, vuelve al sistema

La evidencia de REA son decenas de megabytes de objetos de Python. Al soltarlos, glibc se los
queda en el montón y el cerebro seguía ocupándolos **sin estar haciendo nada**. Ahora, tras
absorber o comparar, se llama a `gc.collect()` y a `malloc_trim(0)`: lo que se suelta, vuelve al
sistema (`daimon/rea.py`, `_soltar_memoria`).

## 5. Lo que no se ha podido medir

- **El arreglo del renderer no está medido en la app en marcha**: medirlo exigiría reiniciar la app,
  y la app es el padre del agente que está haciendo esta sesión (reiniciarla se lleva la sesión por
  delante). Lo que sí está es la **causa** medida (`smaps_rollup`, 2,77 GB de `[anon:v8]`), el
  **mecanismo** leído en el código (la cola que sólo se drena con fotogramas) y el **comportamiento
  nuevo** probado (`cola.test.ts`).
- **La primera medición del tiempo fue engañosa** (+52 % para `sin-arena`): el equipo estaba
  ocupado. La cifra honesta es +8 %, y sale de alternar las variantes y quedarse con la más rápida.
  Sin eso, se habría descartado una mejora de 856 M por un número inventado.

## 6. La herramientas

| | |
|---|---|
| `scripts/medir_lente.py` | la reserva de ONNX: memoria y tiempo, por variante, sobre el código real |
| `scripts/medir_reposo.py` | lo que Esme consume cuando no hace nada (ya existía) |

Las dos se pueden volver a correr: un número que no se puede repetir no es un número.
