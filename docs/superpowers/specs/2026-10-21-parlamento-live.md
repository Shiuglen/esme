// EL PARLAMENTO LIVE — la especificación (21 oct 2026)
//
// Qué es: el paso natural del instinto. Cuando una tarea acaba mal (o el creador lo pide), la casa
// arma un tribunal de motores de distinta familia que se pasan el encargo en vivo con un relevo de
// evidencia: el constructor construye, el revisor lo mira con ojo crítico, el probador ejecuta las
// pruebas y dice si pasan. El creador no vigila tres ventanas: recibe el veredicto final del
// probador con la evidencia de cada relevo.
//
// En qué se diferencia de la arena: la arena es PARALELA (tres motores compiten por lo mismo, el
// creador elige la mejor copia). El parlamento es SECUENCIAL: cada relevo HEREDA el trabajo del
// anterior (su texto final y los ficheros que tocó) y trabaja encima, como un comité. El veredicto
// no lo elige un motor: lo firma el último (probador) con los comandos que se ven.
//
// Qué ya existe y se reutiliza (nada se duplica):
//   - roles.ts       → los oficios (constructor/revisor/probador/…), los del creador si puso los suyos
//   - taller.crear() → cada relevo es una tarea real del Taller: su sesión, su fila, sus eventos,
//                      su veredicto y —ya desde hoy— la negativa por palabras como error de verdad
//   - vista.ts       → los que sí pueden, a un clic, para elegir quién lleva cada relevo
//   - curva.ts       → cada relevo entra en la curva (la mente aprende del parlamento entero)
//
// El relevo (lo que pasa de un motor al siguiente):
//   1. el texto final del relevo anterior (su resumen de dos frases del rol; el detector lo recorta)
//   2. los ficheros que tocó, con líneas + y − (de t.cambios, ya existe)
//   3. qué se le negó o falló en su turno, si pasó (errores reales, no promesas)
//
// Fases de construcción:
//   [x] Fase 1 (hoy): el contrato puro — planParlamento + encargoRelevo + veredictoLegible + tests.
//                     Sin tocar el runtime: la lógica del comité se probara sola.
//   [x] Fase 2 (21 oct, tarde): Taller.parlamentar() corre de verdad — encadena los relevos
//               encadenados como tareas reales del Taller (arena «parlamento»), el siguiente hereda
//               la evidencia del anterior (poda a 800), y si un relevo se niega o muere el comité
//               para y entrega lo hecho («tumbado»). El veredicto lo lee el último relevo.
//   [x] Fase 3 (21 oct, tarde): la puerta viva — handler `taller:parlamentar` (validación de 2..5
//               relevos con oficio+motor), preload+bridge (`ResultadoParlamento`), y en el Detalle
//               la puerta «Armar el parlamento» dentro del aviso de negativa: tres oficios, tú
//               eliges el motor de cada relevo (pre-llenado con los que sí pueden), el encargo sale
//               LIMPIO del oficio viejo de la tarea (baseDe) y sobre la copia donde falló. El
//               cierre (probado/dudoso/tumbado) queda escrito en la puerta cuando vuelve.
//   [x] Fase 4 (21 oct, noche): el acta firmada — `main/taller/acta.ts`: el Taller tiene su par
//               Ed25519 en su carpeta (firma-taller.pem, 0600; NO es la estirpe de la Tienda, es
//               el acto interno del taller), firma el veredicto con el formato de la casa
//               (canónico + cuerpo de orden fijo + huella sha256) y lo anota en el diario
//               `actas-parlamento.jsonl`, verificable línea a línea (`actaValida`). TODA salida
//               firma (también las tumbadas: el acta dice hasta dónde llegó) y avisa a la mente
//               (aprenderEquipo con los estados frescos de los relevos). El arco del parlamento
//               está cerrado: instinto → radar → comité → acta → mente.
//   [x] Fase 5 (21 oct, noche II): el juez local, la pieza que quedaba en la cola del instinto.
//               El veredicto NO se firma con la PALABRA del último relevo sino con la EVIDENCIA de
//               su sesión (`juezDe`): «probado» hay que ganarlo — hace falta una ejecución con
//               pinta de prueba en la sesión («npm test», pytest, vitest…); si no corrió NADA el
//               juez le niega el probado (dudoso); si su ÚLTIMA prueba acabó en fallo, palabra y
//               consola chocan y el juez lo tumba. El error del runtime es un hecho, no una
//               opinión: inapelable. Y el acta no queda escondida: vuelve en la respuesta
//               (`actaFirmada`, validada in situ) y se lee en la puerta del comité con los
//               relevos, la huella y su sello (o el grito de que el diario fue tocado).
//
// Reglas (las de la casa, sin excepción):
//   - el creador elige quién lleva cada relevo (los que sí pueden, nunca a ciegas)
//   - cada relevo se puede parar en vivo; parar el parlamento no rompe las tareas ya hechas//   - si un relevo se niega o se muere, el parlamento NO rellena el hueco solo: te lo enseña y
//     espera tu mano (el instinto ya acusa la negativa; aquí no se reintenta a escondidas)
//   - el coste de cada relevo se cuenta en su tarea (el uso ya se anota por tarea)
