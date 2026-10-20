# Equivalencia económica: lo que Esme sustituye por 0 € (2026-10-20)

> Taller `qxntxkie`. Encargo: el informe de equivalencia (Palanca 11 de la tesis de escala).
> Pregunta: **¿cuánto costaría en APIs de pago el trabajo que ya se está haciendo en local, con la
> memoria de Esme?**
>
> Las cifras son de esta máquina y de este trabajo: 74 turnos reales registrados por la app, los
> precios de models.dev (el mismo catálogo que usa el panel de Uso) y los precios públicos de Mem0 y
> Hindsight. **No es una promesa: es una cuenta, con su script.**

## 0. La regla

Una equivalencia sólo vale si compara **el mismo trabajo**. Aquí se comparan tres cosas:

1. **El modelo**: los mismos modelos que ya se usan, pero pagando por ellos (los «free» de OpenCode y
   OpenRouter tienen hermanos de pago con el mismo peso y la misma calidad: GLM-5.3-Flash,
   MiniMax M3.1 Flash, Nemotron 3.5, Qwen3 Coder…).
2. **La memoria**: lo que costaría la memoria en la nube (Mem0, Hindsight) para el mismo contexto.
3. **La energía**: lo que consume tu equipo, que ya está pagado.

## 1. El trabajo real: 74 turnos tuyos

Sale de `~/.config/daimon-app/uso.jsonl`, el registro que la app escribe en cada turno (proveedor,
modelo, tokens de entrada y salida). Son 74 turnos de esta última noche: los agentes del Taller, el
OpenCode y el Qwen Code trabajando en los proyectos.

| | Turnos | Tokens de entrada | Tokens de salida | Coste real |
|---|---|---|---|---|
| Los 74 turnos | 74 | 2,06 M | 0,47 M | **0,0000 $** |

**Cero euros.** Porque el router de Esme elige primero lo gratis y lo local, y porque el modelo de
9B del equipo no cobra por token.

## 2. Lo que habría costado con las APIs de pago

Mismo modelo, mismo trabajo, pagando por los tokens (precios de models.dev, 20-oct-2026):

| Modelo | Turnos | Entrada | Salida | $/M (entrada/salida) | Con API de pago |
|---|---|---|---|---|---|
| MiniMax M3.1 Flash | 4 | 812.156 | 206.654 | 0,15 / 0,60 | **0,2458 $** |
| GLM-5.3-Flash | 14 | 729.227 | 212.512 | 0,099 / 0,35 | **0,1466 $** |
| Qwen3 Coder | 13 | 225.564 | 0 | 0,30 / 1,20 | **0,0677 $** |
| LongCat 2.5 Preview | 2 | 81.742 | 2.210 | 0,30 / 1,20 | **0,0272 $** |
| MiniMax M3.1 Flash (OpenRouter) | 1 | 33.448 | 1.886 | 0,15 / 0,60 | **0,0061 $** |
| Nemotron 3.5 Lightning | 10 | 46.548 | 3.907 | 0,05 / 0,20 | **0,0031 $** |
| Laguna XS 2.1 | 8 | 12.323 | 1.097 | 0,10 / 0,20 | **0,0015 $** |
| Nemotron 3.5 Super VL | 2 | 3.728 | 1.758 | 0,20 / 0,50 | **0,0016 $** |
| Qwen3.5 9B **local** | 1 | 1.828 | 43 | — | 0,0000 $ (ya lo tienes) |

**Total: 0,4996 $** por 74 turnos, es decir **6,75 $ por cada 1.000 tareas** del mismo trabajo.

Tres modelos que se usaron (Beam Free, North Mini Code, Xing4.0) **no tienen equivalente de pago
conocido** y quedan fuera: no se inventa un precio para rellenar una tabla.

### El detalle que explica la mitad de la factura

El coste no lo marca la memoria: lo marca **el historial del agente reenviado en cada turno**.
Cuatro turnos de MiniMax M3.1 Flash son 812.000 tokens de entrada porque cada turno lleva la
conversación entera. Con el 90 % de esa entrada leída de la caché de contexto (los precios de
`cache_read` están entre 0,010 y 0,025 $/M, contra 0,15 $/M de entrada normal), **el mismo trabajo
bajaría de 0,4996 $ a 0,3239 $**. Ese es el siguiente palanca real, y la app ya mide las lecturas de
caché de cada motor.

## 3. La memoria, que es lo que Esme sustituye de verdad

El examen (35 ítems reales, el mismo tálamo) dice que el contexto que Esme le da a una IA son
**1.157 tokens por tarea** (antes 1.497: un 23 % menos con la misma exactitud). Con eso, la memoria
en la nube costaría:

| Servicio | Precio público | Por tarea (1.157 tokens) | Por 1.000 tareas |
|---|---|---|---|
| **Mem0 Starter** | 19 $/mes por 5.000 recuperaciones | 0,0038 $ | **3,80 $** |
| **Mem0 Pro** | 249 $/mes por 50.000 recuperaciones | 0,0050 $ | **4,98 $** |
| **Hindsight Cloud** (recall) | 0,75 $ por millón de tokens de salida | 0,0009 $ | **0,87 $** |
| **Esme** | local | **0,0000 $** | **0,00 $** |

(Hindsight cobra además 10 $/millón de tokens al retener y 0,25 $/millón al mes lo guardado; Mem0
cobra por las altas. Sólo se comparan las lecturas, que es lo que hace una tarea.)

**La memoria en la nube cuesta entre 0,87 $ y 4,98 $ por cada 1.000 tareas. La de Esme, 0.**

## 4. La energía, que ya está pagada

Medido en esta máquina con el modelo de 9B cargando y generando (RTX 4050, 6 GB):

| | Vatios |
|---|---|
| En reposo (el modelo cargado, sin generar) | 19 W |
| Generando (pico medido) | **43 W** |

Una tarea de 30 segundos son 0,00036 kWh → **0,00005 €**. Mil tareas: **0,05 €**. Es la factura
eléctrica de un dispelador, no la de un servicio de memoria.

## 5. La cuenta entera

Por cada **1.000 tareas** del mismo trabajo, en esta máquina:

| | Con APIs de pago | Con Esme |
|---|---|---|
| Modelo | 6,75 $ | 0,00 $ |
| Memoria | 0,87 – 4,98 $ | 0,00 $ |
| Energía | — | 0,05 € |
| **Total** | **7,62 – 11,73 $** | **0,05 €** |

Y en el trabajo real de esta noche (74 turnos): **0,4996 $ → 0,0000 $**.

## 6. Lo que este informe NO dice

- **No dice que un modelo de 9B en local sea un modelo de frontera.** La comparación es de coste
  del mismo trabajo con modelos del mismo peso; la calidad se mide en otro sitio (el examen de
  memoria, que hoy empata con el mejor rival con un 23 % menos de contexto).
- **74 turnos son una muestra pequeña** de una sola máquina y una sola noche. El número se vuelve a
  calcular con `python3 scripts/equivalencia.py` cuando haya más uso registrado; el script lee el
  registro real, no una tabla escrita a mano.
- **No cuenta el coste de tu tiempo**: mantener ficheros `.md` al día, pegar contexto a mano,
  recordar qué hizo cada agente. Eso sí cuesta, y es justo lo que la herencia viene a quitar.
- **Los precios son de hoy (20-oct-2026)** y se leen de models.dev y de las páginas públicas de Mem0
  y Hindsight. Si cambian, se ejecuta el script y se rehace la cuenta.

## 7. Cómo se reproduce

```bash
curl -sL https://models.dev/api.json -o /tmp/modelsdev.json
python3 scripts/equivalencia.py ~/.config/daimon-app/uso.jsonl /tmp/modelsdev.json
```

La tabla de equivalencias del script es explícita a propósito: si un modelo no tiene hermano de
pago, se declara y no se cuenta.

## 8. Lo que esto significa

Esme no sustituye a los modelos de pago: los usa cuando toca y los evita cuando puede. Sustituye
**la memoria como servicio** (0,87 – 4,98 $ por cada 1.000 tareas) y **el peaje de las APIs**
(6,75 $ por cada 1.000 tareas) por una GPU que ya está en la mesa. El resto del gasto —la energía—
es de céntimos al mes.

La próxima palanca, con el número delante: **la caché de contexto** (0,4996 $ → 0,3239 $ con el
90 % de la entrada cacheada) y **la herencia** (cada tarea deja de empezar de cero).
