# El banco del espejo escalado: tres programas, dos formas (2026-10-21)

> Taller `qxntxkie`, tarde. El número que faltaba de la Palanca 6, por fin **general**: antes era
> el de una sola app, y un número de una sola app es una anécdota.

## 0. Qué se pregunta

¿De qué sirve absorber un programa? Antes se respondió con **una app de Electron**: 0,0000 sin
mirar · 0,9815 mirando. El número era bueno, pero era de un programa, de una forma (Electron) y
con seis preguntas. Con el espejo ya mirando cualquier programa (una app, un binario nativo, un
paquete), el instrumento tenía que aprender a preguntar por cualquier programa: **si no, el banco
medía un espejo que ya no existe**.

Por eso el banco ahora:
- hace las preguntas **según la forma de la evidencia** (una app Electron pregunta por canales,
  ventanas y funciones; un binario pregunta por su formato, sus números, su motor y sus límites);
- corre sobre **varios programas** a la vez y da una fila por programa y una fila de conjunto;
- **guarda la evidencia**, así que repetir la medición no vuelve a pagar el análisis.

## 1. El número

Misma mente, mismas preguntas, mismo presupuesto (1.500 tokens); lo único que cambia es si el
programa se ha mirado. Sin juez y sin modelo: se compone el contexto que la IA recibiría y se
mira si los hechos clave están dentro.

| Programa | Forma | Preguntas | Sin mirar | Con el espejo | Tokens |
|---|---|---|---|---|---|
| `app/out` (la app de Esme) | Electron | 6 | 0,0000 | **0,8148** | 364 |
| `libffmpeg.so` (libffmpeg de Esme) | nativo | 4 | 0,0000 | **1,0000** | 169 |
| `ollama` (el servidor de modelos) | nativo | 4 | 0,0000 | **1,0000** | 215 |
| **Conjunto** | | **14** | **0,0000** | **0,9206** | 266 |

**El binario nativo pasó de 0,0833 a 1,0000** (medido seguido, mismo entorno). El conjunto
subió de 0,7063 a 0,9206. Y el coste de contexto bajó: 266 tokens de media frente a los 982 que
cuesta no mirar nada.

## 2. Lo que había que arreglar para llegar (y por qué el binario valía 0,08)

El binario se absorbía **perfecto** (46-57 recuerdos nuevos, todo en la memoria) y luego **no se
encontraba**. Cuatro causas, todas en cómo el informe se convierte en conocimiento:

1. **Los hechos estaban en la tabla, y las tablas se trocean por filas.** La pregunta «¿qué
   formato tiene X?» recuperaba el apartado cuyo título coincide («El formato y la arquitectura
   de X»), pero ese apartado era una tabla: sus hechos estaban en filas sueltas que no eran el
   trozo que la pregunta traía. **Cada apartado lleva ahora su frase con los hechos**, y la tabla
   se queda debajo para el ojo.
2. **El apartado no nombraba al programa.** La pregunta lleva el nombre de X («¿qué formato tiene
   *libffmpeg.so*?») y un apartado que no lo lleva no se parece a la pregunta. Ahora cada apartado
   del informe del binario **nombra al programa**.
3. **Los números no coincidían.** El banco comparaba «3198 procedimientos» y el informe escribía
   «3.198 procedimientos». Ahora el banco **busca los hechos en el informe** (y si un hecho no
   está, la pregunta no se hace: mejor no medir que medir lo que la mente no sabe).
4. **El apartado de límites era un bloque de 1.700 caracteres** y no lo recuperaba nadie. Ahora
   lleva un resumen en su propia línea y el detalle debajo.

En las apps Electron **no se tocó nada de esto**: se midió y el número no se movió (0,9815 antes
y después), así que no entró (la regla de la casa: si el número no mejora, la mejora no entra).

## 3. El reloj del motor, que era un muro

Con el binario de 27 MB de `ollama`, REA contestaba: *«Ghidra did not finish importing and
analyzing the target within its 330000 ms startup deadline»*. El motor no fallaba: **se quedaba
sin tiempo**. REA da 330 s fijos; el espejo ahora les da un plazo que **cabe con el objetivo**
(un minuto más por cada 4 MiB, hasta 20 minutos) y el fin de tiempo global se pone por encima.
Con eso, `ollama` se analysa entero.

## 4. Lo que el número enseña (y no se arregla aquí)

La app de Esme mide **0,8148** hoy; medía 0,9815 el 21-oct **con el mismo código** (comprobado:
con el código original el número es el mismo de hoy, así que lo que se movió fue el entorno, no
el código). La causa está vista y es real:

- La pregunta «¿qué funciones de *out* se llaman más?» recupera un recuerdo **viejo** de la mente
  («persona Funciones: hablas de webhook, lens, hippocampus, evento, funciones…») en lugar del
  trozo con las funciones del programa. Con un presupuesto de 1.500 tokens y 5.768 recuerdos, los
  recuerdos antiguos y cortos se llevan la pregunta, y el conocimiento nuevo del programa se
  queda fuera.
- Es el **mismo problema con las tablas por filas**: las 25 funciones de la app se metían en 25
  trozos diminutos, todos con el mismo título, y la pregunta traía el grupo equivocado. Se
  probaron tres arreglos (unir las funciones en un trozo, decir en el título cuáles son, quitar
  la tabla) y **ninguno movió el número**, así que ninguno entró. Queda dicho, no escondido.

**La palanca que sí queda**: cuando la pregunta nombra un programa, el conocimiento de ese
programo debería ganar al recuerdo temático. Hoy no lo gana. Es el siguiente número.

## 5. Cómo se repite

```bash
python scripts/banco_rea.py --home data/mente_v2 \
    --programa /home/sakai/Daimon/app/out \
               /home/sakai/Daimon/app/dist/linux-unpacked/libffmpeg.so \
               /usr/local/bin/ollama \
    --cache data/bench/evidencia
```

La evidencia queda en `data/bench/evidencia/`, las filas en `data/bench/rea-banco.jsonl` y el
resumen en `data/bench/rea-banco-resumen.json`.
