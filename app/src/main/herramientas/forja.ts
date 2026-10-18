// La Forja (docs/superpowers/specs/2026-10-18-manos.md): Esme se fabrica la herramienta que le falta. Un agente del
// Taller escribe un solo fichero Python (MCPServer, el SDK oficial de MCP 2.x) que solo usa lo que ya trae el cerebro de Esme; tú lo revisas; al
// instalarlo se copia a la carpeta de herramientas y se arranca con el Python de Esme. Sin instalar nada más.
import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import type { PythonEsme } from './lanzar-mcp'
import type { Ficha } from './registro-mcp'

export function encargoDeForja(necesidad: string, slug: string, py?: PythonEsme): string {
  // el python del sistema no tiene mcp: el agente prueba con el de Esme o se queda en bucle (pasó el 18-oct)
  const probar = py ? `${py.extraPython ? `PYTHONPATH=${py.extraPython} PYTHONNOUSERSITE=1 ` : ''}${py.python} -c "import herramienta"` : 'python3 -c "import herramienta"'
  return `Crea una herramienta MCP para Esme que sirva para: ${necesidad}

Requisitos (obligatorios):
- Un único fichero llamado herramienta.py en la raíz de la carpeta (puedes añadir algún .py auxiliar si de verdad hace falta).
- Usa el SDK oficial de MCP 2.x: from mcp.server.mcpserver import MCPServer; mcp = MCPServer("${slug}"); cada acción es una función con @mcp.tool(), con tipos y un docstring claro en español que explique qué hace y qué devuelve.
- Al final: if __name__ == "__main__": mcp.run() (transporte stdio).
- Solo puedes usar la biblioteca estándar de Python, mcp y httpx (para pedir cosas a internet). Nada más: no habrá pip install.
- Nada de ejecutar órdenes del sistema ni borrar ficheros salvo que la necesidad lo exija de forma explícita.
- Errores claros: si algo falla, devuelve un mensaje que explique qué pasó en vez de lanzar excepciones crudas.
- Antes de terminar, prueba que se importa sin errores con esta orden exacta (no uses el python del sistema, que no tiene mcp; no instales nada): ${probar}
- Si la prueba falla dos veces por lo mismo, para y explica qué pasa en vez de insistir.
Nombre corto de la herramienta: "${slug}".`
}

const PALABRAS_VACIAS = new Set(['con', 'del', 'de', 'la', 'el', 'los', 'las', 'que', 'para', 'por', 'una', 'un', 'en', 'y', 'o', 'a', 'mi', 'mis', 'su', 'sus', 'al',
  'herramienta', 'herramientas', 'sirva', 'reciba', 'recibe', 'dada', 'dado', 'quiero', 'necesito', 'calcule', 'devuelva', 'diga', 'haga', 'pueda', 'aaaa', 'mm', 'dd'])
export function slugDeForja(necesidad: string, existentes: string[]): string {
  // si ya es un nombre corto (dias_hasta), se respeta tal cual
  if (/^[a-z][a-z0-9_]{2,19}$/.test(necesidad)) { let s = necesidad, n = 2; while (existentes.includes(s)) s = `${necesidad}_${n++}`; return s }
  const palabras = necesidad.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter((p) => p && !PALABRAS_VACIAS.has(p))
  const base = palabras.slice(0, 2).join('_').slice(0, 20) || 'forjada'
  let slug = base, n = 2
  while (existentes.includes(slug)) slug = `${base}_${n++}`
  return slug
}

const AVISOS: [RegExp, string][] = [
  [/\bsubprocess\b|\bos\.system\b|\bos\.popen\b|\bpty\b/, 'Puede ejecutar órdenes en tu equipo.'],
  [/\bshutil\.rmtree\b|\bos\.remove\b|\bos\.unlink\b|\.unlink\(|\bos\.rmdir\b/, 'Puede borrar ficheros.'],
  [/\beval\(|\bexec\(|\b__import__\(/, 'Ejecuta código arbitrario.'],
  [/\bsocket\b/, 'Abre conexiones de red de bajo nivel.'],
]
/** Lo que conviene que veas antes de instalarla: si puede ejecutar órdenes, borrar o ejecutar código arbitrario. */
export const avisosDe = (codigo: string) => AVISOS.filter(([re]) => re.test(codigo)).map(([, a]) => a)

/** Copia los .py de la copia del Taller a su carpeta de herramientas y devuelve su ficha. */
export function instalarForjada(o: { copia: string; base: string; slug: string; necesidad: string }): Ficha {
  if (!existsSync(join(o.copia, 'herramienta.py'))) throw new Error('El agente no dejó herramienta.py: no hay nada que instalar.')
  const destino = join(o.base, o.slug)
  rmSync(destino, { recursive: true, force: true })
  mkdirSync(destino, { recursive: true })
  for (const f of readdirSync(o.copia)) if (f.endsWith('.py')) copyFileSync(join(o.copia, f), join(destino, f))
  const titulo = o.slug.replace(/_/g, ' ')
  return { id: `esme.forja/${o.slug}`, slug: o.slug, titulo: titulo[0].toUpperCase() + titulo.slice(1), descripcion: o.necesidad, version: '1',
    conexion: { tipo: 'forjada', fichero: join(destino, 'herramienta.py') }, variables: [] }
}
