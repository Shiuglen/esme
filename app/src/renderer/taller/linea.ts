// La línea de tiempo de una tarea: pliega la ráfaga de eventos del motor en lo que se pinta.
// Une los trozos de texto, actualiza cada herramienta en su sitio y deja un plan por turno.
import type { EventoMotor } from '../../main/motores/sesion-acp'

export type Evento = EventoMotor
type Diff = { ruta: string; antes?: string; despues: string }
export type ItemLinea =
  | { tipo: 'usuario'; clave: string; texto: string }
  | { tipo: 'texto'; clave: string; texto: string }
  | { tipo: 'pensamiento'; clave: string; texto: string }
  | { tipo: 'herramienta'; clave: string; id: string; titulo: string; estado: string; clase?: string; diff?: Diff[] }
  | { tipo: 'plan'; clave: string; pasos: { texto: string; estado: string }[] }
  | { tipo: 'fin'; clave: string; motivo: string; ms: number }
  | { tipo: 'fallo'; clave: string; mensaje: string }

const cambiar = (l: ItemLinea[], i: number, nuevo: ItemLinea) => { const c = l.slice(); c[i] = nuevo; return c }

export function aplicar(l: ItemLinea[], e: Evento): ItemLinea[] {
  const ultimo = l[l.length - 1]
  switch (e.tipo) {
    case 'uso': case 'contexto': return l
    case 'texto': case 'pensamiento':
      if (ultimo?.tipo === e.tipo) return cambiar(l, l.length - 1, { ...ultimo, texto: ultimo.texto + e.texto })
      return [...l, { tipo: e.tipo, clave: `${e.tipo}-${l.length}`, texto: e.texto }]
    case 'herramienta': {
      const i = l.findIndex((x) => x.tipo === 'herramienta' && x.id === e.id)
      if (i < 0) return [...l, { tipo: 'herramienta', clave: `h-${e.id}`, id: e.id, titulo: e.titulo ?? '', estado: e.estado ?? 'pending',
        ...(e.clase ? { clase: e.clase } : {}), ...(e.diff ? { diff: e.diff } : {}) }]
      const p = l[i] as Extract<ItemLinea, { tipo: 'herramienta' }>
      return cambiar(l, i, { ...p, titulo: e.titulo || p.titulo, estado: e.estado ?? p.estado, clase: e.clase ?? p.clase, diff: e.diff ?? p.diff })
    }
    case 'plan': {
      const turno = l.map((x) => x.tipo).lastIndexOf('usuario')
      const i = l.findLastIndex((x, k) => k > turno && x.tipo === 'plan')
      return i < 0 ? [...l, { tipo: 'plan', clave: `plan-${l.length}`, pasos: e.pasos }] : cambiar(l, i, { ...(l[i] as Extract<ItemLinea, { tipo: 'plan' }>), pasos: e.pasos })
    }
    case 'usuario': return [...l, { tipo: 'usuario', clave: `usuario-${l.length}`, texto: e.texto }]
    case 'fin': return [...l, { tipo: 'fin', clave: `fin-${l.length}`, motivo: e.motivo, ms: e.ms }]
    case 'fallo': return [...l, { tipo: 'fallo', clave: `fallo-${l.length}`, mensaje: e.mensaje }]
    default: return l
  }
}

export const plegar = (eventos: Evento[]) => eventos.reduce(aplicar, [] as ItemLinea[])

/** Lo que hace el motor ahora mismo, en una línea; null si el turno ya acabó o aún no hay nada. */
export function actividadActual(l: ItemLinea[]): string | null {
  const u = l[l.length - 1]
  if (!u || u.tipo === 'fin' || u.tipo === 'fallo' || u.tipo === 'usuario') return null
  if (u.tipo === 'pensamiento') return 'Pensando…'
  if (u.tipo === 'texto') return u.texto.trim().split('\n').filter(Boolean).pop() ?? null
  if (u.tipo === 'plan') return u.pasos.find((p) => p.estado === 'in_progress')?.texto ?? 'Planeando'
  const enCurso = l.findLast((x) => x.tipo === 'herramienta' && (x.estado === 'in_progress' || x.estado === 'pending'))
  return enCurso?.tipo === 'herramienta' ? enCurso.titulo || 'Usando una herramienta' : u.titulo || null
}
