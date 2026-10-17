// El puente de arranque del registro: separa el paquete, encuentra el binario global y lo convierte en lanzable.
import { describe, expect, it } from 'vitest'
import { lanzarRegistro, paqueteDe, partesDe } from './registro-lanzar'

describe('paqueteDe y partesDe', () => {
  it('sacan el paquete crudo de la instalación del registro', () => {
    expect(paqueteDe('npx pi-acp@0.0.34')).toBe('pi-acp')
    expect(paqueteDe('npx @qwen-code/qwen-code@0.25.2 --acp')).toBe('@qwen-code/qwen-code')
    expect(paqueteDe('npx @compass-ai/nova@1.1.54 acp')).toBe('@compass-ai/nova')
  })

  it('dejan los argumentos del runtime, no de npm install', () => {
    expect(partesDe('npx pi-acp@0.0.34')?.args).toEqual([])
    expect(partesDe('npx @compass-ai/nova@1.1.54 acp')?.args).toEqual(['acp'])
    expect(partesDe('npx @qoder-ai/qodercli@0.2.14 --acp')?.args).toEqual(['--acp'])
  })

  it('rechazan lo que no es npx', () => {
    expect(paqueteDe('npm i -g cosas')).toBe(null)
    expect(partesDe('npx')).toBe(null)
  })
})

describe('lanzarRegistro', () => {
  const qwen = { id: 'qwen-code', nombre: 'Qwen Code', descripcion: '', repo: null, instalacion: 'npx @qwen-code/qwen-code@0.25.2 --acp' }

  it('resuelve el binario del paquete global con el node del propio Electron', async () => {
    const r = await lanzarRegistro(qwen, new Map([['@qwen-code/qwen-code', '/g/@qwen-code/qwen-code']]),
      async () => JSON.stringify({ bin: { qwen: 'lib/esm/cli.js' } }))
    expect(r).toEqual({ comando: process.execPath, args: ['/g/@qwen-code/qwen-code/lib/esm/cli.js', '--acp'], env: { ELECTRON_RUN_AS_NODE: '1' } })
  })

  it('acepta bin como cadena única', async () => {
    const r = await lanzarRegistro(qwen, new Map([['@qwen-code/qwen-code', '/g/qwen']]), async () => JSON.stringify({ bin: 'cli.js' }))
    expect(r).toEqual({ comando: process.execPath, args: ['/g/qwen/cli.js', '--acp'], env: { ELECTRON_RUN_AS_NODE: '1' } })
  })

  it('da errores claros cuando no hay instalación, binario o el paquete está dañado', async () => {
    const sinCarpeta = await lanzarRegistro(qwen, new Map())
    expect('error' in sinCarpeta && sinCarpeta.error).toContain('no está instalado')

    const sinBin = await lanzarRegistro(qwen, new Map([['@qwen-code/qwen-code', '/g/qwen']]), async () => JSON.stringify({}))
    expect('error' in sinBin && sinBin.error).toContain('binario')

    const dañado = await lanzarRegistro(qwen, new Map([['@qwen-code/qwen-code', '/g/qwen']]), async () => 'no es json')
    expect('error' in dañado && dañado.error).toContain('dañada')

    const sinInstalacion = await lanzarRegistro({ ...qwen, instalacion: null }, new Map())
    expect('error' in sinInstalacion && sinInstalacion.error).toContain('instalación automática')
  })
})
