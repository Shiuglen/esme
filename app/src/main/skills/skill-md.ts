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
  if (t.length >= 2 && t.startsWith('"') && t.endsWith('"')) return t.slice(1, -1).replace(/\\"/g, '"').replace(/\\n/g, '\n')
  if (t.length >= 2 && t.startsWith("'") && t.endsWith("'")) return t.slice(1, -1).replace(/''/g, "'")
  return t
}

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
  if (campos.name !== carpeta) avisos.push(`El nombre «${campos.name}» no coincide con la carpeta «${carpeta}».`)
  if (campos.name.length > 64) avisos.push('El nombre pasa de 64 caracteres (el estándar no lo permite).')
  if (campos.description.length > 1024) avisos.push('La descripción pasa de 1024 caracteres (el estándar no lo permite).')
  return {
    ok: true, avisos,
    skill: {
      nombre: campos.name, descripcion: campos.description, soloManual: campos['disable-model-invocation'] === 'true', campos,
      ...(campos.license ? { licencia: campos.license } : {}), ...(campos['allowed-tools'] ? { herramientasPermitidas: campos['allowed-tools'] } : {}),
      cuerpo: m[2].replace(/\s+$/, ''),
    },
  }
}
