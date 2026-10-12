# «Tinta y Luz»: la identidad de Esme (spec, 2026-10-12)

> **Aprobada por el creador (11-oct):**
> - De día, tinta viva sobre papel que se dibuja sola.
> - De noche, mientras aprende, la tinta se vuelve luz bioluminiscente.
> - El clima es el estado mental, con estaciones y tinta que siente.
> - El ser nace de ti, cada usuario tiene su sello y su propio sol, y habrá tipografía propia.
>
> **Respaldo del FYP (12-oct):** lo analógico (grabado, trama de puntos, tinta electrónica, pixel art) vence a lo brillante.
> Ver `docs/investigacion/fyp-2026-10-12-biblioteca.md`.
> **Sustituye a:** el cristal con malla de gradiente (una tendencia, no una identidad).

## 1. La idea: una epistemología visual
En Esme, cada material **significa** algo de la mente. No decora: dibuja la mente real.

| Material | Significa | Dónde se ve |
|---|---|---|
| **Grafito** (lápiz, gris, trazo fino y discontinuo) | Lo que aún **no está verificado**: cuarentena, lo leído en la web, lo que propone una IA | Recuerdos nuevos de fuentes externas; borradores; tareas sin aprobar |
| **Tinta** | Lo **verificado y consolidado** | Recuerdos confirmados, lo aprobado, lo aplicado |
| **Edad de la tinta** (ferrogálica: azul-negro reciente → pardo con el tiempo) | La **edad** del recuerdo | Red de memoria; deslizar el tiempo |
| **Grosor del trazo** | La **confianza** | Red de memoria, conexiones |
| **Goma** (huella tenue) | Lo **olvidado** con certificado | Red de memoria: «aquí hubo algo» |
| **Luz** (bioluminiscente) | **Atención y aprendizaje**: de día, el trazo que se recuerda se ilumina un instante; de noche, la mente que sueña brilla | Recordar, pensar, el Sueño, el Taller trabajando |
| **Sello** (bermellón, generado desde la red del usuario) | **Lo aprobaste tú** | Aprobar, aplicar, verificar a mano |
| **Papel** (fibras, relieve, luz del sol real) | El **soporte**: el día y la hora del usuario | Fondo de toda la app |

Nadie puede copiarlo sin copiar la mente: la forma de la red, el envejecimiento de la tinta y el sello salen de los datos reales.

## 2. Materiales y tokens
**Día (papel de algodón, frío; nunca crema).**
- Papel `#f3f3ef`; hoja `#fbfbf9`.
- Tinta (texto) `#141a26`; tinta 2 `#3f4653`; tinta 3 `#636974`.
- Tinta fresca `#15233d`; tinta vieja `#6e5235`; grafito `#8b9099`.
- Luz `#0a8c7d`, profunda para que contraste sobre papel. Sello `#c2361e`.

**Noche (papel de tinta).**
- Papel `#08090d`; hoja `#0f1117`.
- Tinta de luz (texto) `#e8ebf0`; tinta 2 `#a4aab4`; tinta 3 `#7d838e`.
- Luz en tres tonos: `#5ef0d4` (bioluminiscencia de *Noctiluca*), `#6cc6ff` y `#a68cff` (en lo profundo).
- Sello `#e85a43`.

**Reglas:**
- Contraste AA comprobado con `check_contrast.py`.
- La luz se usa con mesura: es vida, no decoración.
- El sello solo aparece en lo que aprobó el usuario.

## 3. El papel y el sol
- **Día:**
  - `PaperTexture` (Paper Shaders): fibras, rugosidad y pliegues muy suaves.
  - **La luz entra con el ángulo del sol de la hora local.** A media mañana viene de un lado y a media tarde del otro.
  - El relieve del papel se mueve con el día: casi imperceptible y real.
- **Noche:**
  - Papel de tinta casi negro.
  - **Mientras la mente piensa o aprende**, `NeuroNoise` muy tenue en tonos de luz, como plancton que se enciende.
  - En reposo se apaga.
- **Ahorro y accesibilidad:** sin foco, sin pestaña visible o con «menos movimiento», todo se congela.

## 4. Superficies
- **Hoja** (sustituye al cristal):
  - Papel sobre papel, con sombra de papel apoyado y borde de 1 px.
  - Sin desenfoques.
  - De noche, hoja oscura con un filo de luz casi invisible.
- **Selección:** subrayado o borde en tinta (2 px), no un degradado.
- **Vida** (algo trabajando): un hilo de luz que respira.
- **Lo pendiente de verificar o aprobar:** contorno en grafito discontinuo.

## 5. Movimiento
- **La tinta se seca.** Al aparecer, un trazo llega con algo de brillo húmedo y se asienta en unos 600 ms.
- **La tinta se derrama.** Un recuerdo nuevo es una gota que se expande; el absorber es una lluvia de gotas.
- **La luz recorre.** Al recordar, la luz viaja por los trazos.
- **El sello se estampa.** Escala de 1,15 a 1, con un leve rebote, y deja la marca.

## 6. Fases de implantación (paso 4 del orden de ESME.md)
- **4a. Cimientos:**
  - tokens de día y de noche, con los roles actuales mapeados para que toda la app cambie a la vez;
  - el papel con el sol, y la noche con luz que se enciende al pensar;
  - hojas en vez de cristal;
  - selección en tinta.
  - Verificado con capturas en los dos temas y contraste comprobado.
- **4b. La mente en tinta:** la red como dibujo a plumilla, con edad, grosor, grafito, goma y luz al recordar; deslizar el tiempo.
- **4c. El Taller como grabado y el sello:** máquinas con sombreado de grabado (rayado) en vez de caras planas; el sello en aprobar y aplicar.
- **4d. La Señal en tinta y luz, el sello personal y la bienvenida «la mente despierta».**
