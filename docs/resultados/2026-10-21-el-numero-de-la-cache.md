# El número de la caché, y un número que no hacía falta (2026-10-21)

> Taller `qxntxkie`. Punto 8 de la cola abierta real
> (`docs/resultados/2026-10-21-la-cola-abierta-real.md`): *«El número de la caché — la forma está
> puesta; falta medir el acierto de caché contra el proveedor»*.
>
> Al medirlo, salió el número de la caché **y** un número que nadie estaba mirando: **la app
> anotaba 6,5 veces más tokens de los que hubo**.

## 0. Lo que se midió y con qué

Los datos son los que la app ya escribe en cada turno: `~/.config/daimon-app/uso.jsonl` (150
turnos, con tokens de entrada, salida y caché). Los precios salen del mismo catálogo que usa el
panel de Uso (models.dev, la copia cacheada en `catalogo-modelsdev.json`).

El script: `scripts/banco_memoria.py` (no toca nada: solo mide).

## 1. El acierto de caché

| Ruta | Turnos | Entrada fresca | Leída de caché | Acierto |
|---|---|---|---|---|
| **El chat** | 38 | 112.443 | 81.315 | **42,0 %** |
| **El Taller** (ACP) | 112 | 83.216.940 | **0** | **0 %** (no lo reporta) |

Dos cosas distintas, y hay que distinguirlas:

1. **En el chat la caché funciona**: el 42 % de la entrada de cada turno sale de la caché. Eso es lo
   que la forma de Esme prepara (el prefijo constante al principio, `app/src/main/providers.ts`), y
   es el número que faltaba.
2. **En el Taller no se sabe**: el motor por ACP **no manda** los tokens leídos de caché
   (`cachedReadTokens` viene a null), así que el 0 % no es «no hay caché»: es **que no se mide**.
   La app no puede saberlo, y su cálculo de coste trata esos tokens como frescos.

## 2. El número que nadie estaba mirando: el uso del Taller estaba inflado 6,5 veces

El Taller resta lo ya anotado al acumulado que manda el motor, y así saca el delta de cada turno.
Funciona **si el acumulado es de la sesión**. Y no lo es siempre:

- El motor de **OpenCode reparte su acumulado entre varias tareas** (varias copias del Taller
  abiertas a la vez): cuando una tarea informa, el salto incluye lo que gastaron las demás.
- Cuando la **app se reinicia** y la tarea vuelve del disco, el primer informe trae el acumulado
  entero de un proceso que ya no es el de antes.

La regla para detectarlo no depende del motor: **un turno no puede leer más tokens que la ventana
del modelo**. Con la ventana del catálogo (1.000.000 para MiniMax M3.1) :

| | Turnos | Tokens de entrada | Factura imputada |
|---|---|---|---|
| Todo lo anotado | 150 | 83.329.383 | 0,0000 $ |
| **Sin los saltos imposibles** | 134 | **12.820.539** | 0,0000 $ |

**16 de 150 turnos** tienen más tokens de entrada que la ventana del modelo (el mayor: 7.445.991
tokens en un turno, con una ventana de 1.000.000). Esos 16 turnos concentran el **84,6 %** de los
tokens de entrada que la app había anotado. La foto: lo que la app enseñaba era **6,5 veces** lo
que pasó de verdad.

(La factura es 0 porque los modelos que se usaron son los gratuitos; el error no se ve en el
dinero, se ve en los tokens, y en cualquier día que se use uno de pago.)

## 3. Lo que se ha hecho

**El arreglo** (`app/src/main/taller/uso.ts`, con sus pruebas):

1. El Taller entiende los dos idiomas del uso: **acumulado** (como dice el ACP) y **por turno**.
   Si el contador baja de un informe al siguiente, es que va por turno; si sube, va acumulado.
2. Un salto mayor que la ventana del modelo **no se cuenta**: se descarta y se vuelve a basar en
   lo que el motor dice. El turno siguiente ya sale bien (probado: 7.445.991 → 54.009).

Lo que **no** se ha hecho, y por qué:

- **No se han inventado precios ni ventanas**: si el catálogo no dice la ventana del modelo, no hay
  cota y el salto se cuenta tal cual (mejor un número grande que un número inventado).
- **No se ha tocado el panel de Uso**: el cambio es solo de lo que se anota, no de lo que se pinta.

## 4. La cola que sale de aquí

| # | Qué | Por qué |
|---|---|---|
| 1 | **Que el Taller pida los tokens de caché al motor** | Si el ACP los trae, se anotan; hoy el Taller no puede saber cuánto de su contexto vino de la caché |
| 2 | **El historical de las tareas tiene el número viejo** | Las tareas que ya estaban en el disco guardan el acumulado inflado; el arreglo evita que crezca, pero no reescribe el pasado |
| 3 | **El coste por petición** (punto 18 de la cola) | Con el delta ya honesto, se puede atribuir el coste a la petición y no al turno |

## 5. Cómo se reproduce

```bash
python3 scripts/banco_memoria.py ~/.config/daimon-app/uso.jsonl ~/.config/daimon-app/catalogo-modelsdev.json
```

## 6. Lo que este documento NO dice

- No dice que la caché del chat sea «buena» o «mala»: dice **42 %**, que es un hecho medido sobre
  38 turnos, no una tasa general.
- No dice que los 12,8 M de tokens sean el «número real» del Taller: es el número **sin los saltos
  imposibles**; el gasto real de un turno se sigue sin poder separar por tarea cuando el motor
  reparte su acumulado.
- No toca la decisión de reiniciar la app (punto 9 de la cola): eso es del creador, porque reiniciar
  termina la sesión del agente.
