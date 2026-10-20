// Leer un SKILL.md (estándar abierto de Agent Skills, https://agentskills.io/specification): una cabecera YAML con `name`
// y `description` obligatorios (y `license`, `allowed-tools`, `disable-model-invocation`… opcionales) y el cuerpo con las
// instrucciones. Lector propio y mínimo (claves simples, comillas, bloques «>» y «|»): no hace falta YAML completo y así no
// se depende de una librería que la app no declara.
export type Skill = {
  nombre: string; descripcion: string; licencia?: string; herramientasPermitidas?: string; soloManual: boolean
  campos: Record<string, string>; cuerpo: string
}
export type LecturaSkill = { ok: true; skill: Skill; avisos: string[] } | { ok: false; error: string }

const sinComillas = (v: string) => {
  const t = v.trim()
  if (t.length >= 2 && t.startsWith('"') && t.endsWith('"')) return desdobla(t.slice(1, -1))
  if (t.length >= 2 && t.startsWith("'") && t.endsWith("'")) return t.slice(1, -1).replace(/''/g, "'")
  return t
}

/** Lo que va tras la barra de un valor entrecomillado: \" es comilla, \\ es barra, \n es salto. */
const desdobla = (s: string) => s.replace(/\\(.)/g, (_m, c: string) => (c === 'n' ? '\n' : c === '"' ? '"' : c === '\\' ? '\\' : c))

/** La cabecera como pares clave → texto (las claves anidadas se ignoran: no hacen falta para instalar ni para avisar). */
export function cabeceraDe(yaml: string): Record<string, string> {
  const campos: Record<string, string> = {}
  const lineas = yaml.split('\n')
  for (let i = 0; i < lineas.length; i++) {
    const m = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(lineas[i])
    if (!m) continue
    const [, clave, valor] = m
    if (/^[>|][+-]?$/.test(valor.trim())) {
      const bloque: string[] = []
      while (i + 1 < lineas.length && (/^\s+\S/.test(lineas[i + 1]) || lineas[i + 1].trim() === '')) bloque.push(lineas[++i].trim())
      campos[clave] = valor.trim().startsWith('>') ? bloque.filter(Boolean).join(' ') : bloque.join('\n').trim()
    } else if (valor.trim()) campos[clave] = sinComillas(valor)
    else {
      // valor en varias líneas SIN indicador: YAML lo pliega en una sola línea
      // (description: seguido de líneas indentadas). Si lo que sigue es un mapa
      // anidado (una clave con valor vacío), no es un valor: se ignora.
      const bloque: string[] = []
      let anidado = false
      while (i + 1 < lineas.length && (/^\s+\S/.test(lineas[i + 1]) || lineas[i + 1].trim() === '')) {
        const linea = lineas[++i]
        if (!linea.trim()) continue
        if (/^\s+[A-Za-z0-9_-]+:\s*$/.test(linea)) { anidado = true; break }
        bloque.push(linea.trim())
      }
      if (bloque.length && !anidado) campos[clave] = bloque.join(' ')
    }
  }
  return campos
}

export function leerSkillMd(texto: string, carpeta: string): LecturaSkill {
  const m = /^\uFEFF?---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(texto)
  if (!m) return { ok: false, error: 'El SKILL.md no empieza con su cabecera (--- … ---).' }
  const campos = cabeceraDe(m[1].replace(/\r/g, ''))
  if (!campos.name) return { ok: false, error: 'Falta el campo obligatorio «name».' }
  if (!campos.description) return { ok: false, error: 'Falta el campo obligatorio «description».' }
  const avisos: string[] = []
  if (carpeta && campos.name !== carpeta) avisos.push(`El nombre «${campos.name}» no coincide con la carpeta «${carpeta}».`)
  if (campos.name.length > 64) avisos.push('El nombre pasa de 64 caracteres (el estándar no lo permite).')
  if (campos.description.length > 1024) avisos.push('La descripción pasa de 1024 caracteres (el estándar no lo permite).')
  // después de la cabecera puede haber una línea en blanco: no es parte del cuerpo
  const cuerpo = m[2].replace(/^\n+/, '').replace(/\s+$/, '')
  if (!cuerpo.trim()) avisos.push('El cuerpo está vacío: no hay instrucciones que leer.')
  return {
    ok: true, avisos,
    skill: {
      nombre: campos.name, descripcion: campos.description, soloManual: campos['disable-model-invocation'] === 'true', campos,
      ...(campos.license ? { licencia: campos.license } : {}), ...(campos['allowed-tools'] ? { herramientasPermitidas: campos['allowed-tools'] } : {}),
      cuerpo,
    },
  }
}

/** El valor de una cabecera, entre comillas si puede confundir al lector de YAML. */
const entrecomillado = (v: string) => {
  const limpio = v.split(/\s+/).join(' ').trim()
  if (!limpio) return '""'
  if (/[:#{}[\],&*?|<>=!%@`"']/.test(limpio) || /^[-?]/.test(limpio)) return `"${limpio.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
  return limpio
}

/**
 * Escribe un SKILL.md: la cabecera y el cuerpo, con el formato del estándar.
 *
 * El lector y el escritor viven aquí juntos, en el mismo fichero: el formato es un
 * contrato, y un contrato que se escribe en un sitio y se lee en otro se rompe sin
 * que nadie lo note. Se escribe con saltos de línea de Unix y sin BOM.
 */
export function escribirSkillMd(o: { nombre: string; descripcion: string; cuerpo: string; herramientas?: string; licencia?: string; soloManual?: boolean }): string {
  const nombre = o.nombre.trim()
  if (!nombre) throw new Error('La skill necesita un nombre.')
  if (!o.descripcion.trim()) throw new Error('La skill necesita una descripción.')
  if (!o.cuerpo.trim()) throw new Error('La skill necesita un cuerpo: sin instrucciones no hay receta.')
  const cabecera = [
    `name: ${entrecomillado(nombre)}`,
    `description: ${entrecomillado(o.descripcion)}`,
    ...(o.herramientas?.trim() ? [`allowed-tools: ${entrecomillado(o.herramientas)}`] : []),
    ...(o.licencia?.trim() ? [`license: ${entrecomillado(o.licencia)}`] : []),
    ...(o.soloManual ? ['disable-model-invocation: true'] : []),
  ]
  return `---\n${cabecera.join('\n')}\n---\n\n${o.cuerpo.trim()}\n`
}
