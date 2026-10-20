// El veredicto del juez de las skills: el kit lo dicta y lo firma; la app lo verifica y lo muestra.
// La firma cubre la huella del árbol que se juzgó, así que si alguien cambia el catálogo después
// del juicio, la huella firmada ya no cuadra y la app se niega a instalar. Hasta ahora la app
// comparaba contra el catálogo (que puede cambiar de mano entre la revisión y la descarga).
// El formato es la spec abierta del kit: estandar/skill-veredicto.spec.yaml.
import { createHash, createPublicKey, verify } from 'node:crypto'
import { CLAVE_JUEZ } from './clave-juez'
import veredictos from './veredictos-skills.json'

export type Nivel = 'ok' | 'aviso' | 'fuera'
export type MedidasSkill = { arbolSha256: string; licencia: string; commit: string; ficheros: number; bytes: number; ejecutables: boolean }
export type VeredictoSkill = { id: string; entra: boolean; nivel: Nivel; causa: string; medidas: MedidasSkill }

type Firma = { algorithm: string; signature: string; signed_at: string; signed_by: string; hash: string }
type Firmado = { version: number; emitido: number; firmante: string; skills: VeredictoSkill[]; firma: Firma }

// El cuerpo firmado: las claves en un orden FIJO. Lo dice la spec: el que verifica tiene que
// sacar los mismos bytes que el que firmó.
const cuerpo = (v: { version: number; emitido: number; firmante: string; skills: VeredictoSkill[] }): Buffer =>
  Buffer.from(JSON.stringify({
    version: v.version,
    emitido: v.emitido,
    firmante: v.firmante,
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
      },
    })),
  }))

const forma = (s: unknown): s is VeredictoSkill => {
  const x = s as Partial<VeredictoSkill>
  return !!x && typeof x === 'object' && typeof x.id === 'string' && typeof x.entra === 'boolean'
    && (x.nivel === 'ok' || x.nivel === 'aviso' || x.nivel === 'fuera') && typeof x.causa === 'string'
    && !!x.medidas && typeof x.medidas === 'object' && typeof x.medidas.arbolSha256 === 'string'
}

/** Comprueba el veredicto: ¿el cuerpo es el que se firmó? ¿la firma es del juez? */
export function verificaVeredictos(texto: string, clavePublicaPem: string): { ok: true; skills: VeredictoSkill[]; emitido: number; firmante: string } | { ok: false; motivo: string } {
  let doc: Partial<Firmado>
  try { doc = JSON.parse(texto) } catch { return { ok: false, motivo: 'El veredicto no se puede leer.' } }
  if (!doc || typeof doc !== 'object' || !Array.isArray(doc.skills) || !doc.firma
    || typeof doc.firma.signature !== 'string' || typeof doc.firma.hash !== 'string') return { ok: false, motivo: 'El veredicto no tiene la forma esperada.' }
  if (doc.version !== 1) return { ok: false, motivo: `Versión de veredicto desconocida (${String(doc.version)}).` }
  if (!doc.skills.every(forma)) return { ok: false, motivo: 'El veredicto trae skills sin la forma esperada.' }
  const skills = doc.skills
  const emitido = typeof doc.emitido === 'number' ? doc.emitido : 0
  const bytes = cuerpo({ version: doc.version, emitido, firmante: doc.firmante ?? '', skills })
  if (createHash('sha256').update(bytes).digest('base64') !== doc.firma.hash) return { ok: false, motivo: 'El veredicto cambió respecto al hash firmado.' }
  let valida = false
  try { valida = verify(null, bytes, createPublicKey(clavePublicaPem), Buffer.from(doc.firma.signature, 'base64')) } catch { valida = false }
  if (!valida) return { ok: false, motivo: 'El veredicto no trae una firma válida del juez.' }
  if (doc.firma.signed_by !== doc.firmante) return { ok: false, motivo: 'El veredicto no lo firmó quien dice haber firmado.' }
  return { ok: true, skills, emitido, firmante: doc.firmante ?? '' }
}

export type Veredictos = { ok: true; porId: Map<string, VeredictoSkill>; emitido: number; firmante: string } | { ok: false; motivo: string }

/** El veredicto que viene con la app, ya verificado contra la clave fijada. */
export function veredictosSkills(): Veredictos {
  const v = verificaVeredictos(JSON.stringify(veredictos), CLAVE_JUEZ)
  if (!v.ok) return v
  return { ok: true, porId: new Map(v.skills.map((s) => [s.id, s])), emitido: v.emitido, firmante: v.firmante }
}

/** El veredicto de una skill (o null si el juez no la miró). */
export function veredictoDe(porId: Map<string, VeredictoSkill>, id: string): VeredictoSkill | null {
  return porId.get(id) ?? null
}
