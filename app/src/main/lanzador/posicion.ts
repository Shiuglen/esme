// Dónde aparece el lanzador: en la pantalla donde estás, centrado y en el tercio superior (donde miras al escribir), sin
// salirse nunca de ella.
export function posicionLanzador(a: { x: number; y: number; width: number; height: number }) {
  const width = Math.min(760, a.width - 32), height = Math.min(520, a.height - 32)
  const y = a.y + Math.min(Math.round(a.height * 0.2), a.height - height - 16)
  return { x: a.x + Math.round((a.width - width) / 2), y: Math.max(a.y + 16, y), width, height }
}
