import { describe, expect, it } from 'vitest'
import { compararVersiones, ordenDeActualizacion, paqueteDeRuta, semverDe } from './actualizar'

describe('versiones de los agentes (idea de MonoCode y Deska)', () => {
  it('saca la versión de lo que imprime cada agente', () => {
    expect(semverDe('opencode v2.0.22')).toBe('2.0.22')
    expect(semverDe('3.0.67\n')).toBe('3.0.67')
    expect(semverDe('Qwen Code 0.25.3-beta.1 (node 24)')).toBe('0.25.3-beta.1')
    expect(semverDe('sin versión')).toBeNull()
  })
  it('compara como semver: números y la previa antes que la final', () => {
    expect(compararVersiones('3.0.67', '3.0.73')).toBe(-1)
    expect(compararVersiones('2.10.0', '2.9.9')).toBe(1)
    expect(compararVersiones('1.0.0-beta', '1.0.0')).toBe(-1)
    expect(compararVersiones('0.93.0', '0.93.0')).toBe(0)
  })
  it('reconoce un agente instalado con npm por su ruta real', () => {
    expect(paqueteDeRuta('/usr/local/lib/node_modules/cline/bin/cline')).toEqual({ paquete: 'cline', raiz: '/usr/local/lib/node_modules' })
    expect(paqueteDeRuta('/h/.mise/node/lib/node_modules/@qwen-code/qwen-code/cli-entry.js')).toEqual({ paquete: '@qwen-code/qwen-code', raiz: '/h/.mise/node/lib/node_modules' })
    expect(paqueteDeRuta('/home/u/.opencode/bin/opencode')).toBeNull()
  })
  it('elige cómo actualizar: npm si puede escribir; si no, te da la orden; OpenCode con su upgrade', () => {
    expect(ordenDeActualizacion({ id: 'cline', paquete: 'cline', raiz: '/usr/local/lib/node_modules', escribible: false }))
      .toEqual({ tipo: 'manual', orden: 'sudo npm install -g cline@latest' })
    expect(ordenDeActualizacion({ id: 'qwen', paquete: '@qwen-code/qwen-code', raiz: '/h/n/lib/node_modules', escribible: true }))
      .toEqual({ tipo: 'auto', comando: '/h/n/bin/npm', args: ['install', '-g', '@qwen-code/qwen-code@latest'] })
    expect(ordenDeActualizacion({ id: 'opencode', comando: '/h/.opencode/bin/opencode' })).toEqual({ tipo: 'auto', comando: '/h/.opencode/bin/opencode', args: ['upgrade'] })
    expect(ordenDeActualizacion({ id: 'otro' })).toBeNull()
  })
})
