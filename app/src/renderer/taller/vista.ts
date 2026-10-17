// Cálculos de la vista del Taller: duraciones, orden de la planta, la micrográfica en el tiempo y el silencio de un motor.
import type { TareaTaller } from '../lib/bridge'

const MS_CUBO = 1500
export const ACTIVAS: TareaTaller['estado'][] = ['preparando', 'trabajando', 'esperando']
export const activa = (t: TareaTaller) => ACTIVAS.includes(t.estado)

const dos = (n: number) => String(n).padStart(2, '0')
export function duracion(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000)), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60)
  return h ? `${h}:${dos(m)}:${dos(s % 60)}` : `${m}:${dos(s % 60)}`
}

/** El código de barras del turno: los 40 cubos de actividad muestreados a píldoras que conservan sus picos (máximo por ventana). */
export function barrasDe(actividad: number[], cuantas = 14): number[] {
  const out: number[] = []
  const por = actividad.length / cuantas
  for (let i = 0; i < cuantas; i++) {
    const desde = Math.floor(i * por), hasta = Math.max(desde + 1, Math.floor((i + 1) * por))
    out.push(Math.max(...actividad.slice(desde, hasta), 0))
  }
  return out
}

/** Qué tareas tienen máquina en la planta: lo que está en marcha primero, luego lo más reciente. Ocho como mucho. */
export function ordenPlanta(ts: TareaTaller[]): string[] {
  const recientes = (a: TareaTaller, b: TareaTaller) => b.inicio - a.inicio
  return [...ts.filter(activa).sort(recientes), ...ts.filter((t) => !activa(t)).sort(recientes)].slice(0, 8).map((t) => t.id)
}

/** La actividad alineada con ahora: en marcha, los cubos sin eventos entran por la derecha; terminada, conserva su forma. */
export function actividadAhora(t: TareaTaller, ahora: number): number[] {
  if (!activa(t) || !t.actividadMs) return t.actividad
  const saltos = Math.min(t.actividad.length, Math.max(0, Math.floor(ahora / MS_CUBO) - t.actividadMs / MS_CUBO + 1))
  return saltos ? [...t.actividad.slice(saltos), ...new Array(saltos).fill(0)] : t.actividad
}

/** Cuánto lleva un motor trabajando sin dar señales (null si no está trabajando). `desde`: cuándo empezó el turno. */
export function silencioMs(t: TareaTaller, ahora: number, desde = 0): number | null {
  if (t.estado !== 'trabajando') return null
  return Math.max(0, ahora - Math.max(t.actividadMs - MS_CUBO, desde))
}

export const textoCambios = (c: TareaTaller['cambios']) => (!c ? null : c.ficheros ? `+${c.mas} −${c.menos}` : 'Sin cambios')

const MOTIVOS: Record<string, string> = {
  end_turn: 'Terminó', cancelled: 'La paraste', max_tokens: 'Se quedó sin espacio para responder',
  max_turn_requests: 'Llegó al límite de pasos', refusal: 'El motor se negó',
}
export const motivoFin = (m: string) => MOTIVOS[m] ?? `Terminó (${m})`

export const ESTADOS: Record<TareaTaller['estado'], { texto: string; tono: 'vida' | 'atencion' | 'neutro' | 'apagado' | 'peligro' }> = {
  preparando: { texto: 'Preparando', tono: 'apagado' },
  trabajando: { texto: 'Trabajando', tono: 'vida' },
  esperando: { texto: 'Te necesita', tono: 'atencion' },
  lista: { texto: 'Lista', tono: 'neutro' },
  parada: { texto: 'Parada', tono: 'apagado' },
  error: { texto: 'Error', tono: 'peligro' },
}

export type Explicacion = { tipo: 'sesion' | 'modelo' | 'limite' | 'motor'; titulo: string; consejo: string }
/** Traduce los errores típicos de los motores a qué pasa y qué hacer. null si no es uno conocido. */
export function explicarError(error: string, motor: string, login: string): Explicacion | null {
  if (/auth(entication|enticate)? required|not authenticated|unauthori[sz]ed|sign in|log ?in required/i.test(error))
    return { tipo: 'sesion', titulo: `${motor} necesita que inicies sesión`, consejo: login || `Inicia sesión en ${motor} desde una terminal.` }
  if (/rate limit|too many requests|\b429\b|quota exceeded/i.test(error))
    return { tipo: 'limite', titulo: 'El proveedor ha limitado las peticiones', consejo: 'Los modelos gratis aceptan pocas peticiones a la vez. Espera un poco y pídeselo de nuevo, o usa otro modelo.' }
  if (/deprecated|unavailable|not (found|supported)|no (such|longer) model|model .* (retired|disabled)/i.test(error))
    return { tipo: 'modelo', titulo: 'Ese modelo no está disponible', consejo: 'Elige otro modelo en el selector y pídeselo de nuevo.' }
  if (/internal error|process exited|protocol error|unexpected/i.test(error))
    return { tipo: 'motor', titulo: 'El motor se cayó sin decidir', consejo: 'Suele ser temporal: del proveedor o de la sesión. Vuelve a pedírselo, o reencarna la tarea con otro motor (⟳ arriba).' }
  if (/econn(refused|reset)|epipe|socket hang ?up|x509|self.signed certificate/i.test(error))
    return { tipo: 'motor', titulo: 'El motor no alcanzó su destino', consejo: 'Falla la red o el punto de llegada. Despiértalo más tarde o reencarna con otro motor (⟳).' }
  if (/timeout|timed\s?\-?out|timed out/i.test(error))
    return { tipo: 'motor', titulo: 'Se quedó sin tiempo', consejo: 'El motor tardó demasiado. Divide la petición, pídeselo de nuevo o reencarna (⟳) con otro motor.' }
  return null
}
