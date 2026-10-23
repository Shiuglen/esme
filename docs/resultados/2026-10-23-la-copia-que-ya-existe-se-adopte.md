# La copia que ya existe se adopte (2026-10-23)

> Taller `qxntxkie`, turno 39. Fila 20 del acta del 21-oct: *«Hay worktree por tarea, pero no se
> sabe quién lo tiene ni se evita el choque»* (práctica de Deska 1.32: `worktreeInUse`,
> `worktreeUsedByAnotherTask`). Ya no hace falta un registro de dueños aparte: la rama
> `esme/<tarea-id>` **es** el dueño, y ahora se respeta.

## Qué se rompía

`crearCopia` (`app/src/main/taller/copias.ts`) sólo sabía crear de cero: `worktree add -b
esme/<id>`. Tres formas de ficharse:

1. **La app se reinicia** y vuelve a pedir la copia con la misma id → `fatal: a branch named
   'esme/…' already exists`: la tarea entera se troncaba por no encontrar lo que YA tenía.
2. **El worktree desaparece sin quitar la rama** (caché limpiada a mano, capeta de copias rotada)
   → la rama queda abandonada con el trabajo commiteado dentro, inaccesible.
3. **Residuo sin git** en el camino del Taller (un intento a medias) → `fatal: '…' already exists`.

## Qué hace ahora

- **Adopta**: si un worktree del repo ya lleva la rama de esta tarea, se devuelve tal cual, con su
  historia. La base de la tarea es donde su rama se apartó de la casa (`merge-base rama HEAD`):
  así los puntos de turno siguen siendo suyos, y si su trabajo ya se llevó a casa (la rama quedó
  dentro de HEAD), la copia arranca de nuevo limpia.
- **Cría la rama abandonada**: con la carpeta registrada caducada (`prunable`) primero se depura
  el registro (`worktree prune`) y luego `worktree add <ruta> <rama>` — el commit que el motor
  ya dejó entra de vuelta con la copia, y los puntos se cuentan.
- **Limpia el residuo propio**: lo que hay en `dirCopias/<id>` y **no** es un repo se borra y la
  copia se crea en su sitio. Lo que sí es un worktree de otra cosa no se toca.
- **La copia nueva (carpeta de Esme) también se sigue**: se rehace el `init` ya no añade un
  «punto de partida» por reinicio.

## La prueba

Nuevas en `copias.test.ts`:

- adopte con su trabajo: cambios frente a la base y sus puntos (`[1]`) tras la segunda petición.
- rama abandonada criada de nuevo, con el del turno dentro.
- residuo limpiado y copia creada encima.
- carpeta nueva seguida, sin un segundo «punto de partida».

`app`: **974/974** (149 ficheros) · typecheck limpio.

## Lo que NO hace (por honestidad)

- No guarda ningún fichero de registro de dueños: el dueño vive en el nombre de la rama. Si un
  humano crea a mano un worktree en una rama `esme/<id>` que no le pertenece, se lo queda — es su
  máquina.
- No arregla el choque real de **dos tareas distintas** sobre la misma carpeta: van cada una en
  su rama, a distinto sitio, con su base distinta — ese bache sin registro lo va a:
  fila 20 no pedía anularlo, pedía que se sepa quién tiene qué.
