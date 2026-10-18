import { describe, it, expect } from 'vitest'
import { faltan, lanzamientoDe, nombreAccion } from './lanzar-mcp'
import type { Ficha } from './registro-mcp'

const npm: Ficha = { id: 'ai.perplexity/mcp-server', slug: 'perplexity', titulo: 'Perplexity', descripcion: '', version: '2.1.0',
  conexion: { tipo: 'npm', paquete: '@perplexity-ai/mcp-server', version: '2.1.0' },
  variables: [{ nombre: 'PERPLEXITY_API_KEY', descripcion: '', secreta: true, requerida: true, donde: 'env' }, { nombre: 'DEBUG', descripcion: '', secreta: false, requerida: false, donde: 'env' }] }
const pypi: Ficha = { ...npm, id: 'x/y', slug: 'y', conexion: { tipo: 'pypi', paquete: 'mcp-y', version: '0.3' }, variables: [] }
const remota: Ficha = { ...npm, id: 'com.figma.mcp/mcp', slug: 'figma', conexion: { tipo: 'remoto', url: 'https://mcp.figma.com/mcp' },
  variables: [{ nombre: 'Authorization', descripcion: '', secreta: true, requerida: false, donde: 'cabecera' }] }

describe('cómo se arranca cada herramienta', () => {
  it('npm: npx con la versión fijada y solo las variables que tienen valor', () => {
    expect(lanzamientoDe(npm, { PERPLEXITY_API_KEY: 'k' })).toEqual({ tipo: 'stdio', comando: 'npx', args: ['-y', '@perplexity-ai/mcp-server@2.1.0'], env: { PERPLEXITY_API_KEY: 'k' } })
  })
  it('pypi: uvx con la versión fijada', () => {
    expect(lanzamientoDe(pypi, {})).toEqual({ tipo: 'stdio', comando: 'uvx', args: ['mcp-y==0.3'], env: {} })
  })
  it('remota: su dirección y sus cabeceras', () => {
    expect(lanzamientoDe(remota, { Authorization: 'Bearer t' })).toEqual({ tipo: 'http', url: 'https://mcp.figma.com/mcp', headers: { Authorization: 'Bearer t' } })
  })
  it('dice qué claves obligatorias faltan', () => {
    expect(faltan(npm, {})).toEqual(['PERPLEXITY_API_KEY'])
    expect(faltan(npm, { PERPLEXITY_API_KEY: 'k' })).toEqual([])
  })
})

describe('el nombre de cada acción conectada', () => {
  it('lleva el prefijo de su herramienta y cabe en el límite de los modelos (64)', () => {
    expect(nombreAccion('figma', 'get_file')).toBe('figma__get_file')
    expect(nombreAccion('figma', 'get.file name!')).toBe('figma__get_file_name')
    expect(nombreAccion('x', 'a'.repeat(100)).length).toBeLessThanOrEqual(64)
  })
})
