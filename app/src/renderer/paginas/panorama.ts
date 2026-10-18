// El panorama de tu mente: lo que Esme sabe de tu vida antes de que preguntes (los temas y su peso, lo que llegó hoy y lo
// que pasa en el Taller). Va al modelo como datos junto a la memoria citada, para que una pregunta general («¿qué es lo
// más importante ahora?») tenga respuesta aunque la búsqueda no encuentre un recuerdo concreto.
import type { TareaTaller } from '../lib/bridge'
import type { Atlas } from '../lib/brain'
import { recorta } from './diario'

export function panoramaDe(atlas: Atlas | null, tareas: TareaTaller[], ahora = Date.now()): string {
  const lineas: string[] = []
  if (atlas?.clusters.length) {
    const temas = [...atlas.clusters].sort((a, b) => b.size - a.size).slice(0, 10)
      .map((c) => `${c.label} (${c.size}${c.terms?.length ? `; ${c.terms.slice(0, 3).join(', ')}` : ''})`)
    lineas.push(`Temas de su mente, del más grande al más pequeño: ${temas.join(', ')}.`)
    const hoy = new Date(ahora); hoy.setHours(0, 0, 0, 0)
    const porTema = new Map<number, number>(); let n = 0
    for (const p of atlas.points) { const ms = p.ts ? Date.parse(p.ts) : NaN; if (ms >= hoy.getTime() && ms <= ahora) { n++; porTema.set(p.cluster, (porTema.get(p.cluster) ?? 0) + 1) } }
    if (n) {
      const top = [...porTema].sort((a, b) => b[1] - a[1])[0]?.[0]
      const nombre = atlas.clusters.find((c) => c.id === top)?.label
      lineas.push(`Hoy llegaron ${n} ${n === 1 ? 'recuerdo' : 'recuerdos'}${nombre ? `, sobre todo de «${nombre}»` : ''}.`)
    }
  }
  if (tareas.length) {
    const trab = tareas.filter((t) => t.estado === 'trabajando' || t.estado === 'preparando')
    const esp = tareas.filter((t) => t.estado === 'esperando').length
    const listas = tareas.filter((t) => t.estado === 'lista' && !t.aplicada).length
    const partes = [
      trab.length ? `${trab.length} trabajando (${trab.slice(0, 3).map((t) => `${t.motorNombre}: «${recorta(t.titulo, 40)}»`).join('; ')})` : '',
      esp ? `${esp} esperando tu permiso` : '', listas ? `${listas} listas para revisar` : '',
    ].filter(Boolean)
    if (partes.length) lineas.push(`Taller: ${partes.join(', ')}.`)
  }
  return lineas.join('\n')
}
