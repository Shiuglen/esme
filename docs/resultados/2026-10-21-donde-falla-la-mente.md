# Dónde falla todavía la mente (2026-10-21)

> Taller `qxntxkie`, tarde. Después del suelo del tálamo, la pregunta es: ¿qué queda roto? La
> respuesta, con el examen delante: **casi nada de la recuperación**. Lo que queda son tres
> preguntas, y dos de ellas son del propio examen.

## 1. Las tres que quedan

El examen oculto (35 preguntas, originales): **acierto 0,9286**. FALLAN tres:

| Pregunta | Trozo del oro | Contexto | Qué pasa |
|---|---|---|---|
| `p1-17` «Cuando te dije "vas muy rápido", ¿qué cambio de método pedí?» | 0,00 | 9 trozos | **El oro no es el oro.** La evidencia señalada es un trozo de pyautogui y un venv a medias, de otra sesión. Lo que la mente trae es justo la respuesta: el primer candidato es *«Tienes razón, y lo digo sin rodeos: fui demasiado rápido…»*. |
| `p2-22` «¿Qué paquete hay que instalar en Ubuntu para que arranque el AppImage…?» | 0,50 | 7 trozos | La evidencia que falta (puesto 103) es el trozo de *«la koi queda guardado. Sala de control: fuera la plantilla cian y violeta…»*: no tiene nada que ver con la pregunta. La que sí responde (`sudo apt install libfuse2t64`) entró, puesto 9. |
| `p4-23` «¿Qué instrucción de autonomía te di en AGENTE-AUTONOMO…?» | 0,00 | 14 trozos | Fallo real de trozo: las dos evidencias ni siquiera estaban entre los candidatos. Pero el puesto 3 es *«# 🤖 Agente autónomo > Prompt maestro del usuario»*: el documento correcto estaba en la cabeza. |

**Ninguna de las tres es un fallo del tálamo.** Dos son el examen señalando la evidencia equivocada
(o una evidencia que no es del tema), y la tercera es un trozo que no entró aunque el documento
sí. Y las tres se ven en un minuto, con las herramientas que ahora están en el repo:

- `scripts/donde_falla.py` — las preguntas que no llegan a su respuesta, con la evidencia que faltó.
- `scripts/diagnostico_evidencia.py p1-17` — para una pregunta: si la evidencia estaba entre los
  candidatos, en qué puesto, si era de cabeza o de cola, y qué traía la cabeza. Distingue **fallo de
  pool** (no la busca) de **fallo de ranking** (la busca y la deja fuera).
- `scripts/examen_hechos.py` — la segunda lente: ¿el contexto trae los hechos clave de la
  respuesta?

## 2. La segunda lente (y una hipótesis que salió falsa)

La hipótesis era: «el examen mide el **trozo**, no la **respuesta**; por eso castiga a la mente
cuando trae una memoria mejor que la señalada». Se midió con la misma regla de palabras del juez
(60 % de cada hecho clave) aplicada al contexto:

| Lente | Oculto (originales) | Oculto (paráfrasis) | Visible |
|---|---|---|---|
| por **trozo** (el que usa el examen) | **0,9286** | 0,9000 | 0,8510 |
| por **hechos** (regla del juez sobre el contexto) | 0,8333 | 0,7667 | 0,7962 |

**Los hechos son más estrictos, no más benévolos**: un hecho corto («método deliberado») tiene que
estar casi palabra por palabra. La hipótesis era falsa y el examen se queda con la lente del
trozo. Pero la segunda lente **sí aporta**: ahora el examen dice las dos cosas —de dónde sale la
respuesta (el trozo) y si las palabras de la respuesta están (los hechos)—, y `prueba0.py retrieval`
las publica juntas.

## 3. Dónde está el techo ahora

El examen ya supera al rival que la casa se puso como meta (`rag_denso_eg`): 0,929 contra 0,900 en
oculto-original y 0,764 contra 0,721 en oculto-parametrafía. El banco del espejo está en 1,0000.
Las tres preguntas que quedan no son un techo de la mente: son **tres filas mal apuntadas de un
examen** (los datos del examen viven fuera de git, en `data/bench/`).

**Lo que sigue, y por qué no se toca aquí:** arreglar el oro del examen (apuntar a las evidencias
que de verdad responden) es cambiar el examen. Se puede, pero es una decisión del creador, no un
arreglo de la mente: si el examen se corrige solo, el número sube sin que la mente haya mejorado
nada. Lo honesto es decirlo y seguir midiendo con el juez de verdad (con LLM), que es el que
dicta si la respuesta es buena.

## 4. Lo que queda para el siguiente turno

1. **El juez con LLM** (no se pudo correr: no hay Ollama levantado en la máquina). Es la única
   medida que responde a «¿la respuesta mejora?».
2. **El espejo de las webs**: REA sabe analizar un paquete de web (`analyze-web-bundle`) y el
   espejo todavía no lo mira. Es la tercera forma de programa (Electron, nativo, web) y la que
   más se parece a lo que el creador mira todos los días.
3. **La app que está corriendo** tiene el tálamo viejo en memoria: el suelo entra al reiniciar
   (y reiniciar la app mata a los agentes del Taller: es su padre). Decisión del creador.
