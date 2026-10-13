# La Ventana: la interfaz es tu mente (spec, 2026-10-12)

> **Base aprobada por el creador** (principios de la Ventana, `docs/ESME.md` §2):
> - la Red es el menú;
> - la interfaz nace y desaparece, y respira con la mente;
> - pensar juntos en vivo y deslizar el tiempo;
> - un mundo vivo procedural.
>
> **Por qué ahora:** el 12-oct el creador dijo «no me gusta»: lo construido hasta aquí mejoraba páginas dentro de una
> carcasa genérica (riel lateral, barra y páginas que se cambian). Esta spec cambia la carcasa.

## 1. La idea
La ventana entera es tu mente: una sola red viva, en tinta, que ocupa toda la pantalla y está siempre ahí, detrás de todo.
Todo lo demás vive *dentro* de ese mapa, como en un atlas grabado:
- **El cartucho** (arriba a la izquierda): la fecha, el saludo y tu mente contada en frases.
- **La leyenda** (abajo a la izquierda): los lugares de Esme (Conversación, Taller, Memoria, Uso, Tienda, Ajustes) con su
  estado vivo. Es la navegación. Sustituye al riel.
- **La rosa de los vientos** es la Señal: Esme viva.
- **La pregunta** (abajo, en el centro): «Pregúntale a Esme o pídele que construya algo».

## 2. La interfaz nace y desaparece
- Cada lugar es una **hoja de papel que se despliega desde su sitio en la leyenda** (o desde donde se pidió) y se pliega al cerrarla
  (Esc o volver a pulsarlo). En reposo solo están tu mente, el cartucho, la leyenda y la pregunta.
- Tamaños: Conversación, hoja a la derecha (el mapa sigue vivo a la izquierda); Memoria, hoja a la izquierda (el mapa a la
  derecha, con la regla del tiempo); Taller, Uso, Tienda y Ajustes, hoja grande con el mapa atenuado alrededor.
- La cámara se mueve con la hoja: el mapa se desplaza para dejar sitio (transform en el compositor: no redibuja).

## 3. Pensar juntos en vivo
Al preguntar se despliega la Conversación y, mientras Esme responde, **los recuerdos que usa se encienden en tu mente**, a la
vista. Pulsar una cita enfoca su recuerdo en el mapa sin salir de la conversación.

## 4. La Red es el menú (fase 2)
Cada tema del mapa es un menú: pulsar su nombre ofrece «Pregúntale sobre esto», «Ver sus recuerdos» y «Absorber más».

## 5. Consumo
- Una sola red para toda la app (antes había una por página).
- En reposo no se redibuja nada; mover la cámara es un `transform` de CSS; las hojas cerradas quedan inertes.

## 6. Accesibilidad
La leyenda es una lista de botones con nombre; Ctrl+1…6 abre cada lugar; Esc cierra la hoja; las hojas cerradas son `inert`;
foco visible; «menos movimiento» quita los despliegues.

## 7. Fases
1. **V1:** la mente de fondo, cartucho, leyenda, pregunta, hojas que se despliegan y la cámara que se mueve. Fuera el riel.
2. **V2:** los temas como menú; el Parlamento a la vista; sonido con emoción (con interruptor).
