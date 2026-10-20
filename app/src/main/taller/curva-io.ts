import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { curvaDe, type Curva } from './curva'
import type { Tarea, Veredicto } from './taller'

/** Lee lo que el Taller dejó en disco y calcula la curva. */
export async function leeCurva(dir: string): Promise<Curva> {
  let tareas: Tarea[] = []
  try {
    const crudo = JSON.parse(await readFile(join(dir, 'tareas.json'), 'utf8'))
    if (Array.isArray(crudo)) tareas = crudo as Tarea[]
  } catch { /* sin tareas todavía: la curva empieza en cero */ }

  const veredictos: Veredicto[] = []
  try {
    const texto = await readFile(join(dir, 'veredictos.jsonl'), 'utf8')
    for (const linea of texto.split('\n')) {
      const t = linea.trim()
      if (!t) continue
      try { veredictos.push(JSON.parse(t) as Veredicto) } catch { /* una línea rota no tira el resto */ }
    }
  } catch { /* sin veredictos: aún nadie ha aplicado ni descartado nada */ }

  // Los fallos: cada tarea guarda su último error, así que no hace falta leer los historiales
  // (algunos pesan megabytes). Sólo si falta, se mira el registro de esa tarea y de ninguna más.
  const fallos: string[] = []
  for (const t of tareas) {
    if (t.estado !== 'error') continue
    if (t.error) { fallos.push(t.error); continue }
    try {
      const texto = await readFile(join(dir, `${t.id}.jsonl`), 'utf8')
      for (const linea of texto.split('\n')) {
        if (!linea.includes('"fallo"')) continue
        try {
          const ev = JSON.parse(linea) as { tipo?: string; mensaje?: string }
          if (ev.tipo === 'fallo' && ev.mensaje) fallos.push(ev.mensaje)
        } catch { /* línea ilegible: se salta */ }
      }
    } catch { /* sin registro de esa tarea */ }
  }

  return curvaDe({ tareas, veredictos, fallos })
}
