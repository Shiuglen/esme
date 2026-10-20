// Una piel hecha con los colores de una referencia. De una web guardada sale una piel que se puede poner.
//
// La idea: el color que una web más usa es su fondo (el extractor los deja ordenados por frecuencia), el más vivo es su
// acento, y el resto son matices. De ahí sale una piel completa: fondo, superficie, texto y acento, de noche y de día.
// Y se comprueba que todo se lea (WCAG AA), porque una piel que no se lee no es una piel: es ruido.
import { contraste, validarPiel, type Piel } from './piel'
import { aRgb, mezclar } from './luz'

const hex = (rgb: number[]) => `#${rgb.map((x) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0')).join('')}`

/** La luz de un color: 0 es negro, 1 es blanco. */
const brillo = (c: string) => { const [r, g, b] = aRgb(c); return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 }
/** Lo vivo de un color: 0 es gris, 1 es puro color. */
const croma = (c: string) => { const [r, g, b] = aRgb(c); const mx = Math.max(r, g, b), mn = Math.min(r, g, b); return mx === 0 ? 0 : (mx - mn) / mx }

/** Un color con la luz justa, conservando su tono: oscurecer no es poner negro. */
function conLuz(color: string, objetivo: number): string {
  const actual = brillo(color)
  if (Math.abs(actual - objetivo) < 0.02) return color
  const [r, g, b] = aRgb(color)
  const factor = objetivo / Math.max(0.02, actual)
  return hex([r * factor, g * factor, b * factor])
}

/** El color más cercano en luz al objetivo, de los que hay. */
function masCerca(colores: string[], objetivo: number, excepto: string[] = []): string | undefined {
  return colores.filter((c) => !excepto.includes(c)).sort((a, b) => Math.abs(brillo(a) - objetivo) - Math.abs(brillo(b) - objetivo))[0]
}

/** Un color que se lee sobre su fondo: si no, se acerca al blanco o al negro hasta que se lee. */
function legible(color: string, fondo: string, superficie: string): string {
  if (contraste(color, fondo) >= 4.6 && contraste(color, superficie) >= 4.6) return color
  const texto = brillo(fondo) > 0.5 ? '#000000' : '#ffffff'
  for (let k = 0.9; k >= 0; k -= 0.05) {
    const c = mezclar(color, texto, k)
    if (contraste(c, fondo) >= 4.6 && contraste(c, superficie) >= 4.6) return c
  }
  return texto
}

export type PielDerivada = { ok: true; piel: Piel; fondo: string; acento: string } | { ok: false; errores: string[] }

/**
 * La piel a partir de los colores de una referencia, ordenados por frecuencia (el primero es el que más usa la web).
 * Si no hay con qué, no hay piel: y se dice por qué, en vez de inventar.
 */
export function pielDeColores(colores: string[], o: { nombre?: string } = {}): PielDerivada {
  const limpios = [...new Set(colores.map((c) => c.trim().toLowerCase()).filter((c) => /^#[0-9a-f]{6}$/.test(c)))]
  if (limpios.length < 3) return { ok: false, errores: ['con esos colores no hay una piel: hacen falta al menos tres distintos'] }

  // el fondo: el color que la web más usa
  const fondo = limpios[0]
  const oscuro = brillo(fondo) < 0.5

  // el texto: el que más contraste tiene con el fondo; si ninguno llega, el blanco o el negro
  const porContraste = [...limpios].sort((a, b) => Math.abs(brillo(b) - brillo(fondo)) - Math.abs(brillo(a) - brillo(fondo)))
  const candidato = porContraste[0]
  const textoBase = Math.abs(brillo(candidato) - brillo(fondo)) >= 0.55 ? candidato : (oscuro ? '#f2f4f8' : '#12141a')

  // el acento: el más vivo que no sea el fondo ni el texto
  const vivos = limpios.filter((c) => c !== fondo && c !== textoBase).sort((a, b) => croma(b) - croma(a))
  const acentoBase = vivos[0] ?? textoBase

  // cada tema: el fondo se queda si ya es de ese tono; si no, se le lleva a ese tono conservando su color
  const nocheFondo = oscuro ? fondo : conLuz(fondo, 0.07)
  const diaFondo = oscuro ? conLuz(fondo, 0.94) : fondo
  const nocheTexto = conLuz(oscuro ? textoBase : '#f2f4f8', 0.93)
  const diaTexto = conLuz(oscuro ? '#12141a' : textoBase, 0.09)

  // la superficie: un peldaño sobre el fondo, del color de su texto (como cualquier panel de verdad)
  const nocheSuperficie = mezclar(nocheFondo, nocheTexto, 0.07)
  const diaSuperficie = mezclar(diaFondo, diaTexto, 0.05)

  const nocheAcento = legible(acentoBase, nocheFondo, nocheSuperficie)
  const diaAcento = legible(acentoBase, diaFondo, diaSuperficie)

  const piel: Piel = {
    version: 1,
    nombre: o.nombre ?? 'Sin nombre',
    color: {
      tipo: 'libre',
      noche: { fondo: nocheFondo, superficie: nocheSuperficie, texto: nocheTexto, acento: nocheAcento },
      dia: { fondo: diaFondo, superficie: diaSuperficie, texto: diaTexto, acento: diaAcento },
    },
  }
  const v = validarPiel(piel)
  if (!v.ok) return { ok: false, errores: v.errores }
  return { ok: true, piel: v.piel, fondo, acento: acentoBase }
}
