// Los oficios del equipo: cada motor de una arena trabaja con un papel, no todos con lo mismo.
//
// Palanca 9 de la tesis de escala (roles + traza de equipo). La arena existed: tres modelos
// compitiendo por el mismo encargo. Con oficios, compiten por el encargo **desde oficios
// distintos** (uno construye, otro revisa, otro prueba) y el resultado se puede comparar: el
// creador se queda con el mejor.
//
// Los roles viven en `roles.json` (en la carpeta del Taller). Si no hay archivo, están los de casa;
// si hay archivo, son los del creador: sus palabras mandan.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

export type Rol = { id: string; nombre: string; instruccion: string }

export const ROLES_POR_DEFECTO: Rol[] = [
  {
    id: 'constructor',
    nombre: 'Constructor',
    instruccion: 'Eres quien construye. Haz el encargo entero, toca los ficheros que haga falta y deja el código limpio. Al final, resume en dos frases qué cambiaste y por qué.',
  },
  {
    id: 'revisor',
    nombre: 'Revisor',
    instruccion: 'Eres quien revisa. No rehaces el trabajo: lo miras con ojo crítico y dices qué está mal, qué falta y qué puede romperse. Si puedes arreglar algo pequeño, lo arreglas; si no, lo dices.',
  },
  {
    id: 'probador',
    nombre: 'Probador',
    instruccion: 'Eres quien prueba. Escribe o ejecuta las pruebas del encargo y di si pasan. Si algo falla, di exactamente por qué y con qué comando se ve.',
  },
  {
    id: 'explorador',
    nombre: 'Explorador',
    instruccion: 'Eres quien explora. Antes de tocar nada, entérate de cómo está hecho el proyecto: dónde vive lo que hay que cambiar, qué convenciones se siguen y qué riesgos hay. Luego informa.',
  },
  {
    id: 'espejo',
    nombre: 'Espejo',
    instruccion: 'Eres quien mira por dentro. Antes de proponer nada, entérate de cómo funciona de verdad: usa la ingeniería inversa (la herramienta de absorber el programa) para ver los módulos, las funciones y la superficie del programa, y cuenta qué es y qué NO se puede ver. Cada conclusión con su evidencia; lo incierto, dicho como incierto.',
  },
]

const rolValido = (x: unknown): x is Rol =>
  !!x && typeof x === 'object' && typeof (x as Rol).id === 'string' && typeof (x as Rol).nombre === 'string' &&
  typeof (x as Rol).instruccion === 'string' && !!(x as Rol).instruccion.trim()

/** Los roles de este equipo: los del creador si ha puesto los suyos, si no los de casa. */
export function leeRoles(dir: string): Rol[] {
  try {
    const crudo: unknown = JSON.parse(readFileSync(join(dir, 'roles.json'), 'utf8'))
    if (Array.isArray(crudo)) {
      const roles = crudo.filter(rolValido)
      if (roles.length) return roles
    }
  } catch { /* sin archivo o ilegible: los de casa */ }
  return ROLES_POR_DEFECTO
}

/** El encargo tal como lo recibe el motor, con su oficio delante. */
export function textoConRol(texto: string, rol?: Rol | null): string {
  const base = texto ?? ''
  if (!rol?.instruccion?.trim()) return base
  return `${rol.instruccion.trim()}\n\nEncargo:\n${base.trim()}`
}
