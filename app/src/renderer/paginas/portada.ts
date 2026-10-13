// Los textos de la portada (Inicio): frases que cuentan qué pasa, no cifras sueltas en cajas.
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const n = (x: number) => x.toLocaleString('es-ES')
const plural = (k: number, uno: string, varios: string) => (k === 1 ? uno : varios)

export function fechaLarga(d: Date): string {
  const s = `${DIAS[d.getDay()]}, ${d.getDate()} de ${MESES[d.getMonth()]}`
  return s[0].toUpperCase() + s.slice(1)
}

export function hace(ms: number): string {
  const m = Math.round(ms / 60_000)
  if (m < 2) return 'hace un momento'
  if (m < 60) return `hace ${m} minutos`
  const h = Math.round(m / 60)
  if (h < 24) return `hace ${h} ${plural(h, 'hora', 'horas')}`
  const d = Math.round(h / 24)
  return `hace ${d} ${plural(d, 'día', 'días')}`
}

export function historiaMente({ recuerdos, temas, ultimo, grafito }: { recuerdos: number; temas: number; ultimo?: number; grafito: number }, ahora: number): string {
  if (!recuerdos) return 'Tu mente está en blanco. Empieza dándole tus notas desde Memoria.'
  const partes = [`Tu mente guarda ${n(recuerdos)} ${plural(recuerdos, 'recuerdo', 'recuerdos')} en ${n(temas)} ${plural(temas, 'tema', 'temas')}.`]
  if (ultimo !== undefined) partes.push(`El último llegó ${hace(ahora - ultimo)}.`)
  if (grafito) partes.push(grafito === 1 ? '1 sigue en grafito: lo dijo una IA y aún no lo has confirmado.' : `${n(grafito)} siguen en grafito: los dijo una IA y aún no los has confirmado.`)
  return partes.join(' ')
}

export type FraseTaller = { texto: string; tono: 'atencion' | 'vida' | 'listo' | 'peligro' | 'calma' }
/** Lo que te necesita va primero; luego lo que trabaja, lo que puedes revisar y lo que falló. */
export function frasesTaller({ trabajando, esperando, listas, errores }: { trabajando: number; esperando: number; listas: number; errores: number }): FraseTaller[] {
  const f: FraseTaller[] = []
  if (esperando) f.push({ texto: `${esperando} ${plural(esperando, 'tarea te necesita', 'tareas te necesitan')}`, tono: 'atencion' })
  if (trabajando) f.push({ texto: `${trabajando} trabajando ahora`, tono: 'vida' })
  if (listas) f.push({ texto: `${listas} ${plural(listas, 'lista', 'listas')} para revisar`, tono: 'listo' })
  if (errores) f.push({ texto: `${errores} con error`, tono: 'peligro' })
  return f.length ? f : [{ texto: 'En calma. Pídele algo a Esme y montará una copia aislada para trabajar.', tono: 'calma' }]
}
