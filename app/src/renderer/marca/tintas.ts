// Las tintas del equipo: en imprenta cada tinta de la cuatricromía lleva su ángulo de trama para no formar muaré. Esme es
// la imagen compuesta (45°, el ángulo del negro); cada agente es una tinta con su ángulo. Un fallo no se pinta de rojo:
// es un desregistro (la tinta se corre un poco), como en una imprenta.
const CONOCIDOS: Record<string, number> = { opencode: 0, qwen: 15, claude: 30, gemini: 60, cline: 75, goose: 22.5, codex: 67.5 }
const LIBRES = [7.5, 37.5, 52.5, 82.5, 22.5, 67.5, 0, 15, 30, 60, 75]

export function tintaDe(motor: string): { angulo: number } {
  if (motor in CONOCIDOS) return { angulo: CONOCIDOS[motor] }
  let h = 0
  for (const c of motor) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return { angulo: LIBRES[h % LIBRES.length] }
}
