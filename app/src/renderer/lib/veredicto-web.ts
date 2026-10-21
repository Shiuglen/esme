// Verificar el veredicto del juez en el navegador (WebCrypto). La app de escritorio verifica en el
// proceso principal (node:crypto); el modo web no tiene proceso principal, así que aquí se hace lo mismo
// con WebCrypto. Las dos implementaciones tienen que sacar los MISMOS bytes: por eso el cuerpo se
// construye con un orden de claves fijo (spec abierta estandar/skill-veredicto.spec.yaml del kit).
//
// Si el navegador no soporta Ed25519 (WebCrypto), se dice: sin veredicto, no invents.
export type Nivel = 'ok' | 'aviso' | 'fuera'
export type VeredictoSkill = {
  id: string
  entra: boolean
  nivel: Nivel
  causa: string
  medidas: {
    arbolSha256: string
    licencia: string
    commit: string
    ficheros: number
    bytes: number
    ejecutables: boolean
    tokens: number | null
    skillMdSha256: string
  }
}

/** La forma de una skill: la misma guarda que el escritorio (si no, los dos no coinciden). */
const forma = (s: unknown): s is VeredictoSkill => {
  const x = s as Partial<VeredictoSkill>
  return !!x && typeof x === 'object' && typeof x.id === 'string' && typeof x.entra === 'boolean'
    && (x.nivel === 'ok' || x.nivel === 'aviso' || x.nivel === 'fuera') && typeof x.causa === 'string'
    && !!x.medidas && typeof x.medidas === 'object' && typeof x.medidas.arbolSha256 === 'string'
}

type Firma = { algorithm: string; signature: string; signed_at: string; signed_by: string; hash: string }
type Firmado = { version: number; emitido: number; firmante: string; catalogoSha256: string; skills: VeredictoSkill[]; firma: Firma }

/** El cuerpo firmado: las claves en un orden FIJO (lo dice la spec). */
export function cuerpoVeredictos(v: { version: number; emitido: number; firmante: string; catalogoSha256: string; skills: VeredictoSkill[] }): Uint8Array<ArrayBuffer> {
  return new TextEncoder().encode(JSON.stringify({
    version: v.version,
    emitido: v.emitido,
    firmante: v.firmante,
    catalogoSha256: v.catalogoSha256,
    skills: v.skills.map((s) => ({
      id: s.id,
      entra: s.entra,
      nivel: s.nivel,
      causa: s.causa,
      medidas: {
        arbolSha256: s.medidas.arbolSha256,
        licencia: s.medidas.licencia,
        commit: s.medidas.commit,
        ficheros: s.medidas.ficheros,
        bytes: s.medidas.bytes,
        ejecutables: s.medidas.ejecutables,
        tokens: s.medidas.tokens ?? null,
        skillMdSha256: s.medidas.skillMdSha256 ?? '',
      },
    })),
  }))
}

/** El canónico (claves ordenadas recursivamente, sin espacios): la huella del catálogo no depende del formato. */
export const canonico = (v: unknown): string => {
  if (v === null || typeof v !== 'object') return JSON.stringify(v)
  if (Array.isArray(v)) return '[' + v.map(canonico).join(',') + ']'
  const o = v as Record<string, unknown>
  return '{' + Object.keys(o).sort().map((k) => JSON.stringify(k) + ':' + canonico(o[k])).join(',') + '}'
}

export const catalogoSha256 = async (c: unknown): Promise<string> => {
  const bytes = new TextEncoder().encode(canonico(c))
  const hash = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

const b64 = (s: string): Uint8Array<ArrayBuffer> => {
  const bin = atob(s)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

const hex = (bytes: Uint8Array<ArrayBufferLike>): string =>
  [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')

/** El PEM público → la clave CRUDA (32 bytes), que es lo que WebCrypto quiere para Ed25519.
 *
 * node:crypto acepta el SPKI (44 bytes: cabecera DER + clave), pero WebCrypto con Ed25519 exige
 * la clave pelada: exactamente 32 bytes, o dice «Ed25519 raw keys must be exactly 32-bytes» y se
 * queda con «sin veredicto». Los dos usan la MISMA clave; lo que cambia es el envoltorio.
 */
const pemAClaveBruta = (pem: string): Uint8Array<ArrayBuffer> => {
  const spki = pemABytes(pem)
  if (spki.length !== 44) throw new Error('La clave del juez no es una clave Ed25519 (SPKI de 44 bytes).')
  return spki.slice(spki.length - 32)
}

/** El PEM público → bytes crudos (SPKI), que es lo que lee node:crypto. */
const pemABytes = (pem: string): Uint8Array<ArrayBuffer> => {
  const cuerpo = pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '')
  return b64(cuerpo)
}

export type Verificacion = { ok: true; skills: VeredictoSkill[]; emitido: number; firmante: string; catalogoSha256: string } | { ok: false; motivo: string }

/** Comprueba el veredicto: ¿el cuerpo es el que se firmó? ¿la firma es del juez? */
export async function verificaVeredictos(texto: string, claves: string | string[]): Promise<Verificacion> {
  let doc: Partial<Firmado>
  try { doc = JSON.parse(texto) } catch { return { ok: false, motivo: 'El veredicto no se puede leer.' } }
  if (!doc || typeof doc !== 'object' || !Array.isArray(doc.skills) || !doc.firma
    || typeof doc.firma.signature !== 'string' || typeof doc.firma.hash !== 'string') return { ok: false, motivo: 'El veredicto no tiene la forma esperada.' }
  if (doc.version !== 1) return { ok: false, motivo: `Versión de veredicto desconocida (${String(doc.version)}).` }
  const catSha = typeof doc.catalogoSha256 === 'string' ? doc.catalogoSha256 : ''
  if (!/^[0-9a-f]{64}$/.test(catSha)) return { ok: false, motivo: 'El veredicto no dice qué catálogo juzgó.' }
  if (!doc.skills.every(forma)) return { ok: false, motivo: 'El veredicto trae skills sin la forma esperada.' }
  const skills = doc.skills
  const emitido = typeof doc.emitido === 'number' ? doc.emitido : 0
  const bytes = cuerpoVeredictos({ version: doc.version ?? 0, emitido, firmante: doc.firmante ?? '', catalogoSha256: catSha, skills })
  const hash = hex(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)))
  if (hash !== hex(b64(doc.firma.hash))) return { ok: false, motivo: 'El veredicto cambió respecto al hash firmado.' }
  const lista = typeof claves === 'string' ? [claves] : claves
  let valida = false
  for (const pem of lista) {
    try {
      const clave = await crypto.subtle.importKey('raw', pemAClaveBruta(pem), { name: 'Ed25519' } as AlgorithmIdentifier, false, ['verify'])
      valida = await crypto.subtle.verify('Ed25519', clave, b64(doc.firma.signature), bytes)
      if (valida) break
    } catch { valida = false }
  }
  if (!valida) return { ok: false, motivo: 'El veredicto no trae una firma válida del juez.' }
  if (doc.firma.signed_by !== doc.firmante) return { ok: false, motivo: 'El veredicto no lo firmó quien dice haber firmado.' }
  return { ok: true, skills, emitido, firmante: doc.firmante ?? '', catalogoSha256: catSha }
}
