// El veredicto del juez se verifica en el navegador (WebCrypto) y en el escritorio (node:crypto).
// Los dos tienen que dar **el mismo juicio** con los mismos datos: si no, la Tienda enseñaría una
// cosa en la app y otra en la web, y el listón del juez dejaría de ser el mismo.
//
// Este test firma un veredicto de verdad (node:crypto) y lo pasa por los dos verificadores.
import { createHash, generateKeyPairSync, sign } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { verificaVeredictos as verificaEscritorio } from '../../main/skills/veredicto'
import { cuerpoVeredictos, verificaVeredictos as verificaWeb } from './veredicto-web'

const par = () => {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519')
  return {
    publica: publicKey.export({ type: 'spki', format: 'pem' }).toString(),
    privada: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
  }
}

const skill = {
  id: 'shop/algo',
  entra: true,
  nivel: 'ok' as const,
  causa: 'todo en orden',
  medidas: {
    arbolSha256: 'a'.repeat(64),
    licencia: 'MIT',
    commit: 'abc123',
    ficheros: 3,
    bytes: 1200,
    ejecutables: false,
    tokens: null,
    skillMdSha256: 'b'.repeat(64),
  },
}

/** El veredicto firmado: los MISMOS bytes que verifica cada implementation. */
const firmar = (skills: unknown[], privada: string, o: { catalogo?: string } = {}) => {
  const firmante = 'huella'
  const catalogoSha256 = o.catalogo ?? 'f'.repeat(64)
  const bytes = Buffer.from(JSON.stringify({
    version: 1,
    emitido: 1,
    firmante,
    catalogoSha256,
    skills: skills.map((s) => ({
      id: (s as typeof skill).id,
      entra: (s as typeof skill).entra,
      nivel: (s as typeof skill).nivel,
      causa: (s as typeof skill).causa,
      medidas: (s as typeof skill).medidas,
    })),
  }))
  return JSON.stringify({
    version: 1,
    emitido: 1,
    firmante,
    catalogoSha256,
    skills,
    firma: {
      algorithm: 'ed25519-sha512',
      signature: sign(null, bytes, privada).toString('base64'),
      signed_at: new Date().toISOString(),
      signed_by: firmante,
      hash: createHash('sha256').update(bytes).digest('base64'),
    },
  })
}

describe('el veredicto se verifica igual en el escritorio y en el navegador', () => {
  it('los dos ven el mismo veredicto firmado', async () => {
    const { publica, privada } = par()
    const texto = firmar([skill], privada)
    const escritorio = verificaEscritorio(texto, publica)
    const web = await verificaWeb(texto, publica)
    expect(escritorio.ok).toBe(true)
    expect(web.ok).toBe(true)
    if (escritorio.ok && web.ok) {
      expect(web.skills).toEqual(escritorio.skills)
      expect(web.firmante).toBe(escritorio.firmante)
      expect(web.catalogoSha256).toBe(escritorio.catalogoSha256)
    }
  })

  it('los dos rechazan lo mismo: un veredicto cambiado', async () => {
    const { publica, privada } = par()
    const c = JSON.parse(firmar([skill], privada))
    c.skills[0].medidas.arbolSha256 = 'c'.repeat(64)
    const escritorio = verificaEscritorio(JSON.stringify(c), publica)
    const web = await verificaWeb(JSON.stringify(c), publica)
    expect(escritorio.ok).toBe(false)
    expect(web.ok).toBe(false)
    if (!escritorio.ok && !web.ok) expect(web.motivo).toBe(escritorio.motivo)
  })

  it('los dos rechazan lo mismo: una skill con la forma rota', async () => {
    const { publica, privada } = par()
    const roto = { ...skill, nivel: 'inventado' }
    const texto = firmar([roto], privada)
    const escritorio = verificaEscritorio(texto, publica)
    const web = await verificaWeb(texto, publica)
    expect(escritorio.ok).toBe(false)
    expect(web.ok).toBe(false)
    if (!escritorio.ok && !web.ok) expect(web.motivo).toBe(escritorio.motivo)
  })

  it('el cuerpo que verifica el navegador es el mismo que el del escritorio', async () => {
    const bytes = cuerpoVeredictos({
      version: 1, emitido: 1, firmante: 'huella', catalogoSha256: 'f'.repeat(64), skills: [skill],
    })
    const esperado = Buffer.from(JSON.stringify({
      version: 1, emitido: 1, firmante: 'huella', catalogoSha256: 'f'.repeat(64),
      skills: [{
        id: skill.id, entra: skill.entra, nivel: skill.nivel, causa: skill.causa,
        medidas: skill.medidas,
      }],
    }))
    expect(Buffer.from(bytes).toString('base64')).toBe(esperado.toString('base64'))
  })
})
