// El flujo de verdad: una plantilla de varios pasos (plantillas.ts) que no se queda en texto, sino que
// corre como un PARLAMENTO (parlamento.ts + Taller.parlamentar): un relevo por paso, cada uno con su
// oficio y su etapa, y el siguiente hereda la evidencia y el parche real del anterior. Aquí solo está la
// lógica pura (de plantilla a relevos); el runtime es el del parlamento, que ya firma su acta.
// Sin dependencias de Node: la usan el proceso principal y la ventana.
import type { Relevo } from './parlamento'

/** El mismo tope que el canal taller:parlamentar: cada relevo es un agente trabajando de verdad. */
export const MAX_RELEVOS = 5

// Las palabras que delatan el oficio de una etapa; la primera que encaja manda. Conservadoras a
// propósito: lo que no se reconoce lo construye el constructor, que es el oficio que hace el encargo entero.
const PISTAS: [RegExp, string][] = [
  [/ingenier[ií]a inversa|\bbinari|\bdesensambl|\brea\b|por dentro/i, 'espejo'],
  [/\bexplor|\bentend|\binvestig|\baverigu|\bent[eé]rate/i, 'explorador'],
  [/\bprob(ar|ad|ando)|\bprueb|\btests?\b|\bverific|\bcompr(ue|o)b|\bvalid/i, 'probador'],
  [/\brevis|\baudit|\bcr[ií]tic/i, 'revisor'],
]

/** El oficio que pide una etapa, escogido entre los que este equipo tiene (roles.json manda). */
export function oficioDeEtapa(texto: string, disponibles: string[]): string {
  for (const [pista, rol] of PISTAS) if (pista.test(texto) && disponibles.includes(rol)) return rol
  return disponibles.includes('constructor') || !disponibles.length ? 'constructor' : disponibles[0]
}

/** Los relevos de un flujo: un paso, un relevo. Manda el oficio que declara la plantilla si el equipo lo
 *  tiene; si no, el que piden sus palabras. Los motores se turnan (uno solo = todos con el mismo). */
export function relevosDeFlujo(flujo: { pasos: string[]; oficios?: string[] }, motores: string[], disponibles: string[]): Relevo[] {
  if (!motores.length) return []
  const conTexto = flujo.pasos.map((p, i) => ({ etapa: p.trim(), declarado: flujo.oficios?.[i] })).filter((x) => x.etapa)
  return conTexto.map((x, i) => ({
    rol: x.declarado && disponibles.includes(x.declarado) ? x.declarado : oficioDeEtapa(x.etapa, disponibles),
    motor: motores[i % motores.length],
    etapa: x.etapa,
  }))
}

/** ¿Se puede lanzar? Un relevo solo es una tarea (no un flujo) y más de MAX_RELEVOS no entra en un parlamento. */
export function flujoLanzable(relevos: Relevo[]): { ok: true } | { ok: false; motivo: string } {
  if (relevos.length < 2) return { ok: false, motivo: 'Un flujo necesita dos pasos como mínimo (uno solo es una tarea normal).' }
  if (relevos.length > MAX_RELEVOS) return { ok: false, motivo: `Un flujo corre hasta ${MAX_RELEVOS} pasos seguidos; este tiene ${relevos.length}. Divídelo en dos.` }
  return { ok: true }
}
