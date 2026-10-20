# Lo que hay ya: el recorrido de lo nuevo (20-oct-2026, noche)

> Esto es lo que se ve. Cuatro capturas del código que ya está en la app (el laboratorio pinta las
> piezas sueltas con los datos reales; `docs/resultados/2026-10-20-muestras/`).
> Todo lo de aquí está **medido** y con pruebas: 154 de Python, 761 de la app, typecheck limpio.

## 1. La bienvenida: lo primero que ve cualquiera

![la bienvenida](../2026-10-20-muestras/01-la-bienvenida.png)

La primera vez la mente está viva pero en blanco. Antes eso se comunicaba con un «tu mente está en
blanco, empieza dándole tus notas desde Memoria» (un manual). Ahora **Esme se presenta** y ofrece
tres primeros pases que funcionan de verdad: la mente se abre, las manos buscan y leen, el equipo
trabaja en una copia. Nada de lo que no existe.

## 2. La curva del Taller: Esme midiendo a sus propios agentes

![la curva](../2026-10-20-muestras/02-la-curva-del-taller.png)

Sin juez y sin gastar un token: la etiqueta eres tú (aplicar los cambios de una tarea es un sí,
descartarlos un no). **Uso › La curva del Taller**.

Con los datos reales de este equipo: 46 tareas, **16 con error**, ninguna de las 11 tareas que
revisaste te la quedaste. La lista de abajo es el cartero de lo que hay que arreglar:
«Internal error» del proveedor (7), «Authentication required» (3), «Rate limit» (2),
«getaddrinfo ETIMEOUT» (2), modelo retirado (1) y «la sesión del motor está cerrada» (3).

De mirar ese número salieron tres arreglos: **lo temporal se reintenta solo**, **la sesión cerrada
se abre otra**, y **el vigilante** da por muerto a un motor que lleva 30 minutos callado (una tarea
se había quedado tres días colgada).

## 3. Los oficios del equipo: la arena reparte papeles

![los oficios](../2026-10-20-muestras/03-los-oficios.png)

La arena ya no es «tres modelos con lo mismo»: cada rival trabaja **con un papel** (Constructor,
Revisor, Probador, Explorador). Los oficios son tuyos: si pones un `roles.json` en la carpeta del
Taller, mandan los tuyos.

## 4. La arena: qué tocó cada rival, fichero a fichero

![la arena](../2026-10-20-muestras/04-la-arena.png)

Elegir la mejor respuesta deja de ser leer tres resúmenes y comparar de memoria: ves el oficio de
cada uno, el tiempo, los tokens y **los ficheros que tocó cada uno, con las líneas**.

## Y lo que no se ve pero está

- **La memoria contra la industria**: mem0 (Apache-2.0, 67K★) medida con el mismo examen que
  Esme — mismo corpus, mismas 35 preguntas ocultas, mismo presupuesto y **el mismo codificador**.
  Esme 0,929 con 1.124 tokens · mem0 0,857 con 1.499. Con paráfrasis, 0,900 contra 0,757. Cara a
  cara: 3-1-31. Informe: `2026-10-20-banco-memoria.md`.
- **La voz**: el oído iba **más despacio que en tiempo real** en la CPU (RTF 0,643) y en la GPU es
  8,6 veces más rápido con el mismo error. Ahora elige GPU si hay sitio. Informe:
  `2026-10-20-voz.md`.
- **La mente aprende del equipo**: cada veredicto tuyo es una lección («con opencode no te
  quedaste ninguna de las 10 tareas que hizo; se rompió 7 veces con «Internal error»») y la
  herencia se la pasa al siguiente agente antes de su primera pregunta.
- **La Agent Card**: `/.well-known/agent-card.json` — Esme ya es descubrible por otros agentes.
- **El consumo**: el cerebro en reposo, 224 MB y 0,02 % de CPU. Informe:
  `2026-10-20-reposo.md`.
