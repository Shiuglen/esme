// El uso del motor, sin creerse sus cifras a ciegas.
//
// Los motores **no hablan todos el mismo idioma** sobre el uso, y el Taller tiene que entender a
// los dos:
//
// - **Acumulado** (lo que dice el ACP: «total input tokens across all turns»): cada informe trae la
//   suma de la sesión, así que lo que pasó en un turno es la **diferencia** con el informe anterior.
// - **Por turno**: cada informe trae solo ese turno. Entonces el valor **baja** de un turno a otro
//   (o al menos no crece de forma monótona), y lo que pasó es el valor entero.
//
// Y hay un tercer caso, el que dolía: hay motores (el de OpenCode reparte su acumulado entre
// varias tareas) cuyo contador **no es de la sesión**, y al reiniciar la app la tarea vuelve del
// disco con un acumulado que ya no cuadra. En ese caso el salto no es de este turno, y sumarlo
// **infla** los números de la app.
//
// Medido en esta máquina (scripts/banco_memoria.py): **16 de 150 turnos** con más tokens de entrada
// que la ventana del modelo, y el **84,6 %** de los tokens de entrada anotados venía de esos saltos.
//
// La regla final no depende del motor: **un turno no puede leer más tokens que la ventana del
// modelo**. Si el salto la supera, no es de este turno: se descarta y se vuelve a basar en lo que
// el motor dice.
export type Reportado = { entrada: number; salida: number; pensamiento: number }
export type Modo = 'acumulado' | 'turno'
export type Estado = { anterior?: Reportado; modo?: Modo }
export type Delta = { delta: Reportado; estado: Estado; sospechoso: boolean }

const max0 = (x: number) => Math.max(0, x)

export function deltaDeUso(reportado: Reportado, estado: Estado | undefined, ventana: number): Delta {
  const rep: Reportado = { entrada: max0(reportado.entrada), salida: max0(reportado.salida), pensamiento: max0(reportado.pensamiento) }
  const prev = estado?.anterior
  let modo = estado?.modo
  let entrada: number
  if (modo === 'turno') entrada = rep.entrada
  else if (!prev) entrada = rep.entrada
  else if (rep.entrada < prev.entrada) { modo = 'turno'; entrada = rep.entrada }   // el contador bajó: va por turno
  else { modo = modo ?? 'acumulado'; entrada = rep.entrada - prev.entrada }        // el contador sube: va acumulado

  const salida = modo === 'turno' || !prev ? rep.salida : max0(rep.salida - prev.salida)
  const pensamiento = modo === 'turno' || !prev ? rep.pensamiento : max0(rep.pensamiento - prev.pensamiento)

  // Un turno no puede leer más tokens que la ventana del modelo: si lo hace, el salto es de otro
  // sitio (contador repartido, sesión reiniciada) y no se cuenta.
  const imposible = ventana > 0 && entrada > ventana
  if (imposible) return { delta: { entrada: 0, salida, pensamiento }, estado: { anterior: rep, modo }, sospechoso: true }
  return { delta: { entrada, salida, pensamiento }, estado: { anterior: rep, modo }, sospechoso: false }
}
