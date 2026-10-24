// El comité del parlamento: la lógica del relevo, pura y probada (fase 1 de la spec
// docs/superpowers/specs/2026-10-21-parlamento-live.md). Cada relevo es una tarea real del Taller
// con un oficio (roles.ts); lo que se pasa de un motor al siguiente es la EVIDENCIA: lo que hizo,
// en qué ficheros y qué falló o se negó en su camino. Aquí está el plan, el encargo de cada relevo
// y cómo se lee el veredicto final — sin tocar nada del runtime todavía.
import type { EventoMotor } from '../motores/sesion-acp'
import type { ActaFirmada } from './acta'
import type { Rol } from './roles'

/** Un relevo: quién lleva el testigo en esa etapa del comité. Con `etapa` es un relevo de un FLUJO
 *  (flujo.ts): además del encargo entero, sabe qué paso le toca a él. */
export type Relevo = { rol: string; motor: string; etapa?: string }

/** Cómo acabó el parlamento entero: los ids de los relevos en orden, el estado del veredicto
 *  y la frase humana. `error` trae el motivo si el comité no llegó al final. `acta` dice si el
 *  veredicto quedó firmado en el diario del taller (actas-parlamento.jsonl), y `actaFirmada`
 *  la trae ya sellada (con su estados de validez comprobado in situ) para que se lea sin pedir
 *  nada más: lo que firmó la casa, visible en la puerta que lo pidió. */
export type FinParlamento = {
  ids: string[]
  estado: 'probado' | 'dudoso' | 'tumbado'
  frase: string
  error?: string
  acta?: boolean
  actaFirmada?: ActaFirmada & { valida: boolean }
}

/** Un paso del plan: el oficio del relevo, el motor que lo lleva y el encargo de base. */
export type Paso = {
  orden: number
  rol: string
  motor: string
  instruccion?: string   // el texto del oficio (roles.ts); si el rol no existe, el paso no se arma
  encargo: string        // el encargo de base, sin la evidencia (ésta se cose en encargoRelevo)
  etapa?: string         // solo en un flujo: el paso que lleva este relevo
  total?: number         // solo en un flujo: cuántas etapas hay
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
    const etapa = r.etapa?.trim()
    plan.push({ orden: plan.length + 1, rol: r.rol, motor: r.motor, instruccion, encargo: encargo.trim(), ...(etapa ? { etapa, total: relevos.length } : {}) })
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
  if (paso.etapa) piezas.push(etapaDe(paso, !!anterior))
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

/** La etapa de un relevo de flujo: cuál le toca y qué hace con las demás (no las rehace ni las adelanta). */
function etapaDe(paso: Paso, huboAnterior: boolean): string {
  const total = paso.total ?? paso.orden
  const cabeza = `Tu etapa en este flujo (${paso.orden} de ${total}): ${paso.etapa}`
  if (paso.orden >= total) return `${cabeza}\nEs la última etapa: cierra el trabajo y di claramente cómo quedó; si hay pruebas, córrelas y di con qué comando.`
  const prueba = huboAnterior ? (paso.orden === 2 ? ' (su evidencia está arriba)' : ' (la evidencia del último está arriba)') : ''
  const antes = paso.orden === 1 ? '' : paso.orden === 2 ? `La etapa anterior ya la llevó otro relevo${prueba}. ` : `Las etapas anteriores ya las llevaron otros relevos${prueba}. `
  const despues = total - paso.orden === 1 ? 'La siguiente la llevará otro relevo' : 'Las siguientes las llevarán otros relevos'
  return `${cabeza}\nHaz solo esta etapa. ${antes}${despues} con lo que tú dejes: di qué hiciste y qué queda.`
}

const recortado = (s: string, max = 800) => (s.trim().length > max ? s.trim().slice(0, max - 1).trimEnd() + '…' : s.trim())

/** La consola del probador: lo que de verdad ejecutó en su sesión (las herramientas de la clase
 *  'execute'). No lo que dice que corrió: lo que dejó pasar por el runtime. */
export type Ejecucion = { detalle?: string; estado?: string }
export const ejecucionesDe = (eventos: EventoMotor[]): Ejecucion[] =>
  eventos.flatMap((e) => (e.tipo === 'herramienta' && e.clase === 'execute' ? [{ detalle: e.detalle, estado: e.estado }] : []))

/** ¿Ese comando tiene pinta de prueba? Por el nombre manda: npm test, pytest, vitest run, go test,
 *  cargo test, `npx tsc --check`… (la crítica de la casa es conservadora: si no huele a prueba, no lo es). */
export const parecioPrueba = (comando?: string): boolean => !!comando?.trim() && /test|spec|vitest|jest|pytest|mocha|prueba|\bcheck/i.test(comando)

/** El juez local (la cola del instinto, 21-oct): el veredicto del comité no se firma con la PALABRA
 *  del último relevo sino con la EVIDENCIA de su sesión. «Probado» hay que ganarlo:
 *   - tumbado por el runtime (cayó o se negó): inapelable, el error es un hecho.
 *   - dudoso (no declaró nada claro): se queda como está, no hay nada que juzgar.
 *   - dijo que PASA: hace falta que la consola suene — al menos una ejecución con pinta de prueba.
 *     Si no corrió NADA, o lo suyo no parece pruebas, el probado se le niega (dudoso). Y si su
 *     ÚLTIMA prueba acabó en fallo, la palabra y la consola chocan: el juez lo tumba. */
export function juezDe(e: { resumen?: string; caido?: string; eventos?: EventoMotor[] }): { estado: 'probado' | 'dudoso' | 'tumbado'; frase: string } {
  const base = veredictoDe(e)
  if (base.estado !== 'probado') return base
  const ejecutadas = ejecucionesDe(e.eventos ?? [])
  if (!ejecutadas.length) return { estado: 'dudoso', frase: `Dijo que pasaba sin haber corrido nada: «${base.frase}»` }
  if (!ejecutadas.some((x) => parecioPrueba(x.detalle))) return { estado: 'dudoso', frase: `Dijo que pasaban las pruebas, pero no se ve que corriera una: «${base.frase}»` }
  const ultima = [...ejecutadas].reverse().find((x) => parecioPrueba(x.detalle))!
  if (ultima.estado === 'failed') {
    return { estado: 'tumbado', frase: `Jura que pasan, pero su última prueba acabó en fallo${ultima.detalle ? ` («${ultima.detalle}»)` : ''}: el juez lo tumba.` }
  }
  return base
}
