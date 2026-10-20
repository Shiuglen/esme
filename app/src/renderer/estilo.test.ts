// UNA SOLA PIEL: el color de la app lo decide la piel, no el fichero. Ni un negro, ni un blanco, ni un hex suelto,
// ni una paleta de Tailwind escrita a mano en el chrome: todo pasa por los roles (bg-s1, text-texto, border-linea,
// shadow-flotante) y de ahí lo pone la piel.
//
// Este test lo hace imposible de romper: si alguien mete un color fijo en una superficie, el test se cae y dice dónde.
// Se perdonan las tres cosas que sí son color de verdad: las skins (tinta/), las máscaras de la marca (marca/) y las
// piezas de terceros reescritas (ui/), que son otro mundo con sus propias reglas.
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

const RAIZ = import.meta.dirname
const PERDONADAS = ['ui/', 'laboratorio/', 'marca/', 'tinta/']

const ficheros = (dir: string): string[] =>
  readdirSync(dir).flatMap((n) => {
    const p = join(dir, n)
    if (statSync(p).isDirectory()) return ficheros(p)
    return n.endsWith('.tsx') ? [p] : []
  })

/** Solo el chrome: los className y los style en línea. Los mapas de color (datos) no cuentan. */
const chrome = (t: string): string => {
  const clases = [...t.matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\})/g)].map((m) => m[1] ?? m[2] ?? '').join(' ')
  const estilos = [...t.matchAll(/style=\{\{([^}]*)\}\}/g)].map((m) => m[1]).join(' ')
  return `${clases} ${estilos}`
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
