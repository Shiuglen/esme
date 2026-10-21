# Dos agentes en el Taller a la vez: el contrato (2026-10-20)

> Dos tareas pueden estar **trabajando** al mismo tiempo (la app lo permite: cada tarea corre su
> motor en su propio proceso). Este documento es el acuerdo de cómo se convive, para que la
> concurrencia sea una ventaja y no un accidente.

## 0. Lo que ya está resuelto por la arquitectura

| Riesgo | Cómo lo resuelve Esme |
|---|---|
| Pisarse los ficheros | Cada tarea tiene su **copia aislada** (`~/.config/daimon-app/taller/copias/<id>`), con su repo y su rama |
| Perder contexto al empezar | La **herencia** (`app/src/main/taller/herencia.ts`): antes de la primera pregunta, el motor recibe lo que la mente sabe del encargo |
| No saber del otro | El **pack de sesión** (`daimon/sesion.py`): la lista de compañeros dice quién más trabaja, con su copia y su último commit |
| Hablar sin intermediarios | La **mente es el bus**: lo que uno guarda (`remember`), el otro lo encuentra (`recall`, `sesion`) |
| Cambios que rompen al otro | Cada cambio se mide con los **tests** de su repo, y la casa solo se toca bajo cerrojo |

## 1. Las reglas (corta y larga)

1. **Cada agente trabaja en su copia**, nunca en la casa ni en la copia del otro.
   La casa (`~/Daimon`) es de todos: solo se toca para *traer a casa*, y siempre bajo el cerrojo.
2. **El cerrojo**: `scripts/casa.sh <lo que sea>` en vez de `git` a pelo, cuando se toca la casa.
   Sin cerrojo, dos commits a la vez se pisan con `index.lock` y uno se queda con medio trabajo.
3. **Antes de traer a casa**: `scripts/casa.sh pull --rebase` y luego `scripts/casa.sh merge <rama>`.
   Si el merge dice que hay conflicto, **no lo fuerces**: es que el otro cambió lo mismo; léelo,
   entiéndelo y decide. Un conflicto que se resuelve sin leer es una pérdida silenciosa.
4. **La mente es el bus**: lo que descubras y sirva al otro, guárdalo con `remember`. Si el otro
   agent está con la misma tarea, el error se ve antes.
5. **No toques lo que no es tuyo**: ni ficheros, ni ramas, ni procesos, ni la tarea del otro.
   Si necesitas algo de su copia, **pregunta** (no hay canal: es un proceso aparte) — así que
   déjalo en la mente con `remember` y sigue.
6. **No reescribas historia**: nada de `push --force`, ni `reset --hard` sobre la casa, ni
   rebase de lo que otro ya trajo.
7. **Si el otro dejó algo a medias** (cambios sin commitear en la casa), **no lo toques ni lo
   commitees**: déjaselo y sigue con lo tuyo.
8. **Cada commit cuenta una historia**: el mensaje dice qué cambió y por qué, como en
   `docs/ESME.md` (esto es lo que lee el otro agente cuando lista los compañeros).

## 2. El flujo completo de un agente (el "bucle")

```
 0. sesion        → el rumbo, lo que la mente sabe del encargo, QUIÉN MÁS ESTÁ TRABAJANDO
 1. trabajar      → en tu copia, con tests, sin tocar la casa
 2. remember      → lo que descubriste que el otro necesita
 3. commit        → en tu copia, una historia por commit
 4. casa.sh pull --rebase ; casa.sh merge <tu rama>   → con cerrojo, leyendo los conflictos
 5. feedback      → los ids que te sirvieron, para que la mente aprenda qué contexto funciona
```

El paso 0 y el 5 son los que el protocolo de la memoria (`daimon/sesion.py`) pide: sin ellos, la
mente no sabe qué le sirve a cada IA y la herencia se queda a medias.

## 3. Lo que este contrato NO resuelve (y hay que decidir)

- **El Taller sigue siendo un singleton de proceso** (`app/src/main/ipc-taller.ts:29`): el motor de
  cada tarea es su propio proceso, pero la app tiene una sola instancia del Taller. Con dos tareas
  vivas funciona; con muchas habría que mirar si la app serializa algo que no debería.
- **La "una sola sesión a la vez"** sigue siendo la regla del creador (17-oct): este documento no la
  cambia. Dos agentes **con tareas distintas** sí conviven; dos sesiones sobre **el mismo** código,
  no.
- **Falta el número**: no hay medida de «dos agentes juntos rinden más que dos solos». Con la regla
  madre (si el número no mejora, no entra), esta pieza **no entra** hasta que se mida: por ejemplo,
  el tiempo de una tarea con y sin el pack de sesión y con y sin la herencia.
