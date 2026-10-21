// UNA SOLA PUERTA: entre el TypeScript y el cerebro (Python) no hay más contrato que el de `mente/cliente.ts`.
// Este test lo hace imposible de romper: si alguien escribe un fetch al cerebro en otro fichero —o si la ventana
// intenta hablar con el Python por su cuenta— el test se cae y dice por qué.
//
// La razón es sencilla: el cerebro es Python y la app es TypeScript. Entre dos lenguas solo sobrevive lo que está
// escrito; lo que no está escrito se duplica, se contradice y se rompe sin que nadie lo vea. Y el token de la mente
// no puede andar suelto por la ventana: la ventana es la parte menos de fiar de la casa.
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

const SRC = join(import.meta.dirname, '..')               // src
const PUERTA = join('mente', 'cliente.ts')

const ficheros = (dir: string): string[] =>
  readdirSync(dir).flatMap((n) => {
    const p = join(dir, n)
    if (statSync(p).isDirectory()) return ficheros(p)
    return n.endsWith('.ts') && !n.endsWith('.test.ts') ? [p] : []
  })

// Las rutas del cerebro. Si aparecen fuera de la puerta, alguien ha abierto una puerta de más.
const RUTAS_CEREBRO = ['/health', '/memories', '/recall', '/remember', '/feedback', '/forget', '/ingest', '/ingest-x', '/equipo', '/sueño', '/repeticiones', '/orquesta', '/atlas', '/voz/oir', '/voz/decir', '/events', '/rumbo', '/memory/', '/rea/absorber']

const RELATIVO_A_PUERTA = (f: string) => relative(SRC, f).endsWith(PUERTA)

describe('una sola puerta entre el TypeScript y el cerebro', () => {
  const todos = ficheros(SRC).filter((f) => !RELATIVO_A_PUERTA(f))

  it('ningún otro fichero habla con el cerebro por su cuenta', () => {
    const culpables: string[] = []
    for (const f of todos) {
      const texto = readFileSync(f, 'utf8')
      for (const r of RUTAS_CEREBRO) {
        if (texto.includes(`'${r}'`) || texto.includes(`\`${r}\``) || texto.includes(`/${r}?`)) culpables.push(`${relative(SRC, f)} → ${r}`)
      }
    }
    expect(culpables, `habla con el cerebro fuera de ${PUERTA}:\n${culpables.join('\n')}`).toEqual([])
  })

  it('la url del cerebro solo se construye en la puerta', () => {
    const culpables: string[] = []
    for (const f of todos) {
      const texto = readFileSync(f, 'utf8')
      if (/\.url\}/.test(texto) && /brainInfo|brain\.info|BrainInfo/.test(texto)) culpables.push(relative(SRC, f))
    }
    expect(culpables, `construye la url del cerebro fuera de ${PUERTA}:\n${culpables.join('\n')}`).toEqual([])
  })

  it('quien habla con la mente lo hace por la puerta (y no por un fetch suelto)', () => {
    // un fetch a la URL del cerebro (con una de sus rutas) fuera de la puerta: prohibido.
    // (el servidor de vista previa del Taller es otra cosa: no habla con la mente)
    const culpables: string[] = []
    const ruta = '/(memories|recall|remember|feedback|forget|ingest|health|rumbo|atlas|events)'
    for (const f of todos) {
      const texto = readFileSync(f, 'utf8')
      if (new RegExp(`fetch\\(\\s*\`?\\$\\{[^}]*\\.url\\}${ruta}`).test(texto)) culpables.push(relative(SRC, f))
    }
    expect(culpables, `llama al cerebro sin la puerta:\n${culpables.join('\n')}`).toEqual([])
  })

  it('el token de la mente no sale del proceso principal', () => {
    const culpables: string[] = []
    for (const f of todos.filter((f) => f.includes(`renderer`))) {
      const texto = readFileSync(f, 'utf8')
      if (/VITE_BRAIN_TOKEN/.test(texto)) culpables.push(`${relative(SRC, f)} → VITE_BRAIN_TOKEN`)
      if (/BrainInfo/.test(texto) && /token\s*:\s*string/.test(texto)) culpables.push(`${relative(SRC, f)} → BrainInfo con token`)
    }
    expect(culpables, `la ventana toca el token de la mente:\n${culpables.join('\n')}`).toEqual([])
  })

  it('una ruta del cerebro fuera de la puerta, aunque vaya pegada a una url', () => {
    // El caso que se colaba: `fetch(`${url}/recall`)` con la ruta al FINAL de
    // una plantilla (no como cadena suelta). Una puerta de más, disfrazada.
    const culpables: string[] = []
    for (const f of todos) {
      const texto = readFileSync(f, 'utf8')
      for (const r of RUTAS_CEREBRO) {
        // en la plantilla, el $ va escapado: un $ literal, no el ancla
        const re = new RegExp(`\\$\\{[^}]*\\.url\\}${r.replace('/', '\\/')}`)
        if (re.test(texto)) culpables.push(`${relative(SRC, f)} → ${r}`)
      }
    }
    expect(culpables, `llama al cerebro por su cuenta:\n${culpables.join('\n')}`).toEqual([])
  })

  it('el token de la mente no se escribe a mano fuera de la puerta', () => {
    // Bearer + una ruta del cerebro, aunque no sea un fetch: si alguien
    // construye la llamada a mano, está abriendo otra puerta.
    const culpables: string[] = []
    for (const f of todos) {
      const texto = readFileSync(f, 'utf8')
      if (!/Bearer/.test(texto)) continue
      for (const r of RUTAS_CEREBRO) {
        const re = new RegExp(`Bearer[^\\n]{0,120}${r.replace('/', '\\/')}`)
        if (re.test(texto)) culpables.push(`${relative(SRC, f)} → ${r}`)
      }
    }
    expect(culpables, `escribe el token de la mente a mano:\n${culpables.join('\n')}`).toEqual([])
  })
})
