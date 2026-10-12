// Resaltado de código para la revisión: Shiki con su motor de JavaScript (sin WASM) y un tema de variables CSS,
// así los colores salen del sistema de diseño (día y noche) y no hay paleta fija. Cada lenguaje se carga la primera vez.
import { createCssVariablesTheme, createHighlighterCore, type HighlighterCore, type LanguageInput } from 'shiki/core'
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript'

export type Pieza = { contenido: string; color?: string; cursiva?: boolean }

const CARGAR: Record<string, () => Promise<{ default: LanguageInput }>> = {
  typescript: () => import('shiki/langs/typescript.mjs'), tsx: () => import('shiki/langs/tsx.mjs'), javascript: () => import('shiki/langs/javascript.mjs'),
  jsx: () => import('shiki/langs/jsx.mjs'), json: () => import('shiki/langs/json.mjs'), jsonc: () => import('shiki/langs/jsonc.mjs'),
  css: () => import('shiki/langs/css.mjs'), scss: () => import('shiki/langs/scss.mjs'), html: () => import('shiki/langs/html.mjs'),
  vue: () => import('shiki/langs/vue.mjs'), svelte: () => import('shiki/langs/svelte.mjs'), astro: () => import('shiki/langs/astro.mjs'),
  markdown: () => import('shiki/langs/markdown.mjs'), mdx: () => import('shiki/langs/mdx.mjs'), python: () => import('shiki/langs/python.mjs'),
  rust: () => import('shiki/langs/rust.mjs'), go: () => import('shiki/langs/go.mjs'), java: () => import('shiki/langs/java.mjs'),
  kotlin: () => import('shiki/langs/kotlin.mjs'), swift: () => import('shiki/langs/swift.mjs'), c: () => import('shiki/langs/c.mjs'),
  cpp: () => import('shiki/langs/cpp.mjs'), csharp: () => import('shiki/langs/csharp.mjs'), php: () => import('shiki/langs/php.mjs'),
  ruby: () => import('shiki/langs/ruby.mjs'), shellscript: () => import('shiki/langs/shellscript.mjs'), yaml: () => import('shiki/langs/yaml.mjs'),
  toml: () => import('shiki/langs/toml.mjs'), sql: () => import('shiki/langs/sql.mjs'), docker: () => import('shiki/langs/docker.mjs'),
  xml: () => import('shiki/langs/xml.mjs'), lua: () => import('shiki/langs/lua.mjs'), dart: () => import('shiki/langs/dart.mjs'),
  graphql: () => import('shiki/langs/graphql.mjs'), prisma: () => import('shiki/langs/prisma.mjs'),
}
const POR_EXTENSION: Record<string, string> = {
  ts: 'typescript', mts: 'typescript', cts: 'typescript', tsx: 'tsx', js: 'javascript', mjs: 'javascript', cjs: 'javascript', jsx: 'jsx',
  json: 'json', jsonc: 'jsonc', css: 'css', scss: 'scss', html: 'html', htm: 'html', vue: 'vue', svelte: 'svelte', astro: 'astro',
  md: 'markdown', markdown: 'markdown', mdx: 'mdx', py: 'python', rs: 'rust', go: 'go', java: 'java', kt: 'kotlin', kts: 'kotlin', swift: 'swift',
  c: 'c', h: 'c', cpp: 'cpp', cc: 'cpp', hpp: 'cpp', cs: 'csharp', php: 'php', rb: 'ruby', sh: 'shellscript', bash: 'shellscript', zsh: 'shellscript',
  yaml: 'yaml', yml: 'yaml', toml: 'toml', sql: 'sql', xml: 'xml', svg: 'xml', lua: 'lua', dart: 'dart', graphql: 'graphql', gql: 'graphql', prisma: 'prisma',
}

export function lenguajeDe(ruta: string): string | null {
  const nombre = ruta.split('/').pop() ?? ''
  if (/^dockerfile/i.test(nombre)) return 'docker'
  const punto = nombre.lastIndexOf('.')
  return punto > 0 ? POR_EXTENSION[nombre.slice(punto + 1).toLowerCase()] ?? null : null
}

let resaltador: Promise<HighlighterCore> | null = null
const TEMA = createCssVariablesTheme({ name: 'esme', variablePrefix: '--shiki-', fontStyle: true })
const motor = () => (resaltador ??= createHighlighterCore({ themes: [TEMA], langs: [], engine: createJavaScriptRegexEngine() }))

/** Colorea un bloque de líneas seguidas (conserva el estado entre ellas: comentarios y cadenas de varias líneas). */
export async function resaltar(lineas: string[], lenguaje: string | null): Promise<Pieza[][]> {
  const tal = () => lineas.map((l) => [{ contenido: l }])
  if (!lenguaje || !CARGAR[lenguaje]) return tal()
  try {
    const h = await motor()
    if (!h.getLoadedLanguages().includes(lenguaje)) await h.loadLanguage((await CARGAR[lenguaje]()).default)
    const filas = h.codeToTokensBase(lineas.join('\n'), { lang: lenguaje, theme: 'esme' })
    return filas.map((f) => f.map((x) => ({ contenido: x.content, ...(x.color ? { color: x.color } : {}), ...(x.fontStyle && x.fontStyle & 1 ? { cursiva: true } : {}) })))
  } catch { return tal() }
}
