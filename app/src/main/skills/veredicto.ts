// El veredicto del juez de las skills: el kit lo dicta y lo firma; la app lo verifica y lo muestra.
// La firma cubre la huella del árbol que se juzgó y el catálogo exacto que se juzgó. Así, si alguien cambia el
// catálogo después del juicio, el veredicto deja de aplicar (las skills vuelven a «sin medir») y si el árbol
// cambia, la app se niega a instalar. Hasta ahora la app comparaba solo contra el catálogo, que puede cambiar
// de mano entre la revisión y la descarga.
// El formato es la spec abierta del kit: estandar/skill-veredicto.spec.yaml.
import { createHash, createPublicKey, verify } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { CLAVES_TIENDA } from '../claves'
import catalogo from './catalogo.json'
import veredictos from './veredictos-skills.json'

export type Nivel = 'ok' | 'aviso' | 'fuera'
export type MedidasSkill = { arbolSha256: string; licencia: string; commit: string; ficheros: number; bytes: number; ejecutables: boolean
  /** Los tokens que ocupa su SKILL.md, medidos por el juez (null = sin medir). */
  tokens: number | null; skillMdSha256: string }
export type VeredictoSkill = { id: string; entra: boolean; nivel: Nivel; causa: string; medidas: MedidasSkill }

type Firma = { algorithm: string; signature: string; signed_at: string; signed_by: string; hash: string }
type Firmado = { version: number; emitido: number; firmante: string; catalogoSha256: string; skills: VeredictoSkill[]; firma: Firma }

/** El canónico del kit (claves ordenadas recursivamente, sin espacios): la huella del catálogo no depende del formato del fichero. */
const canonico = (v: unknown): string => {
  if (v === null || typeof v !== 'object') return JSON.stringify(v)
  if (Array.isArray(v)) return '[' + v.map(canonico).join(',') + ']'
  const o = v as Record<string, unknown>
  return '{' + Object.keys(o).sort().map((k) => JSON.stringify(k) + ':' + canonico(o[k])).join(',') + '}'
}

/** La huella del catálogo: qué catálogo exacto se juzgó. */
export const catalogoSha256 = (c: unknown): string => createHash('sha256').update(canonico(c)).digest('hex')

// El cuerpo firmado: las claves en un orden FIJO. Lo dice la spec: el que verifica tiene que
// sacar los mismos bytes que el que firmó.
const cuerpo = (v: { version: number; emitido: number; firmante: string; catalogoSha256: string; skills: VeredictoSkill[] }): Buffer =>
  Buffer.from(JSON.stringify({
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

const forma = (s: unknown): s is VeredictoSkill => {
  const x = s as Partial<VeredictoSkill>
  return !!x && typeof x === 'object' && typeof x.id === 'string' && typeof x.entra === 'boolean'
    && (x.nivel === 'ok' || x.nivel === 'aviso' || x.nivel === 'fuera') && typeof x.causa === 'string'
    && !!x.medidas && typeof x.medidas === 'object' && typeof x.medidas.arbolSha256 === 'string'
}

/** Cuánto vive un veredicto antes de pedir otro.
 *
 * La práctica viene de dos sitios: **@KanikaBK** («revisa los permisos de tus skills instaladas
 * cada mes») y **@mem0ai** (Hermes: «las skills que el agente guarda se degradan sin
 * mantenimiento» — skill drift). Un veredicto de hace un año no dice nada del estado de hoy.
 *
 * **El juez pone el listón, nunca lo quita**: un veredicto caducado **sigue valiendo**; lo que
 * cambia es que se dice, para que nadie lo crea actual sin que lo sea.
 */
export const CADUCIDAD_DIAS = 90
export const DIA_MS = 86_400_000

export type Verificacion = { ok: true; skills: VeredictoSkill[]; emitido: number; firmante: string; catalogoSha256: string
  caducado: boolean; vence: number } | { ok: false; motivo: string }

/** Comprueba el veredicto: ¿el cuerpo es el que se firmó? ¿la firma es del juez? */
export function verificaVeredictos(texto: string, claves: string | string[]): Verificacion {
  let doc: Partial<Firmado>
  try { doc = JSON.parse(texto) } catch { return { ok: false, motivo: 'El veredicto no se puede leer.' } }
  if (!doc || typeof doc !== 'object' || !Array.isArray(doc.skills) || !doc.firma
    || typeof doc.firma.signature !== 'string' || typeof doc.firma.hash !== 'string') return { ok: false, motivo: 'El veredicto no tiene la forma esperada.' }
  if (doc.version !== 1) return { ok: false, motivo: `Versión de veredicto desconocida (${String(doc.version)}).` }
  if (!/^[0-9a-f]{64}$/.test(typeof doc.catalogoSha256 === 'string' ? doc.catalogoSha256 : '')) return { ok: false, motivo: 'El veredicto no dice qué catálogo juzgó.' }
  if (!doc.skills.every(forma)) return { ok: false, motivo: 'El veredicto trae skills sin la forma esperada.' }
  const skills = doc.skills
  const emitido = typeof doc.emitido === 'number' ? doc.emitido : 0
  const huellaCatalogo = doc.catalogoSha256 as string
  const bytes = cuerpo({ version: doc.version, emitido, firmante: doc.firmante ?? '', catalogoSha256: huellaCatalogo, skills })
  if (createHash('sha256').update(bytes).digest('base64') !== doc.firma.hash) return { ok: false, motivo: 'El veredicto cambió respecto al hash firmado.' }
  const lista = typeof claves === 'string' ? [claves] : claves
  let valida = false
  for (const pem of lista) {
    try { if (verify(null, bytes, createPublicKey(pem), Buffer.from(doc.firma.signature, 'base64'))) { valida = true; break } } catch { valida = false }
  }
  if (!valida) return { ok: false, motivo: 'El veredicto no trae una firma válida del juez.' }
  if (doc.firma.signed_by !== doc.firmante) return { ok: false, motivo: 'El veredicto no lo firmó quien dice haber firmado.' }
  const vence = emitido + CADUCIDAD_DIAS * DIA_MS
  const caducado = emitido > 0 && Date.now() > vence
  return { ok: true, skills, emitido, firmante: doc.firmante ?? '', catalogoSha256: huellaCatalogo, caducado, vence }
}

/** De dónde salió el veredicto: la red, la copia local, el que viaja con la app o ninguno. */
export type OrigenVeredicto = 'red' | 'copia' | 'empaquetado' | 'ninguno'
export type Veredictos = {
  ok: true
  porId: Map<string, VeredictoSkill>
  emitido: number
  firmante: string
  catalogoSha256: string
  origen: OrigenVeredicto
  caducado: boolean      // el veredicto tiene edad: sigue valiendo, pero se dice
  vence: number
  aviso?: string
} | { ok: false; motivo: string; origen: OrigenVeredicto; aviso?: string }

/** El veredicto que viaja con la app (el empaquetado): siempre está, aunque no haya red. */
export function veredictosEmpaquetados(claves: string | string[] = CLAVES_TIENDA): Verificacion {
  return verificaVeredictos(JSON.stringify(veredictos), claves)
}

/** ¿Este veredicto juzgó NUESTRO catálogo? Si no, no aplica (las skills quedan sin medir). */
export function aplicaAlCatalogo(v: { catalogoSha256: string }, c: unknown = catalogo): boolean {
  return v.catalogoSha256 === catalogoSha256(c)
}

export const URL_VERDICTOS = 'https://raw.githubusercontent.com/Shiuglen/esme-tienda/main/veredictos-skills.json'

export type Buscar = (url: string) => Promise<{ ok: boolean; text(): Promise<string> }>

/**
 * El veredicto, de donde venga: la red primero (es lo que el juez acaba de publicar), luego la copia local
 * y por último el que viaja con la app. Lo que no verifica no se usa ni se guarda.
 */
export async function veredictosRemotos(o: { datos: string; url?: string; buscar?: Buscar; claves?: string | string[] }): Promise<Veredictos> {
  const url = o.url ?? URL_VERDICTOS
  const claves = o.claves ?? CLAVES_TIENDA
  const buscar = o.buscar ?? ((u: string) => fetch(u, { signal: AbortSignal.timeout(8000) }))
  const copia = join(o.datos, 'skills-veredictos.json')
  let aviso: string | undefined

  try {
    const r = await buscar(url)
    if (r.ok) {
      const texto = await r.text()
      const v = verificaVeredictos(texto, claves)
      if (v.ok) {
        try { writeFileSync(copia, texto) } catch { /* la copia es opcional */ }
        return { ok: true, porId: new Map(v.skills.map((s) => [s.id, s])), emitido: v.emitido, firmante: v.firmante, catalogoSha256: v.catalogoSha256, origen: 'red', caducado: v.caducado, vence: v.vence }
      }
      aviso = v.motivo
    }
  } catch { /* sin conexión: sigue con la copia */ }

  try {
    const v = verificaVeredictos(readFileSync(copia, 'utf8'), claves)
    if (v.ok) return { ok: true, porId: new Map(v.skills.map((s) => [s.id, s])), emitido: v.emitido, firmante: v.firmante, catalogoSha256: v.catalogoSha256, origen: 'copia', caducado: v.caducado, vence: v.vence, aviso }
  } catch { /* sin copia */ }

  const v = veredictosEmpaquetados(claves)
  if (!v.ok) return { ok: false, motivo: v.motivo, origen: 'ninguno', aviso }
  return { ok: true, porId: new Map(v.skills.map((s) => [s.id, s])), emitido: v.emitido, firmante: v.firmante, catalogoSha256: v.catalogoSha256, origen: 'empaquetado', caducado: v.caducado, vence: v.vence, aviso }
}
