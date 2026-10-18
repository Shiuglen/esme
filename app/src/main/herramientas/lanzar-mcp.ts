// Arrancar las herramientas conectadas (docs/superpowers/specs/2026-10-18-manos.md, paso 2): de su ficha y tus claves
// sale qué ejecutar (npx/uvx, con la versión fijada) o a qué dirección hablar. El Gestor mantiene un cliente por
// herramienta, convierte sus acciones en herramientas del modelo con el mismo guardián de permisos que las propias,
// y lo cierra todo al salir.
import { createMCPClient, type OAuthClientProvider } from '@ai-sdk/mcp'
import { Experimental_StdioMCPTransport } from '@ai-sdk/mcp/mcp-stdio'
import type { ToolSet } from 'ai'
import { conGuardia, type Manos } from './propias'
import type { Ficha } from './registro-mcp'

export type Lanzamiento = { tipo: 'stdio'; comando: string; args: string[]; env: Record<string, string> } | { tipo: 'http'; url: string; headers: Record<string, string> }

const conValor = (f: Ficha, valores: Record<string, string>, donde: 'env' | 'cabecera') =>
  Object.fromEntries(f.variables.filter((v) => v.donde === donde && valores[v.nombre]).map((v) => [v.nombre, valores[v.nombre]]))

export type PythonEsme = { python: string; extraPython: string | null }
export function lanzamientoDe(f: Ficha, valores: Record<string, string>, py?: PythonEsme): Lanzamiento {
  const c = f.conexion
  if (c.tipo === 'forjada') {
    if (!py) throw new Error('Falta el Python de Esme para arrancar una herramienta forjada.')
    return { tipo: 'stdio', comando: py.python, args: [c.fichero], env: py.extraPython ? { PYTHONPATH: py.extraPython, PYTHONNOUSERSITE: '1' } : {} }
  }
  if (c.tipo === 'remoto') return { tipo: 'http', url: c.url, headers: conValor(f, valores, 'cabecera') }
  if (c.tipo === 'npm') return { tipo: 'stdio', comando: 'npx', args: ['-y', c.version ? `${c.paquete}@${c.version}` : c.paquete], env: conValor(f, valores, 'env') }
  return { tipo: 'stdio', comando: 'uvx', args: [c.version ? `${c.paquete}==${c.version}` : c.paquete], env: conValor(f, valores, 'env') }
}

export const faltan = (f: Ficha, valores: Record<string, string>) => f.variables.filter((v) => v.requerida && !valores[v.nombre]).map((v) => v.nombre)

/** figma + get.file → figma__get_file (los modelos aceptan [a-zA-Z0-9_-], como mucho 64). */
export const nombreAccion = (slug: string, accion: string) => `${slug}__${accion.replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '')}`.slice(0, 64)

type Cliente = Awaited<ReturnType<typeof createMCPClient>>
export type Conectada = { ficha: Ficha; activa: boolean }

export class GestorMCP {
  private clientes = new Map<string, Promise<Cliente>>()

  // authDe: el inicio de sesión OAuth de cada herramienta remota (en la conversación, nunca abre el navegador)
  constructor(private readonly valoresDe: (f: Ficha) => Record<string, string>, private readonly authDe?: (f: Ficha) => OAuthClientProvider, private readonly py?: PythonEsme) {}

  private cliente(f: Ficha): Promise<Cliente> {
    const previo = this.clientes.get(f.slug)
    if (previo) return previo
    const l = lanzamientoDe(f, this.valoresDe(f), this.py)
    const transport = l.tipo === 'http'
      ? { type: 'http' as const, url: l.url, headers: l.headers, redirect: 'follow' as const, ...(this.authDe ? { authProvider: this.authDe(f) } : {}) }
      : new Experimental_StdioMCPTransport({ command: l.comando, args: l.args, env: { ...process.env as Record<string, string>, ...l.env } })
    const p = createMCPClient({ transport, initializationOptions: { timeout: 30_000 }, onUncaughtError: (e) => console.error(`[mcp ${f.slug}]`, e) })
    p.catch(() => this.clientes.delete(f.slug))   // si no arrancó, se reintenta la próxima vez
    this.clientes.set(f.slug, p)
    return p
  }

  /** Las acciones de una herramienta, sin permisos (para probarla al conectarla y contar cuántas trae). */
  async acciones(f: Ficha): Promise<{ nombre: string; descripcion: string }[]> {
    const t = await (await this.cliente(f)).tools()
    return Object.entries(t).map(([n, x]) => ({ nombre: n, descripcion: (x as { description?: string }).description ?? '' }))
  }

  /** Todas las acciones de las herramientas activas, cada una con el guardián de permisos. Lo que no arranca se cuenta. */
  async herramientas(conectadas: Conectada[], m: Pick<Manos, 'preguntar' | 'politicas' | 'guardarPolitica' | 'conocidas' | 'alPaso'>): Promise<{ tools: ToolSet; fallos: string[] }> {
    const tools: ToolSet = {}, fallos: string[] = []
    await Promise.all(conectadas.filter((c) => c.activa).map(async ({ ficha }) => {
      try {
        const propias = await (await this.cliente(ficha)).tools()
        for (const [accion, t] of Object.entries(propias)) {
          const nombre = nombreAccion(ficha.slug, accion)
          const original = t as unknown as { execute?: (a: unknown, o: unknown) => PromiseLike<unknown> | unknown }
          if (!original.execute) continue
          tools[nombre] = { ...t, execute: (a: unknown, o: { toolCallId: string }) => conGuardia(m, nombre, async (x: unknown) => await original.execute!(x, o))(a, o) } as ToolSet[string]
        }
      } catch (e) { fallos.push(`${ficha.titulo}: ${e instanceof Error ? e.message : String(e)}`) }
    }))
    return { tools, fallos }
  }

  async olvidar(slug: string) { const c = this.clientes.get(slug); this.clientes.delete(slug); await c?.then((x) => x.close()).catch(() => {}) }
  async cerrar() { await Promise.all([...this.clientes.keys()].map((s) => this.olvidar(s))) }
}
