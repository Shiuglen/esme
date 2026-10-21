// La curva del Taller, contada: qué se ve y cómo se lee. Lógica pura, para poder probarla.
//
// Esta es la misma cuenta que hace `scripts/curva_taller.py` (desde la terminal, sin abrir la app):
// las dos deben dar el mismo número. Si cambian las reglas, cambian las dos.
import type { Curva } from '../lib/bridge'
import { fmtTokens, fmtUSD } from '../chat/formatos'

export type BarraCurva = { dia: string; titulo: string; altura: number; acierto: boolean }
export type PedazoEstado = { texto: string; valor: number; tono: 'bien' | 'mal' | 'normal' }
export type LineaMotor = { motor: string; tareas: number; error: number; tokens: number; acierto: number | null }
/** Un grupo de tareas: las solas, o las que compartieron arena (dos agentes en el mismo encargo). */
export type LineaGrupo = {
  grupo: string
  titulo: string
  tareas: number
  veredictos: number
  aciertos: number
  acierto: number | null
  tokens: number
}
export type VistaCurva = {
  titulo: string
  subtitulo: string
  hayCurva: boolean
  barras: BarraCurva[]
  motores: LineaMotor[]
  grupos: LineaGrupo[]
  fallos: { mensaje: string; veces: number }[]
  costeDelAcierto: string | null
  estados: PedazoEstado[]
  sinAciertos: boolean
}

/** La curva, ya contada para la vista: lo que se ve es lo que dice. */
export function vistaCurva(curva: Curva | null): VistaCurva {
  if (!curva || curva.tareas === 0) {
    return { titulo: 'La curva del Taller', subtitulo: 'Aún no hay tareas que medir.', hayCurva: false, barras: [], motores: [], grupos: [],
      fallos: [], costeDelAcierto: null, estados: [], sinAciertos: false }
  }
  // Cómo acabaron las tareas: lo que de verdad se mide, día a día.
  const estados: PedazoEstado[] = ([
    { texto: 'terminadas', valor: curva.estados.lista ?? 0, tono: 'bien' },
    { texto: 'con error', valor: curva.estados.error ?? 0, tono: 'mal' },
    { texto: 'paradas', valor: curva.estados.parada ?? 0, tono: 'normal' },
    { texto: 'trabajando', valor: curva.estados.trabajando ?? 0, tono: 'normal' },
  ] as PedazoEstado[]).filter((e) => e.valor > 0)
  const v = curva.veredictos
  const barra = (b: { dia: string; positivos: number; negativos: number; aciertos: number }): BarraCurva => ({
    dia: b.dia,
    titulo: `${b.dia} · ${b.positivos} aplicadas · ${b.negativos} descartadas`,
    altura: Math.max(6, Math.round(b.aciertos * 100)),
    acierto: b.aciertos > 0,
  })
  const motores: LineaMotor[] = curva.porMotor.map((m) => ({
    motor: m.motor,
    tareas: m.tareas,
    error: m.error,
    tokens: m.tokensPorTarea,
    acierto: m.veredictos ? m.aciertosPorTarea : null,
  }))
  const coste = curva.costeDelAcierto
  // Los grupos: dos agentes en el mismo encargo frente a uno solo. El número que faltaba.
  const grupos: LineaGrupo[] = (curva.porGrupo ?? []).map((g) => ({
    grupo: g.grupo,
    titulo: g.grupo === 'arena' ? 'dos agentes en el mismo encargo' : 'un agente solo',
    tareas: g.tareas,
    veredictos: g.veredictos,
    aciertos: g.aciertos,
    acierto: g.veredictos ? g.aciertosPorVeredicto : null,
    tokens: g.tokensPorTarea,
  }))
  return {
    titulo: 'La curva del Taller',
    subtitulo: v.total
      ? `${curva.tareas} tareas · te quedaste ${v.positivos} de ${v.total} · ${curva.estados.error ?? 0} con error`
      : `${curva.tareas} tareas · ${curva.estados.error ?? 0} con error · aún no te has quedado ninguna`,
    hayCurva: true,
    barras: curva.porDia.map(barra),
    motores,
    grupos,
    fallos: curva.fallos.slice(0, 4),
    costeDelAcierto: coste ? `${fmtTokens(coste.tokens)} tokens y ${fmtUSD(coste.coste)} por tarea que te quedaste` : null,
    estados,
    // Sin un solo «sí» todavía la línea de barras no dice nada: mejor decirlo con palabras.
    sinAciertos: curva.veredictos.total > 0 && curva.veredictos.positivos === 0,
  }
}
