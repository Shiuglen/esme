// Lee un diff unificado de git: ficheros, su estado, y cada línea con su número en el original (a) y en la copia (b).
export type LineaDiff =
  | { tipo: 'trozo'; texto: string }
  | { tipo: 'igual'; texto: string; a: number; b: number }
  | { tipo: 'menos'; texto: string; a: number }
  | { tipo: 'mas'; texto: string; b: number }
export type FicheroDiff = { ruta: string; estado: 'cambiado' | 'nuevo' | 'borrado'; binario: boolean; mas: number; menos: number; lineas: LineaDiff[] }

export function leerDiff(texto: string): FicheroDiff[] {
  const out: FicheroDiff[] = []
  let f: FicheroDiff | null = null, a = 0, b = 0, cabecera = false
  for (const l of texto.split('\n')) {
    if (l.startsWith('diff --git ')) {
      const ruta = l.match(/ b\/(.+)$/)?.[1] ?? l.slice(11)
      f = { ruta, estado: 'cambiado', binario: false, mas: 0, menos: 0, lineas: [] }
      out.push(f); cabecera = true; continue
    }
    if (!f) continue
    if (cabecera) {
      if (l.startsWith('new file mode')) f.estado = 'nuevo'
      else if (l.startsWith('deleted file mode')) f.estado = 'borrado'
      else if (l.startsWith('Binary files')) f.binario = true
      if (!l.startsWith('@@')) continue
    }
    const h = l.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/)
    if (h) { a = Number(h[1]); b = Number(h[2]); cabecera = false; f.lineas.push({ tipo: 'trozo', texto: l }); continue }
    if (l.startsWith('+')) { f.lineas.push({ tipo: 'mas', texto: l.slice(1), b: b++ }); f.mas++ }
    else if (l.startsWith('-')) { f.lineas.push({ tipo: 'menos', texto: l.slice(1), a: a++ }); f.menos++ }
    else if (l.startsWith(' ')) f.lineas.push({ tipo: 'igual', texto: l.slice(1), a: a++, b: b++ })
  }
  return out
}

const lineasDe = (s?: string) => (s ? s.split('\n') : [])
/** Líneas añadidas y quitadas entre dos versiones de un fichero (como multiconjunto: rápido y suficiente para un resumen). */
export function contarLineas(antes?: string, despues?: string): { mas: number; menos: number } {
  const quedan = new Map<string, number>()
  for (const l of lineasDe(antes)) quedan.set(l, (quedan.get(l) ?? 0) + 1)
  let mas = 0
  for (const l of lineasDe(despues)) { const n = quedan.get(l) ?? 0; if (n) quedan.set(l, n - 1); else mas++ }
  let menos = 0
  for (const n of quedan.values()) menos += n
  return { mas, menos }
}

/** El antes y el después de un fichero como bloques seguidos (para colorearlos con su contexto) y, por cada línea del diff, de qué lado sale. */
export function lados(f: FicheroDiff): { viejo: string[]; nuevo: string[]; indice: ({ lado: 'viejo' | 'nuevo'; k: number } | null)[] } {
  const viejo: string[] = [], nuevo: string[] = []
  const indice = f.lineas.map((l) => {
    if (l.tipo === 'trozo') return null
    if (l.tipo === 'menos') { viejo.push(l.texto); return { lado: 'viejo' as const, k: viejo.length - 1 } }
    if (l.tipo === 'igual') viejo.push(l.texto)
    nuevo.push(l.texto)
    return { lado: 'nuevo' as const, k: nuevo.length - 1 }
  })
  return { viejo, nuevo, indice }
}
