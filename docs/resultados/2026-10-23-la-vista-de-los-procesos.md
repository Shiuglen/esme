# La vista de los procesos: la casa se mira y el que se desboca, suelto (2026-10-23)

> Taller `qxntxkie`, turno 41. Fila 21 del acta del 21-oct, segunda mitad: el medidor ya estaba
> (`presion.ts`, la herramienta `ver_presion` en manos del agente); lo que faltaba era **la vista
> para ti**: qué pesa ahora y, si algo se desboca, soltarlo con un par de clics (MonoCode 0.15 lo
> tiene; Esme tenía el número solo en palabras para el agente).

## Qué se rompía

La app murió de memoria dos veces (13 GB de pico; swap lleno) y la única salida era abrir `htop`
fuera de Esme. El medidor existía pero vivía dentro del pillablo de los agentes; el creador nunca
lo ve.

## Qué hay ahora

- **La columna «La casa» en el Mando** (la fila inferior «Ahora», junto a «Tus manos»): el total
  de los procesos de la casa, lo que queda libre y cuántos agentes hay en marcha. Si el total se
  pasa de 12 GB o el swap queda por debajo de 512 MB, la frase avisa en color.
- **El panel de procesos** al abrirla: del más gordo al más flojo, con su `rol`, su `pid`, su MB y
  su CPU, y el texto completo en palabras que ya sabía explicar el medidor.
- **El botón de parar**: segundo clic (como en la Revisión) que dice qué pasa. El pid se vuelve a
  contar por su línea de órdenes antes de matar (`uso/presion.ts: pararProceso`): un pid que llega
  por la ventana es la parte menos fiable de la casa. Sólo se para lo parable — **un agente o el
  chrome de la casa** — con SIGTERM (que suelte lo suyo) y SIGKILL si aguanta. A la casa (la app,
  el renderer, el GPU, el cerebro) no se llega: matarla es apagar a Esme.
- El sondeo se hace cada 15 s mientras el Mando está delante; si nadie mira, nada se mide.

## La prueba

- `presion.test.ts` (main): el rol parable o no (agente y chrome sí; renderer y cerebro no), TERM
  si se extingue, TERM y KILL si aguanta, y las negaciones (el cerebro, pid que no está, pid que
  no vale). `paginas/presion.test.ts` (ventana): fame en palabras, orden de filas, avisos.
- `app`: **982/982** (150 ficheros) · typecheck limpio.

## Lo que NO hace (por honestidad)

- No vigila procesos de fuera de la casa ni ofrece matarlos: la vista es de Lo Tuyo.
- No reintenta nada: el botón suelta el proceso; la tarea afectada queda en el Taller con su
  estado (error) y el router del motor aprende de la caída — el resto ya existía.
- La app en marcha no lo verá hasta que se reconstruya y reinicie (mismo aviso que siempre).
