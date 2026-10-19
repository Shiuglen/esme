# 08 · Marca: Esme como ser, no como herramienta

> Visión 2026-10-18. Estado: **en curso** (documento vivo; se amplía por secciones).
> Alcance: solo investigación y diseño. No toca código de la app.

## Índice
1. Diagnóstico de la marca actual
2. Lo que aprendemos de seres digitales y marcas amadas
3. Sistema A
4. Sistema B
5. Sistema C
6. Recomendación razonada
7. Fuentes

---

## 1. Diagnóstico de la marca actual


### 1.1 Qué hay hoy (inventario, leído del código y de las capturas)

Esme no tiene **una** marca: tiene **siete** cosas que hacen de marca a la vez, y ninguna manda.

| Pieza | Dónde vive | Qué es | Dónde se ve hoy |
|---|---|---|---|
| **Señal** | `marca/senal.ts`, `SenalVista.tsx` | 3–5 líneas isométricas con un potencial de acción; símbolo «provisional» según `ESME.md` | Cabecera (junto a «esme»), riel de navegación, icono de escritorio |
| **Chispa** | `marca/chispa.ts`, `ChispaVista.tsx` | Esquirlas de cristal facetado alrededor de un núcleo; cada esquirla es un tema de tu mente | Casi en ningún sitio visible en las capturas actuales |
| **Sello** | `marca/sello.ts`, `SelloVista.tsx` | Cuadrado bermellón con la constelación de tu mente en blanco; «lo aprobaste tú» | Revisiones del Taller |
| **Ser / Bicho** | `marca/ser.ts`, `SerVista.tsx` | Criaturas de línea nacidas de un trozo de tu constelación, con ojos que parpadean | Selector de tareas, Ajustes (motores) |
| **Orbe** | `ui/Orb` (React Bits) | Esfera brillante 3D | Conversación vacía; todas las tarjetas de la Tienda |
| **Orbe de voz** | `ui/voz/orb` (ElevenLabs UI) | Esfera 3D reactiva a la voz | Pieles Océano y Cosmos |
| **Cara** | `ui/presencia/agent-face` (paquete `agentfaces`) | **El triángulo lila con ojos** | Portada (piel Arcilla) y **cada motor del Taller** |

Más el **logotipo**: la palabra «esme» en minúsculas, compuesta en la letra de títulos de la piel que lleves puesta (Sora gruesa en Arcilla, Bodoni en Tinta y Luz). Es decir: el logotipo cambia cada vez que cambias de piel.

Historia que pesa (de `superpowers/specs/2026-10-11-app-v2-decisiones.md`): el logo está **abierto** desde el 11-oct. El creador ya descartó, y no hay que repetir: gema 3D realista, gema plana, «e» tallada, anillos, jardín, eclipse/anillo de diamante («triste»), medusa, centinela de placas con ojo («geométrico y raro»), dragona pixel, formas orgánicas (mercurio, ferrofluido, flor, rayo, murmuración, S viva: «muertas»), kitsune («bien malo»), ajolote en todas sus versiones («no es sofisticado»), mariposa Psique («Esme no puede ser una mariposa»). Sus requisitos: **monocromo** (el color es una capa intercambiable), único, «bestial», de otro mundo, sofisticado, limpio, que se ame, **animable con funciones**, mejor que Claude/OpenAI. Sus referentes elegidos: Obsidian (cristal facetado), Supabase (rayo de dos mitades desplazadas) y Claude (chispa orgánica): un elemento natural hecho símbolo, 2–4 tonos planos, asimetría artesanal, un color dominante, energía animable; **ni letras ni criaturas**.

### 1.2 Diagnóstico, pieza por pieza

**1. No hay invariante.** Con el sistema de pieles todo lo visual se cambia: color, letra, forma, presencia. Eso está bien para la *casa*, pero hoy también se cambia **el propio ser**: en Arcilla Esme es un triángulo; en Océano, una esfera de voz; en Tinta y Luz, un orbe; en Mínimo, nada. Y el logotipo cambia de letra. Una marca es lo que **no** cambia cuando todo lo demás cambia. Ahora mismo, si tapas la palabra «esme», no hay nada en la pantalla que diga Esme.

**2. El ser más visible ni siquiera es nuestro.** El triángulo con ojos de la portada y los nueve triángulos del Taller son la cara por defecto del paquete `agentfaces`. Cualquier app que lo instale tiene la misma criatura. Para un producto cuya promesa es «propia e incomparable, nunca una copia» (regla madre de `ESME.md`), es el fallo más grave de la marca. Además:
- Es **el mismo triángulo para Qwen Code, Cline, OpenCode, Claude, Bob…**: borra la diferencia entre Esme y sus empleados. Si todos tienen la cara de Esme, Esme no tiene cara.
- Está **pegado encima de tu mente** (la constelación de 2.346 recuerdos queda detrás, tapada). Es una pegatina sobre un cuadro: el detalle más valioso de la portada, tu mente real, queda de fondo de una mascota genérica.
- Es infantil en el sentido que el creador ya rechazó con el ajolote: «no es sofisticado».

**3. La Señal no aguanta el tamaño pequeño.** A 24 px (cabecera, riel) las líneas isométricas se leen como un monigote bailando o un ecualizador garabateado (ampliado en `scratchpad/marca/zoom-logo.png`). Su significado (potencial de acción en perspectiva) es inteligente pero **necesita explicación**, y un símbolo que hay que explicar no se recuerda. Además «señal/onda/ECG» es territorio saturado (apps de salud, audio, monitorización).

**4. El orbe es el símbolo más genérico de la IA 2024–2026.** Una esfera brillante con degradado es lo que usan Siri, Gemini Live, el modo voz de ChatGPT y cada plantilla de «AI assistant». Contradice frontalmente la lección del FYP del creador («lo analógico vence a lo brillante; fuera el cristal»). En la Tienda, **las 12 pieles muestran la misma esfera** cambiando de color: el escaparate dice que todas las pieles son la misma.

**5. «esme» en minúscula dice herramienta, no ser.** La minúscula funciona en marcas que quieren parecer utilidades amables (un comando, una app). Pero toda la copia la escribe con mayúscula («Esme monta una copia aislada…», «Esme le da a la IA…»). El nombre propio de un ser va con mayúscula; la contradicción entre logotipo y texto debilita las dos.

**6. La voz habla de Esme en tercera persona y de «la IA» como de otra.** Ejemplos reales de las capturas:
- Conversación vacía: «Esme le da a la IA solo lo que necesita de tu memoria. Verás qué recordó…» → si Esme es el ser, ¿quién es «la IA»? El usuario ve a un intermediario, no a alguien.
- Tienda: «herramientas… del registro oficial de MCP» → jerga de ingeniero en el escaparate.
- Portada: debajo de «Buenas tardes.», cuatro motores con «falló» en rojo. El ser te recibe con una lista de fracasos de sus empleados.
- Taller: «Error», «Libre», `laguna-s-2.1:free)` (con paréntesis huérfano) bajo cada cara.
Es la voz de un panel de control educado, no la de alguien que te conoce.

**7. Lo que sí es oro (y hay que salvar).**
- La idea de que **los símbolos nacen de tu mente**: el Sello, la Chispa y los Bichos se generan de los temas reales de tu atlas. Ningún competidor hace eso. Es la semilla de la marca.
- **El Sello bermellón**: un gesto analógico con sentido («esto lo aprobaste tú»). Es lo más memorable que tiene Esme hoy.
- **La doctrina Tinta y Luz**: materia impresa, tinta que envejece, luz solo en lo vivo, Bodoni cursiva para rotular. Es la estética que el FYP del creador premia.
- «Buenas tardes.» en serif gigante con punto final: tiene aplomo.
- El nombre: *Esme*, del francés antiguo *esmer* («amar, estimar»), «la querida». Pocas IA tienen un nombre con una historia tan cálida y tan corta.

**Conclusión del diagnóstico.** El problema no es que sea feo: es que **Esme no tiene cuerpo propio**. Hay piezas brillantes (Sello, mente que se dibuja, Tinta y Luz) y piezas prestadas (triángulo, orbe) que se pisan. La marca necesita **un único ser invariable** —forma, movimiento, sonido y voz— que ninguna piel pueda redibujar (solo recolorear), y que sea a la vez el logo, la presencia y el estado.

---

## 2. Lo que enseñan los seres digitales y las marcas que la gente ama

Investigación de 2026-10-18 (fuentes en la sección 7). Separo **hecho** (lo que dice la fuente), **inferencia** (lo que saco yo) y **hipótesis** (lo que habría que probar). De cada caso tomo la idea, nunca la interfaz.

| Caso | Hecho | Lección para Esme |
|---|---|---|
| **Duolingo (Duo)** | Personaje animado por estados (reposo, escuchando, pensando, hablando) en Rive, un solo sistema reutilizado. En feb-2025 «mataron» a Duo: ~169.000 menciones en dos semanas, #ripduo más de 45.000 veces; según datos secundarios de Similarweb, descargas Android +38 % al día siguiente. Los analistas lo atribuyen a que era **coherente con el carácter** de Duo. | Inferencia: la gente no ama un dibujo, ama **un carácter con historia que le pasa cosas**. Un ser necesita **acontecimientos** (nacer, asentarse, cumplir años), no solo estados. |
| **Mailchimp** | Su guía: la **voz** se mantiene casi igual; el **tono** cambia según la situación y el ánimo del lector. Freddie, la mascota, **nunca habla**: no se escribe con su voz. | La voz de Esme debe ser una sola en todas las pieles; lo que cambia es el tono (error, logro, madrugada). Separar el símbolo (que no habla) de la voz (que es Esme) evita el efecto mascota. |
| **Clippy** | Odiado por interrumpir sin contexto, animarse para llamar la atención cuando estabas pensando y no dejarse apagar. Microsoft lo apagó por defecto en Office 2000 y lo quitó en 2007. | Un ser con presencia tiene que **ganarse el derecho a interrumpir**. Cuanto más «personaje», más disciplina. Esme quieta por defecto. |
| **Daimonion de Sócrates** (Platón, *Apología* 31d) | Una voz interior que **solo advierte, nunca ordena**; su silencio es asentimiento. | El nombre en clave del proyecto es *Daimon*. Regla de voz: cuando Esme se adelanta, **avisa; no manda**. Y su silencio también comunica: si no dice nada, va bien. |
| **Dæmons de *La materia oscura*** (Pullman) | El dæmon es el alma visible; en la infancia cambia de forma y en la adolescencia **se asienta** en una forma fija que refleja el carácter de su persona. | Idea, no interfaz (nada de animales): **la forma de Esme podría asentarse** cuando tu mente madura. Un rito único por persona y algo que se puede contar. |
| **Google (los cuatro puntos)** | En el rediseño de 2015, el movimiento era el núcleo de la identidad: los estados animados de los puntos (escuchar, no entender) se pensaron **antes** que el logo estático. | Diseñar primero **cómo se mueve** Esme en cada estado y después la versión quieta. El logo es una pose del ser, no al revés. |
| **WALL·E** (Ben Burtt) | Voz hecha de **voz humana resintetizada** más ruidos cotidianos (carritos de supermercado, un saco arrastrado). Burtt buscaba «la sensación de un alma» con el sonido. | El sonido de Esme no debe ser «bip» de sistema: grano humano (aliento, tarareo) mezclado con materia (papel, madera, tinta). |
| **Animal Crossing (animalés)** | Habla hecha de sílabas grabadas, troceadas y aceleradas; el tono sube si el personaje está contento y baja si está triste. | Hipótesis: unas sílabas casi inaudibles mientras Esme escribe dan vida sin palabras. **Riesgo alto de infantilizar**: solo en pieles que lo pidan. |
| **Tamagotchi** | Paola Antonelli (MoMA): de los primeros objetos que demostraron que el diseño puede crear vínculo emocional con una máquina, por ciclos de **cuidado y descuido, obligación y recompensa**; el peso emocional venía del comportamiento, no del gráfico. | El vínculo sale de lo que Esme **hace contigo a lo largo del tiempo**, no de lo bonito que sea. Pero nunca castigar (nada de «Esme está triste porque no viniste»). |
| **Sesame (voz Maya)** | Persigue la «presencia de voz» con imperfecciones humanas: respiraciones, pausas, autocorrecciones. | Cuando Esme hable, los silencios y las pausas forman parte de su marca. |
| **Teenage Engineering** | Minimalismo brutal más juego; los límites como motor; objetos que se aman por cómo se sienten al usarlos. | Pocas piezas, cada una perfecta, con gracia. El placer de uso como marca. |
| **Nothing** | Construyó su identidad con tipografía de matriz de puntos y casi monocromo; en enero de 2026 anunció un logo más convencional. | La trama de puntos es reconocible, pero **una estética de moda caduca**. Lo que dura es una idea propia (en Esme: **tus recuerdos son los puntos**). |
| **Anthropic / Claude** | Identidad trabajada ~2,5 años con el estudio Geist; símbolo irregular, naranja terroso, que la gente lee como asterisco, molinillo o ameba; wordmark con serifa; mascota aparte (Clawd, un cangrejo de píxeles que solo sale al arrancar Claude Code). | Inferencia: una marca de IA cálida se separa del azul geométrico del resto. Y **el logo y el personaje viven separados**: el símbolo es sobrio y la criatura sale en momentos concretos. |
| **Kamon** (blasones japoneses) | Se trazan solo con **compás y regla** (círculos perfectos y rectas); monocromos; hay decenas de miles, cada familia con el suyo. | Una **gramática fija** con variación por persona: la marca es la regla de construcción y cada mente tiene su versión. |
| **Hanko** (sello japonés) | El sello rojo bermellón (*shuniku*) sustituye a la firma: aprobación, identidad, acuerdo. | Confirma el acierto del Sello de Esme: mantenerlo como gesto de «lo aprobaste tú». |
| ***Her*** (Geoff McFetridge) | Las interfaces de Samantha son casi invisibles: caligrafía cursiva cuando llama y patrones que giran cuando no está. | Inferencia: un ser **no necesita cara** para ser alguien. Su presencia puede ser letra, ritmo y luz. |

**Lo que sale de todo esto (las reglas que siguen los tres sistemas):**
1. **Invariante del ser:** forma, movimiento, sonido y voz no cambian con la piel. Las pieles solo cambian el color (y, como mucho, el material).
2. **Monocromo y geométrico**, trazable con compás y regla, para que sobreviva a 16 px y a cualquier color.
3. **Nace de tu mente**, porque es lo único que nadie más tiene. Gramática fija y semilla tuya.
4. **El movimiento se diseña primero.** Seis estados (`reposo`, `escuchando`, `pensando`, `hablando`, `trabajando`, `te-necesita`, los de `tinta/estado.ts`) y una animación con funciones, no con vídeos.
5. **Acontecimientos, no solo estados:** nacer, asentarse, cumplir años, despedirse.
6. **Quieta por defecto** (lección de Clippy): la vida se nota en lo mínimo.
7. **Fuera lo prestado y lo brillante:** ni orbe de cristal, ni cara de paquete, ni degradado de IA genérica.
8. **El símbolo no habla; habla Esme.** Voz en primera persona, una sola, con el tono adaptado al momento.

---

## 3. Sistema A · «Punto»: Esme, el punto final de tu mente

Lámina de prueba: [`marca-a-punto.svg`](marca-a-punto.svg) · símbolo suelto, monocromo: [`marca-a-punto-simbolo.svg`](marca-a-punto-simbolo.svg) (vista previa renderizada en el scratchpad: `marca/prev-a.png`).

### Concepto
Un recuerdo es un punto de tinta. Tus 2.346 recuerdos, vistos de lejos, hacen **un solo punto**. Ese punto es Esme. Por eso su nombre se escribe **«Esme.»**, con mayúscula y punto: el punto no es puntuación, es ella. Y cada vez que te habla, su frase termina en ella.

La idea fuerte es la continuidad de escala: el mismo objeto es el favicon de 16 px, el punto de «Buenas tardes.» y, ampliado, el atlas entero de tu mente. **Del punto al universo**, sin cambiar de objeto. Nadie en la IA tiene eso.

### Símbolo (descrito con precisión)
- **Forma:** un disco dibujado en **trama de imprenta** (semitono AM con la rejilla a 45°, el ángulo del negro en offset). Es la luz de una esfera iluminada desde arriba a la izquierda. El centro se cierra en sólido y el borde se deshace en puntos cada vez más pequeños. Nada de degradado, brillo ni cristal: **puntos de tinta**.
- **Regla de construcción** (implementable con funciones, ver `scratchpad/marca/gen_punto.py`): paso de rejilla `s = R·√(π/N)`; radio de cada punto `r = 0,74·s·√tono`; `tono = luz de esfera × caída hacia el borde`; se descarta todo punto menor que `0,09·s`.
- **Escalas:**
  - ≤ 24 px: círculo sólido (favicon, bandeja del sistema, insignias).
  - 32–96 px: trama gruesa (60–160 puntos).
  - ≥ 128 px: trama fina (400–1.400 puntos).
  - En la portada y en Memoria, **cada punto de la trama es un recuerdo real**: su tamaño es la confianza, su tinta es su edad (la escala ferrogálica que ya existe) y lo nuevo es luz.
- **Monocromo por definición:** usa `currentColor`. La piel decide el color: el cuerpo en el color `texto` y la luz en el `acento`. Lo que la piel **nunca** puede cambiar es la forma, la trama ni la luz desde arriba a la izquierda.
- **Comprobado contra la lista de descartes:** no es gema, ni «e», ni anillo, ni eclipse, ni criatura, ni forma orgánica. Es materia impresa, la lección del FYP.

### Logotipo
- **«Esme.»**, con mayúscula. Una didona de alto contraste **dibujada a medida** a partir de Bodoni Moda (licencia OFL, que permite modificarla si se renombra). Detalles:
  - fuste de la E algo más grueso que en Bodoni Moda;
  - ojo de la «e» final redondeado para que rime con el punto;
  - interletraje cerrado (−2 %);
  - el punto se sienta en la línea base, mide **1,6×** el punto normal de la fuente y va separado 0,12 em.
- **Color:** las letras en `texto` y el punto en `acento`. En monocromo, todo en un color.
- **No cambia con la piel.** Hoy el logotipo se compone en la letra de títulos de cada piel. A partir de aquí sería un **dibujo fijo** (SVG), como cualquier marca seria. Las pieles cambian la letra de la app, no la del nombre.
- **Abreviatura:** el punto solo. En la cabecera, «Esme.» pequeño con el punto vivo.

### Cómo se manifiesta su presencia en la interfaz
**Regla madre: solo hay un punto vivo en la pantalla a la vez, y está donde está Esme.** Si abres el lanzador, el punto viaja allí; si escribe en la conversación, cierra su última frase; si trabaja en el Taller, está en la fila que se mueve. Así **se ve dónde está ella**: un ser ocupa un sitio, una herramienta está en todas partes.

- **Portada (Tu mente):** «Buenas tardes.» en la serif grande; el punto final es Esme. Al entrar, ese punto **crece** (zoom continuo, unos 1,2 s) hasta ser la trama de tu mente en la mitad derecha, con los temas rotulados en Bodoni cursiva. Sustituye al triángulo y deja de tapar la mente: **la mente es el ser**.
- **Conversación:** fuera el orbe brillante. El estado vacío lleva un punto de 128 px y «¿En qué piensas?». Mientras escribe, en el sitio del cursor aparecen **«…» hechos de su trama**; al terminar, los tres puntos se funden en el punto final de su frase.
- **Taller (su equipo):** cada motor deja de tener la cara de `agentfaces` y pasa a tener **su tinta**: un punto pequeño con su propia **forma de trama**, como las tramas de imprenta (redonda, cuadrada, elíptica, de línea) y su propio ángulo. Qwen Code, elíptica a 15°; Cline, de línea a 75°; OpenCode, cuadrada a 0°; Claude, redonda a 45°… Esme es la imagen compuesta; el equipo, **las tintas de la cuatricromía**.
  - **Fallo = desregistro:** la tinta del motor se desplaza 2 px, como un mal registro de imprenta, en vez de un «Error» en rojo.
- **Memoria:** zoom continuo del punto al atlas y vuelta.
- **Uso:** el coste se cuenta como **tinta gastada**: una barra de puntos, uno por cada céntimo o por cada mil tokens.
- **Tienda:** cada tarjeta de piel enseña **el punto con esa piel** (su color, su material), no la misma esfera recoloreada. Las «presencias» de la Tienda venden **materiales del punto** (risografía, bordado, píxel, grabado, neón de tinta), nunca otro ser.
- **Lanzador (Ctrl+Mayús+Espacio):** un punto pequeño a la izquierda del campo. Al teclear, **su luz gira hacia el texto**: te está leyendo.
- **Icono y bandeja:** punto sólido. Si te necesita, aparece a su lado una gota pequeña, nunca un número rojo.
- **Sello bermellón:** se queda tal cual para lo que apruebas. Esme firma con su punto; tú, con tu sello.

### Cómo suena
- **Firma sonora «Es–Mi»:** dos notas, **mi bemol → sol** (tercera mayor que sube), en piano de fieltro o celesta muy suave. Dura unos 280 ms más la cola. El origen es un criptograma de verdad:
  - en la notación alemana, **«Es» es mi bemol** (como en el monograma DSCH de Shostakóvich: D-Es-C-H);
  - en solfeo móvil de mi bemol mayor, **«mi» es sol**.
  
  Así el nombre de Esme se escribe en dos notas. Solo suena al despertar (al abrir la app) y al terminar algo largo.
- **El punto:** un «toc» seco y suave (tipo de imprenta, tecla de madera), con una variación mínima de altura para que nunca suene igual dos veces. Es la confirmación de «hecho» y «enviado».
- **Te necesita:** dos toques suaves («toc, toc»), como quien llama a una puerta con los nudillos. Jamás una alarma.
- **Fallo:** un roce de papel seco (el desregistro). Sin «bip» de error.
- **Reglas:** volumen bajo; respeta el silencio del sistema; en la piel Mínimo, nada; ningún sonido en bucle.

### Cómo se mueve
Principio: **inercia de tinta**. Entra despacio y sale despacio; nada rebota (el único rebote de la casa es el del Sello). Los estados son los de `tinta/estado.ts`:

| Estado | Movimiento | Sin movimiento (`prefers-reduced-motion`) |
|---|---|---|
| `reposo` | Respira: escala 1 → 1,015 en un ciclo de 7 s. Casi no se ve, pero se nota | Punto quieto |
| `escuchando` | **La luz gira hacia ti** (hacia el cursor o el micro), con 400 ms de retraso; el borde de la trama late con tu volumen | Luz fija hacia abajo a la derecha |
| `pensando` | El ángulo de la trama gira despacio y produce un muaré que parpadea (**la tinta se revuelve**); el núcleo se encoge | Núcleo más pequeño |
| `recordando` | Las celdas de los recuerdos que usa se encienden en luz y suben a la superficie | Esas celdas en `acento` |
| `hablando` | Ondas de tono que salen del centro con su voz, como tinta en papel mojado | — |
| `trabajando` | El punto se parte en **«…»** (un punto por motor) y se reúne al terminar: **punto y seguido** si queda trabajo, **punto final** si ya acabó todo | «…» quietos |
| `te-necesita` | Se desprende una gota y espera arriba a la derecha. No tiembla ni salta | Gota quieta |

**Acontecimientos** (la lección de Duolingo y del dæmon):
- **Nace:** en la primera apertura, papel en blanco, un solo punto y «Hola. Soy Esme.». A medida que importas recuerdos, cada uno añade una celda y el punto crece hasta tener trama.
- **Se asienta:** a los 30 días, o con unos 1.000 recuerdos, su ángulo de trama y su dirección de luz **quedan fijos para siempre**, sacados de tu mente. Ese es **tu punto**: ningún otro Esme del mundo tiene la misma trama. Se celebra con una lámina imprimible y compartible.
- **Cumple años:** cada año, la lámina del año: «Un año contigo. 9.412 puntos».

### Cómo habla
**Voz:** breve y exacta; cálida sin empalago; en primera persona; **cierra sus frases**. Cuatro rasgos: **exacta, serena, cálida, con memoria**. Español neutro, tuteo, sin regionalismos y sin signos de exclamación salvo una alegría de verdad. Nunca habla de «la IA» como de otra persona: la IA es ella.

| Momento | Hoy | Con «Punto» |
|---|---|---|
| Saludo de portada | «Buenas tardes. 15 tareas están listas para que las revises.» | «Buenas tardes. Tengo 15 cambios listos para que los mires; empieza por estos tres, que son los que más tocan.» |
| Conversación vacía | «Esme le da a la IA solo lo que necesita de tu memoria…» | «¿En qué piensas?» · «Recuerdo lo que me has contado. Te enseño qué usé y tú me dices si sirvió.» |
| Motor que falla | «Cline · falló» (en rojo) | «Cline no pudo con esto: se cortó la red. Lo intento con Qwen Code, ¿te parece?» |
| Permiso de manos | — | «Para esto necesito escribir en tu carpeta Proyectos. ¿Te parece bien solo esta vez, o siempre?» |
| La Forja | — | «No tengo una herramienta para eso. Puedo fabricarla en unos dos minutos y te la enseño antes de usarla.» |
| Tienda | «Diseños para vestir a Esme… del registro oficial de MCP» | «Pieles para cambiarme por fuera. Por dentro sigo siendo yo.» · Herramientas: «Manos nuevas. Ninguna toca nada sin tu permiso.» |
| Uso | — | «Este mes llevo 3,20 $. Lo que más costó: las pruebas del Taller del martes.» |
| Lanzador (texto de ayuda) | — | «Dime.» |
| Aprobación con sello | — | «Sellado. Queda como lo aprobaste.» |
| Olvidar | — | «Olvidado. No queda copia.» |
| Pensando | — | (no dice nada: «…» es su manera de decir «estoy en ello») |
| Aviso proactivo (regla del daimonion) | — | «Antes de publicarlo: el `.env` va dentro. Yo no lo subiría.» |

