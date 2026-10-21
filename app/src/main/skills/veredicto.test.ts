import { createHash, generateKeyPairSync, sign } from 'node:crypto'
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { CLAVES_TIENDA } from '../claves'
import catalogo from './catalogo.json'
import {
  aplicaAlCatalogo,
  catalogoSha256,
  verificaVeredictos,
  veredictosEmpaquetados,
  veredictosRemotos,
  type VeredictoSkill,
} from './veredicto'

const par = () => { const { publicKey, privateKey } = generateKeyPairSync('ed25519'); return { publica: publicKey.export({ type: 'spki', format: 'pem' }).toString(), privada: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString() } }
const { publica, privada } = par()
const medida = { arbolSha256: 'a'.repeat(64), licencia: 'MIT', commit: 'b'.repeat(40), ficheros: 2, bytes: 100, ejecutables: false, tokens: 100, skillMdSha256: 'c'.repeat(64) }
const skill: VeredictoSkill = { id: 'anthropics/frontend-design', entra: true, nivel: 'ok', causa: 'todo comprobable', medidas: medida }
const cuerpo = (v: { version: number; emitido: number; firmante: string; catalogoSha256: string; skills: VeredictoSkill[] }) => Buffer.from(JSON.stringify({
  version: v.version, emitido: v.emitido, firmante: v.firmante, catalogoSha256: v.catalogoSha256,
  skills: v.skills.map((s) => ({ id: s.id, entra: s.entra, nivel: s.nivel, causa: s.causa,
    medidas: { arbolSha256: s.medidas.arbolSha256, licencia: s.medidas.licencia, commit: s.medidas.commit, ficheros: s.medidas.ficheros, bytes: s.medidas.bytes, ejecutables: s.medidas.ejecutables, tokens: s.medidas.tokens ?? null, skillMdSha256: s.medidas.skillMdSha256 ?? '' } })),
}))
const firmar = (skills: VeredictoSkill[], o: { clave?: string; firmante?: string; signedBy?: string; catalogo?: string; emitido?: number } = {}) => {
  const firmante = o.firmante ?? 'huella'
  const v = { version: 1, emitido: o.emitido ?? 1, firmante, catalogoSha256: o.catalogo ?? 'f'.repeat(64), skills }
  const bytes = cuerpo(v)
  return JSON.stringify({ ...v, firma: { algorithm: 'ed25519-sha512', signature: sign(null, bytes, o.clave ?? privada).toString('base64'), signed_at: new Date().toISOString(), signed_by: o.signedBy ?? firmante, hash: createHash('sha256').update(bytes).digest('base64') } })
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
    expect(verificaVeredictos(firmar([skill], { clave: par().privada }), publica).ok).toBe(false)
  })
  it('con varias claves de confianza, vale con cualquiera de ellas', () => {
    const texto = firmar([skill], { clave: privada })
    expect(verificaVeredictos(texto, [par().publica, publica]).ok).toBe(true)
  })
  it('quien dice firmar tiene que ser quien firmó', () => {
    expect(verificaVeredictos(firmar([skill], { signedBy: 'otra' }), publica).ok).toBe(false)
  })
  it('lo que no es un veredicto se rechaza sin romperse', () => {
    for (const x of ['', '{}', 'null', '{"skills":5,"firma":"x"}']) expect(verificaVeredictos(x, publica).ok).toBe(false)
  })
  it('un veredicto que no dice qué catálogo juzgó no vale', () => {
    const c = JSON.parse(firmar([skill])); delete c.catalogoSha256
    expect(verificaVeredictos(JSON.stringify(c), publica).ok).toBe(false)
  })
})

describe('el veredicto va atado al catálogo que juzgó', () => {
  it('la huella del catálogo no depende del orden de las claves', () => {
    expect(catalogoSha256([{ id: 'x', b: 1, a: 2 }])).toBe(catalogoSha256([{ a: 2, b: 1, id: 'x' }]))
  })
  it('el veredicto que viene con la app juzgó NUESTRO catálogo', () => {
    const v = veredictosEmpaquetados(CLAVES_TIENDA)
    expect(v.ok).toBe(true)
    if (v.ok) expect(aplicaAlCatalogo(v, catalogo)).toBe(true)
  })
  it('un veredicto de otro catálogo no aplica', () => {
    expect(aplicaAlCatalogo({ catalogoSha256: 'a'.repeat(64) }, catalogo)).toBe(false)
  })
})

describe('el veredicto se busca: la red, la copia y el que viaja con la app', () => {
  const datos = () => mkdtempSync(join(tmpdir(), 'esme-veredicto-'))
  const ok = (texto: string) => ({ ok: true, text: async () => texto })

  it('si la red trae un veredicto firmado, ese gana', async () => {
    const texto = firmar([skill], { catalogo: catalogoSha256(catalogo) })
    const v = await veredictosRemotos({ datos: datos(), buscar: async () => ok(texto), claves: publica })
    expect(v.ok && v.origen).toBe('red')
  })
  it('lo que la red trae sin firma no se usa ni se guarda', async () => {
    const dir = datos()
    const v = await veredictosRemotos({ datos: dir, buscar: async () => ok('{"skills":[]}'), claves: [publica, ...CLAVES_TIENDA] })
    expect(v.ok).toBe(true)
    if (v.ok) expect(v.origen).toBe('empaquetado')
    expect(() => readFileSync(join(dir, 'skills-veredictos.json'))).toThrow()
  })
  it('sin red, vale la copia local', async () => {
    const dir = datos()
    const texto = firmar([skill], { catalogo: catalogoSha256(catalogo) })
    await veredictosRemotos({ datos: dir, buscar: async () => ok(texto), claves: publica })
    const v = await veredictosRemotos({ datos: dir, buscar: async () => { throw new Error('sin red') }, claves: publica })
    expect(v.ok && v.origen).toBe('copia')
  })
  it('sin red y sin copia, el que viaja con la app', async () => {
    const v = await veredictosRemotos({ datos: datos(), buscar: async () => { throw new Error('sin red') }, claves: CLAVES_TIENDA })
    expect(v.ok && v.origen).toBe('empaquetado')
  })
})

describe('el veredicto envejece: se dice, pero no se quita', () => {
  it('un veredicto de hace un día está al día', () => {
    const r = verificaVeredictos(firmar([skill], { emitido: Date.now() - 86_400_000 }), publica)
    expect(r.ok).toBe(true)
    if (r.ok) { expect(r.caducado).toBe(false); expect(r.vence).toBeGreaterThan(Date.now()) }
  })

  it('un veredicto de hace más de 90 días se marca caducado… pero sigue valiendo', () => {
    // El juez pone el listón, nunca lo quita: un veredicto viejo sigue aplicando.
    const viejo = Date.now() - 120 * 86_400_000
    const r = verificaVeredictos(firmar([skill], { emitido: viejo }), publica)
    expect(r.ok).toBe(true)
    if (r.ok) { expect(r.caducado).toBe(true); expect(r.emitido).toBe(viejo) }
  })
})
