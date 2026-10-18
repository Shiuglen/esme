// Las piezas (capa de la piel): cada detalle de la interfaz es un hueco con muchas variantes, absorbidas de todas las
// bibliotecas (React Bits, Kokonut UI…) y de lo que vaya llegando. Aquí solo hay datos —qué huecos hay y qué variantes
// valen—; cómo se pinta cada una vive en tinta/Piezas.tsx. Sumar una variante es añadir una línea aquí y su dibujo allí.
export const PIEZAS = {
  saludo: { nombre: 'Cómo aparece el saludo', variantes: [
    { id: 'enfoque', nombre: 'Se enfoca letra a letra' }, { id: 'descifrar', nombre: 'Se descifra como un código' },
    { id: 'brillo', nombre: 'Un brillo lo recorre' }, { id: 'degradado', nombre: 'Degradado vivo' },
    { id: 'glitch', nombre: 'Interferencia' }, { id: 'fijo', nombre: 'Quieto' },
  ] },
  pulsar: { nombre: 'Al pulsar', variantes: [{ id: 'nada', nombre: 'Nada' }, { id: 'chispas', nombre: 'Chispas de luz' }] },
  trabajo: { nombre: 'Mientras Esme trabaja', variantes: [
    { id: 'electrico', nombre: 'Borde eléctrico' }, { id: 'estrella', nombre: 'Estrella que orbita' }, { id: 'brillo', nombre: 'Brillo suave' }, { id: 'nada', nombre: 'Nada' },
  ] },
} as const

export type Hueco = keyof typeof PIEZAS
export type Piezas = { [H in Hueco]: (typeof PIEZAS)[H]['variantes'][number]['id'] }
export const PIEZAS_BASE: Piezas = { saludo: 'enfoque', pulsar: 'nada', trabajo: 'electrico' }

/** Valida las piezas que trae una piel: completa lo que falta con la base y devuelve los errores de lo que no existe. */
export function validarPiezas(x: unknown): { piezas: Piezas; errores: string[] } {
  const piezas = { ...PIEZAS_BASE }, errores: string[] = []
  if (x === undefined) return { piezas, errores }
  if (typeof x !== 'object' || x === null || Array.isArray(x)) return { piezas, errores: ['piezas: tiene que ser un objeto'] }
  for (const [k, v] of Object.entries(x)) {
    if (!(k in PIEZAS)) { errores.push(`piezas.${k}: no es un hueco`); continue }
    const ids = PIEZAS[k as Hueco].variantes.map((w) => w.id) as string[]
    if (ids.includes(v as string)) (piezas as Record<string, string>)[k] = v as string
    else errores.push(`piezas.${k}: «${String(v)}» no es una variante`)
  }
  return { piezas, errores }
}
