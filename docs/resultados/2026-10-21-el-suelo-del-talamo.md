# El corte que se comía el contexto: el suelo del tálamo (2026-10-21)

> Taller `qxntxkie`, tarde. La Palanca 6 (el espejo) tenía un techo que no era del espejo: era
> del tálamo. **El banco del espejo subió de 0,9206 a 1,0000 sin tocar el espejo.**

## 0. Qué se pregunta

El banco del espejo medía 0,8148 en la app de Electron y 1,0000 en los dos binarios nativos. La
pregunta era: ¿el espejo es malo con las apps, o el queCome mal es otro? Y la contestación, con
números: **la app no perdía nada por el espejo; perdía la mitad de lo que el espejo le daba.**

Al mirarlo de cerca, la causa no estaba en el espejo, ni en la forma de la evidencia, ni en las
preguntas: estaba en **el corte del tálamo**.

## 1. El número

Dos instrumentos, la misma mente, el mismo presupuesto (1.500 tokens).

**El banco del espejo** (se absorbe el programa y se mira si los hechos clave están en el contexto):

| Programa | Forma | Antes | **Ahora** | Tokens (antes → ahora) |
|---|---|---|---|---|
| `app/out` (la app de Esme) | Electron | 0,8148 | **1,0000** | 364 → 1.316 |
| `libffmpeg.so` | nativo | 1,0000 | **1,0000** | 169 → 619 |
| `ollama` | nativo | 1,0000 | **1,0000** | 215 → 844 |
| **Conjunto** | | **0,9206** | **1,0000** | 266 → 982 |

**El examen** (prueba0, 104 preguntas visibles + 104 paráfrasis y 70 ocultas; se entrena con el
visible y se mide en el oculto):

| Política | Oculto | Visible | Tokens (visible) |
|---|---|---|---|
| corte absoluto 2,0 (la de antes) | 0,9143 | 0,8438 | 1.222 |
| **corte 2,0 + suelo de 20** | 0,9143 | **0,8510** | 1.498 |
| llenar el presupuesto (sin corte) | 0,9143 | 0,8462 | 1.498 |

El oculto no se mueve (0,9143 en todos los casos: es el techo de este examen) y el visible **sube**
por encima de llenar el presupuesto: 0,8510 contra 0,8462. No es que el contexto grande sea mejor
que el pequeño; es que el contexto **bien elegido** es mejor que el grande.

## 2. Qué pasaba (el mecanismo, con la línea)

`daimon/thalamus.py`, en `compose()`:

```python
if self.max_drop is not None:
    ranked = [t for t in ranked if t[1] >= ranked[0][1] - self.max_drop]
```

El corte es **adaptativo en apariencia pero absoluto en la práctica**: entra lo que puntúa a menos
de 2,0 puntos del mejor. El problema no es el número: es **la escala**. La puntuación es un modelo
lineal (`x @ w`) sin cota superior, así que 2,0 significa cosas distintas según la pregunta:

- en el examen, las puntuaciones van juntas (7,25 · 7,04 · 6,79…) y el corte quita poco;
- en la app de Electron, un trozo corto («4 de 4» de las funciones más llamadas) puntúa 6,71 y
  todo lo demás cae a 4,65: **unescalón**. Con 2,0 de margen, sobrevive **un** trozo.

Medido, con la misma mente y el corte de antes:

| Pregunta | Candidatos | Sobrevivientes | Tokens | Acierto |
|---|---|---|---|---|
| ¿Qué canales IPC expone out? | 180 | 12 | 859 | 0,89 |
| ¿Qué ventanas tiene out…? | 286 | 2 | 158 | 1,00 |
| **¿Qué funciones de out se llaman más?** | 261 | **1** | **35** | **0,00** |

35 tokens de 1.500. La pregunta de las funciones no la respondía mal la mente: **la mente no tenía
la respuesta en la cabeza**. No le llegaba.

Y hay una segunda cara, más fea: **este corte se estrecha solo**. La diferencia entre el mejor y el
segundo depende de cuántos recuerdos compiten; cuanto más crece la mente, más separados caen los
scores y más se come el corte. El límite se cierra justo cuando el producto mejora.

## 3. El arreglo: el suelo

Un corte puede quitar ruido; **no puede dejar a la mente ciega**. Se le añade un suelo:

```python
if self.min_candidatos and len(ranked) < self.min_candidatos:
    ranked = todos[:self.min_candidatos]     # el corte no puede dejar el contexto vacío
```

`min_candidatos` (configurable, 20 por defecto) es el número mínimo de trozos que entran al
contexto aunque el corte los haya podado. Con eso, el escalón deja de importar: si el mejor gana
por goleada, entran los 20 mejores, no uno.

Se probaron las dos maneras de arreglarlo y **se quedó la más simple**:

| Mecanismo | Acierto del banco | Tokens | Examen (visible) |
|---|---|---|---|
| solo el corte (antes) | 0,8148 | 364 | 0,8438 |
| corte **relativo** (fracción del mejor) | 1,0000 | 1.207 | 0,8438 |
| corte relativo + suelo | 1,0000 | 1.335 | 0,8462 |
| **corte absoluto + suelo (el que se queda)** | **1,0000** | **1.316** | **0,8510** |

El corte relativo (la distancia al mejor medida en fracciones de ese mejor) también funciona, pero
el suelo ya resuelve lo mismo y además garantiza que el contexto tenga material: **una sola pieza
en vez de dos**, y la que se puede defender con un número.

## 4. La curva (para re-tunearlo cuando la mente crezca)

`scripts/curva_corte.py` deja la curva a la vista con los dos instrumentos:

| Suelo | Examen (oculto) | Examen (visible) | Banco del espejo | Tokens (banco) |
|---|---|---|---|---|
| 0 (lo de antes) | 0,9143 | 0,8438 | 0,8148 | 364 |
| 8 | 0,9143 | 0,8510 | 0,9815 | 694 |
| 12 | 0,9143 | 0,8510 | 0,9815 | 918 |
| **16** | 0,9143 | **0,8510** | **1,0000** | 1.181 |
| **20** | 0,9143 | **0,8510** | **1,0000** | 1.316 |
| 24 | 0,9143 | 0,8462 | 1,0000 | 1.423 |
| 30 | 0,9143 | 0,8462 | 1,0000 | 1.490 |

El mejor momento está entre 16 y 20 (meseta): por debajo el banco pierde alguna respuesta; por encima
vuelve el ruido y el examen visible baja. **Se elige 20**: es el centro de la meseta y el que
aguanta mejor un escalón más profundo.

## 5. Lo que cuesta y lo que no cuesta

- **Cuesta contexto**: 266 → 982 tokens de media en el banco. La mente usa el presupuesto que se
  le da; antes lo regalaba. En la app real el cambio es pequeño: la consulta de la app pasa de
  2.922 a 4.000 tokens (el presupuesto que la propia app pide) y las demás no se mueven.
- **No cuesta acierto**: el examen no baja en ningún caso; en el visible sube.
- **No arregla lo que no era esto**: el binario nativo seguía en 1,0000 porque ahí no hay escalón.
  Lo que se arregla es la app, que era el techo del banco.

## 6. Qué queda pendiente

- La **app que está corriendo** tiene el tálamo viejo en memoria: el cambio entra cuando se
  reinicie (la app es el padre de los agentes del Taller: reiniciarla los mata).
- El **examen con juez** (LLM de verdad) no se ha corrido: no hay Ollama levantado en esta máquina.
  El acierto que aquí se mide es «los hechos clave están dentro del contexto», que es la prueba
  previa; el juez decide si la respuesta mejora también.
- El corte sigue siendo **absoluto** (2,0 puntos). Con el suelo ya no deja a la mente ciega, pero
  sigue siendo un número que no significa lo mismo en todas las preguntas. Si algún día se
  quiere, el corte relativo está medido y documentado aquí.
