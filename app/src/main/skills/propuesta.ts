// La propuesta del sueño, hecha skill: una receta que escribe el creador a partir de una
// tarea que repitió (el sueño la ve, la mente propone, el creador decide).
//
// Se instala por el mismo camino que una skill de la Tienda: copia canónica con su marca
// de Esme, enlace en la carpeta de cada agente y entrada en el manifiesto (para poder
// quitarla después). Con una diferencia: esta no viene de un repositorio ajeno, la has
// escrito tú — así que su `fuente` es Esme y su licencia es la tuya.
//
// Nunca crea nada por su cuenta: aquí sólo se escribe cuando el creador ha pulsado
// «Instalar la receta».
import { createHash } from 'node:crypto'
import { homedir } from 'node:os'
import { AGENTES_CON_SKILLS, instalarSkill } from './instalar'
import { escribirSkillMd, leerSkillMd } from './skill-md'

export type Propuesta = {
  nombre: string
  descripcion: string
  cuerpo: string
  agentes: string[]
  herramientas?: string
}

export type ResultadoPropuesta =
  | { ok: true; nombre: string; canonica: string; skillMd: string; carpetas: { carpeta: string; agentes: string[] }[]; conflictos: { carpeta: string; motivo: string }[] }
  | { ok: false; error: string }

/** El nombre de una skill tiene que poder ser una carpeta: letras, números, guiones y puntos. */
const NOMBRE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/

/**
 * Instala la receta. Devuelve el motivo si no puede: nunca deja la mitad puesto.
 *
 * La receta se valida antes de tocar el disco (con el mismo lector que usa la Tienda):
 * un `SKILL.md` que no se puede leer es un `SKILL.md` que no va a funcionar.
 */
export function instalarPropuesta(p: Propuesta, rutas?: { home?: string; datos: string; plataforma?: NodeJS.Platform }): ResultadoPropuesta {
  const nombre = (p.nombre ?? '').trim()
  const descripcion = (p.descripcion ?? '').trim()
  const cuerpo = (p.cuerpo ?? '').trim()
  if (!nombre || !descripcion || !cuerpo) return { ok: false, error: 'La receta necesita nombre, descripción y cuerpo.' }
  if (!NOMBRE.test(nombre)) return { ok: false, error: 'El nombre sólo puede tener letras, números, guiones y puntos (y empezar por letra o número).' }
  if (descripcion.length > 1024) return { ok: false, error: 'La descripción pasa de 1024 caracteres (el estándar no lo permite).' }
  if (!Array.isArray(p.agentes) || p.agentes.length === 0) return { ok: false, error: 'Elige al menos un agente para la receta.' }
  if (p.agentes.some((a) => typeof a !== 'string' || !AGENTES_CON_SKILLS.includes(a))) return { ok: false, error: 'Agentes no válidos.' }

  let texto = ''
  try {
    texto = escribirSkillMd({ nombre, descripcion, cuerpo, herramientas: p.herramientas })
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
  const leida = leerSkillMd(texto, nombre)
  if (!leida.ok) return { ok: false, error: leida.error }
  if (leida.avisos.length) return { ok: false, error: `La receta no es válida: ${leida.avisos.join(' ')}` }

  const archivos = [{ ruta: 'SKILL.md', datos: Buffer.from(texto, 'utf8'), ejecutable: false }]
  const huella = createHash('sha256').update(texto).digest('hex')
  const id = `propuesta:${huella.slice(0, 16)}`
  try {
    const r = instalarSkill({
      home: rutas?.home ?? homedir(), datos: rutas!.datos, id, nombre, archivos, agentes: p.agentes,
      ...(rutas?.plataforma ? { plataforma: rutas.plataforma } : {}),
      fuente: { repo: 'esme', ruta: `propuestas/${nombre}`, commit: '', arbolSha256: huella, licencia: 'propia' },
    })
    return { ok: true, nombre, canonica: r.canonica, skillMd: texto, carpetas: r.carpetas, conflictos: r.conflictos }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}
