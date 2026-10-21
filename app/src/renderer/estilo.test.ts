// UNA SOLA PIEL: el color de la app lo decide la piel, no el fichero. Ni un negro, ni un blanco, ni un hex suelto,
// ni una paleta de Tailwind escrita a mano en el chrome: todo pasa por los roles (bg-s1, text-texto, border-linea,
// shadow-flotante) y de ahí lo pone la piel.
//
// Este test lo hace imposible de romper: si alguien mete un color fijo en una superficie, el test se cae y dice dónde.
// Se perdonan las tres cosas que sí son color de verdad: las skins (tinta/), las máscaras de la marca (marca/) y las
// piezas de terceros reescritas (ui/), que son otro mundo con sus propias reglas.
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { describe, expect, it } from 'vitest'

const RAIZ = import.meta.dirname
const PERDONADAS = ['ui/', 'laboratorio/', 'marca/', 'tinta/']

const ficheros = (dir: string): string[] =>
  readdirSync(dir).flatMap((n) => {
    const p = join(dir, n)
    if (statSync(p).isDirectory()) return ficheros(p)
    return n.endsWith('.tsx') ? [p] : []
  })

/** Solo el chrome: los className y los style en línea. Los mapas de color (datos) no cuentan.
 *  Se leen también los className con expresión (className={cn(…)} o className={`…`}), que es como
 *  escriben las piezas de las librerías: si solo se mirara el literal, el color fijo se colaría. */
const chrome = (t: string): string => {
  const clases = [...t.matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\})/g)].map((m) => m[1] ?? m[2] ?? '').join(' ')
  // className={…}: se coge el texto de la expresión, que es donde vive el className de verdad
  const expr = [...t.matchAll(/className=\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g)].map((m) => m[1]).join(' ')
  const estilos = [...t.matchAll(/style=\{\{([^}]*)\}\}/g)].map((m) => m[1]).join(' ')
  return `${clases} ${expr} ${estilos}`
}

const PROHIBIDOS: { rx: RegExp; que: string }[] = [
  { rx: /rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*(?!0\s*\))/i, que: 'un rgb/rgba con color' },
  { rx: /#[0-9a-fA-F]{3,8}\b/, que: 'un hex' },
  { rx: /\b(?:text|bg|border|from|to|via|ring|fill|stroke|shadow|outline|decoration)-(?:white|black|zinc|neutral|stone|slate|gray|grey|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)\b/, que: 'un color de la paleta de Tailwind' },
]

describe('una sola piel: el color lo decide la piel', () => {
  const propios = ficheros(RAIZ).filter((f) => !PERDONADAS.some((x) => relative(RAIZ, f).startsWith(x)))

  it('ninguna superficie tiene un color fijo', () => {
    const culpables: string[] = []
    for (const f of propios) {
      const c = chrome(readFileSync(f, 'utf8'))
      for (const { rx, que } of PROHIBIDOS) if (rx.test(c)) culpables.push(`${relative(RAIZ, f)} → ${que}`)
    }
    expect(culpables, `colores que no vienen de la piel:\n${culpables.join('\n')}`).toEqual([])
  })

  it('las sombras son las del sistema (la sombra también es de la piel)', () => {
    const culpables: string[] = []
    for (const f of propios) {
      const c = chrome(readFileSync(f, 'utf8'))
      // una sombra escrita a mano vale si TODO su color sale de una variable de la piel; si lleva un color literal, no
      for (const m of c.matchAll(/shadow-\[([^\]]*)\]/g)) {
        const valor = m[1]
        const colorLiteral = /#[0-9a-fA-F]{3,8}\b|rgba?\(|\b(?:white|black)\b/.test(valor)
        if (colorLiteral) culpables.push(`${relative(RAIZ, f)} → sombra con color fijo: ${valor.slice(0, 50)}`)
      }
    }
    expect(culpables, `sombras que no son del sistema:\n${culpables.join('\n')}`).toEqual([])
  })
})

// Las piezas de terceros viven en ui/ (y están perdonadas del color fijo), pero no del PRINCIPIO: si una trae
// su propio negro o su propio verde, deja de ser ESME. Este test mira justo eso: las piezas de fuera hablan el
// vocabulario de la piel (los roles) o nada; nunca un color que no sea de la piel.
describe('las piezas de fuera también hablan el idioma de la piel', () => {
  const deTerceros = ficheros(join(RAIZ, 'ui')).filter((f) => !f.includes(`${sep}efectos${sep}`) && !f.includes(`${sep}fondos${sep}`))

  it('ninguna pieza de ui/ trae un color que no sea de la piel', () => {
    const culpables: string[] = []
    for (const f of deTerceros) {
      // los props con valor por defecto (colorFrom=«#ffaa40») NO son el color de la pieza: quien la usa
      // los cambia. Y el #000 de una máscara es un canal, no un color. Lo que cuenta es el className.
      const c = chrome(readFileSync(f, 'utf8')).replace(/mask-\[[^\]]*\]/g, '')
      for (const { rx, que } of PROHIBIDOS) if (rx.test(c)) culpables.push(`${relative(RAIZ, f)} → ${que}`)
    }
    expect(culpables, `piezas de fuera con color propio:\n${culpables.join('\n')}`).toEqual([])
  })

  it('el puente con el vocabulario de shadcn está completo (para que ninguna pieza salga sin color)', () => {
    const css = readFileSync(join(RAIZ, 'styles', 'esme.css'), 'utf8')
    // los que el catálogo entero usa: si falta uno, la pieza sale heredando (invisible o negra)
    for (const token of [
      'background', 'foreground', 'card', 'popover', 'muted', 'primary', 'secondary', 'accent',
      'destructive', 'border', 'input', 'ring', 'sidebar', 'chart-1', 'success', 'warning', 'info',
    ]) {
      expect(css, `falta el token --color-${token}`).toContain(`--color-${token}:`)
    }
  })

  it('las piezas de fuera usan los roles o el vocabulario bridgeado, nunca un color suelto', () => {
    // Dos idiomas válidos: los roles de la piel (bg-s1, text-texto) y el de shadcn (bg-card, text-primary),
    // que el puente traduce. Lo que no vale es un color de la paleta de Tailwind sin traducir.
    const ROLES = /\b(bg|text|border|from|to|via|ring|fill|stroke|shadow|outline|decoration)-(s[123]|fondo|texto(-[23])?|linea(-fuerte)?|acento|sobre-acento|acento-velo|foco|memoria|memoria-velo|atencion|atencion-velo|peligro|sobre-peligro|peligro-velo|velo|sobre-velo|info|exito|cristal|papel|hoja|tinta-fresca|tinta-vieja|grafito|luz(-[23])?|sello|esmeralda(-[13])?|background|foreground|card|popover|muted|primary|secondary|accent|destructive|border|input|ring|sidebar|chart-[1-5]|success|warning|info|surface(-[23])?|veil|overlay|highlight|track|on|off|haz(-[23])?|degradado-[123]|transparent|current|inherit)\b/
    const proprios = deTerceros.filter((f) => !f.endsWith('.test.ts'))
    // Una pieza que NO tiene ningún color propio no es un problema: su color llega de quien la usa
    // (por prop className). Solo es problema si trae un color que NO es de la piel, y eso lo mira el otro test.
    const conColorAjeno = proprios.filter((f) => {
      const c = chrome(readFileSync(f, 'utf8'))
      const usaColor = /\b(bg|text|border|from|to|via|ring|fill|stroke|shadow|outline|decoration)-/.test(c)
      return usaColor && !ROLES.test(c)
    })
    expect(conColorAjeno.map((f) => relative(RAIZ, f)), 'piezas con color que no es de la piel').toEqual([])
  })
})
