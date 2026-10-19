// El Punto (docs/investigacion/vision-2026-10-18/08-marca.md, sistema A): Esme es el punto final de tu mente. Un disco
// dibujado en trama de imprenta (semitono con la rejilla a 45°, el ángulo del negro en offset): la luz de una esfera
// iluminada desde arriba a la izquierda, sólida donde da la luz y deshecha en puntos hacia el borde. Sin degradados, ni
// brillo, ni cristal: puntos de tinta. Lógica pura; PuntoVista solo la dibuja.
export type PuntoTinta = { x: number; y: number; r: number }

// la luz, de arriba a la izquierda y algo de frente (y crece hacia abajo, como en pantalla)
const L = (() => { const v = [-0.35, -0.42, 0.84]; const n = Math.hypot(...v); return v.map((c) => c / n) as [number, number, number] })()
const suave = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t) }
const r4 = (x: number) => Math.round(x * 1e4) / 1e4

/** Los puntos de la trama en un disco de radio 1 centrado en 0: `n` celdas en el disco, la rejilla girada `angulo` grados. */
export function puntosDe({ n, angulo = 45 }: { n: number; angulo?: number }): { puntos: PuntoTinta[]; paso: number } {
  const paso = Math.sqrt(Math.PI / n)
  const a = (angulo * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a)
  const k = Math.ceil(1 / paso) + 1
  const puntos: PuntoTinta[] = []
  for (let i = -k; i <= k; i++) for (let j = -k; j <= k; j++) {
    const x = i * paso * c - j * paso * s, y = i * paso * s + j * paso * c
    const rho = Math.hypot(x, y)
    if (rho >= 1) continue
    const z = Math.sqrt(1 - rho * rho)
    const lambert = Math.max(0, x * L[0] + y * L[1] + z * L[2])
    const tono = (0.04 + 0.96 * lambert ** 1.5) * (1 - suave(0.78, 1, rho))
    const r = Math.min(0.74 * paso * Math.sqrt(tono), 1 - rho)
    if (r < 0.09 * paso) continue
    puntos.push({ x: r4(x), y: r4(y), r: r4(r) })
  }
  puntos.sort((p, q) => p.y - q.y || p.x - q.x)
  return { puntos, paso }
}

/** Cuántas celdas lleva el Punto a cada tamaño en píxeles: 0 = disco sólido (favicon, bandeja, insignias). */
export function tramaPara(px: number): number {
  const entre = (x: number, x0: number, x1: number, y0: number, y1: number) => Math.round(y0 + ((Math.min(Math.max(x, x0), x1) - x0) / (x1 - x0)) * (y1 - y0))
  if (px <= 24) return 0
  if (px <= 96) return entre(px, 32, 96, 60, 160)
  if (px < 128) return entre(px, 96, 128, 160, 400)
  return entre(px, 128, 512, 400, 1400)
}

/** Todos los puntos en un solo trazado SVG (dos arcos por punto): un nodo en vez de cientos. */
export function trazoDe(puntos: PuntoTinta[]): string {
  return puntos.map(({ x, y, r }) => `M${r4(x - r)} ${y}a${r} ${r} 0 1 0 ${r4(2 * r)} 0a${r} ${r} 0 1 0 ${r4(-2 * r)} 0`).join('')
}
