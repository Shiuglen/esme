# Planes y licencias (17 oct 2026)

**Qué pidió el creador:** «esto lo debemos hacer algo por lo que generemos ingresos… hay gente de mi lado que se le dará
acceso gratuito porque trabajan conmigo». Esme se vende, y los colaboradores entran gratis.

## Decisión: licencias firmadas que se comprueban sin servidor

Una licencia es un código `ESME-…` con dos partes: los datos (para quién, qué plan, desde cuándo, hasta cuándo) y una
**firma Ed25519** hecha con la clave privada del creador. La app lleva dentro solo la clave **pública**: puede comprobar
que un código es auténtico, pero no puede fabricar ninguno. Nadie puede inventarse un código ni cambiar el plan o la
fecha de uno ya hecho, porque la firma deja de cuadrar.

- **Por qué así:** funciona ya, sin servidor, sin cuentas y sin internet. Es lo mismo que usan muchas apps de escritorio.
- **Lo que no hace (todavía):** revocar un código ya entregado. Por eso los códigos de colaborador **caducan** (un año
  por defecto) y se renuevan. Cuando haya servidor, se añade una comprobación en línea opcional.
- **El cobro:** cuando se abra al público, una tienda que hace de comerciante (Lemon Squeezy o Paddle: cobran, pagan
  impuestos y emiten la licencia) entrega estos mismos códigos. Eso es otro paso y no cambia el formato.

## Planes

| Plan | Para quién | Precio |
|---|---|---|
| Gratis | cualquiera, con sus propios motores | 0 |
| Colaborador | el equipo del creador | 0 (invitación) |
| Pro | quien paga | **lo decide el creador** |
| Equipo | empresas | **lo decide el creador** |

Mientras Esme está en beta **no se bloquea nada**: el plan se ve y se guarda, y las funciones de pago se marcarán cuando
el creador decida cuáles son. Los precios no se inventan: los pone el creador.

## Piezas

- `app/src/main/licencia/licencia.ts`: firmar (solo la usa el script del creador) y leer/verificar (la usa la app).
- `app/src/main/licencia/clave-publica.ts`: la clave pública que va dentro de la app.
- `scripts/esme-licencias.mjs`: el creador crea sus claves una vez y emite invitaciones:
  `node scripts/esme-licencias.mjs invitar --para "Ana" --plan colaborador --dias 365`.
- La clave privada vive en `~/.config/esme-licencias/privada.pem` (permisos 600), **nunca en el repo ni en el vault**.
  Si se pierde, se crean claves nuevas y se reemiten los códigos; si se filtra, igual y se rota.
- Ajustes › Tu plan: pegar el código, ver el plan, para quién es y cuándo caduca, y quitarlo.
