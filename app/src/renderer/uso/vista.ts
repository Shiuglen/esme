// Cálculos de la vista de Uso: días seguidos (rellenando huecos) y la rejilla de actividad tipo GitHub.
export type Dia = { dia: string; costeUSD: number; tokens: number }
export type Celda = { dia: string; tokens: number; costeUSD: number; nivel: 0 | 1 | 2 | 3 | 4; futuro: boolean }

const clave = (f: Date) => `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}`
const mas = (f: Date, n: number) => { const x = new Date(f); x.setDate(x.getDate() + n); return x }

/** Los últimos `n` días hasta hoy (incluido), con ceros donde no hubo uso. */
export function diasSeguidos(datos: Dia[], hoy: Date, n: number): Dia[] {
  const por = new Map(datos.map((d) => [d.dia, d]))
  return Array.from({ length: n }, (_, i) => { const k = clave(mas(hoy, i - n + 1)); return por.get(k) ?? { dia: k, costeUSD: 0, tokens: 0 } })
}

/** `semanas` columnas de lunes a domingo; la última contiene hoy. Nivel por cuantiles de los días con actividad. */
export function rejillaActividad(datos: Dia[], hoy: Date, semanas: number): Celda[][] {
  const por = new Map(datos.map((d) => [d.dia, d]))
  const valores = datos.map((d) => d.tokens).filter((t) => t > 0).sort((a, b) => a - b)
  const q = (p: number) => valores[Math.min(valores.length - 1, Math.floor(p * valores.length))] ?? Infinity
  const cortes = [q(0.25), q(0.5), q(0.75)]
  const nivel = (t: number): Celda['nivel'] => (t <= 0 ? 0 : t <= cortes[0] ? 1 : t <= cortes[1] ? 2 : t <= cortes[2] ? 3 : 4)
  const lunes = mas(hoy, -((hoy.getDay() + 6) % 7))                    // lunes de esta semana
  const inicio = mas(lunes, -7 * (semanas - 1)), hoyK = clave(hoy)
  return Array.from({ length: semanas }, (_, s) => Array.from({ length: 7 }, (_, d) => {
    const f = mas(inicio, s * 7 + d), k = clave(f), x = por.get(k)
    return { dia: k, tokens: x?.tokens ?? 0, costeUSD: x?.costeUSD ?? 0, nivel: nivel(x?.tokens ?? 0), futuro: k > hoyK }
  }))
}
