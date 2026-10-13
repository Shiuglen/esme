// Las aguadas de los temas: dónde cae cada mancha de tinta diluida, cuánto abarca y de qué edad es su tinta.
// La comparten la red de Memoria (que se mueve) y el grabado de Inicio (quieto).
export type Aguada = { tema: number; x: number; y: number; r: number; n: number; dias: number | undefined }
type Punto = { tema: number; x: number; y: number; fecha?: number }

/** Por tema: el centro de sus recuerdos, un radio que cubre el 80 % (los sueltos quedan como islas) y su edad media en días. */
export function aguadasDe(puntos: Punto[], ref: number, margen = 4): Aguada[] {
  const grupos = new Map<number, Punto[]>()
  for (const p of puntos) { const g = grupos.get(p.tema); if (g) g.push(p); else grupos.set(p.tema, [p]) }
  const out: Aguada[] = []
  for (const [tema, ps] of grupos) {
    let sx = 0, sy = 0, edad = 0, fechados = 0
    for (const p of ps) { sx += p.x; sy += p.y; if (p.fecha !== undefined) { edad += ref - p.fecha; fechados++ } }
    const x = sx / ps.length, y = sy / ps.length
    const d = ps.map((p) => Math.hypot(p.x - x, p.y - y)).sort((a, b) => a - b)
    out.push({ tema, x, y, n: ps.length, r: d[Math.min(d.length - 1, Math.floor(d.length * 0.8))] * 1.08 + margen, dias: fechados ? edad / fechados / 864e5 : undefined })
  }
  return out
}
