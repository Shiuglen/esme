import { describe, it, expect } from 'vitest'
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { avisosDe, encargoDeForja, instalarForjada, rutasDe, slugDeForja } from './forja'

describe('el encargo de la Forja', () => {
  it('pide un solo fichero Python con MCPServer (mcp 2.x; FastMCP ya no existe), solo con lo que ya trae Esme, y la necesidad tal cual', () => {
    const e = encargoDeForja('convertir divisas con el cambio del BCE', 'divisas')
    expect(e).toMatch(/herramienta\.py/)
    expect(e).toMatch(/from mcp.server.mcpserver import MCPServer/)
    expect(e).not.toMatch(/fastmcp/i)
    expect(e).toMatch(/biblioteca estándar/)
    expect(e).toMatch(/httpx/)
    expect(e).toContain('convertir divisas con el cambio del BCE')
    expect(e).toMatch(/"divisas"/)
  })
  it('le da al agente la orden exacta para probar con el Python de Esme (el del sistema no tiene mcp)', () => {
    const e = encargoDeForja('x'.repeat(20), 'divisas', { python: '/esme/python3', extraPython: '/esme/paquetes' })
    expect(e).toContain('PYTHONPATH=/esme/paquetes PYTHONNOUSERSITE=1 /esme/python3 -c "import herramienta"')
    expect(e).toMatch(/no uses el python del sistema/i)
    expect(encargoDeForja('x'.repeat(20), 'd', { python: '/venv/bin/python3', extraPython: null })).toContain('/venv/bin/python3 -c "import herramienta"')
  })
  it('lleva lo que la mente ya sabe, para que el agente no invente lo que ya está en su memoria', () => {
    const e = encargoDeForja('recrea el canal hilos:buscar', 'hilos', undefined, 'La superficie: los canales IPC. | `hilos:buscar` | handle | literal | index.js:8523 |')
    expect(e).toMatch(/Lo que la mente de Esme ya sabe/)
    expect(e).toContain('`hilos:buscar`')
  })
  it('sin contexto, el encargo es el de siempre', () => {
    const e = encargoDeForja('convertir divisas', 'divisas')
    expect(e).not.toMatch(/Lo que la mente de Esme ya sabe/)
    expect(encargoDeForja('convertir divisas', 'divisas', undefined, '   ')).not.toMatch(/Lo que la mente de Esme ya sabe/)
  })
  it('el nombre corto sale de la necesidad, sin choques con las que ya tienes', () => {
    expect(slugDeForja('Convertir divisas con el cambio del BCE', [])).toBe('convertir_divisas')
    expect(slugDeForja('Convertir divisas con el cambio del BCE', ['convertir_divisas'])).toBe('convertir_divisas_2')
    expect(slugDeForja('¿¡!?', [])).toBe('forjada')
    expect(slugDeForja('Una herramienta que, reciba una fecha en formato AAAA-MM-DD', [])).toBe('fecha_formato')
    expect(slugDeForja('dias_hasta', [])).toBe('dias_hasta')
  })
  it('sabe qué programa nombra el encargo (para pedirle a la mente lo que sabe de él)', () => {
    expect(rutasDe('recrea el mecanismo de /home/sakai/Daimon/app/out/main')).toEqual(['/home/sakai/Daimon/app/out/main'])
    expect(rutasDe('mira /tmp/a y /tmp/b')).toEqual(['/tmp/a', '/tmp/b'])
    expect(rutasDe('no hay ninguna ruta aquí')).toEqual([])
  })
})

describe('avisos sobre el código antes de instalarlo', () => {
  it('señala lo que puede tocar tu equipo', () => {
    expect(avisosDe('from mcp.server.fastmcp import FastMCP\nimport httpx\n')).toEqual([])
    const a = avisosDe('import subprocess\nimport os\nos.system("rm -rf /")\neval(x)\nshutil.rmtree(p)\n')
    expect(a.join(' ')).toMatch(/órdenes/)
    expect(a.join(' ')).toMatch(/borrar/)
    expect(a.join(' ')).toMatch(/código arbitrario/)
  })
})

describe('instalar una herramienta forjada', () => {
  it('copia sus ficheros Python a la carpeta de herramientas y devuelve su ficha', () => {
    const copia = mkdtempSync(join(tmpdir(), 'forja-copia-')), base = mkdtempSync(join(tmpdir(), 'forja-dest-'))
    writeFileSync(join(copia, 'herramienta.py'), 'from mcp.server.fastmcp import FastMCP\n')
    writeFileSync(join(copia, 'util.py'), 'X = 1\n')
    mkdirSync(join(copia, '.git')); writeFileSync(join(copia, 'notas.md'), 'hola')
    const f = instalarForjada({ copia, base, slug: 'divisas', necesidad: 'convertir divisas' })
    expect(f).toMatchObject({ id: 'esme.forja/divisas', slug: 'divisas', titulo: 'Divisas', descripcion: 'convertir divisas', conexion: { tipo: 'forjada', fichero: join(base, 'divisas', 'herramienta.py') }, variables: [] })
    expect(readFileSync(join(base, 'divisas', 'util.py'), 'utf8')).toBe('X = 1\n')
    expect(existsSync(join(base, 'divisas', 'notas.md'))).toBe(false)
  })
  it('sin herramienta.py no se instala nada', () => {
    const copia = mkdtempSync(join(tmpdir(), 'forja-copia-'))
    expect(() => instalarForjada({ copia, base: tmpdir(), slug: 'x', necesidad: 'y' })).toThrow(/herramienta\.py/)
  })
})
