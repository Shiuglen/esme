// Una piel hecha con los colores de una referencia. De una web guardada sale una piel que se puede poner.
//
// La idea: el color que una web más usa es su fondo (el extractor los deja ordenados por frecuencia), el más vivo es su
// acento, y el resto son matices. De ahí sale una piel completa: fondo, superficie, texto y acento, de noche y de día.
// Y se comprueba que todo se lea (WCAG AA), porque una piel que no se lee no es una piel: es ruido.
import { contraste, revisarContraste, validarPiel, variablesDePiel, PIEL_BASE, type Piel } from './piel'
import { aRgb } from './luz'

const hex = (rgb: number[]) => `#${rgb.map((x) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0')).join('')}`

/** La luz de un color: 0 es negro, 1 es blanco. */
const brillo = (c: string) => { const [r, g, b] = aRgb(c); return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 }
/** Lo vivo de un color: 0 es gris, 1 es puro color. */
const croma = (c: string) => { const [r, g, b] = aRgb(c); const mx = Math.max(r, g, b), mn = Math.min(r, g, b); return mx === 0 ? 0 : (mx - mn) / mx }

/** Un color con la luz justa, conservando su tono: se MEZCLA (multiplicar no aclararía el negro). */
function conLuz(color: string, objetivo: number): string {
  const actual = brillo(color)
  if (Math.abs(actual - objetivo) < 0.03) return color
  const destino = objetivo > actual ? '#ffffff' : '#000000'   // aclarar es hacia el blanco; oscurecer, hacia el negro
  return mezclaHex(color, destino, Math.min(1, Math.abs(actual - objetivo)))
}

/** Mezclar dos colores guardando su tono: el resultado, en hex (las pieles son datos, no funciones). */
function mezclaHex(a: string, b: string, t: number): string {
  const [x, y, z] = aRgb(a), [u, v, w] = aRgb(b)
  return hex([x + (u - x) * t, y + (v - y) * t, z + (w - z) * t])
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
    const c = mezclaHex(color, texto, k)
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
  const nocheSuperficie = mezclaHex(nocheFondo, nocheTexto, 0.07)
  const diaSuperficie = mezclaHex(diaFondo, diaTexto, 0.05)

  const nocheAcento = legible(acentoBase, nocheFondo, nocheSuperficie)
  const diaAcento = legible(acentoBase, diaFondo, diaSuperficie)

  // los colores de aviso también tienen que leerse en ESTA piel (si no, un error se vuelve ilegible)
  const SEMANTICOS = { atencion: '#f2b45b', peligro: '#ff7a6b', exito: '#7ee0a1' } as const
  const semanticos = (fondo: string, superficie: string) => ({
    atencion: legible(SEMANTICOS.atencion, fondo, superficie),
    peligro: legible(SEMANTICOS.peligro, fondo, superficie),
    exito: legible(SEMANTICOS.exito, fondo, superficie),
  })

  // el texto tiene que leerse sobre su fondo: si no, se acerca al blanco o al negro hasta que se lee
  const nocheTextoLegible = legible(nocheTexto, nocheFondo, nocheSuperficie)
  const diaTextoLegible = legible(diaTexto, diaFondo, diaSuperficie)

  const piel: Piel = {
    ...PIEL_BASE,
    version: 1,
    nombre: o.nombre ?? 'Sin nombre',
    color: {
      tipo: 'libre',
      noche: { fondo: nocheFondo, superficie: nocheSuperficie, texto: nocheTextoLegible, acento: nocheAcento, ...semanticos(nocheFondo, nocheSuperficie) },
      dia: { fondo: diaFondo, superficie: diaSuperficie, texto: diaTextoLegible, acento: diaAcento, ...semanticos(diaFondo, diaSuperficie) },
    },
  }
  const v = validarPiel(piel)
  if (!v.ok) return { ok: false, errores: v.errores }

  // la comprobación final es la de la app (los pares que tienen que leerse, de noche y de día)
  const fallos = [...revisarContraste(variablesDePiel(piel, 'noche')), ...revisarContraste(variablesDePiel(piel, 'dia'))]
  if (fallos.length) return { ok: false, errores: fallos }

  return { ok: true, piel: v.piel, fondo, acento: acentoBase }
}
