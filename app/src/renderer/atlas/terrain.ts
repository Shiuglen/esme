// Relieve del Atlas: la densidad real de recuerdos se convierte en altura. Sin inventar nada.
export const EXTENT = 1.15   // el mapa cubre [-EXTENT, EXTENT]² (las coordenadas del cerebro van de -1 a 1)

export function heightGrid(points: { x: number; y: number }[], size = 192, bandwidth = 0.065): Float32Array {
  const g = new Float32Array(size * size)
  if (!points.length) return g
  const step = (2 * EXTENT) / (size - 1)
  const inv = 1 / (2 * bandwidth * bandwidth)
  const reach = Math.ceil((3 * bandwidth) / step)
  for (const p of points) {
    const ci = Math.round((p.x + EXTENT) / step), cj = Math.round((p.y + EXTENT) / step)
    for (let j = Math.max(0, cj - reach); j <= Math.min(size - 1, cj + reach); j++) {
      const gy = -EXTENT + j * step, dy = gy - p.y
      for (let i = Math.max(0, ci - reach); i <= Math.min(size - 1, ci + reach); i++) {
        const gx = -EXTENT + i * step, dx = gx - p.x
        g[j * size + i] += Math.exp(-(dx * dx + dy * dy) * inv)
      }
    }
  }
  let max = 0
  for (const v of g) if (v > max) max = v
  if (max > 0) for (let k = 0; k < g.length; k++) g[k] = Math.pow(g[k] / max, 0.6)   // realza las llanuras habitadas
  return g
}

/** Altura interpolada en (x, y) del mapa. */
export function sampleHeight(g: Float32Array, size: number, x: number, y: number): number {
  const fx = ((x + EXTENT) / (2 * EXTENT)) * (size - 1), fy = ((y + EXTENT) / (2 * EXTENT)) * (size - 1)
  const i = Math.max(0, Math.min(size - 2, Math.floor(fx))), j = Math.max(0, Math.min(size - 2, Math.floor(fy)))
  const tx = Math.min(1, Math.max(0, fx - i)), ty = Math.min(1, Math.max(0, fy - j))
  const a = g[j * size + i], b = g[j * size + i + 1], c = g[(j + 1) * size + i], d = g[(j + 1) * size + i + 1]
  return (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty
}
