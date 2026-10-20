// El router del Taller: Esme elige motor y modelo aprendiendo de lo que tú aplicas o descartas.
// Muestreo de Thompson sobre una Beta(2 + aciertos, 2 + fallos) por modelo: explota lo que funciona y, de vez en cuando,
// prueba lo que aún no conoce. A igualdad, lo gratis gana. Siempre explica por qué eligió.
// Y aprende también de lo que falló: una tarea que acabó en error ya es un fallo de ese modelo, aunque tú no la etiquetes.
import type { TareaTaller } from '../lib/bridge'
import { explicarError } from './vista'
import type { MotorTaller, OpcionMotor } from '../lib/bridge'

export type Candidato = { motor: string; motorNombre: string; modelo: string; modeloNombre: string; gratis: boolean }
export type Veredicto = { motor: string; modelo: string | null; exito: boolean; error?: string; tarea?: string }
export type Eleccion = Candidato & { aciertos: number; total: number; fallos: number; motivo: string }
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

/** Los modelos que el motor rechazó por retirado o caído: no se vuelven a proponer.
 *  Como con los motores que no están listos, **manda el último intento**: si el modelo vuelve a
 *  funcionar, vuelve a estar disponible. (Banearlo para siempre era un resto de una decisión anterior.) */
export function caidosDe(tareas: Pick<TareaTaller, 'inicio' | 'error' | 'opciones'>[]): string[] {
  const ultimo = new Map<string, Pick<TareaTaller, 'inicio' | 'error' | 'opciones'>>()
  for (const t of tareas) {
    const modelo = t.opciones?.find((o) => o.id === 'model')?.actual
    if (!modelo) continue
    const u = ultimo.get(modelo)
    if (!u || t.inicio > u.inicio) ultimo.set(modelo, t)
  }
  const fuera: string[] = []
  for (const [modelo, t] of ultimo) {
    if (t.error && explicarError(t.error, '', '')?.tipo === 'modelo') fuera.push(modelo)
  }
  return fuera
}

/** Los fallos que ya sabemos sin que el creador etiquete nada: cada tarea que acabó en error es un fallo de su motor y su modelo.
 *  Sólo cuentan los que dicen qué modelo falló: los que mueren antes de elegir modelo (la sesión se cae) son culpa del motor,
 *  y de ésos se ocupa `noListos`. */
export function fallosDe(tareas: Pick<TareaTaller, 'id' | 'motor' | 'modelo' | 'estado' | 'error' | 'inicio'>[]): Veredicto[] {
  return tareas
    .filter((t) => t.estado === 'error' && !!t.motor && !!t.modelo)
    .sort((a, b) => b.inicio - a.inicio)
    .map((t) => ({ motor: t.motor, modelo: t.modelo, exito: false, error: t.error, tarea: t.id }))
}

/** Todo lo que se sabe del pasado, sin contar dos veces lo mismo: lo que el creador aplicó o descartó, más los fallos ya sabidos.
 *  Una tarea que acabó en error y que además descartaste cuenta una vez, no dos. */
export function historial(veredictos: Veredicto[], fallos: Veredicto[]): Veredicto[] {
  const yaContados = new Set(fallos.map((f) => f.tarea).filter(Boolean) as string[])
  return [...veredictos.filter((v) => !v.tarea || !yaContados.has(v.tarea)), ...fallos]
}

const corta = (s: string, n = 60) => (s.length > n ? s.slice(0, n - 1) + '…' : s)

// Los veredictos guardan el nombre visible del modelo; los candidatos, su id. Valen los dos.
function cuenta(c: Candidato, vs: Veredicto[]) {
  let aciertos = 0, total = 0, fallos = 0, ultimo = ''
  for (const v of vs) {
    if (v.motor !== c.motor || !(v.modelo === c.modelo || v.modelo === c.modeloNombre)) continue
    total++
    if (v.exito) aciertos++
    else if (v.error) { fallos++; if (!ultimo) ultimo = v.error }   // el primero es el más reciente: los fallos van ordenados
  }
  return { aciertos, total, fallos, ultimo }
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
    const { aciertos, total, fallos, ultimo } = cuenta(c, vs)
    const s = beta(aciertos + 2, total - aciertos + 2, azar) * (preferirGratis && !c.gratis ? 0.85 : 1)
    const motivo = !total
      ? 'Aún sin historial: Esme lo prueba'
      : !fallos
        ? `Acertó ${aciertos} de ${total} veces`
        : `Acertó ${aciertos} de ${total} veces · ${fallos} ${fallos === 1 ? 'acabó' : 'acabaron'} en error${ultimo ? `: ${corta(ultimo)}` : ''}`
    return { ...c, aciertos, total, fallos, s, motivo }
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

/** Los motores que hoy no están listos, aprendido de su último intento real: si falló por la sesión o porque no existe en el
 *  equipo, no se ofrece en Automático y su botón dice por qué. En cuanto vuelve a funcionar una vez, vuelve a estar listo.
 *  Un límite de peticiones o un fallo de red es pasajero: no cuenta. */
export function noListos(tareas: Pick<TareaTaller, 'motor' | 'motorNombre' | 'inicio' | 'estado' | 'error'>[]): Map<string, string> {
  const ultimo = new Map<string, (typeof tareas)[number]>()
  for (const t of tareas) {
    if (t.estado !== 'lista' && t.estado !== 'error') continue
    const u = ultimo.get(t.motor); if (!u || t.inicio > u.inicio) ultimo.set(t.motor, t)
  }
  const out = new Map<string, string>()
  for (const [motor, t] of ultimo) {
    if (t.estado !== 'error' || !t.error) continue
    if (/ENOENT|not found|no se encuentra/i.test(t.error)) out.set(motor, 'No se encuentra en este equipo')
    else if (/dejó de responder|sin señales/i.test(t.error)) out.set(motor, 'Se quedó mudo la última vez')
    else if (explicarError(t.error, t.motorNombre, '')?.tipo === 'sesion') out.set(motor, `Inicia sesión en ${t.motorNombre}`)
  }
  return out
}
