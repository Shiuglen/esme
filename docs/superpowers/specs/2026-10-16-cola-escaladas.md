# La cola de escaladas (16 de octubre de 2026)

> Origen: your FYP (215 publicaciones, **52 de oro**), las pendientes declaradas en
> `lenguaje-visual-v2`, y los hallazgos vivos de esta sesión. Cada entrada dice de
> dónde nace y cómo la superamos. La regla del FYP: **no se copia; se absorbe y se supera**.

## El hito que destraba todo (probarlo esta sesión)

**La cadena completa del registro vive de punta a punta:**

```
catálogo vivo → Instalar (npm -g) → binario resuelto (ELECTRON_RUN_AS_NODE)
→ llavero → env del motor (QWEN_HOME propio + llave por env, nunca en disco)
→ session/new → prompt → trabajo real → diff en la copia aislada → estado «lista»
```

Evidencia: tarea `2kllxeke` con `qwen-code` (ruta gratuita `poolside/laguna-s-2.1:free`
vía OpenRouter) escribió `poema.txt` (+2 −0) y terminó **lista**, con la copia capturando el diff.
Referencias: `src/main/motores/credenciales.ts`, `registro-lanzar.ts`, `ipc-taller.ts` (escalera en `elegirMotor`).

**Realidad del llavero:** la llave de OpenRouter es válida, pero la cuenta **no tiene
créditos** (402 «never purchased credits»). Todo lo gratuito funciona; las rutas de pago
(`qwen/qwen3-coder-flash`, etc.) necesitan créditos. El puente ya está listo para cuando los haya.

## Cola 1 — El uso que cuenta historias (el hueco del §6 del FYP)

- **Qué:** el Uso de la app ignora el gasto y el trabajo del Taller. Las tareas ya cargan
  `uso` (entrada/salida/pensamiento/contexto) y cambios — la página Uso no los agrega a
  su ranking ni a sus historias.
- **De dónde nace:** FYP §6 acción 5 («integrar el gasto de los motores del Taller — era
  el hueco detectado») + las 4 acciones del FYP para Uso (como contador de historias,
  proyectos y trabajo real, no de suscripciones).
- **La superación:** cada tarea del taller levanta *su historia* en Uso: qué motor, cuánto
  costó, qué cambió. Y un bicho de verdad: en esta sesión las tareas con motor del registro
  reportan `contextoUsado` pero `entrada/salida` en cero — hay que mapear el `usage_update`
  del ACP por motor (el traductor de `sesion-acp.ts`).
- **Estado:** siguiente en la cola. La base de datos ya existe; falta el grifo y la página.

## Cola 2 — Bichitos que nacen de tu red (el principio aprobado)

- **Qué:** cada motor del Taller tiene su criatura viviente — y **ninguna copia es igual a otra**,
  porque el bichito nace de la red del usuario (su atlas): forma procedimental derivada de sus
  nodos y aristas, no arte hecho a mano.
- **De dónde nace:** FYP §2 (la decisión aprobada: «el ser nace de la red del usuario;
  su forma sale de su propia mente») + el §1 (lo analógico vence: materia impresa, tinta).
- **La superación:** nadie tiene esto. Los filas HUD del Taller y los avisos ganan un
  pequeño ser: dibujado con la misma tinta, animado con la física del modo actual
  (Explorar, Construir, Evolucionar, Sombra).
- **Estado:** después del Uso. Coste bajo si nace procedimental del atlas (`daimon` ya tiene la red).

## Cola 3 — La Guía de la revisión (pendiente declarada)

- **Qué:** en la revisión guiada del Taller, un modo «Guía»: explicación paso a paso del diff
  con diagrama antes/después por bloque.
- **De dónde nace:** pendiente declarada en `lenguaje-visual-v2` §3 + FYP §6 (revisiones
  con historia, no con ruido).
- **Estado:** tras el Uso/Bichitos (depende del diff, que ya existe y es sólido).

## Cola 4 — Conflicto de fuentes en la memoria (el campo de batalla del §3)

- **Qué:** cuando dos fuentes del cerebro se contradicen, la interfaz lo **muestra** con la
  acción de tres botones del FYP: «Usa la de 2024 / Pregúntame cada vez / Quita la de 2022».
- **De dónde nace:** FYP #10 y #158 (TencentDB Agent Memory: −61 % de tokens, +51 % de
  aciertos; conflicts explícitos como feature, no como bug).
- **La superación:** ningún competidor resuelve conflictos *con el usuario cara a cara*;
  la mayoría los esconde.
- **Estado:** para cuando la cola 1 libere presupuesto (comparte la página del Uso del cerebro).

## Cola 5 — El resto de las pendientes declaradas

- Vista previa del Taller con clic para editar (`lenguaje-visual-v2` §3).
- Trazas aurora por tipo + vista esfera en Memoria (§4).
- Bienvenida «la mente despierta»: malla a pantalla completa, esfera de partículas,
  fuentes a absorber, autonomía (§5).
- Suscripciones completas en Uso: cuota con proyección (§22 theo — en parte hecha).
- Comandos en contenedor: necesita podman/docker en el equipo (bloqueo de hardware, no de código).

## La doctrina de lo inédito (la vara de «no es de este mundo»)

1. **Lo que nace de ti:** bichitos y el ser de Esme procedimentales del atlas del usuario.
2. **Lo que conversa:** memoria que muestra sus conflictos y deja decidir.
3. **Lo que cuenta su historia:** cada tarea, cada gasto, cada uso levanta su historia.
4. **Lo que se supera, no se copia:** el FYP es materia prima; la forma es nuestra (tinta y luz).
