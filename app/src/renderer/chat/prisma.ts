// El Prisma: los datos que piden ser vistos. Cuando la respuesta trae una tabla con números, la tabla
// pinta su gráfica; cuando trae un bloque json, se vuelve panel. Puro: parsea lo que hay, no adivina.
export type SerieViva = { col: string; serie: number[]; suma: number }
export type TablaViva = { line: number; encabezados: string[]; series: SerieViva[] }

/** Las filas sueltas de una línea de tabla GFM: | a | b | → [a, b]. */
const filas = (l: string): string[] => {
  const t = l.trim()
  if (!t.startsWith('|')) return []
  return t.replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim())
}

/** «1.5» → 1.5, «1,5» → 1.5, «12%» → 12, «1.200» → 1200 (grupos de 3 = miles), «1.234,5» → 1234.5. «—» → null. */
export const numeroDe = (c: string): number | null => {
  const v = c.replace(/[€$%\s]/g, '')
  if (!v || !/\d/.test(v)) return null
  const partes = v.split(/[.,]/)
  // el último separador es el decimal; los demás, miles. Cada grupo tras el primero con 3 dígitos exactos = miles seguros.
  if (partes.length > 1 && partes.slice(1).every((p) => /^\d{3}$/.test(p))) {
    const n = Number(partes.join(''))
    return Number.isFinite(n) ? n : null
  }
  const ultimoSep = Math.max(v.lastIndexOf('.'), v.lastIndexOf(','))
  if (ultimoSep === -1) return Number.isFinite(Number(v)) ? Number(v) : null
  if (v.lastIndexOf('.') === -1 || v.lastIndexOf(',') === -1) {
    // un solo separador: si lo que sigue mide 3, es miles; si no, decimal
    const despues = v.slice(ultimoSep + 1)
    const n = /^\d{3}$/.test(despues)
      ? Number(v.replace(/[.,]/g, ''))
      : Number(v.slice(0, ultimoSep).replace(/[.,]/g, '') + '.' + despues)
    return Number.isFinite(n) ? n : null
  }
  // mezcla: el último separador manda el decimal; el otro tipo era miles
  const quita = v[ultimoSep] === '.' ? /,/g : /\./g
  const n = Number(v.slice(0, ultimoSep).replace(quita, '') + '.' + v.slice(ultimoSep + 1))
  return Number.isFinite(n) ? n : null
}

/** Las tablas vivas del texto crudo: línea de encabezados + separador de guiones + 2+ filas, con alguna columna numérica. */
export function tablasVivas(texto: string): TablaViva[] {
  const lineas = texto.split('\n')
  const vivas: TablaViva[] = []
  for (let i = 0; i < lineas.length - 2; i++) {
    const encabezados = filas(lineas[i])
    if (!encabezados.length) continue
    const sep = (lineas[i + 1] ?? '').trim()
    if (!sep.startsWith('|') || !/-/.test(sep) || !/^[\s|\-:]+$/.test(sep.replace(/\d/g, ''))) continue
    const cuerpo: string[][] = []
    for (let j = i + 2; j < lineas.length; j++) {
      if (!filas(lineas[j]).length) break
      cuerpo.push(filas(lineas[j]))
    }
    if (cuerpo.length < 2) continue
    const series: SerieViva[] = []
    for (let ci = 0; ci < encabezados.length; ci++) {
      const serie = cuerpo.map((f) => numeroDe(f[ci] ?? ''))
      if (serie.every((v) => v !== null) && serie.some((v) => v !== 0 && v !== undefined))
        series.push({ col: encabezados[ci], serie: serie as number[], suma: (serie as number[]).reduce((a, b) => a + b, 0) })
    }
    if (series.length) vivas.push({ line: i + 1, encabezados, series })
  }
  return vivas
}

/** ¿El bloque es una figura viva? (json que al parsear da objeto/arreglo). Devuelve los datos o null. */
export const datosVivos = (texto: string): { datos: unknown } | null => {
  const t = texto.trim()
  if (!(t.startsWith('{') || t.startsWith('['))) return null
  try { return { datos: JSON.parse(t) } } catch { return null }
}

/** Un objeto plano de números → sus pares [clave, valor] (lo que el panel enseña como fichas). */
export const fichasDe = (datos: unknown): Array<[string, number]> => {
  if (!datos || typeof datos !== 'object' || Array.isArray(datos)) return []
  return Object.entries(datos).filter(([, v]) => typeof v === 'number') as Array<[string, number]>
}

// ————— El prisma del motor —————

export type SpecLinea = { tipo: 'linea'; titulo?: string; unidades?: string; nombre?: string; valores: number[]; etiquetas?: string[] }
export type SpecBarras = { tipo: 'barras'; titulo?: string; unidades?: string; series: { nombre: string; valores: number[] }[]; etiquetas?: string[] }
export type SpecFichas = { tipo: 'fichas'; titulo?: string; unidades?: string; fichas: Record<string, number> }
export type SpecPrisma = SpecLinea | SpecBarras | SpecFichas

/** El spec del motor, strict: números finitos, arreglos no vacíos. Mal déjaloasil, null y el bloque queda crudo. */
export function leerPrisma(contenido: string): SpecPrisma | null {
  const vivo = datosVivos(contenido)
  if (!vivo) return null
  const d = vivo.datos as Record<string, unknown>
  const nums = (v: unknown): number[] | null =>
    Array.isArray(v) && v.length > 0 && v.every((x) => typeof x === 'number' && Number.isFinite(x)) ? (v as number[]) : null
  const texto = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() ? v.trim() : undefined)
  const etiquetas = (v: unknown): string[] | undefined => (Array.isArray(v) && v.every((e) => typeof e === 'string') && v.length > 0) ? (v as string[]) : undefined
  const titulo = texto(d.titulo), unidades = texto(d.unidades)
  if (d.tipo === 'fichas' && d.fichas && typeof d.fichas === 'object' && !Array.isArray(d.fichas)) {
    const fichas = fichasDe(d.fichas)
    if (fichas.length === 0) return null
    return { tipo: 'fichas', titulo, fichas: Object.fromEntries(fichas) }
  }
  if (d.tipo === 'barras') {
    if (!Array.isArray(d.series) || d.series.length === 0) return null
    const series = d.series.slice(0, 3)
      .map((s): { nombre: string; valores: number[] } | null => {
        if (!s || typeof s !== 'object') return null
        const valores = nums((s as Record<string, unknown>).valores)
        return valores ? { nombre: texto((s as Record<string, unknown>).nombre) ?? 'serie', valores } : null
      })
      .filter((s): s is { nombre: string; valores: number[] } => s !== null)
    if (!series.length) return null
    return { tipo: 'barras', titulo, unidades, series, etiquetas: etiquetas(d.etiquetas) }
  }
  if (d.tipo === 'linea' || d.tipo === undefined) {
    const valores = nums(d.valores) ?? nums(d.serie)
    if (!valores) return null
    return { tipo: 'linea', titulo, unidades, nombre: texto(d.nombre), valores, etiquetas: etiquetas(d.etiquetas) }
  }
  return null
}

/** El camino de una línea con su área, en el cuadro [pad..ancho-pad] × [pad..alto-pad]. Rango total: arriba–abajo; si ganan el cero, se le marca. */
export function caminoLinea(valores: number[], ancho = 260, alto = 86, pad = 8): { linea: string; area: string; puntos: Array<[number, number]>; yCero?: number; arriba: number; abajo: number } {
  const n = valores.length
  const arriba = Math.max(...valores), abajo = Math.min(...valores)
  const rango = arriba - abajo || Math.abs(arriba) || 1
  const yDe = (v: number) => pad + (alto - 2 * pad) * (1 - (v - abajo) / rango)
  const pasos = n === 1 ? [0.5] : valores.map((_, i) => i / (n - 1))
  const puntos = valores.map((v, i): [number, number] => [pad + pasos[i] * (ancho - 2 * pad), yDe(v)])
  const linea = puntos.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join('')
  const yBase = yDe(abajo <= 0 && arriba >= 0 ? 0 : abajo)
  const area = `${linea}L${puntos[puntos.length - 1][0].toFixed(1)} ${yBase.toFixed(1)}L${puntos[0][0].toFixed(1)} ${yBase.toFixed(1)}Z`
  return { linea, area, puntos, yCero: abajo <= 0 && arriba >= 0 ? yBase : undefined, arriba, abajo }
}
