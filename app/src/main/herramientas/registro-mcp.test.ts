import { describe, it, expect, vi } from 'vitest'
import { buscarEnRegistro, fichaDe, slugDe } from './registro-mcp'

const remoto = { name: 'com.figma.mcp/mcp', title: 'Figma', description: 'Diseños de Figma', version: '1.0.0', websiteUrl: 'https://figma.com',
  remotes: [{ type: 'streamable-http', url: 'https://mcp.figma.com/mcp', headers: [{ name: 'Authorization', description: 'Bearer token', isSecret: true, isRequired: false }] }] }
const npm = { name: 'ai.perplexity/mcp-server', description: 'Busca con Perplexity', version: '2.1.0',
  packages: [{ registryType: 'npm', identifier: '@perplexity-ai/mcp-server', version: '2.1.0', transport: { type: 'stdio' },
    environmentVariables: [{ name: 'PERPLEXITY_API_KEY', description: 'Tu clave', isSecret: true, isRequired: true }, { name: 'DEBUG', description: 'trazas' }] }] }

describe('la ficha de una herramienta del registro', () => {
  it('una remota se conecta por su URL y sus cabeceras son variables', () => {
    expect(fichaDe(remoto)).toEqual({ id: 'com.figma.mcp/mcp', slug: 'figma', titulo: 'Figma', descripcion: 'Diseños de Figma', version: '1.0.0', web: 'https://figma.com',
      conexion: { tipo: 'remoto', url: 'https://mcp.figma.com/mcp' },
      variables: [{ nombre: 'Authorization', descripcion: 'Bearer token', secreta: true, requerida: false, donde: 'cabecera' }] })
  })
  it('una de npm se lanza con npx y pide sus claves', () => {
    const f = fichaDe(npm)!
    expect(f.conexion).toEqual({ tipo: 'npm', paquete: '@perplexity-ai/mcp-server', version: '2.1.0' })
    expect(f.variables[0]).toEqual({ nombre: 'PERPLEXITY_API_KEY', descripcion: 'Tu clave', secreta: true, requerida: true, donde: 'env' })
    expect(f.slug).toBe('perplexity')
  })
  it('sin título, se usa un nombre legible (nunca «mcp»)', () => {
    expect(fichaDe({ name: 'com.notion/mcp', remotes: remoto.remotes })!.titulo).toBe('Notion')
    expect(fichaDe({ name: 'io.github.someone/blender-mcp', remotes: remoto.remotes })!.titulo).toBe('Blender mcp')
  })
  it('si trae remota y paquete, prefiere la remota (no ejecuta nada en tu equipo)', () => {
    expect(fichaDe({ ...npm, remotes: remoto.remotes })!.conexion.tipo).toBe('remoto')
  })
  it('lo que Esme aún no sabe lanzar (docker, nuget…) o no tiene forma, se descarta', () => {
    expect(fichaDe({ name: 'x/y', description: '', version: '1', packages: [{ registryType: 'oci', identifier: 'img' }] })).toBeNull()
    expect(fichaDe(null)).toBeNull()
    expect(fichaDe({ name: 'x/y', remotes: [{ type: 'streamable-http', url: 'javascript:alert(1)' }] })).toBeNull()
  })
})

describe('el nombre corto de cada herramienta (prefijo de sus acciones)', () => {
  it('sale del dominio o del nombre, en minúsculas y sin símbolos', () => {
    expect(slugDe('com.figma.mcp/mcp')).toBe('figma')
    expect(slugDe('io.github.someone/Blender-MCP')).toBe('blender_mcp')
    expect(slugDe('ai.exa/exa')).toBe('exa')
    expect(slugDe('app.linear/linear')).toBe('linear')
    expect(slugDe(`io.github.x/${'a'.repeat(60)}`).length).toBeLessThanOrEqual(24)
  })
})

describe('buscar en el registro', () => {
  const json = (x: unknown) => ({ ok: true, json: async () => x }) as Response
  it('devuelve fichas válidas, sin repetir, y reintenta si el registro falla', async () => {
    let n = 0
    const f = vi.fn(async () => (++n === 1 ? ({ ok: false, status: 500 }) as Response : json({ servers: [{ server: remoto }, { server: remoto }, { server: npm }, { server: { name: 'malo' } }] })))
    const r = await buscarEnRegistro('figma', f as unknown as typeof fetch, 0)
    expect(r.map((x) => x.id)).toEqual(['com.figma.mcp/mcp', 'ai.perplexity/mcp-server'])
    expect(f).toHaveBeenCalledTimes(2)
    expect((f.mock.calls[1] as unknown as [string])[0]).toContain('search=figma')
  })
})
