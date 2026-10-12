// «Tu sol»: la luz sobre el papel entra con el ángulo del sol de la hora local.
// Amanece a las 6 por un lado (300°), a mediodía viene de arriba (0°) y se pone a las 18 por el otro (60°).
export function anguloSol(fecha: Date): number {
  const h = Math.min(18, Math.max(6, fecha.getHours() + fecha.getMinutes() / 60))
  return (300 + ((h - 6) / 12) * 120) % 360
}
