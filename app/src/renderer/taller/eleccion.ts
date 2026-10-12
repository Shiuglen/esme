// El router del Taller: Esme elige motor y modelo aprendiendo de lo que tú aplicas o descartas.
// Muestreo de Thompson sobre una Beta(2 + aciertos, 2 + fallos) por modelo: explota lo que funciona y, de vez en cuando,
// prueba lo que aún no conoce. A igualdad, lo gratis gana. Siempre explica por qué eligió.
import type { MotorTaller, OpcionMotor } from '../lib/bridge'

export type Candidato = { motor: string; motorNombre: string; modelo: string; modeloNombre: string; gratis: boolean }
export type Veredicto = { motor: string; modelo: string | null; exito: boolean }
export type Eleccion = Candidato & { aciertos: number; total: number; motivo: string }
type Opciones = { azar?: () => number; preferirGratis?: boolean }

/** Generador con semilla (mulberry32): el mismo azar cada vez, para probar y para repetir decisiones. */
export function semillado(semilla: number): () => number {
  let s = semilla | 0
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Un candidato por modelo de cada motor instalado que respondió al sondeo; fuera los modelos que ya fallaron. */
export function candidatosDe(motores: Pick<MotorTaller, 'id' | 'nombre' | 'instalado'>[], opciones: Record<string, OpcionMotor[]>, caidos: string[]): Candidato[] {
  return motores.filter((m) => m.instalado).flatMap((m) => {
    const o = (opciones[m.id] ?? []).find((x) => x.id === 'model')
    return (o?.valores ?? []).filter((v) => !caidos.includes(v.id))
      .map((v) => ({ motor: m.id, motorNombre: m.nombre, modelo: v.id, modeloNombre: v.nombre, gratis: /free/i.test(v.id) }))
  })
}

// Los veredictos guardan el nombre visible del modelo; los candidatos, su id. Valen los dos.
function cuenta(c: Candidato, vs: Veredicto[]) {
  let aciertos = 0, total = 0
  for (const v of vs) if (v.motor === c.motor && (v.modelo === c.modelo || v.modelo === c.modeloNombre)) { total++; if (v.exito) aciertos++ }
  return { aciertos, total }
}

/** Una muestra de Beta(a, b) con a y b enteros: el a-ésimo menor de a + b − 1 uniformes (con mucho historial, aproximación normal). */
function beta(a: number, b: number, azar: () => number): number {
  if (a + b > 200) {
    const m = a / (a + b), sd = Math.sqrt((a * b) / ((a + b) ** 2 * (a + b + 1)))
    const g = Math.sqrt(-2 * Math.log(azar() || 1e-12)) * Math.cos(2 * Math.PI * azar())
    return Math.min(1, Math.max(0, m + sd * g))
  }
  const u = Array.from({ length: a + b - 1 }, azar).sort((x, y) => x - y)
  return u[a - 1]
}

function puntuar(cs: Candidato[], vs: Veredicto[], { azar = Math.random, preferirGratis = true }: Opciones) {
  return cs.map((c) => {
    const { aciertos, total } = cuenta(c, vs)
    const s = beta(aciertos + 2, total - aciertos + 2, azar) * (preferirGratis && !c.gratis ? 0.85 : 1)
    return { ...c, aciertos, total, s, motivo: total ? `${aciertos} de ${total} tareas aplicadas con este modelo` : 'Aún sin historial: Esme lo prueba' }
  }).sort((x, y) => y.s - x.s)
}

export function elegir(cs: Candidato[], vs: Veredicto[], o: Opciones = {}): Eleccion | null {
  if (!cs.length) return null
  const { s: _s, ...mejor } = puntuar(cs, vs, o)[0]
  return mejor
}

/** Para la arena: n candidatos distintos, los mejores de una misma tirada. */
export function elegirVarios(cs: Candidato[], vs: Veredicto[], n: number, o: Opciones = {}): Eleccion[] {
  return puntuar(cs, vs, o).slice(0, n).map(({ s: _s, ...e }) => e)
}

/** Qué puede elegir Esme sola: lo gratis, y lo local o de pago solo si alguna vez aplicaste una tarea hecha con ello. */
export const elegibles = (cs: Candidato[], vs: Veredicto[]) => cs.filter((c) => c.gratis || cuenta(c, vs.filter((v) => v.exito)).aciertos > 0)
