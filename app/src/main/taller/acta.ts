// El acta del parlamento: lo que el comité decidió, firmado por el propio Taller (fase 4 de la spec
// docs/superpowers/specs/2026-10-21-parlamento-live.md). No usa las claves de la estirpe de la
// Tienda —esas firman lo que se publica a otras manos—: el Taller tiene su par en su carpeta
// (firma-taller), se genera la primera vez que firma y de ahí en adelante el diario es verificable:
// cualquiera que tenga el fichero puede comprobar que ningún veredicto cambió después de dictarse.
import { createHash, createPrivateKey, createPublicKey, generateKeyPairSync, sign, verify } from 'node:crypto'
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

/** Un relevo tal como quedó: quién llevaba el testigo y cómo acabó. */
export type ActaRelevo = { orden: number; rol: string; motor: string; estado: 'lista' | 'error' }

/** El veredicto del comité, sin firmar: lo firmable está en claves y orden FIJOS. */
export type Acta = { version: 1; emitido: number; encargoSha256: string; estado: 'probado' | 'dudoso' | 'tumbado'; frase: string; relevos: ActaRelevo[] }

/** El formato de firma de la casa (el mismo del juez de skills): algoritmo, sello, cuándo y quién. */
export type Firma = { algorithm: string; signature: string; signed_at: string; signed_by: string; hash: string }
export type ActaFirmada = Acta & { firma: Firma }

/** El canónico de la casa: claves ordenadas, sin espaciado — la huella no depende del formato. */
const canonico = (v: unknown): string => {
  if (v === null || typeof v !== 'object') return JSON.stringify(v)
  if (Array.isArray(v)) return '[' + v.map(canonico).join(',') + ']'
  const o = v as Record<string, unknown>
  return '{' + Object.keys(o).sort().map((k) => JSON.stringify(k) + ':' + canonico(o[k])).join(',') + '}'
}

/** El cuerpo firmado: los mismos bytes siempre — el que verifica saca lo mismo que el que firmó. */
export const cuerpoActa = (a: Omit<ActaFirmada, 'firma'>): Buffer =>
  Buffer.from(JSON.stringify({
    version: a.version, emitido: a.emitido, encargoSha256: a.encargoSha256, estado: a.estado, frase: a.frase,
    relevos: a.relevos.map((r) => ({ orden: r.orden, rol: r.rol, motor: r.motor, estado: r.estado })),
  }))

/** La huella que acompaña a la firma: qué acta exacta se firmó. */
export const actaSha256 = (a: Omit<ActaFirmada, 'firma'>): string => createHash('sha256').update(canonico(a)).digest('hex')

/** El par del Taller para firmar sus actas: se crea la primera vez y vive en su carpeta (es la
 *  máquina del creador la raíz de esta confianza; no es el firmante público de la Tienda). */
export function parDeFirma(dir: string): { privada: string; publica: string } {
  const privada = join(dir, 'firma-taller.pem'), publica = join(dir, 'firma-taller.pub')
  if (existsSync(privada) && existsSync(publica)) {
    return { privada: readFileSync(privada, 'utf8'), publica: readFileSync(publica, 'utf8') }
  }
  const par = generateKeyPairSync('ed25519')
  const pem = { privada: par.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(), publica: par.publicKey.export({ type: 'spki', format: 'pem' }).toString() }
  mkdirSync(dir, { recursive: true })
  writeFileSync(privada, pem.privada, { mode: 0o600 })
  writeFileSync(publica, pem.publica)
  return pem
}

/** Firma el acta con la clave del Taller y la sella con quién, cuándo y la huella del contenido. */
export function firmaDe(acta: Omit<ActaFirmada, 'firma'>, privada: string): ActaFirmada {
  return {
    ...acta,
    firma: {
      algorithm: 'Ed25519',
      signature: sign(null, cuerpoActa(acta), createPrivateKey(privada)).toString('base64url'),
      signed_at: new Date(acta.emitido).toISOString(),
      signed_by: 'taller',
      hash: actaSha256(acta),
    },
  }
}

/** ¿El veredicto llega íntegro? La firma y la huella tienen que salir solas; si alguien tocó
 *  el estado, la frase o un relevo después de dictarse el acta, deja de valer. */
export function actaValida(f: ActaFirmada, publica: string): boolean {
  const { firma, ...resto } = f
  if (!firma?.signature || firma.algorithm !== 'Ed25519' || firma.hash !== actaSha256(resto)) return false
  try {
    return verify(null, cuerpoActa(resto), createPublicKey(publica), Buffer.from(firma.signature, 'base64url'))
  } catch { return false }
}

const DIARIO = 'actas-parlamento.jsonl'
/** El diario de los parlamentos: una acta firmada por línea, comprobable línea a línea. */
export function anotaActa(dir: string, firmada: ActaFirmada): void {
  mkdirSync(dir, { recursive: true })
  appendFileSync(join(dir, DIARIO), JSON.stringify(firmada) + '\n')
}

export function leeActas(dir: string): ActaFirmada[] {
  let texto = ''
  try { texto = readFileSync(join(dir, DIARIO), 'utf8') } catch { return [] }
  return texto.split('\n').filter(Boolean).flatMap((l) => { try { return [JSON.parse(l) as ActaFirmada] } catch { return [] } })
}
