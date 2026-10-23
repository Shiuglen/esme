# La puerta del Taller: encargar desde fuera, aprobar desde dentro (2026-10-23)

> Taller `qxntxkie`, turno 41. Lo que la propia Agent Card tenía escrito desde el 18: «encargar
> tareas al Taller desde fuera — está en camino; la tarjeta no promete lo que no hay». Hoy la
> puerta existe y la tarjeta la promete con su regla visible.

## La decisión (tomada con el capitán)

**La puerta vive en la mente, no en la app.** La mente ya está expuesta (MCP + HTTP con token
Bearer, 127.0.0.1 y host propio si se publica); abrir otro servidor en el proceso principal de
Electron duplicaría autenticación. La mente guarda la cola; la app la consulta; **el creador
aprueba y rechaza desde la UI del Taller**. Sin Ed25519 en v1: token + aprobación del creador son
los dos factores; la firma del parlamento llega al rotar claves.

Las reglas de la puerta (todas en código, no en promesas):

- **La cola nunca crea una tarea.** Sólo guarda: id, hora, título, texto, origen, estado.
- **TTL de 24 h**: lo que nadie respondió en un día caduca (y la limpieza lo suelta).
- **Tope de 5 encargos/hora**: la puerta no inunda el taller.
- **Texto con carácter**: mínimo 20 chars, máximo 20 000 (el tope del Taller).
- **Lo aceptado corre con acceso «ediciones»** (la jaula por defecto) y **sin credenciales**:
  el origen queda marcado en la tarea (`origen: 'fuera'`).

## Qué se montó

**Mente (Python):**
- `daimon/taller_cola.py` (nuevo): la cola pura — `entrar`, `pendientes`, `responder`
  («aceptado»/«rechazado»), `limpiar`, `ErrPuerta`. JSONL local (`encargos-fuera.jsonl`).
- `daimon/server.py`: `POST /taller/encargo` (guarda y avisa por el bus), `GET /taller/encargo`
  (lo pendiente), `POST /taller/encargo/{id}` (la respuesta del creador).
- `daimon/agent_card.py`: la tarjeta anuncia el skill «taller» con sus tres rutas y su regla
  («desde aquí NO se crea ninguna tarea»).

**App (Electron):**
- `mente/cliente.ts`: rutas + `EncargoFuera` + `encargosDeFuera()` y `responderEncargo()`.
- `mente/ipc.ts`: `mente:tallerEncargos` y `mente:tallerEncargoResponder` (id con forma `enc-`
  y decisión de las dos que hay, nada más).
- `taller.ts`: las tareas pueden llevar `origen` (vacio = creador; `'fuera'` = la puerta).
- `NuevaTarea` + `Repeticion.tsx`: la sección «Encargos de fuera» — de dónde llegó, cuándo, qué
  pide, y dos botones: **Aprobar y arrancar** (crea la tarea con la misma elección de motor que
  la vista, acceso «ediciones» fijado, y luego marca «aceptado» en la cola; si la tarea no
  arranca, el encargo sigue esperando) y **Rechazar**. La sección refresca al abrir el panel.
- `useTaller`/`bridge`/`preload`: el hilo completo hasta la ventana.

## Desviación honesta del plan del capitán

- El sondeo de 30 s desde el proceso principal quedó como **sondeo al abrir «Nueva tarea»**:
  una pieza menos (sin temporizador vivo en main), y el encargo no se pierde igual — la cola
  persiste en la mente aunque la app esté cerrada; al abrir el panel se ve todo lo pendiente.
  El sondeo en vida (toast en cualquier pantalla) queda para el siguiente turno, junto al evento
  del bus (`taller:encargo`) que ya se publica.
- La spec del kit (`estandar/cerebro-frontera.spec.yaml`) vive fuera de este repo: su hilo
  (`taller/encargo`) hay que añadirla cuando la mente corra con la nueva puerta.

## La prueba

- Mente: `test_taller_cola.py` (13: cola, título deducido, tonterías no entran, cuota 5/h,
  TTL 24 h, doble respuesta, decisión inválida, limpieza) + las 5 HTTP de la puerta en
  `test_server.py` + la tarjeta en `test_agent_card.py` (6) — **321/321 del repo entero**.
- App: la puerta del IPC (`mente/ipc.test.ts`, 6) y `haceDe` (Repeticion.test.ts) —
  **986/986** (150 ficheros), typecheck limpio.
- NO hace (precio honesto): el encargo aceptado NO espera a nuevo permiso; su primera acción
  fuera de las ediciones igual pregunta (eso ya lo hace la jaula de ediciones). Y la app en
  marcha no verá la puerta hasta reconstruir y reiniciar, como siempre.
