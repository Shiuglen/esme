// El comité del parlamento: la lógica del relevo, pura y probada (fase 1 de la spec
// docs/superpowers/specs/2026-10-21-parlamento-live.md). Cada relevo es una tarea real del Taller
// con un oficio (roles.ts); lo que se pasa de un motor al siguiente es la EVIDENCIA: lo que hizo,
// en qué ficheros y qué falló o se negó en su camino. Aquí está el plan, el encargo de cada relevo
// y cómo se lee el veredicto final — sin tocar nada del runtime todavía.
import type { Rol } from './roles'

/** Un relevo: quién lleva el testigo en esa etapa del comité. */
export type Relevo = { rol: string; motor: string }

/** Cómo acabó el parlamento entero: los ids de los relevos en orden, el estado del veredicto
 *  y la frase humana. `error` trae el motivo si el comité no llegó al final. */
export type FinParlamento = { ids: string[]; estado: 'probado' | 'dudoso' | 'tumbado'; frase: string; error?: string }

/** Un paso del plan: el oficio del relevo, el motor que lo lleva y el encargo de base. */
export type Paso = {
  orden: number
  rol: string
  motor: string
  instruccion?: string   // el texto del oficio (roles.ts); si el rol no existe, el paso no se arma
  encargo: string        // el encargo de base, sin la evidencia (ésta se cose en encargoRelevo)
}

/** La evidencia que un relevo deja para el siguiente (nada de promesas: hechos del runtime). */
export type Evidencia = {
  resumen?: string        // el texto final del motor del relevo (recortado; manda lo último que dijo)
  ficheros?: { nombre: string; mas: number; menos: number }[]   // lo que tocó (de t.cambios)
  caido?: string          // si el relevo falló o se negó: la frase humana del error (t.error)
}

/** El encargo de base: si el texto traía un oficio delante (textoConRol), se lo quita — cada relevo
 *  pone el suyo; el encargo original no debe llegar dos veces disfrazado. */
export const baseDe = (texto: string): string => {
  const inicia = texto.indexOf('\n\nEncargo:\n')
  return inicia >= 0 ? texto.slice(inicia + '\n\nEncargo:\n'.length) : texto
}

/** El plan del comité. Un relevo solo es una tarea, no un parlamento: hace falta de dos en adelante,
 *  todo rol conocido y encargo con sustancia; si algo no cumple, no hay parlamento (y mañana se ve). */
export function planParlamento(encargo: string, relevos: Relevo[], roles: Rol[]): Paso[] {
  if (!encargo.trim() || relevos.length < 2) return []
  const oficios = new Map(roles.map((r) => [r.id, r.instruccion]))
  const plan: Paso[] = []
  for (const r of relevos) {
    const instruccion = oficios.get(r.rol)
    if (!instruccion?.trim()) return []   // un oficio desconocido no es parlamento: mejor parar que adivinar
    plan.push({ orden: plan.length + 1, rol: r.rol, motor: r.motor, instruccion, encargo: encargo.trim() })
  }
  return plan
}

/** El encargo exacto del relevo: su oficio delante y, si hubo uno antes, su evidencia cosida. */
export function encargoRelevo(paso: Paso, anterior?: Evidencia): string {
  const piezas: string[] = []
  if (paso.instruccion?.trim()) piezas.push(paso.instruccion.trim())
  if (anterior) {
    const cosido: string[] = []
    if (anterior.resumen?.trim()) cosido.push(`Lo que hizo y contó el relevo anterior:\n${recortado(anterior.resumen)}`)
    if (anterior.ficheros?.length) {
      cosido.push(`Ficheros que ya tocó: ${anterior.ficheros.map((f) => `${f.nombre} (+${f.mas}/−${f.menos})`).join(', ')}`)
    }
    if (anterior.caido?.trim()) cosido.push(`Lo que quedó MAL en el camino anterior: ${anterior.caido.trim()}`)
    if (cosido.length) piezas.push(`Evidencia del relevo anterior:\n${cosido.join('\n')}`)
  }
  piezas.push(`Encargo:\n${paso.encargo}`)
  return piezas.join('\n\n')
}

/** Podar la evidencia antes de coserla: el texto largo ahoga al siguiente relevo (800 es la casa). */
export function podarEvidencia(e: Evidencia): Evidencia {
  return {
    ...e,
    resumen: e.resumen ? recortado(e.resumen) : undefined,
    ficheros: e.ficheros?.length ? e.ficheros : undefined,
    caido: e.caido?.trim() ? e.caido.trim() : undefined,
  }
}

/** Cómo se lee el parlamento entero: lo que firma el ÚLTIMO relevo (su texto si terminó bien,
 *  su error si cayó o se negó — que no ocultó el detector de negativas). */
export function veredictoDe(base: { resumen?: string; caido?: string }): { estado: 'probado' | 'dudoso' | 'tumbado'; frase: string } {
  if (base.caido?.trim()) return { estado: 'tumbado', frase: `El parlamento no llegó: ${base.caido.trim()}` }
  const texto = (base.resumen ?? '').toLowerCase()
  const dicePasa = /(\btests?\b|\bpruebas?\b|\bases\b|\bpassing\b|\bpassed\b)/.test(texto)
  const diceNo = /\b(fallan|no pasan|no pasaron|no pasa la|failing|failed|no se ejecut)/.test(texto)
  if (dicePasa && !diceNo) return { estado: 'probado', frase: base.resumen!.trim() }
  return { estado: 'dudoso', frase: base.resumen?.trim() || 'El último relevo no dijo nada: sin veredicto.' }
}

const recortado = (s: string, max = 800) => (s.trim().length > max ? s.trim().slice(0, max - 1).trimEnd() + '…' : s.trim())
