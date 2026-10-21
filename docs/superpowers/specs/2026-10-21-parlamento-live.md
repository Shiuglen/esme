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
//   [ ] Fase 2: Taller.parlamentar(tarea, albaces) — encola los relevo encadenados (cada uno con
//               su tarea real y su veredicto) y el ítem del taller muestra «Parlamento en curso».
//   [x] Fase 3 (21 oct, tarde): la puerta viva — handler `taller:parlamentar` (validación de 2..5
//               relevos con oficio+motor), preload+bridge (`ResultadoParlamento`), y en el Detalle
//               la puerta «Armar el parlamento» dentro del aviso de negativa: tres oficios, tú
//               eliges el motor de cada relevo (pre-llenado con los que sí pueden), el encargo sale
//               LIMPIO del oficio viejo de la tarea (baseDe) y sobre la copia donde falló. El
//               cierre (probado/dudoso/tumbado) queda escrito en la puerta cuando vuelve.
//   [ ] Fase 4: la firma — el veredicto final se guarda firmado (Ed25519, como la Tienda) en
//               resultados/, y la mente lo aprende como una lección del equipo.
//
// Reglas (las de la casa, sin excepción):
//   - el creador elige quién lleva cada relevo (los que sí pueden, nunca a ciegas)
//   - cada relevo se puede parar en vivo; parar el parlamento no rompe las tareas ya hechas//   - si un relevo se niega o se muere, el parlamento NO rellena el hueco solo: te lo enseña y
//     espera tu mano (el instinto ya acusa la negativa; aquí no se reintenta a escondidas)
//   - el coste de cada relevo se cuenta en su tarea (el uso ya se anota por tarea)
