// Los pasos de Esme dentro de una respuesta (buscar, leer, encargar…): cada llamada a una herramienta es una línea que
// avanza (pide permiso → haciendo → hecho o error) y se dice como lo diría una persona.
import type { Paso } from '../../main/herramientas/propias'

export type PasoVisto = { id: string; nombre: string; estado: 'pide' | 'haciendo' | 'hecho' | 'error'; args?: unknown; resumen?: string; error?: string }

export function aplicarPaso(lista: PasoVisto[], p: Paso): PasoVisto[] {
  const i = lista.findIndex((x) => x.id === p.id)
  const previo: PasoVisto = i >= 0 ? lista[i] : { id: p.id, nombre: p.nombre, estado: 'haciendo' }
  const nuevo: PasoVisto =
    p.fase === 'pide' ? { ...previo, estado: 'pide', args: p.args }
    : p.fase === 'llama' ? { ...previo, estado: 'haciendo', args: p.args }
    : p.fase === 'resultado' ? { ...previo, estado: 'hecho', resumen: p.resumen }
    : { ...previo, estado: 'error', error: p.error }
  return i >= 0 ? lista.map((x, k) => (k === i ? nuevo : x)) : [...lista, nuevo]
}

const corto = (s: unknown, n = 60) => { const t = typeof s === 'string' ? s.replace(/\s+/g, ' ').trim() : ''; return t.length > n ? `${t.slice(0, n)}…` : t }
const sitio = (u: unknown) => { try { return new URL(String(u)).hostname.replace(/^www\./, '') } catch { return 'una página' } }
// [haciendo, hecho, pide] para cada herramienta propia
const FRASES: Record<string, (a: Record<string, unknown>) => [string, string, string]> = {
  buscar_en_internet: (a) => [`Buscando en internet «${corto(a.consulta)}»`, `Buscó en internet «${corto(a.consulta)}»`, `Quiere buscar en internet «${corto(a.consulta)}»`],
  leer_web: (a) => [`Leyendo ${sitio(a.url)}`, `Leyó ${sitio(a.url)}`, `Quiere leer ${sitio(a.url)}`],
  buscar_en_memoria: (a) => [`Recordando «${corto(a.consulta)}»`, `Recordó «${corto(a.consulta)}»`, `Quiere recordar «${corto(a.consulta)}»`],
  ver_equipo: () => ['Mirando a tu equipo', 'Miró a tu equipo', 'Quiere mirar a tu equipo'],
  encargar_al_equipo: (a) => [`Encargando al equipo «${corto(a.encargo)}»`, `Encargó al equipo «${corto(a.encargo)}»`, `Quiere encargar al equipo «${corto(a.encargo)}»`],
  forjar_herramienta: (a) => [`Forjando una herramienta: «${corto(a.necesidad)}»`, `Encargó a la Forja «${corto(a.necesidad)}»`, `Quiere forjar una herramienta: «${corto(a.necesidad)}»`],
  programar_encargo: (a) => [`Programando «${corto(a.encargo)}»`, `Programó «${corto(a.encargo)}»`, `Quiere programar «${corto(a.encargo)}»`],
}

export function fraseDePaso(p: PasoVisto): string {
  const a = (p.args && typeof p.args === 'object' ? p.args : {}) as Record<string, unknown>
  const f = FRASES[p.nombre]
  // lo que falló o negaste se dice en infinitivo («Encargar al equipo…»), nunca como hecho
  const infinitivo = (pide: string) => { const t = pide.replace(/^Quiere /, ''); return t[0].toUpperCase() + t.slice(1) }
  if (f) { const [haciendo, hecho, pide] = f(a); return p.estado === 'pide' ? pide : p.estado === 'haciendo' ? haciendo : p.estado === 'error' ? infinitivo(pide) : hecho }
  // una herramienta conectada: «servidor__accion» se lee «servidor · accion»
  const nombre = p.nombre.replace('__', ' · ').replace(/_/g, ' ')
  return p.estado === 'pide' ? `Quiere usar ${nombre}` : p.estado === 'haciendo' ? `Usando ${nombre}` : p.estado === 'error' ? `Usar ${nombre}` : `Usó ${nombre}`
}
