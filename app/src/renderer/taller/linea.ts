// La línea de tiempo de una tarea: pliega la ráfaga de eventos del motor en lo que se pinta.
// Une los trozos de texto, actualiza cada herramienta en su sitio y deja un plan por turno.
import type { EventoMotor } from '../../main/motores/sesion-acp'

export type Evento = EventoMotor
type Diff = { ruta: string; antes?: string; despues: string }
export type ItemLinea =
  | { tipo: 'usuario'; clave: string; texto: string }
  | { tipo: 'texto'; clave: string; texto: string }
  | { tipo: 'pensamiento'; clave: string; texto: string }
  | { tipo: 'herramienta'; clave: string; id: string; titulo: string; estado: string; clase?: string; nombre?: string; rutas?: string[]; detalle?: string; diff?: Diff[] }
  | { tipo: 'plan'; clave: string; pasos: { texto: string; estado: string }[] }
  | { tipo: 'fin'; clave: string; motivo: string; ms: number }
  | { tipo: 'fallo'; clave: string; mensaje: string }
  | { tipo: 'reintento'; clave: string; ms: number; motivo: string }
  | { tipo: 'aprobado'; clave: string; titulo: string }
  | { tipo: 'herencia'; clave: string; tokens: number; recuerdos: number }

/** El índice de las herramientas por su id: sin él, cada evento recorre la línea entera. */
type Indice = Map<string, number>

function indiceDe(l: ItemLinea[]): Indice {
  const m: Indice = new Map()
  for (let i = 0; i < l.length; i++) {
    const x = l[i]
    if (x.tipo === 'herramienta') m.set(x.id, i)
  }
  return m
}

/** Aplica un evento **en el sitio** (muta `c`).
 *
 * Existe aparte de `aplicar` por una razón medida: una sesión larga trae decenas de miles de
 * eventos (78.134 en la del 21-oct: 16.746 de herramientas y 53.657 de pensamiento), y la línea
 * llega a 17.000 elementos. Copiar la línea entera por cada evento son mil millones de copias:
 * el renderer se comía 2,7 GB de montón de JavaScript y un núcleo entero de CPU. Con el lote se
 * copia **una vez** y cada evento se aplica en el sitio. */
function aplicarEn(c: ItemLinea[], e: Evento, indice?: Indice): void {
  const ultimo = c[c.length - 1]
  switch (e.tipo) {
    case 'uso': case 'contexto': return
    case 'texto': case 'pensamiento':
      if (ultimo?.tipo === e.tipo) { c[c.length - 1] = { ...ultimo, texto: ultimo.texto + e.texto }; return }
      c.push({ tipo: e.tipo, clave: `${e.tipo}-${c.length}`, texto: e.texto })
      return
    case 'herramienta': {
      const i = indice ? (indice.get(e.id) ?? -1) : c.findIndex((x) => x.tipo === 'herramienta' && x.id === e.id)
      if (i < 0) {
        c.push({ tipo: 'herramienta', clave: `h-${e.id}`, id: e.id, titulo: e.titulo ?? '', estado: e.estado ?? 'pending',
          ...(e.clase ? { clase: e.clase } : {}), ...(e.nombre ? { nombre: e.nombre } : {}), ...(e.rutas ? { rutas: e.rutas } : {}),
          ...(e.detalle ? { detalle: e.detalle } : {}), ...(e.diff ? { diff: e.diff } : {}) })
        indice?.set(e.id, c.length - 1)
        return
      }
      const p = c[i] as Extract<ItemLinea, { tipo: 'herramienta' }>
      c[i] = { ...p, titulo: e.titulo || p.titulo, estado: e.estado ?? p.estado, clase: e.clase ?? p.clase, nombre: e.nombre ?? p.nombre,
        rutas: e.rutas ?? p.rutas, detalle: e.detalle ?? p.detalle, diff: e.diff ?? p.diff }
      return
    }
    case 'plan': {
      const turno = c.map((x) => x.tipo).lastIndexOf('usuario')
      const i = c.findLastIndex((x, k) => k > turno && x.tipo === 'plan')
      if (i < 0) { c.push({ tipo: 'plan', clave: `plan-${c.length}`, pasos: e.pasos }); return }
      c[i] = { ...(c[i] as Extract<ItemLinea, { tipo: 'plan' }>), pasos: e.pasos }
      return
    }
    case 'usuario': c.push({ tipo: 'usuario', clave: `usuario-${c.length}`, texto: e.texto }); return
    case 'fin': c.push({ tipo: 'fin', clave: `fin-${c.length}`, motivo: e.motivo, ms: e.ms }); return
    case 'fallo': c.push({ tipo: 'fallo', clave: `fallo-${c.length}`, mensaje: e.mensaje }); return
    case 'reintento': c.push({ tipo: 'reintento', clave: `reintento-${c.length}`, ms: e.ms, motivo: e.motivo }); return
    case 'aprobado': c.push({ tipo: 'aprobado', clave: `aprobado-${c.length}`, titulo: e.titulo }); return
    case 'herencia': c.push({ tipo: 'herencia', clave: `herencia-${c.length}`, tokens: e.tokens, recuerdos: e.recuerdos }); return
    default: return
  }
}

export function aplicar(l: ItemLinea[], e: Evento): ItemLinea[] {
  if (e.tipo === 'uso' || e.tipo === 'contexto') return l   // nada que aplicar: la misma línea
  const c = l.slice()
  aplicarEn(c, e, indiceDe(c))
  return c
}

/** Aplica **muchos** eventos de una vez: una sola copia de la línea y, en el sitio, cada evento. */
export function aplicarLote(l: ItemLinea[], eventos: Evento[]): ItemLinea[] {
  if (!eventos.length) return l
  const c = l.slice()
  const indice = indiceDe(c)
  for (const e of eventos) aplicarEn(c, e, indice)
  return c
}

export const plegar = (eventos: Evento[]) => aplicarLote([] as ItemLinea[], eventos)

/** Lo que hace el motor ahora mismo, en una línea; null si el turno ya acabó o aún no hay nada. */
export function actividadActual(l: ItemLinea[]): string | null {
  const u = l[l.length - 1]
  if (!u || u.tipo === 'fin' || u.tipo === 'fallo' || u.tipo === 'usuario') return null
  if (u.tipo === 'pensamiento') return 'Pensando…'
  if (u.tipo === 'reintento') return 'Esperando al proveedor: límite de peticiones'
  if (u.tipo === 'aprobado') return `Aprobado dentro de la copia: ${u.titulo}`
  if (u.tipo === 'herencia') return `Le heredé tu memoria: ${u.recuerdos} recuerdos`
  if (u.tipo === 'texto') return u.texto.trim().split('\n').filter(Boolean).pop() ?? null
  if (u.tipo === 'plan') return u.pasos.find((p) => p.estado === 'in_progress')?.texto ?? 'Planeando'
  const enCurso = l.findLast((x) => x.tipo === 'herramienta' && (x.estado === 'in_progress' || x.estado === 'pending'))
  const h = enCurso?.tipo === 'herramienta' ? enCurso : u
  const d = describirHerramienta(h)
  return [d.texto, d.objeto ?? d.codigo].filter(Boolean).join(' ')
}

type Herramienta = Extract<ItemLinea, { tipo: 'herramienta' }>
const VERBOS: Record<string, string> = { edit: 'Edita', read: 'Lee', delete: 'Borra', move: 'Mueve', search: 'Busca', execute: 'Ejecuta', fetch: 'Consulta', think: 'Piensa' }
const POR_NOMBRE: Record<string, string> = { write: 'Escribe', todowrite: 'Actualiza su lista de pasos', todoread: 'Repasa su lista de pasos', task: 'Encarga una parte a un ayudante',
  glob: 'Busca ficheros', list: 'Mira una carpeta', ls: 'Mira una carpeta', webfetch: 'Consulta', websearch: 'Busca en la web' }
const host = (u: string) => { try { return new URL(u).host } catch { return u } }

/** Cómo contar una herramienta: los títulos que ya son frases se respetan; los escuetos («write», «bash») se cuentan en castellano. */
export function describirHerramienta(h: Herramienta): { texto: string; objeto?: string; codigo?: string } {
  const t = h.titulo.trim()
  const escueto = !t || t === h.nombre || /^[a-z_]+$/.test(t)
  if (!escueto) return { texto: t }
  const clave = (h.nombre || t).toLowerCase()
  const texto = POR_NOMBRE[clave] ?? VERBOS[h.clase ?? ''] ?? (t ? t : 'Usa una herramienta')
  if (h.clase === 'execute' && h.detalle) return { texto, codigo: h.detalle }
  if (h.clase === 'fetch' && h.detalle) return { texto, objeto: host(h.detalle) }
  if (h.clase === 'search' && h.detalle) return { texto, objeto: `«${h.detalle}»` }
  if (h.rutas?.length) return { texto, objeto: h.rutas.length > 1 ? `${h.rutas[0]} y ${h.rutas.length - 1} más` : h.rutas[0] }
  return { texto }
}
