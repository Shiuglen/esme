// La búsqueda de la paleta (Ctrl K): lo tuyo se encuentra escribas como escribas. Sin acentos ni mayúsculas, y todas las
// palabras tienen que estar (en cualquier orden). Lógica pura; la paleta solo la dibuja.
const plano = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()

export function coincide(consulta: string, texto: string): boolean {
  const palabras = plano(consulta).split(/\s+/).filter(Boolean)
  if (!palabras.length) return false
  const t = plano(texto)
  return palabras.every((p) => t.includes(p))
}

export function tareasQueCoinciden<T extends { titulo: string; texto: string; inicio: number }>(consulta: string, tareas: T[], n = 5): T[] {
  return tareas.filter((t) => coincide(consulta, `${t.titulo} ${t.texto}`)).sort((a, b) => b.inicio - a.inicio).slice(0, n)
}
