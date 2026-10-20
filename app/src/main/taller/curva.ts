// La curva del Taller: qué rindieron las tareas de verdad. Sin juez y sin gastar un token.
//
// La etiqueta es del propio creador: aplicar los cambios de una tarea es un sí, descartarlos un no.
// Las medidas (tiempo, tokens, coste, herramientas, ficheros tocados) las dejó la app al trabajar.
// Con eso se sabe si el equipo está mejorando o empeorando, motor a motor y día a día: la línea que
// sube o baja cada noche. Antes esto era una creencia; ahora es un número.
import type { Tarea, Veredicto } from './taller'

export type CurvaDia = { dia: string; positivos: number; negativos: number; aciertos: number }
export type CurvaMotor = {
  motor: string; tareas: number; terminadas: number; error: number; parada: number; trabajando: number
  herramientas: number; tokens: number; coste: number; ficheros: number
  veredictos: number; aciertos: number
  aciertosPorTarea: number; herramientasPorTarea: number; tokensPorTarea: number; costePorTarea: number
}
export type Curva = {
  tareas: number
  estados: Record<string, number>
  veredictos: { total: number; positivos: number; negativos: number }
  porDia: CurvaDia[]
  porMotor: CurvaMotor[]
  fallos: { mensaje: string; veces: number }[]
  costeDelAcierto: { tareas: number; tokens: number; coste: number } | null
}

export const CURVA_VACIA: Curva = {
  tareas: 0, estados: {}, veredictos: { total: 0, positivos: 0, negativos: 0 },
  porDia: [], porMotor: [], fallos: [], costeDelAcierto: null,
}

/** El día en el calendario del creador (no en UTC: su medianoche es la suya). */
export function diaDe(ts: number): string {
  const d = new Date(ts)
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mes}-${dia}`
}

const redondea = (n: number, d = 3) => Math.round(n * 10 ** d) / 10 ** d

/** La curva, calculada de lo que ya está en disco. */
export function curvaDe(datos: { tareas: Tarea[]; veredictos: Veredicto[]; fallos: string[] }): Curva {
  const { tareas, veredictos } = datos

  // 1. La curva: aciertos por día. La etiqueta es del creador (aplicar = sí, descartar = no).
  const porDia = new Map<string, { positivos: number; negativos: number }>()
  for (const v of veredictos) {
    const d = porDia.get(diaDe(v.ts)) ?? { positivos: 0, negativos: 0 }
    if (v.exito) d.positivos++; else d.negativos++
    porDia.set(diaDe(v.ts), d)
  }

  // 2. Por motor: quién termina más, quién falla más, quién cuesta más.
  const motores = new Map<string, CurvaMotor>()
  const motorDe = (t: Tarea) => t.motor || 'desconocido'
  for (const t of tareas) {
    const m = motores.get(motorDe(t)) ?? {
      motor: motorDe(t), tareas: 0, terminadas: 0, error: 0, parada: 0, trabajando: 0,
      herramientas: 0, tokens: 0, coste: 0, ficheros: 0, veredictos: 0, aciertos: 0,
      aciertosPorTarea: 0, herramientasPorTarea: 0, tokensPorTarea: 0, costePorTarea: 0,
    }
    m.tareas++
    const estado = t.estado || 'lista'
    if (estado === 'lista') m.terminadas++
    else if (estado === 'error') m.error++
    else if (estado === 'parada') m.parada++
    else m.trabajando++
    m.herramientas += t.herramientas || 0
    m.tokens += (t.uso?.entrada || 0) + (t.uso?.salida || 0)
    m.coste += t.uso?.coste?.cantidad || 0
    m.ficheros += t.cambios?.ficheros || 0
    motores.set(motorDe(t), m)
  }
  // Cada veredicto dice qué tarea fue: así se sabe qué motor deliveró y cuánto costó.
  const ventanas = new Map<string, Tarea[]>()
  for (const t of tareas) {
    const lista = ventanas.get(t.id) ?? []
    lista.push(t)
    ventanas.set(t.id, lista)
  }
  const tareaDelVeredicto = (v: Veredicto): Tarea | undefined => {
    if (v.tarea) {
      const directa = ventanas.get(v.tarea)?.[0]
      if (directa) return directa
    }
    for (const lista of ventanas.values()) {
      const t = lista.find((x) => (x.inicio || 0) <= v.ts && v.ts <= (x.fin ?? Infinity))
      if (t) return t
    }
    return undefined
  }
  for (const v of veredictos) {
    const t = tareaDelVeredicto(v)
    if (!t) continue
    const m = motores.get(motorDe(t))
    if (!m) continue
    m.veredictos++
    if (v.exito) m.aciertos++
  }
  for (const m of motores.values()) {
    m.aciertosPorTarea = m.tareas ? redondea(m.aciertos / m.tareas) : 0
    m.herramientasPorTarea = m.tareas ? redondea(m.herramientas / m.tareas, 1) : 0
    m.tokensPorTarea = m.tareas ? Math.round(m.tokens / m.tareas) : 0
    m.costePorTarea = m.tareas ? redondea(m.coste / m.tareas, 6) : 0
  }

  // 3. El coste del acierto: lo que costó cada tarea que el creador se quedó.
  const aplicadas = veredictos.filter((v) => v.exito)
  let costeDelAcierto: Curva['costeDelAcierto'] = null
  if (aplicadas.length) {
    let tokens = 0
    let coste = 0
    for (const v of aplicadas) {
      const t = tareaDelVeredicto(v)
      if (!t) continue
      tokens += (t.uso?.entrada || 0) + (t.uso?.salida || 0)
      coste += t.uso?.coste?.cantidad || 0
    }
    costeDelAcierto = { tareas: aplicadas.length, tokens, coste: redondea(coste, 6) }
  }

  // 4. Los fallos: los mensajes repetidos, que son el trabajo pendiente de verdad.
  const cuenta = new Map<string, number>()
  for (const m of datos.fallos) {
    const limpio = (m || '').trim()
    if (!limpio) continue
    cuenta.set(limpio, (cuenta.get(limpio) || 0) + 1)
  }

  const estados: Record<string, number> = {}
  for (const t of tareas) estados[t.estado || 'lista'] = (estados[t.estado || 'lista'] || 0) + 1

  return {
    tareas: tareas.length,
    estados,
    veredictos: {
      total: veredictos.length,
      positivos: veredictos.filter((v) => v.exito).length,
      negativos: veredictos.filter((v) => !v.exito).length,
    },
    porDia: [...porDia.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([dia, d]) => ({
      dia, positivos: d.positivos, negativos: d.negativos,
      aciertos: d.positivos + d.negativos ? redondea(d.positivos / (d.positivos + d.negativos)) : 0,
    })),
    porMotor: [...motores.values()].sort((a, b) => b.tareas - a.tareas),
    fallos: [...cuenta.entries()].map(([mensaje, veces]) => ({ mensaje, veces })).sort((a, b) => b.veces - a.veces),
    costeDelAcierto,
  }
}

