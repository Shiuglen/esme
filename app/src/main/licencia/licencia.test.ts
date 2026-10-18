import { generateKeyPairSync } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { firmarLicencia, leerLicencia } from './licencia'

const par = () => {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519')
  return { publica: publicKey.export({ type: 'spki', format: 'pem' }).toString(), privada: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString() }
}
const { publica, privada } = par()
const AHORA = Date.UTC(2026, 9, 17)
const dia = 864e5

describe('una licencia es un código firmado que la app comprueba sin servidor', () => {
  it('un código del creador se lee con su plan, para quién es y hasta cuándo', () => {
    const codigo = firmarLicencia({ para: 'Ana', plan: 'colaborador', desde: AHORA, hasta: AHORA + 365 * dia }, privada)
    expect(codigo).toMatch(/^ESME-[\w-]+\.[\w-]+$/)
    const r = leerLicencia(codigo, publica, AHORA + dia)
    expect(r.ok && r.licencia).toMatchObject({ para: 'Ana', plan: 'colaborador', hasta: AHORA + 365 * dia })
  })
  it('se acepta aunque venga con espacios o saltos de línea al pegarlo', () => {
    const codigo = firmarLicencia({ para: 'Ana', plan: 'pro', desde: AHORA }, privada)
    expect(leerLicencia(`  ${codigo.slice(0, 20)}\n${codigo.slice(20)}  `, publica, AHORA).ok).toBe(true)
  })
  it('cambiar el plan o la fecha de un código rompe la firma', () => {
    const codigo = firmarLicencia({ para: 'Ana', plan: 'colaborador', desde: AHORA, hasta: AHORA + dia }, privada)
    const [cuerpo, firma] = codigo.slice(5).split('.')
    const datos = JSON.parse(Buffer.from(cuerpo, 'base64url').toString())
    const trucado = `ESME-${Buffer.from(JSON.stringify({ ...datos, plan: 'equipo', hasta: AHORA + 9999 * dia })).toString('base64url')}.${firma}`
    expect(leerLicencia(trucado, publica, AHORA)).toEqual({ ok: false, motivo: 'Este código no es auténtico: no lo firmó Esme.' })
  })
  it('un código firmado con otra clave no vale', () => {
    const otro = par()
    const codigo = firmarLicencia({ para: 'Ana', plan: 'pro', desde: AHORA }, otro.privada)
    expect(leerLicencia(codigo, publica, AHORA).ok).toBe(false)
  })
  it('un código caducado lo dice con la fecha', () => {
    const codigo = firmarLicencia({ para: 'Ana', plan: 'colaborador', desde: AHORA - 10 * dia, hasta: AHORA - dia }, privada)
    const r = leerLicencia(codigo, publica, AHORA)
    expect(r.ok).toBe(false)
    expect(!r.ok && r.motivo).toMatch(/^Este código caducó el /)
  })
  it('lo que no es un código se rechaza con una explicación, sin romperse', () => {
    for (const x of ['', 'hola', 'ESME-', 'ESME-abc.def', 'ESME-%%%.%%%']) expect(leerLicencia(x, publica, AHORA).ok).toBe(false)
  })
  it('un plan desconocido no se acepta aunque esté firmado', () => {
    const codigo = firmarLicencia({ para: 'Ana', plan: 'dios' as never, desde: AHORA }, privada)
    expect(leerLicencia(codigo, publica, AHORA).ok).toBe(false)
  })
})

describe('el plan que tienes', () => {
  it('sin código, Gratis; con uno válido, su plan; caducado, Gratis con el aviso de por qué', async () => {
    const { estadoDe } = await import('./licencia')
    expect(estadoDe(null, publica, AHORA)).toEqual({ plan: 'gratis', nombre: 'Gratis' })
    const bueno = firmarLicencia({ para: 'Ana', plan: 'colaborador', desde: AHORA, hasta: AHORA + 30 * dia }, privada)
    expect(estadoDe(bueno, publica, AHORA)).toMatchObject({ plan: 'colaborador', nombre: 'Colaborador', para: 'Ana', hasta: AHORA + 30 * dia })
    const viejo = firmarLicencia({ para: 'Ana', plan: 'pro', desde: AHORA - 9 * dia, hasta: AHORA - dia }, privada)
    const e = estadoDe(viejo, publica, AHORA)
    expect(e.plan).toBe('gratis'); expect(e.aviso).toMatch(/caducó/)
  })
})
