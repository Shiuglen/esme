import { describe, expect, it } from 'vitest'
import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { actaValida, actaSha256, anotaActa, firmaDe, leeActas, parDeFirma, type Acta } from './acta'

const acta = (): Acta => ({
  version: 1, emitido: 1730000000000, encargoSha256: 'abc123',
  estado: 'probado', frase: 'Las 3 pruebas pasan.',
  relevos: [
    { orden: 1, rol: 'constructor', motor: 'opencode', estado: 'lista' },
    { orden: 2, rol: 'revisor', motor: 'claude', estado: 'lista' },
    { orden: 3, rol: 'probador', motor: 'gemini', estado: 'lista' },
  ],
})

describe('el acta del parlamento — firmada y verificable', () => {
  it('el par de firma se crea una vez y reusa', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'esme-acta-'))
    const p1 = parDeFirma(dir), p2 = parDeFirma(dir)
    expect(p1.publica).toBe(p2.publica)
    expect(p1.privada).toBe(p2.privada)
    expect(await readFile(join(dir, 'firma-taller.pem'), 'utf8')).toContain('PRIVATE KEY')
  })

  it('firmar y verificar: lo que se dictó llega completo', async () => {
    const { privada, publica } = parDeFirma(await mkdtemp(join(tmpdir(), 'esme-acta-')))
    const firmada = firmaDe({ ...acta(), version: 1 }, privada)
    expect(firmada.firma.algorithm).toBe('Ed25519')
    expect(firmada.firma.signed_by).toBe('taller')
    expect(firmada.firma.hash).toBe(actaSha256({ ...acta(), version: 1 }))
    expect(actaValida(firmada, publica)).toBe(true)
  })

  it('una acta cambiada después deja de valer', async () => {
    const { privada, publica } = parDeFirma(await mkdtemp(join(tmpdir(), 'esme-acta-')))
    const firmada = firmaDe({ ...acta(), version: 1 }, privada)
    const falsa = { ...firmada, estado: 'dudoso' as const, frase: 'otra frase' }
    expect(actaValida(falsa, publica)).toBe(false)
    const cambiadaSinNadie = { ...firmada, relevos: [...firmada.relevos.slice(0, 2)] }
    expect(actaValida(cambiadaSinNadie, publica)).toBe(false)
    expect(actaValida(firmada, 'clave ajena')).toBe(false)
  })

  it('el diario: anota y lee, línea a línea', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'esme-acta-'))
    const { privada, publica } = parDeFirma(dir)
    const firmada = firmaDe({ ...acta(), version: 1 }, privada)
    anotaActa(dir, firmada)
    anotaActa(dir, firmaDe({ ...acta(), emitido: 1730000000200, estado: 'tumbado', frase: 'no llegó' }, privada))
    const diario = leeActas(dir)
    expect(diario).toHaveLength(2)
    expect(actaValida(diario[0], publica)).toBe(true)
    expect(actaValida(diario[1], publica)).toBe(true)
    expect(diario[1].estado).toBe('tumbado')
  })
})
