import { createHash, generateKeyPairSync, sign } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { CLAVE_JUEZ } from './clave-juez'
import { verificaVeredictos, veredictosSkills, type VeredictoSkill } from './veredicto'

const par = () => { const { publicKey, privateKey } = generateKeyPairSync('ed25519'); return { publica: publicKey.export({ type: 'spki', format: 'pem' }).toString(), privada: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString() } }
const { publica, privada } = par()
const medida = { arbolSha256: 'a'.repeat(64), licencia: 'MIT', commit: 'b'.repeat(40), ficheros: 2, bytes: 100, ejecutables: false }
const skill: VeredictoSkill = { id: 'anthropics/frontend-design', entra: true, nivel: 'ok', causa: 'todo comprobable', medidas: medida }
const cuerpo = (v: { version: number; emitido: number; firmante: string; skills: VeredictoSkill[] }) => Buffer.from(JSON.stringify({
  version: v.version, emitido: v.emitido, firmante: v.firmante,
  skills: v.skills.map((s) => ({ id: s.id, entra: s.entra, nivel: s.nivel, causa: s.causa,
    medidas: { arbolSha256: s.medidas.arbolSha256, licencia: s.medidas.licencia, commit: s.medidas.commit, ficheros: s.medidas.ficheros, bytes: s.medidas.bytes, ejecutables: s.medidas.ejecutables } })),
}))
const firmar = (skills: VeredictoSkill[], clavePrivada = privada, firmante = 'huella', signedBy = firmante) => {
  const v = { version: 1, emitido: 1, firmante, skills }
  const bytes = cuerpo(v)
  return JSON.stringify({ ...v, firma: { algorithm: 'ed25519-sha512', signature: sign(null, bytes, clavePrivada).toString('base64'), signed_at: new Date().toISOString(), signed_by: signedBy, hash: createHash('sha256').update(bytes).digest('base64') } })
}

describe('el veredicto del juez viene firmado: nadie cambia el listón en silencio', () => {
  it('un veredicto firmado se lee con sus skills', () => {
    const r = verificaVeredictos(firmar([skill]), publica)
    expect(r.ok && r.skills.map((s) => s.id)).toEqual(['anthropics/frontend-design'])
  })
  it('cambiar el veredicto rompe la firma', () => {
    const c = JSON.parse(firmar([skill])); c.skills[0].medidas.arbolSha256 = 'c'.repeat(64)
    expect(verificaVeredictos(JSON.stringify(c), publica).ok).toBe(false)
  })
  it('un veredicto firmado con otra clave no vale', () => {
    expect(verificaVeredictos(firmar([skill], par().privada), publica).ok).toBe(false)
  })
  it('quien dice firmar tiene que ser quien firmó', () => {
    const r = verificaVeredictos(firmar([skill], privada, 'huella', 'otra'), publica)
    expect(r.ok).toBe(false)
  })
  it('lo que no es un veredicto se rechaza sin romperse', () => {
    for (const x of ['', '{}', 'null', '{"skills":5,"firma":"x"}']) expect(verificaVeredictos(x, publica).ok).toBe(false)
  })
})

describe('el veredicto que viene con la app', () => {
  it('verifica contra la clave fijada del juez', () => {
    const v = veredictosSkills()
    expect(v.ok).toBe(true)
    if (v.ok) expect(v.porId.size).toBeGreaterThan(0)
  })
  it('cada skill juzgada trae la huella del árbol que juzgó', () => {
    const v = veredictosSkills()
    if (!v.ok) return
    for (const s of v.porId.values()) expect(s.medidas.arbolSha256).toMatch(/^[0-9a-f]{64}$/)
  })
})
